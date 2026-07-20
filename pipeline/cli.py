from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pipeline.aggregate import build_aggregates
from pipeline.config import DEFAULT_START_YEAR, YearMonth, iter_months
from pipeline.quality import validate_aggregates, validate_cleaned_data
from pipeline.source import (
    discover_latest_complete_month,
    download_partitions,
    verify_downloads,
)
from pipeline.transform import transform_partitions


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="arrival-data",
        description="Download, validate, transform, and aggregate official BTS flight data.",
    )
    parser.add_argument(
        "command",
        choices=["discover", "download", "transform", "aggregate", "validate", "refresh"],
    )
    parser.add_argument("--start", help="first partition as YYYY-MM")
    parser.add_argument("--through", help="last complete partition as YYYY-MM")
    parser.add_argument("--force", action="store_true")
    parser.add_argument(
        "--manifest-output",
        type=Path,
        help="optionally copy the aggregate manifest to this path",
    )
    return parser


def _range(args: argparse.Namespace) -> tuple[list[YearMonth], YearMonth]:
    latest = YearMonth.parse(args.through) if args.through else discover_latest_complete_month()
    start = YearMonth.parse(args.start) if args.start else YearMonth(DEFAULT_START_YEAR, 1)
    return iter_months(start, latest), latest


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    if args.command == "discover":
        print(discover_latest_complete_month().key)
        return 0

    partitions, latest = _range(args)
    if args.command in {"download", "refresh"}:
        manifest = download_partitions(partitions, force=args.force)
        print(f"Raw partitions: {manifest['partition_count']}")
    if args.command in {"transform", "refresh"}:
        manifest = transform_partitions(partitions, force=args.force)
        print(f"Cleaned rows: {manifest['cleaned_rows']:,}")
    if args.command in {"aggregate", "refresh"}:
        manifest = build_aggregates(latest)
        print(f"Aggregate rows: {manifest['aggregate_rows']:,}")
        if args.manifest_output:
            args.manifest_output.write_text(json.dumps(manifest, indent=2) + "\n")

    if args.command in {"validate", "refresh"}:
        errors = [
            *verify_downloads(),
            *validate_cleaned_data(),
            *validate_aggregates(),
        ]
        if errors:
            for error in errors:
                print(f"ERROR: {error}", file=sys.stderr)
            return 1
        print("Data quality checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
