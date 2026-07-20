from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import UTC, datetime
from pathlib import Path

import duckdb

from pipeline.config import (
    BTS_DOWNLOAD_URL,
    BTS_TABLE_INFO_URL,
    CLEAN_DIR,
    MIN_RANKING_OBSERVATIONS,
    PROCESSED_DIR,
    PUBLIC_DATA_DIR,
    YearMonth,
)
from pipeline.dataset_card import write_dataset_card
from pipeline.reference import CARRIER_NAMES


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _sql_string(value: str | Path) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def _write_json(path: Path, value: dict, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    serialized = (
        json.dumps(value, separators=(",", ":"), sort_keys=True)
        if compact
        else json.dumps(value, indent=2, sort_keys=True)
    )
    temporary.write_text(serialized + "\n")
    os.replace(temporary, path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


METRICS_SQL = """
  count(*)::BIGINT AS scheduled_flights,
  count(*) FILTER (WHERE is_operated)::BIGINT AS operated_flights,
  count(*) FILTER (WHERE has_arrival_observation)::BIGINT AS observations,
  count(*) FILTER (WHERE is_cancelled)::BIGINT AS cancelled_flights,
  count(*) FILTER (WHERE is_diverted)::BIGINT AS diverted_flights,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes < 15
  )::BIGINT AS on_time_arrivals,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 30
  )::BIGINT AS arrivals_30_plus,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 60
  )::BIGINT AS arrivals_60_plus,
  quantile_cont(arrival_delay_minutes, 0.5) FILTER (
    WHERE has_arrival_observation
  )::DOUBLE AS median_arrival_delay,
  quantile_cont(arrival_delay_minutes, 0.75) FILTER (
    WHERE has_arrival_observation
  )::DOUBLE AS p75_arrival_delay,
  quantile_cont(arrival_delay_minutes, 0.9) FILTER (
    WHERE has_arrival_observation
  )::DOUBLE AS p90_arrival_delay,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes < 0
  )::BIGINT AS delay_bin_early,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 0
      AND arrival_delay_minutes < 15
  )::BIGINT AS delay_bin_0_14,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 15
      AND arrival_delay_minutes < 30
  )::BIGINT AS delay_bin_15_29,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 30
      AND arrival_delay_minutes < 60
  )::BIGINT AS delay_bin_30_59,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 60
      AND arrival_delay_minutes < 120
  )::BIGINT AS delay_bin_60_119,
  count(*) FILTER (
    WHERE has_arrival_observation AND arrival_delay_minutes >= 120
  )::BIGINT AS delay_bin_120_plus,
  sum(greatest(coalesce(carrier_delay_minutes, 0), 0))::DOUBLE
    AS carrier_delay_minutes,
  sum(greatest(coalesce(weather_delay_minutes, 0), 0))::DOUBLE
    AS weather_delay_minutes,
  sum(greatest(coalesce(nas_delay_minutes, 0), 0))::DOUBLE
    AS nas_delay_minutes,
  sum(greatest(coalesce(security_delay_minutes, 0), 0))::DOUBLE
    AS security_delay_minutes,
  sum(greatest(coalesce(late_aircraft_delay_minutes, 0), 0))::DOUBLE
    AS late_aircraft_delay_minutes
"""


def _grouped_query(group_columns: list[str], *, source: str = "flights") -> str:
    columns = ", ".join(group_columns)
    return f"SELECT {columns}, {METRICS_SQL} FROM {source} GROUP BY ALL"


def _with_all_time_band(group_columns: list[str]) -> str:
    detailed = _grouped_query([*group_columns, "departure_time_band"])
    overall = _grouped_query(group_columns).replace(
        "SELECT ", "SELECT ", 1
    )
    select_columns = ", ".join(group_columns)
    overall = overall.replace(
        f"SELECT {select_columns},",
        f"SELECT {select_columns}, 'All'::VARCHAR AS departure_time_band,",
        1,
    )
    return f"{detailed} UNION ALL {overall}"


def _copy_partitioned(
    connection: duckdb.DuckDBPyConnection, table: str, destination: Path
) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    connection.execute("SET threads = 1")
    try:
        connection.execute(
            f"COPY (SELECT * FROM {table}) TO {_sql_string(destination)} "
            "(FORMAT PARQUET, COMPRESSION ZSTD, PARTITION_BY (origin), "
            "ROW_GROUP_SIZE 50000, OVERWRITE_OR_IGNORE TRUE)"
        )
    finally:
        connection.execute("SET threads = 4")
    _coalesce_origin_files(connection, destination)


def _coalesce_origin_files(
    connection: duckdb.DuckDBPyConnection, destination: Path
) -> None:
    """Make every browser addressable origin partition exactly one file."""
    merge_dir = destination / ".merge"
    merge_dir.mkdir()
    try:
        for origin_dir in sorted(destination.glob("origin=*")):
            source_files = sorted(origin_dir.glob("*.parquet"))
            if not source_files:
                raise RuntimeError(f"Empty aggregate partition: {origin_dir}")
            target = origin_dir / "data.parquet"
            if len(source_files) == 1:
                os.replace(source_files[0], target)
                continue

            source_list = ", ".join(_sql_string(path) for path in source_files)
            temporary = merge_dir / f"{origin_dir.name}.parquet"
            connection.execute(
                f"COPY (SELECT * FROM read_parquet([{source_list}], "
                "hive_partitioning = false, union_by_name = true)) "
                f"TO {_sql_string(temporary)} "
                "(FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 50000)"
            )
            for source_file in source_files:
                source_file.unlink()
            os.replace(temporary, target)
    finally:
        shutil.rmtree(merge_dir, ignore_errors=True)


def _partition_map(root: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for path in sorted(root.glob("origin=*/*.parquet")):
        origin = path.parent.name.removeprefix("origin=")
        if origin in result:
            raise RuntimeError(f"Multiple files found for origin {origin} in {root}")
        result[origin] = path.as_posix()
    return result


def build_aggregates(
    latest: YearMonth,
    *,
    clean_dir: Path = CLEAN_DIR,
    processed_dir: Path = PROCESSED_DIR,
    public_dir: Path = PUBLIC_DATA_DIR,
) -> dict:
    clean_glob = clean_dir / "year=*" / "month=*" / "flights.parquet"
    clean_files = sorted(clean_dir.glob("year=*/month=*/flights.parquet"))
    if not clean_files:
        raise FileNotFoundError("No cleaned Parquet partitions are available")
    clean_manifest = json.loads((clean_dir / "manifest.json").read_text())

    version = f"v{latest.key}"
    for root in (processed_dir, public_dir):
        for old_version in root.glob("v*"):
            if old_version.name != version:
                shutil.rmtree(old_version)
    processed_version = processed_dir / version
    public_version = public_dir / version
    if processed_version.exists():
        shutil.rmtree(processed_version)
    if public_version.exists():
        shutil.rmtree(public_version)
    processed_version.mkdir(parents=True)

    connection = duckdb.connect()
    try:
        connection.execute("SET preserve_insertion_order = false")
        connection.execute("SET threads = 4")
        connection.execute(
            f"CREATE VIEW flights AS SELECT * FROM read_parquet({_sql_string(clean_glob)}, "
            "hive_partitioning = false, union_by_name = true)"
        )

        table_queries = {
            "route_airline_comparison": _with_all_time_band(
                [
                    "origin",
                    "origin_airport_id",
                    "destination",
                    "destination_airport_id",
                    "carrier_id",
                    "carrier_code",
                    "month AS calendar_month",
                ]
            ),
            "route_airline_period": _with_all_time_band(
                [
                    "origin",
                    "origin_airport_id",
                    "destination",
                    "destination_airport_id",
                    "carrier_id",
                    "carrier_code",
                    "year",
                    "month",
                ]
            ),
            "route_period": _with_all_time_band(
                [
                    "origin",
                    "origin_airport_id",
                    "destination",
                    "destination_airport_id",
                    "year",
                    "month",
                ]
            ),
            "route_month_band": _with_all_time_band(
                [
                    "origin",
                    "origin_airport_id",
                    "destination",
                    "destination_airport_id",
                    "month AS calendar_month",
                ]
            ),
            "airport_period": _with_all_time_band(
                ["origin", "origin_airport_id", "year", "month"]
            ),
            "airport_month_band": _with_all_time_band(
                ["origin", "origin_airport_id", "month AS calendar_month"]
            ),
            "airport_routes": _with_all_time_band(
                [
                    "origin",
                    "origin_airport_id",
                    "destination",
                    "destination_airport_id",
                    "month AS calendar_month",
                ]
            ),
        }

        aggregate_rows: dict[str, int] = {}
        for table, query in table_queries.items():
            connection.execute(f"CREATE TEMP TABLE {table} AS {query}")
            aggregate_rows[table] = int(
                connection.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
            )
            _copy_partitioned(connection, table, processed_version / table)

        airport_rows = connection.execute(
            """
            WITH appearances AS (
              SELECT
                origin AS code,
                origin_airport_id AS airport_id,
                origin_airport_seq_id AS airport_seq_id,
                origin_city_name AS city_name,
                origin_state AS state,
                flight_date
              FROM flights
              UNION ALL
              SELECT
                destination AS code,
                destination_airport_id AS airport_id,
                destination_airport_seq_id AS airport_seq_id,
                destination_city_name AS city_name,
                destination_state AS state,
                flight_date
              FROM flights
            )
            SELECT
              code,
              arg_max(airport_id, flight_date) AS airport_id,
              arg_max(airport_seq_id, flight_date) AS airport_seq_id,
              arg_max(city_name, flight_date) AS city_name,
              arg_max(state, flight_date) AS state,
              max(flight_date)::VARCHAR AS last_seen
            FROM appearances
            GROUP BY code
            ORDER BY code
            """
        ).fetchall()
        airports = [
            {
                "code": row[0],
                "airport_id": row[1],
                "airport_seq_id": row[2],
                "city_name": row[3],
                "state": row[4],
                "last_seen": row[5],
            }
            for row in airport_rows
        ]

        route_rows = connection.execute(
            """
            SELECT origin, destination, count(*)::BIGINT AS scheduled_flights
            FROM flights
            GROUP BY origin, destination
            ORDER BY origin, destination
            """
        ).fetchall()
        routes: dict[str, list[dict]] = {}
        for origin, destination, scheduled_flights in route_rows:
            routes.setdefault(origin, []).append(
                {"destination": destination, "scheduled_flights": scheduled_flights}
            )
        top_routes = [
            {
                "origin": row[0],
                "destination": row[1],
                "scheduled_flights": row[2],
            }
            for row in connection.execute(
                """
                SELECT origin, destination, count(*)::BIGINT AS scheduled_flights
                FROM flights
                GROUP BY origin, destination
                HAVING count(*) >= 1000
                ORDER BY scheduled_flights DESC
                LIMIT 12
                """
            ).fetchall()
        ]
        carrier_codes = [
            row[0]
            for row in connection.execute(
                "SELECT DISTINCT carrier_code FROM flights ORDER BY carrier_code"
            ).fetchall()
        ]
    finally:
        connection.close()

    shutil.copytree(processed_version, public_version)
    partition_tables: dict[str, dict] = {}
    for table in table_queries:
        processed_table = processed_version / table
        relative_map = {
            origin: f"{version}/{path.relative_to(processed_version).as_posix()}"
            for origin, path in (
                (origin, Path(path)) for origin, path in _partition_map(processed_table).items()
            )
        }
        partition_tables[table] = {
            "rows": aggregate_rows[table],
            "partitions": relative_map,
        }

    files = []
    for path in sorted(processed_version.rglob("*.parquet")):
        files.append(
            {
                "path": path.relative_to(processed_dir).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": _sha256(path),
            }
        )
    source_rows = int(clean_manifest["source_rows"])
    cleaned_rows = int(clean_manifest["cleaned_rows"])
    first_partition = min(clean_manifest["partitions"])
    last_partition = max(clean_manifest["partitions"])
    manifest = {
        "schema_version": 1,
        "product": "Arrival Atlas",
        "version": version,
        "generated_at": _utc_now(),
        "coverage": {
            "start": first_partition,
            "end": last_partition,
            "latest_complete_month": latest.key,
        },
        "source": {
            "name": "BTS Reporting Carrier On-Time Performance",
            "table_info_url": BTS_TABLE_INFO_URL,
            "download_url": BTS_DOWNLOAD_URL,
            "source_rows": source_rows,
            "cleaned_rows": cleaned_rows,
            "duplicates_removed": source_rows - cleaned_rows,
            "partition_count": len(clean_manifest["partitions"]),
        },
        "ranking_minimum_observations": MIN_RANKING_OBSERVATIONS,
        "airports": airports,
        "carriers": {
            code: CARRIER_NAMES.get(code, code) for code in carrier_codes
        },
        "routes": routes,
        "top_routes": top_routes,
        "tables": partition_tables,
        "files": files,
        "file_count": len(files),
        "aggregate_rows": sum(aggregate_rows.values()),
        "aggregate_bytes": sum(item["bytes"] for item in files),
    }
    catalog = {key: value for key, value in manifest.items() if key != "files"}
    _write_json(processed_dir / "manifest.json", manifest)
    _write_json(public_dir / "manifest.json", manifest)
    _write_json(processed_dir / "catalog.json", catalog, compact=True)
    _write_json(public_dir / "catalog.json", catalog, compact=True)
    write_dataset_card(manifest, processed_dir / "README.md")
    return manifest
