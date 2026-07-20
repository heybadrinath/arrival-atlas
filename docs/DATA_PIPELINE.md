# Data pipeline

## Requirements

- Python 3.12+
- `uv`
- Sufficient local storage for monthly source ZIPs and cleaned Parquet

```bash
uv sync --frozen --dev
```

## Full refresh

The default start is January 2021 and the end is discovered from official monthly files.

```bash
uv run arrival-data discover
uv run arrival-data refresh
```

For a fixed, reproducible cutoff:

```bash
uv run arrival-data refresh --start 2021-01 --through 2026-05
```

Use `--force` only when an official source partition must be redownloaded despite matching HTTP
metadata. The normal path downloads only missing or changed partitions and transforms only those
whose recorded source checksum changed.

## Layers

```text
data/
├── raw/
│   ├── manifest.json
│   └── ...monthly official ZIPs
├── cleaned/
│   ├── manifest.json
│   └── year=YYYY/month=MM/flights.parquet
└── processed/
    ├── README.md
    ├── catalog.json
    ├── manifest.json
    └── vYYYY-MM/...origin-partitioned Parquet
```

Raw and cleaned layers are ignored by Git. They can be restored by the scheduled workflow cache.
The processed layer is published atomically to the public dataset repository.

## Source schema contract

`pipeline/transform.py` declares every required source column. A missing column stops the refresh
with the affected month and missing names. The pipeline does not use permissive null-padding or
ignore malformed CSV rows.

The cleaned schema normalizes names and types while retaining:

- scheduled period and flight date
- stable carrier and airport identifiers
- historical reporting and airport codes
- scheduled and actual local clock fields
- BTS departure and arrival delays
- cancellation, diversion, and cause fields
- elapsed duration and distance
- duplicate count and invalid-duration flags

## Deduplication and reconciliation

Within a monthly partition, the stable flight key is:

```text
flight date + DOT carrier ID + reporting flight number + origin airport ID
+ destination airport ID + scheduled departure time
```

The cleaned record stores the number of source copies. For every partition:

```text
source rows = cleaned rows + duplicate rows removed
```

The refresh fails if a stable identity is missing or the counts do not reconcile.

## Invalid durations

Non-null scheduled or actual elapsed durations at or below zero or over 1,440 minutes are flagged.
Arrival-delay metrics still use the source `ArrDelay` when otherwise eligible; the application
does not recompute it from those duration fields.

## Validation

```bash
uv run ruff check pipeline tests scripts/publish_dataset.py
uv run pytest
uv run arrival-data validate --through 2026-05
```

Validation checks source checksums, partition counts, stable identities, allowed month/time values,
cancelled/diverted exclusions, aggregate file existence, and manifest byte reconciliation.

## Publication

The publisher needs SSH write access to the dedicated public dataset repository:

```bash
DATASET_REPO=heybadrinath/arrival-atlas-data \
  uv run python scripts/publish_dataset.py
```

The publisher replaces the active version directory in one Git commit, pushes it atomically, and
downloads the public raw manifest to verify the version before returning success. Consumers use
the HTTPS, CORS-enabled `raw.githubusercontent.com` URLs recorded by the manifest.
