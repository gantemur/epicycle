"""Generate numerical Sun fixtures from the checked Python evaluators.

The source transcriptions in sun-source-cases.json remain independent; this
file contains computed values for cross-language agreement only.
"""

import json
from pathlib import Path

from epicycle_atlas.chronology import EPOCH_LOCAL_JDN, civil_to_local_jd
from epicycle_atlas.copernicus_earth import EPOCH_LOCAL_JD
from epicycle_atlas.copernicus_sun import evaluate_sun as evaluate_copernicus_sun
from epicycle_atlas.sun_almagest import (
    evaluate_sun as evaluate_ptolemy_sun,
    evaluate_sun_from_arguments,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "tests/fixtures/sun-cross-language.json"


def ptolemy_days(year, month, day, fraction=0.0):
    return civil_to_local_jd(year, month, day, fraction) - EPOCH_LOCAL_JDN


def copernicus_days(year, month, day, fraction=0.0):
    return civil_to_local_jd(year, month, day, fraction) - EPOCH_LOCAL_JD


argument_cases = [
    (330.75, 65.5), (65.5, 65.5), (155.5, 65.5),
    (245.5, 65.5), (290.95, 65.5), (0, 0), (359.9, 147.2),
]
ptolemy_dates = [
    0,
    844 * 365 + 5 * 30 + 17 + 19.5 / 24,
    ptolemy_days(-746, 2, 25),
    ptolemy_days(0, 1, 1),
    ptolemy_days(1525, 4, 17),
    ptolemy_days(2026, 10, 12),
]
copernicus_dates = [
    0,
    copernicus_days(1512, 1, 1, 6 / 24),
    copernicus_days(1525, 4, 17),
    copernicus_days(2026, 10, 12),
]

fixture = {
    "generator": "scripts/generate_sun_cross_language.py; Python evaluators, not source transcriptions",
    "ptolemy_argument_cases": [
        {"arguments": arguments, "result": evaluate_sun_from_arguments(*arguments)}
        for arguments in argument_cases
    ],
    "ptolemy_date_cases": [
        {"days": days, "result": evaluate_ptolemy_sun(days)}
        for days in ptolemy_dates
    ],
    "copernicus_date_cases": [
        {"days": days, "result": evaluate_copernicus_sun(days)}
        for days in copernicus_dates
    ],
}
OUTPUT.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
print(OUTPUT)
