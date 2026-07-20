from __future__ import annotations

import csv
import hashlib
import io
import json
import zipfile
from pathlib import Path

import pytest

from pipeline.config import YearMonth
from pipeline.transform import REQUIRED_SOURCE_COLUMNS


@pytest.fixture
def synthetic_raw(tmp_path: Path) -> tuple[YearMonth, Path]:
    partition = YearMonth(2021, 1)
    raw_dir = tmp_path / "raw"
    raw_dir.mkdir()
    defaults = {column: "" for column in sorted(REQUIRED_SOURCE_COLUMNS)}
    defaults.update(
        {
            "Year": "2021",
            "Month": "1",
            "FlightDate": "2021-01-15",
            "Reporting_Airline": "AA",
            "DOT_ID_Reporting_Airline": "19805",
            "Flight_Number_Reporting_Airline": "100",
            "OriginAirportID": "12478",
            "OriginAirportSeqID": "1247805",
            "Origin": "JFK",
            "OriginCityName": "New York, NY",
            "OriginState": "NY",
            "DestAirportID": "12892",
            "DestAirportSeqID": "1289208",
            "Dest": "LAX",
            "DestCityName": "Los Angeles, CA",
            "DestState": "CA",
            "CRSDepTime": "800",
            "DepTime": "805",
            "DepDelay": "5",
            "CRSArrTime": "1115",
            "ArrTime": "1125",
            "ArrDelay": "10",
            "Cancelled": "0",
            "Diverted": "0",
            "CRSElapsedTime": "375",
            "ActualElapsedTime": "380",
            "Distance": "2475",
        }
    )
    on_time = defaults.copy()
    duplicate = defaults.copy()
    cancelled = defaults | {
        "Flight_Number_Reporting_Airline": "101",
        "ArrTime": "",
        "ArrDelay": "",
        "Cancelled": "1",
        "CancellationCode": "B",
        "ActualElapsedTime": "",
    }
    diverted = defaults | {
        "Flight_Number_Reporting_Airline": "102",
        "ArrTime": "",
        "ArrDelay": "",
        "Diverted": "1",
    }
    delayed = defaults | {
        "Flight_Number_Reporting_Airline": "103",
        "ArrTime": "1245",
        "ArrDelay": "90",
        "CarrierDelay": "60",
        "NASDelay": "30",
    }
    historical_code = defaults | {
        "Flight_Number_Reporting_Airline": "104",
        "Origin": "NYC",
        "CRSDepTime": "2400",
        "ArrTime": "",
        "ArrDelay": "",
        "CRSElapsedTime": "0",
        "ActualElapsedTime": "1500",
    }
    buffer = io.StringIO(newline="")
    writer = csv.DictWriter(buffer, fieldnames=sorted(REQUIRED_SOURCE_COLUMNS))
    writer.writeheader()
    writer.writerows([on_time, duplicate, cancelled, diverted, delayed, historical_code])

    archive_path = raw_dir / partition.source_filename
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("sample.csv", buffer.getvalue())
    checksum = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    (raw_dir / "manifest.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "partitions": {
                    partition.key: {
                        "source_url": partition.source_url,
                        "sha256": checksum,
                        "bytes": archive_path.stat().st_size,
                    }
                },
            }
        )
    )
    return partition, raw_dir
