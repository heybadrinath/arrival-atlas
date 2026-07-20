from __future__ import annotations

from datetime import UTC, datetime

import pytest

from pipeline.config import YearMonth, iter_months
from pipeline.source import discover_latest_complete_month


def test_year_month_parsing_and_source_url() -> None:
    partition = YearMonth.parse("2026-05")
    assert partition.key == "2026-05"
    assert partition.source_filename.endswith("_2026_5.zip")
    assert partition.source_url.startswith("https://transtats.bts.gov/PREZIP/")


def test_iter_months_crosses_year_boundary() -> None:
    assert [item.key for item in iter_months(YearMonth(2025, 11), YearMonth(2026, 2))] == [
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
    ]


def test_discovery_never_selects_the_current_partial_month() -> None:
    class Response:
        def __init__(self, exists: bool) -> None:
            self.status_code = 200 if exists else 404
            self.headers = {"content-length": "2000000" if exists else "0"}

    class Client:
        def head(self, url: str) -> Response:
            return Response(url.endswith("_2026_7.zip"))

    latest = discover_latest_complete_month(
        client=Client(),  # type: ignore[arg-type]
        reference_time=datetime(2026, 8, 20, tzinfo=UTC),
    )
    assert latest == YearMonth(2026, 7)


@pytest.mark.parametrize("value", ["2026", "2026-00", "2026-13", "not-a-month"])
def test_invalid_year_month(value: str) -> None:
    with pytest.raises(ValueError):
        YearMonth.parse(value)
