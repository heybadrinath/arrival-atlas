from __future__ import annotations

from pathlib import Path

import duckdb

from pipeline.transform import transform_partition


def test_transform_deduplicates_and_classifies_flights(
    synthetic_raw: tuple, tmp_path: Path
) -> None:
    partition, raw_dir = synthetic_raw
    clean_dir = tmp_path / "cleaned"
    record = transform_partition(partition, raw_dir=raw_dir, clean_dir=clean_dir)

    assert record["source_rows"] == 6
    assert record["cleaned_rows"] == 5
    assert record["duplicate_rows_removed"] == 1
    assert record["cancelled_rows"] == 1
    assert record["diverted_rows"] == 1
    assert record["arrival_observations"] == 2
    assert record["invalid_scheduled_duration"] == 1
    assert record["invalid_actual_duration"] == 1

    parquet = clean_dir / "year=2021" / "month=01" / "flights.parquet"
    stats = duckdb.sql(
        """
        SELECT
          count(*) FILTER (WHERE departure_time_band = 'Morning'),
          count(*) FILTER (WHERE departure_time_band = 'Overnight'),
          count(*) FILTER (WHERE is_cancelled AND NOT has_arrival_observation),
          count(*) FILTER (WHERE is_diverted AND NOT has_arrival_observation),
          count(DISTINCT origin) FILTER (WHERE origin_airport_id = 12478),
          count(*) FILTER (
            WHERE flight_number = 103 AND weather_delay_minutes IS NULL
              AND security_delay_minutes IS NULL
              AND late_aircraft_delay_minutes IS NULL
          )
        FROM read_parquet(?)
        """,
        params=[str(parquet)],
    ).fetchone()
    assert stats == (4, 1, 1, 1, 2, 1)
