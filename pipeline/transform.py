from __future__ import annotations

import csv
import io
import json
import os
import shutil
import tempfile
import zipfile
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from pipeline.config import CLEAN_DIR, RAW_DIR, YearMonth

REQUIRED_SOURCE_COLUMNS = {
    "Year",
    "Month",
    "FlightDate",
    "Reporting_Airline",
    "DOT_ID_Reporting_Airline",
    "Flight_Number_Reporting_Airline",
    "OriginAirportID",
    "OriginAirportSeqID",
    "Origin",
    "OriginCityName",
    "OriginState",
    "DestAirportID",
    "DestAirportSeqID",
    "Dest",
    "DestCityName",
    "DestState",
    "CRSDepTime",
    "DepTime",
    "DepDelay",
    "CRSArrTime",
    "ArrTime",
    "ArrDelay",
    "Cancelled",
    "CancellationCode",
    "Diverted",
    "CRSElapsedTime",
    "ActualElapsedTime",
    "Distance",
    "CarrierDelay",
    "WeatherDelay",
    "NASDelay",
    "SecurityDelay",
    "LateAircraftDelay",
}

TRANSFORM_SCHEMA_VERSION = 2


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _read_json(path: Path, default: dict) -> dict:
    return json.loads(path.read_text()) if path.exists() else default


def _write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    os.replace(temporary, path)


def _sql_string(value: str | Path) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def _csv_member(archive: zipfile.ZipFile) -> str:
    members = [name for name in archive.namelist() if name.lower().endswith(".csv")]
    if len(members) != 1:
        raise RuntimeError(f"Expected one CSV in BTS archive, found {len(members)}")
    return members[0]


def _source_columns(archive: zipfile.ZipFile, member: str) -> list[str]:
    with archive.open(member) as raw:
        wrapped = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
        return next(csv.reader(wrapped))


def _clean_query(csv_path: Path) -> str:
    source = _sql_string(csv_path)
    return f"""
        WITH typed AS (
          SELECT
            try_cast("Year" AS SMALLINT) AS year,
            try_cast("Month" AS TINYINT) AS month,
            try_cast("FlightDate" AS DATE) AS flight_date,
            trim(cast("Reporting_Airline" AS VARCHAR)) AS carrier_code,
            try_cast("DOT_ID_Reporting_Airline" AS INTEGER) AS carrier_id,
            try_cast("Flight_Number_Reporting_Airline" AS INTEGER) AS flight_number,
            try_cast("OriginAirportID" AS INTEGER) AS origin_airport_id,
            try_cast("OriginAirportSeqID" AS INTEGER) AS origin_airport_seq_id,
            trim(cast("Origin" AS VARCHAR)) AS origin,
            trim(cast("OriginCityName" AS VARCHAR)) AS origin_city_name,
            trim(cast("OriginState" AS VARCHAR)) AS origin_state,
            try_cast("DestAirportID" AS INTEGER) AS destination_airport_id,
            try_cast("DestAirportSeqID" AS INTEGER) AS destination_airport_seq_id,
            trim(cast("Dest" AS VARCHAR)) AS destination,
            trim(cast("DestCityName" AS VARCHAR)) AS destination_city_name,
            trim(cast("DestState" AS VARCHAR)) AS destination_state,
            try_cast("CRSDepTime" AS INTEGER) AS scheduled_departure_time,
            try_cast("DepTime" AS INTEGER) AS actual_departure_time,
            try_cast("DepDelay" AS DOUBLE) AS departure_delay_minutes,
            try_cast("CRSArrTime" AS INTEGER) AS scheduled_arrival_time,
            try_cast("ArrTime" AS INTEGER) AS actual_arrival_time,
            try_cast("ArrDelay" AS DOUBLE) AS arrival_delay_minutes,
            coalesce(try_cast("Cancelled" AS DOUBLE), 0) = 1 AS is_cancelled,
            nullif(trim(cast("CancellationCode" AS VARCHAR)), '') AS cancellation_code,
            coalesce(try_cast("Diverted" AS DOUBLE), 0) = 1 AS is_diverted,
            try_cast("CRSElapsedTime" AS DOUBLE) AS scheduled_elapsed_minutes,
            try_cast("ActualElapsedTime" AS DOUBLE) AS actual_elapsed_minutes,
            try_cast("Distance" AS DOUBLE) AS distance_miles,
            try_cast("CarrierDelay" AS DOUBLE) AS carrier_delay_minutes,
            try_cast("WeatherDelay" AS DOUBLE) AS weather_delay_minutes,
            try_cast("NASDelay" AS DOUBLE) AS nas_delay_minutes,
            try_cast("SecurityDelay" AS DOUBLE) AS security_delay_minutes,
            try_cast("LateAircraftDelay" AS DOUBLE) AS late_aircraft_delay_minutes
          FROM read_csv_auto(
            {source},
            header = true,
            sample_size = 200000,
            ignore_errors = false,
            strict_mode = true,
            null_padding = false
          )
        ),
        classified AS (
          SELECT
            *,
            CASE
              WHEN scheduled_departure_time = 2400 THEN 'Overnight'
              WHEN scheduled_departure_time BETWEEN 0 AND 559
                AND scheduled_departure_time % 100 < 60 THEN 'Overnight'
              WHEN scheduled_departure_time BETWEEN 600 AND 1159
                AND scheduled_departure_time % 100 < 60 THEN 'Morning'
              WHEN scheduled_departure_time BETWEEN 1200 AND 1759
                AND scheduled_departure_time % 100 < 60 THEN 'Afternoon'
              WHEN scheduled_departure_time BETWEEN 1800 AND 2359
                AND scheduled_departure_time % 100 < 60 THEN 'Evening'
              ELSE 'Unknown'
            END AS departure_time_band,
            NOT is_cancelled AS is_operated,
            NOT is_cancelled AND NOT is_diverted AND arrival_delay_minutes IS NOT NULL
              AS has_arrival_observation,
            scheduled_elapsed_minutes IS NOT NULL
              AND (scheduled_elapsed_minutes <= 0 OR scheduled_elapsed_minutes > 1440)
              AS has_invalid_scheduled_duration,
            actual_elapsed_minutes IS NOT NULL
              AND (actual_elapsed_minutes <= 0 OR actual_elapsed_minutes > 1440)
              AS has_invalid_actual_duration
          FROM typed
        ),
        deduplicated AS (
          SELECT
            *,
            count(*) OVER flight_key AS source_duplicate_copies,
            row_number() OVER flight_key AS duplicate_number
          FROM classified
          WINDOW flight_key AS (
            PARTITION BY flight_date, carrier_id, flight_number,
              origin_airport_id, destination_airport_id, scheduled_departure_time
          )
        )
        SELECT * EXCLUDE (duplicate_number)
        FROM deduplicated
        WHERE duplicate_number = 1
    """


def transform_partition(
    partition: YearMonth,
    *,
    raw_dir: Path = RAW_DIR,
    clean_dir: Path = CLEAN_DIR,
    force: bool = False,
) -> dict:
    raw_manifest = _read_json(raw_dir / "manifest.json", {"partitions": {}})
    raw_record = raw_manifest.get("partitions", {}).get(partition.key)
    if not raw_record:
        raise FileNotFoundError(f"No raw manifest entry for {partition.key}")
    archive_path = raw_dir / partition.source_filename
    if not archive_path.exists():
        raise FileNotFoundError(archive_path)

    clean_manifest_path = clean_dir / "manifest.json"
    clean_manifest = _read_json(
        clean_manifest_path, {"schema_version": 1, "partitions": {}}
    )
    destination = (
        clean_dir
        / f"year={partition.year:04d}"
        / f"month={partition.month:02d}"
        / "flights.parquet"
    )
    prior = clean_manifest["partitions"].get(partition.key, {})
    if (
        destination.exists()
        and prior.get("source_sha256") == raw_record["sha256"]
        and prior.get("transform_schema_version") == TRANSFORM_SCHEMA_VERSION
        and not force
    ):
        return prior

    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        member = _csv_member(archive)
        source_columns = set(_source_columns(archive, member))
        missing = sorted(REQUIRED_SOURCE_COLUMNS - source_columns)
        if missing:
            raise RuntimeError(
                f"BTS schema changed for {partition.key}; missing columns: {', '.join(missing)}"
            )

        with tempfile.TemporaryDirectory(prefix=f"arrival-atlas-{partition.key}-") as folder:
            csv_path = Path(folder) / "source.csv"
            with archive.open(member) as source, csv_path.open("wb") as output:
                shutil.copyfileobj(source, output, length=1024 * 1024)

            temporary = destination.with_suffix(".parquet.part")
            temporary.unlink(missing_ok=True)
            connection = duckdb.connect()
            try:
                connection.execute("SET preserve_insertion_order = false")
                connection.execute("SET threads = 4")
                connection.execute(
                    f"COPY ({_clean_query(csv_path)}) TO {_sql_string(temporary)} "
                    "(FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)"
                )
            finally:
                connection.close()
            os.replace(temporary, destination)

    connection = duckdb.connect()
    try:
        stats = connection.execute(
            f"""
            SELECT
              count(*) AS cleaned_rows,
              coalesce(sum(source_duplicate_copies - 1), 0) AS duplicate_rows_removed,
              count(*) FILTER (
                WHERE flight_date IS NULL OR carrier_id IS NULL
                  OR origin_airport_id IS NULL OR destination_airport_id IS NULL
              ) AS rows_missing_stable_identity,
              count(*) FILTER (WHERE has_invalid_scheduled_duration) AS invalid_scheduled_duration,
              count(*) FILTER (WHERE has_invalid_actual_duration) AS invalid_actual_duration,
              count(*) FILTER (WHERE is_cancelled) AS cancelled_rows,
              count(*) FILTER (WHERE is_diverted) AS diverted_rows,
              count(*) FILTER (WHERE has_arrival_observation) AS arrival_observations
            FROM read_parquet({_sql_string(destination)})
            """
        ).fetchone()
    finally:
        connection.close()

    (
        cleaned_rows,
        duplicate_rows_removed,
        rows_missing_stable_identity,
        invalid_scheduled_duration,
        invalid_actual_duration,
        cancelled_rows,
        diverted_rows,
        arrival_observations,
    ) = (int(value or 0) for value in stats)
    if rows_missing_stable_identity:
        destination.unlink(missing_ok=True)
        raise RuntimeError(
            f"{partition.key} contains {rows_missing_stable_identity} rows "
            "without stable identifiers"
        )

    record = {
        "transform_schema_version": TRANSFORM_SCHEMA_VERSION,
        "source_sha256": raw_record["sha256"],
        "source_url": raw_record["source_url"],
        "transformed_at": _utc_now(),
        "source_rows": cleaned_rows + duplicate_rows_removed,
        "cleaned_rows": cleaned_rows,
        "duplicate_rows_removed": duplicate_rows_removed,
        "rows_missing_stable_identity": rows_missing_stable_identity,
        "invalid_scheduled_duration": invalid_scheduled_duration,
        "invalid_actual_duration": invalid_actual_duration,
        "cancelled_rows": cancelled_rows,
        "diverted_rows": diverted_rows,
        "arrival_observations": arrival_observations,
        "file": str(destination.relative_to(clean_dir.parent)),
        "bytes": destination.stat().st_size,
    }
    clean_manifest["partitions"][partition.key] = record
    clean_manifest["updated_at"] = _utc_now()
    clean_manifest["partition_count"] = len(clean_manifest["partitions"])
    clean_manifest["source_rows"] = sum(
        item["source_rows"] for item in clean_manifest["partitions"].values()
    )
    clean_manifest["cleaned_rows"] = sum(
        item["cleaned_rows"] for item in clean_manifest["partitions"].values()
    )
    _write_json(clean_manifest_path, clean_manifest)
    return record


def transform_partitions(
    partitions: list[YearMonth],
    *,
    raw_dir: Path = RAW_DIR,
    clean_dir: Path = CLEAN_DIR,
    force: bool = False,
) -> dict:
    for partition in partitions:
        transform_partition(
            partition, raw_dir=raw_dir, clean_dir=clean_dir, force=force
        )
    return _read_json(clean_dir / "manifest.json", {"partitions": {}})
