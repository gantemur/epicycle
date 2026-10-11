"""Save independent Python outputs for the TypeScript Phase 3C port."""

import json
from pathlib import Path

from epicycle_atlas.chronology import civil_to_local_jd
from epicycle_atlas.copernicus_earth import EPOCH_LOCAL_JD, evaluate_earth, evaluate_earth_from_arguments
from epicycle_atlas.copernicus_mars import (
    APSIS_POLICY, EXPLORATORY_APSIS_POLICY, evaluate_mars, evaluate_mars_from_arguments,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "tests/fixtures/copernicus-cross-language.json"


def days(y, m, d, hour=0, minute=0):
    return civil_to_local_jd(y, m, d, (hour + minute / 60) / 24) - EPOCH_LOCAL_JD


earth_args = [
    [262, 61 + 17 / 60, 165 + 39 / 60, 26],
    [0, 0, 0, 0],
    [359.9, 120.4, 270.1, 31.5],
]
mars_args = [
    [262, 98 + 28 / 60, 119 + 40 / 60, 61 + 17 / 60, 165 + 39 / 60, 26],
    [0, 0, 0, 0, 0, 0],
    [339.8, 14.2, 178.9, 110.3, 270.1, 31.5],
]
earth_dates = [days(1473, 2, 19, 16, 48), days(1512, 1, 1, 6), days(1523, 2, 22, 5), days(1525, 4, 17)]
mars_dates = earth_dates[:3]
exploratory_dates = [days(1473, 2, 19), days(1523, 2, 22, 5), days(2026, 10, 11)]

fixture = {
    "generator": "scripts/generate_copernicus_cross_language.py; Python Phase 3B evaluators; regenerated, not source transcriptions",
    "earth_argument_cases": [{"arguments": a, "result": evaluate_earth_from_arguments(*a)} for a in earth_args],
    "earth_date_cases": [{"days": d, "result": evaluate_earth(d)} for d in earth_dates],
    "mars_argument_cases": [{"arguments": a, "result": evaluate_mars_from_arguments(a[0], a[1], a[2],
                            solar_mean_apogee=a[3], theta=a[4], mean_precession=a[5])} for a in mars_args],
    "mars_date_cases": [{"days": d, "result": evaluate_mars(d, apsis_policy=APSIS_POLICY)} for d in mars_dates],
    "mars_exploratory_cases": [
        {"days": d, "result": evaluate_mars(d, apsis_policy=EXPLORATORY_APSIS_POLICY)}
        for d in exploratory_dates
    ],
}
OUT.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
print(OUT)
