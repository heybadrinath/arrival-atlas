from __future__ import annotations

import hashlib
import json
import os
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path

import httpx

from pipeline.config import RAW_DIR, YearMonth


def _utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def _load_manifest(path: Path) -> dict:
    if not path.exists():
        return {"schema_version": 1, "partitions": {}}
    return json.loads(path.read_text())


def _write_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    os.replace(temporary, path)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def discover_latest_complete_month(
    *,
    client: httpx.Client | None = None,
    lookback_months: int = 18,
    reference_time: datetime | None = None,
) -> YearMonth:
    """Find the newest BTS ZIP, starting with the previous calendar month."""
    owns_client = client is None
    client = client or httpx.Client(follow_redirects=True, timeout=30)
    today = reference_time or datetime.now(UTC)
    candidate = YearMonth(today.year, today.month).previous()
    try:
        for _ in range(lookback_months):
            response = client.head(candidate.source_url)
            content_length = int(response.headers.get("content-length", "0"))
            if response.status_code == 200 and content_length > 1_000_000:
                return candidate
            candidate = candidate.previous()
    finally:
        if owns_client:
            client.close()
    raise RuntimeError("Could not find a complete BTS monthly partition")


def download_partitions(
    partitions: Iterable[YearMonth],
    *,
    raw_dir: Path = RAW_DIR,
    force: bool = False,
    workers: int = 8,
) -> dict:
    """Download only missing or changed monthly partitions and record lineage."""
    raw_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = raw_dir / "manifest.json"
    manifest = _load_manifest(manifest_path)
    manifest["source"] = "BTS Reporting Carrier On-Time Performance"
    manifest["updated_at"] = _utc_now()

    def download_one(partition: YearMonth) -> tuple[str, dict | None]:
        destination = raw_dir / partition.source_filename
        prior = manifest["partitions"].get(partition.key, {})
        with httpx.Client(follow_redirects=True, timeout=120) as client:
            head = client.head(partition.source_url)
            head.raise_for_status()
            remote = {
                "etag": head.headers.get("etag"),
                "last_modified": head.headers.get("last-modified"),
                "bytes": int(head.headers.get("content-length", "0")),
            }
            unchanged = (
                destination.exists()
                and prior.get("etag") == remote["etag"]
                and prior.get("bytes") == remote["bytes"]
            )
            if unchanged and not force:
                return partition.key, None

            temporary = destination.with_suffix(".zip.part")
            temporary.unlink(missing_ok=True)
            digest = hashlib.sha256()
            downloaded_bytes = 0
            with client.stream("GET", partition.source_url) as response:
                response.raise_for_status()
                with temporary.open("wb") as output:
                    for chunk in response.iter_bytes(chunk_size=1024 * 1024):
                        output.write(chunk)
                        digest.update(chunk)
                        downloaded_bytes += len(chunk)
            if remote["bytes"] and downloaded_bytes != remote["bytes"]:
                temporary.unlink(missing_ok=True)
                raise RuntimeError(
                    f"Partial download for {partition.key}: "
                    f"expected {remote['bytes']} bytes, received {downloaded_bytes}"
                )
            os.replace(temporary, destination)
            return partition.key, {
                "source_url": partition.source_url,
                "downloaded_at": _utc_now(),
                "sha256": digest.hexdigest(),
                **remote,
            }

    partition_list = list(partitions)
    with ThreadPoolExecutor(max_workers=max(1, min(workers, 8))) as executor:
        futures = {
            executor.submit(download_one, partition): partition
            for partition in partition_list
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            key, record = future.result()
            if record is not None:
                manifest["partitions"][key] = record
                _write_manifest(manifest_path, manifest)
            print(f"[{completed}/{len(partition_list)}] {key}", flush=True)

    manifest["partition_count"] = len(manifest["partitions"])
    manifest["total_bytes"] = sum(
        partition.get("bytes", 0) for partition in manifest["partitions"].values()
    )
    _write_manifest(manifest_path, manifest)
    return manifest


def verify_downloads(raw_dir: Path = RAW_DIR) -> list[str]:
    manifest = _load_manifest(raw_dir / "manifest.json")
    errors: list[str] = []
    for key, record in manifest.get("partitions", {}).items():
        path = raw_dir / Path(record["source_url"]).name
        if not path.exists():
            errors.append(f"{key}: file is missing")
        elif path.stat().st_size != record["bytes"]:
            errors.append(f"{key}: byte count changed")
        elif _sha256(path) != record["sha256"]:
            errors.append(f"{key}: checksum changed")
    return errors
