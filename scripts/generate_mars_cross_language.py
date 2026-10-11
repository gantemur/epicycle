"""Regenerate the shared Python/TypeScript Mars geometry fixtures."""

import json
from pathlib import Path

from epicycle_atlas.chronology import egyptian_to_days
from epicycle_atlas.mars import evaluate_mars, evaluate_mars_from_arguments


ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / "tests/fixtures/mars-source-cases.json").read_text())


def sexagesimal(text):
    sign = -1 if text.startswith("-") else 1
    digits = text.removeprefix("-").replace(";", ",").split(",")
    return sign * sum(int(digit) / 60 ** place for place, digit in enumerate(digits))


def projection(result):
    keys = (
        "earth", "deferent_center", "equant", "epicycle_center", "planet",
        "deferent_radius", "epicycle_radius", "mean_longitude", "mean_anomaly",
        "apogee_longitude", "mean_centrum", "epicycle_center_longitude",
        "equation_of_center", "epicycle_equation", "longitude",
        "equant_to_epicycle_center", "earth_to_epicycle_center", "earth_to_planet",
    )
    return {key: result[key] for key in keys}


historical = []
for case in SOURCE["historical_cases"]:
    L = sexagesimal(case["input"]["mean_centrum"])
    alpha = sexagesimal(case["input"].get("mean_anomaly", "0"))
    historical.append({"id": case["id"], "arguments": [L, alpha, 0],
                       "result": projection(evaluate_mars_from_arguments(L, alpha, 0))})

example = SOURCE["scholarly_table_case"]
names = ("mean_longitude", "mean_anomaly", "apogee_longitude")
arguments = [sexagesimal(example["input"][name]) for name in names]
historical.append({"id": example["id"], "arguments": arguments,
                   "result": projection(evaluate_mars_from_arguments(*arguments))})

synthetic = [
    (0, 0, 0), (90, 180, 105), (359.7, 122.25, 111.17),
    (230.5, 280.75, 300), (-41.55, 171.41666666666666, -60),
]
for index, args in enumerate(synthetic):
    historical.append({"id": f"synthetic-{index}", "arguments": args,
                       "result": projection(evaluate_mars_from_arguments(*args))})

date = example["nabonassar_date"]
days = [0, 0.5, 364.5, 365, 160000.25, egyptian_to_days(**date), 175000.75]
time_cases = [{"days": day, "result": projection(evaluate_mars(day))} for day in days]

fixture = {"schema_version": 1,
           "generated_by": "scripts/generate_mars_cross_language.py using Python Phase 1 evaluator",
           "argument_cases": historical, "time_cases": time_cases}
(ROOT / "tests/fixtures/mars-cross-language.json").write_text(
    json.dumps(fixture, indent=2, ensure_ascii=False) + "\n")
