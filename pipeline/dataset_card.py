from __future__ import annotations

from pathlib import Path

from pipeline.config import MIN_RANKING_OBSERVATIONS


def write_dataset_card(manifest: dict, destination: Path) -> None:
    coverage = manifest["coverage"]
    source = manifest["source"]
    version = manifest["version"]
    card = f"""---
license: us-pd
language:
- en
pretty_name: Arrival Atlas BTS Flight Reliability Aggregates
tags:
- aviation
- transportation
- data-analytics
- parquet
size_categories:
- 1M<n<10M
---

# Arrival Atlas: BTS Flight Reliability Aggregates

Compact, application-ready aggregates of the official US Bureau of Transportation Statistics
Reporting Carrier On-Time Performance data. The dataset supports descriptive comparisons by
domestic route, reporting airline, calendar month, period, and scheduled departure-time band.

## Source and attribution

- **Original source:** [BTS Reporting Carrier On-Time Performance]({source['table_info_url']})
- **Official download interface:** [BTS TranStats]({source['download_url']})
- **Attribution:** US Bureau of Transportation Statistics, Reporting Carrier On-Time Performance
- **License:** U.S. Public Domain. Attribution is retained for provenance and reproducibility.

This is an independently processed dataset and is not an official BTS product.

## Published snapshot

| Property | Value |
| --- | ---: |
| Coverage | {coverage['start']} through {coverage['end']} |
| Latest complete month | {coverage['latest_complete_month']} |
| Generated (UTC) | {manifest['generated_at']} |
| Official source partitions | {source['partition_count']:,} |
| Source rows before deduplication | {source['source_rows']:,} |
| Cleaned flight rows | {source['cleaned_rows']:,} |
| Exact duplicate flight keys removed | {source['duplicates_removed']:,} |
| Aggregate rows | {manifest['aggregate_rows']:,} |
| Parquet files | {manifest['file_count']:,} |
| Aggregate bytes | {manifest['aggregate_bytes']:,} |

The top-level `manifest.json` records table paths, row counts, file sizes, SHA-256 checksums,
airport labels, carrier display labels, route coverage, and the active version. `catalog.json`
contains the same application metadata without the per-file checksum inventory, reducing the
browser's initial transfer while preserving complete lineage in the manifest.

## Tables

All large tables are partitioned by origin airport. The partition paths are listed in the
manifest, so consumers can download only one selected origin.

| Table | Grain |
| --- | --- |
| `route_airline_comparison` | Route × carrier × calendar month × departure band |
| `route_airline_period` | Route × stable carrier × year-month × departure band |
| `route_period` | Route × year-month × departure band, all carriers |
| `route_month_band` | Route × calendar month × departure band, pooled across coverage |
| `airport_period` | Origin airport × year-month × departure band |
| `airport_month_band` | Origin airport × calendar month × departure band, pooled across coverage |
| `airport_routes` | Origin × destination × calendar month × departure band |

Each table includes an exact `All` departure-band row calculated from flight records. It is not
created by averaging or combining subgroup percentiles.

## Metric columns

- `scheduled_flights`, `operated_flights`, `observations`
- `cancelled_flights`, `diverted_flights`, `on_time_arrivals`
- `arrivals_30_plus`, `arrivals_60_plus`
- `median_arrival_delay`, `p75_arrival_delay`, `p90_arrival_delay`
- six mutually exclusive arrival-delay histogram counts
- positive reported carrier, weather, NAS, security, and late-aircraft delay minutes

Rates are intentionally stored as numerator and denominator counts so users can audit and
recalculate them. Arrival delay observations include only non-cancelled, non-diverted flights
with a reported `ArrDelay`. On time follows the BTS definition: `ArrDelay < 15` minutes.

## Processing

1. Discover the latest complete official monthly ZIP.
2. Download only missing or changed files and record URL, ETag, modification date, byte count,
   extraction timestamp, and SHA-256.
3. Validate required source columns; fail on schema drift.
4. Cast required fields, retain DOT carrier and airport identifiers, and deduplicate stable
   flight keys within each month.
5. Flag impossible elapsed durations and reconcile source, duplicate, and cleaned row counts.
6. Use DuckDB to calculate exact cohort counts, continuous quantiles, histograms, and cause sums.
7. Publish Zstandard-compressed Parquet origin partitions in one versioned commit.

## Departure-time bands

- Overnight: 00:00–05:59
- Morning: 06:00–11:59
- Afternoon: 12:00–17:59
- Evening: 18:00–23:59

Times use the scheduled local clock at the origin. Arrival delay is taken directly from BTS;
clock subtraction is not used for flights crossing midnight or time zones.

## Ranking rule

Arrival Atlas assigns a within-cohort airline rank only when an airline has at least
{MIN_RANKING_OBSERVATIONS} observed arrivals. Smaller samples remain available but unranked.

## Example DuckDB query

```sql
SELECT
  carrier_code,
  100.0 * on_time_arrivals / observations AS on_time_rate,
  100.0 * cancelled_flights / scheduled_flights AS cancellation_rate,
  p90_arrival_delay,
  observations
FROM read_parquet('{version}/route_airline_comparison/origin=JFK/*.parquet')
WHERE destination = 'LAX'
  AND calendar_month = 12
  AND departure_time_band = 'Morning'
ORDER BY on_time_rate DESC;
```

## Known limitations

- Historical descriptive performance is not a prediction of a future flight.
- Reporting-carrier records can differ from the marketing airline shown to a traveler.
- Airline names and ownership change; stable DOT ID and historical reporting code are retained.
- Delay-cause minutes exist only where BTS supports and reports them; missing causes are not
  assigned to an “other” category.
- Current-year coverage ends at the latest complete BTS month, not the current date.
- The source does not cover international, non-scheduled, or otherwise unreported flights.
- Airport analytics follow flights departing the selected airport and evaluate downstream
  arrival performance; they are not airport service-level measures.

## Reproducibility

Pipeline source, tests, automated refresh workflow, metric definitions, and the public web
application are maintained at https://github.com/heybadrinath/arrival-atlas.
"""
    destination.write_text(card)
