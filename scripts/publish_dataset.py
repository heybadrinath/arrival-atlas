from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

from pipeline.config import PROCESSED_DIR


def _run(*args: str, cwd: Path | None = None) -> None:
    subprocess.run(args, cwd=cwd, check=True)


def _verify_remote(repo: str, expected_version: str) -> None:
    manifest_url = f"https://raw.githubusercontent.com/{repo}/main/manifest.json"
    deadline = time.monotonic() + 90
    last_error = "manifest was not available"
    while time.monotonic() < deadline:
        try:
            response = httpx.get(
                manifest_url,
                params={"version": expected_version, "t": int(time.time())},
                headers={"Cache-Control": "no-cache"},
                follow_redirects=True,
                timeout=20,
            )
            response.raise_for_status()
            published = response.json()
            if published.get("version") == expected_version:
                return
            last_error = (
                f"published version {published.get('version')} did not match "
                f"{expected_version}"
            )
        except (httpx.HTTPError, json.JSONDecodeError) as error:
            last_error = str(error)
        time.sleep(2)
    raise RuntimeError(f"Could not verify published dataset: {last_error}")


def _prepare_checkout(checkout: Path, manifest: dict) -> None:
    version = manifest["version"]
    for old_version in checkout.glob("v*"):
        if old_version.is_dir():
            shutil.rmtree(old_version)

    shutil.copy2(PROCESSED_DIR / "README.md", checkout / "README.md")
    shutil.copy2(PROCESSED_DIR / "manifest.json", checkout / "manifest.json")
    shutil.copy2(PROCESSED_DIR / "catalog.json", checkout / "catalog.json")
    shutil.copytree(PROCESSED_DIR / version, checkout / version)
    (checkout / ".nojekyll").unlink(missing_ok=True)
    (checkout / "LICENSE").write_text(
        "Arrival Atlas BTS Flight Reliability Aggregates\n\n"
        "The underlying source records are works of the United States government and are "
        "treated as U.S. Public Domain data. Source attribution and transformation provenance "
        "are retained in README.md and manifest.json. This independently processed dataset is "
        "not an official Bureau of Transportation Statistics product.\n"
    )


def main() -> int:
    manifest_path = PROCESSED_DIR / "manifest.json"
    card_path = PROCESSED_DIR / "README.md"
    if not manifest_path.exists() or not card_path.exists():
        print("Build aggregates before publishing the dataset", file=sys.stderr)
        return 1

    manifest = json.loads(manifest_path.read_text())
    repo = os.environ.get("DATASET_REPO", "heybadrinath/arrival-atlas-data")
    repo_url = os.environ.get("DATASET_REPO_URL", f"git@github.com:{repo}.git")

    with tempfile.TemporaryDirectory(prefix="arrival-atlas-dataset-") as folder:
        checkout = Path(folder) / "repo"
        _run("git", "clone", repo_url, str(checkout))
        _prepare_checkout(checkout, manifest)
        _run("git", "config", "user.name", "arrival-atlas-data", cwd=checkout)
        _run(
            "git",
            "config",
            "user.email",
            "arrival-atlas-data@users.noreply.github.com",
            cwd=checkout,
        )
        _run("git", "add", "--all", cwd=checkout)
        unchanged = subprocess.run(
            ["git", "diff", "--cached", "--quiet"], cwd=checkout, check=False
        ).returncode == 0
        if unchanged:
            print(f"Dataset {manifest['version']} is already current")
        else:
            _run(
                "git",
                "commit",
                "-m",
                f"data: publish {manifest['version']}",
                cwd=checkout,
            )
            _run("git", "push", "origin", "HEAD:main", cwd=checkout)

    _verify_remote(repo, manifest["version"])
    print(
        f"Published and verified {manifest['version']}: "
        f"https://github.com/{repo}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
