from __future__ import annotations

import json
from pathlib import Path

import duckdb

from pipeline.aggregate import build_aggregates
from pipeline.quality import validate_aggregates
from pipeline.transform import transform_partition


def test_aggregates_use_correct_denominators_and_exact_quantiles(
    synthetic_raw: tuple, tmp_path: Path
) -> None:
    partition, raw_dir = synthetic_raw
    clean_dir = tmp_path / "cleaned"
    processed_dir = tmp_path / "processed"
    public_dir = tmp_path / "public"
    transform_partition(partition, raw_dir=raw_dir, clean_dir=clean_dir)

    manifest = build_aggregates(
        partition,
        clean_dir=clean_dir,
        processed_dir=processed_dir,
        public_dir=public_dir,
    )
    table = manifest["tables"]["route_airline_comparison"]
    parquet = processed_dir / table["partitions"]["JFK"]
    assert len(list(parquet.parent.glob("*.parquet"))) == 1
    assert duckdb.sql(
        "SELECT typeof(calendar_month) FROM read_parquet(?) LIMIT 1",
        params=[str(parquet)],
    ).fetchone()[0] != "VARCHAR"
    row = duckdb.sql(
        """
        SELECT
          scheduled_flights, operated_flights, observations, cancelled_flights,
          diverted_flights, on_time_arrivals, arrivals_60_plus,
          median_arrival_delay, p75_arrival_delay, p90_arrival_delay,
          carrier_delay_minutes, nas_delay_minutes
        FROM read_parquet(?)
        WHERE destination = 'LAX' AND calendar_month = 1
          AND departure_time_band = 'All'
        """,
        params=[str(parquet)],
    ).fetchone()
    assert row[:7] == (4, 3, 2, 1, 1, 1, 1)
    assert row[7] == 50
    assert row[8] == 70
    assert row[9] == 82
    assert row[10:] == (60, 30)
    assert json.loads((public_dir / "manifest.json").read_text())["source"][
        "cleaned_rows"
    ] == 5
    catalog = json.loads((public_dir / "catalog.json").read_text())
    assert catalog["version"] == manifest["version"]
    assert "files" not in catalog
    assert validate_aggregates(processed_dir) == []
