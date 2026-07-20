from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
CLEAN_DIR = DATA_DIR / "cleaned"
PROCESSED_DIR = DATA_DIR / "processed"
PUBLIC_DATA_DIR = PROJECT_ROOT / "public" / "data"

BTS_BASE_URL = "https://transtats.bts.gov/PREZIP"
BTS_TABLE_SLUG = "On_Time_Reporting_Carrier_On_Time_Performance_1987_present"
BTS_TABLE_INFO_URL = (
    "https://www.transtats.bts.gov/TableInfo.asp?QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ"
)
BTS_DOWNLOAD_URL = (
    "https://www.transtats.bts.gov/DL_SelectFields.aspx?"
    "QO_fu146_anzr=b0-gvzr&gnoyr_VQ=FGJ"
)

DEFAULT_START_YEAR = 2021
MIN_RANKING_OBSERVATIONS = 100


@dataclass(frozen=True, order=True)
class YearMonth:
    year: int
    month: int

    def __post_init__(self) -> None:
        if self.year < 1987:
            raise ValueError("BTS on-time data begins in 1987")
        if not 1 <= self.month <= 12:
            raise ValueError("month must be between 1 and 12")

    @classmethod
    def parse(cls, value: str) -> YearMonth:
        try:
            year_text, month_text = value.split("-", maxsplit=1)
            return cls(int(year_text), int(month_text))
        except (TypeError, ValueError) as error:
            raise ValueError("expected YYYY-MM") from error

    @property
    def key(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"

    @property
    def source_filename(self) -> str:
        return f"{BTS_TABLE_SLUG}_{self.year}_{self.month}.zip"

    @property
    def source_url(self) -> str:
        return f"{BTS_BASE_URL}/{self.source_filename}"

    def previous(self) -> YearMonth:
        if self.month == 1:
            return YearMonth(self.year - 1, 12)
        return YearMonth(self.year, self.month - 1)


def iter_months(start: YearMonth, end: YearMonth) -> list[YearMonth]:
    if start > end:
        raise ValueError("start must be before or equal to end")
    result: list[YearMonth] = []
    current = start
    while current <= end:
        result.append(current)
        if current.month == 12:
            current = YearMonth(current.year + 1, 1)
        else:
            current = YearMonth(current.year, current.month + 1)
    return result
