from __future__ import annotations

import json
from pathlib import Path

import duckdb

from pipeline.config import CLEAN_DIR, PROCESSED_DIR


def validate_cleaned_data(clean_dir: Path = CLEAN_DIR) -> list[str]:
    errors: list[str] = []
    manifest_path = clean_dir / "manifest.json"
    if not manifest_path.exists():
        return ["cleaned manifest is missing"]
    manifest = json.loads(manifest_path.read_text())
    partition_rows = sum(
        item["cleaned_rows"] for item in manifest.get("partitions", {}).values()
    )
    if partition_rows != manifest.get("cleaned_rows"):
        errors.append("cleaned manifest row count does not reconcile")
    if any(
        item["source_rows"] != item["cleaned_rows"] + item["duplicate_rows_removed"]
        for item in manifest.get("partitions", {}).values()
    ):
        errors.append("a partition source row count does not reconcile")

    parquet_files = sorted(clean_dir.glob("year=*/month=*/flights.parquet"))
    if len(parquet_files) != manifest.get("partition_count"):
        errors.append("cleaned partition count does not match the manifest")
    if not parquet_files:
        return [*errors, "no cleaned partitions found"]

    connection = duckdb.connect()
    try:
        glob = clean_dir / "year=*" / "month=*" / "flights.parquet"
        stats = connection.execute(
            """
            SELECT
              count(*) AS rows,
              count(*) FILTER (WHERE month NOT BETWEEN 1 AND 12) AS invalid_month,
              count(*) FILTER (WHERE departure_time_band = 'Unknown') AS invalid_time,
              count(*) FILTER (WHERE is_cancelled AND has_arrival_observation)
                AS cancelled_with_arrival,
              count(*) FILTER (WHERE is_diverted AND has_arrival_observation)
                AS diverted_with_arrival,
              count(*) FILTER (WHERE source_duplicate_copies < 1) AS invalid_duplicate_count
            FROM read_parquet(?, hive_partitioning = false, union_by_name = true)
            """,
            [str(glob)],
        ).fetchone()
    finally:
        connection.close()
    labels = [
        "row count",
        "invalid calendar month",
        "invalid scheduled departure time",
        "cancelled flight with arrival observation",
        "diverted flight with arrival observation",
        "invalid duplicate count",
    ]
    if int(stats[0]) != manifest.get("cleaned_rows"):
        errors.append("Parquet rows do not match the cleaned manifest")
    for label, count in zip(labels[1:], stats[1:], strict=True):
        if count:
            errors.append(f"{label}: {count}")
    return errors


def validate_aggregates(processed_dir: Path = PROCESSED_DIR) -> list[str]:
    errors: list[str] = []
    manifest_path = processed_dir / "manifest.json"
    if not manifest_path.exists():
        return ["aggregate manifest is missing"]
    manifest = json.loads(manifest_path.read_text())
    catalog_path = processed_dir / "catalog.json"
    if not catalog_path.exists():
        errors.append("client catalog is missing")
    elif json.loads(catalog_path.read_text()) != {
        key: value for key, value in manifest.items() if key != "files"
    }:
        errors.append("client catalog does not match the aggregate manifest")
    version_dir = processed_dir / manifest["version"]
    files = sorted(version_dir.rglob("*.parquet"))
    if len(files) != manifest["file_count"]:
        errors.append("aggregate file count does not match the manifest")
    if sum(path.stat().st_size for path in files) != manifest["aggregate_bytes"]:
        errors.append("aggregate byte count does not match the manifest")
    connection = duckdb.connect()
    try:
        for table_name, table in manifest["tables"].items():
            if not table["partitions"]:
                errors.append(f"{table_name} has no origin partitions")
                continue
            expected = {
                processed_dir / path for path in table["partitions"].values()
            }
            actual = set((version_dir / table_name).glob("origin=*/*.parquet"))
            if expected != actual:
                errors.append(
                    f"{table_name} manifest paths do not match its Parquet files"
                )
                continue
            origin_count = len({path.parent.name for path in actual})
            if len(actual) != origin_count:
                errors.append(f"{table_name} has a split origin partition")
                continue
            table_glob = version_dir / table_name / "origin=*" / "*.parquet"
            actual_rows = int(
                connection.execute(
                    "SELECT count(*) FROM read_parquet(?, "
                    "hive_partitioning = false, union_by_name = true)",
                    [str(table_glob)],
                ).fetchone()[0]
            )
            if actual_rows != table["rows"]:
                errors.append(
                    f"{table_name} row count is {actual_rows}, expected {table['rows']}"
                )
    finally:
        connection.close()
    return errors
