"""Generate Jupiter/Saturn numerical fixtures from the Python evaluators.

These are computed outputs for cross-language agreement, never replacements
for the independently transcribed P1 source-case files.
"""

import json
from pathlib import Path

from epicycle_atlas.chronology import EPOCH_LOCAL_JDN, civil_to_local_jd, egyptian_to_days
from epicycle_atlas.jupiter import evaluate_jupiter, evaluate_jupiter_from_arguments
from epicycle_atlas.jupiter import parameters as jupiter_parameters
from epicycle_atlas.saturn import evaluate_saturn, evaluate_saturn_from_arguments
from epicycle_atlas.saturn import parameters as saturn_parameters


ROOT = Path(__file__).resolve().parents[1]


def historical_days(year, month, day, fraction=0.0):
    """Formal Alexandria local Julian date to Nabonassar Egyptian day count."""
    return civil_to_local_jd(year, month, day, fraction) - EPOCH_LOCAL_JDN


def write_fixture(body, evaluate_days, evaluate_arguments, epoch_apogee):
    arguments = [
        (0, 0, 0),
        (359.9, 359.9, 147.2),
        (epoch_apogee, 0, epoch_apogee),
        (epoch_apogee + 90, 90, epoch_apogee),
        (epoch_apogee + 96, 180, epoch_apogee),
        (epoch_apogee + 180, 270, epoch_apogee),
        (epoch_apogee + 270, 359, epoch_apogee),
        (epoch_apogee - 0.01, 179.99, epoch_apogee),
        (366.01, 45.2, -5.0),
    ]
    if body == "jupiter":
        arguments.append((157 + 13 / 60 + 285 + 41 / 60,
                          77 + 2 / 60, 157 + 13 / 60))
    else:
        arguments.append((229 + 20 / 60 + 283 + 33 / 60,
                          183 + 17 / 60, 229 + 20 / 60))

    dates = [
        0, -0.5, 0.5, 365, 36500,
        egyptian_to_days(450, 10, 8),
        historical_days(-240, 9, 4),
        historical_days(-228, 3, 1),
        historical_days(1512, 1, 1, 0.25),
        historical_days(2026, 10, 12),
    ]
    fixture = {
        "generator": "scripts/generate_outer_cross_language.py; Python geometry, not original table transcription",
        "body": body,
        "argument_cases": [
            {"arguments": case, "result": evaluate_arguments(*case)}
            for case in arguments
        ],
        "date_cases": [
            {"days": days, "result": evaluate_days(days)}
            for days in dates
        ],
    }
    output = ROOT / "tests" / "fixtures" / f"{body}-cross-language.json"
    output.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    print(output)


write_fixture("jupiter", evaluate_jupiter, evaluate_jupiter_from_arguments,
              jupiter_parameters()["apogee_longitude_epoch"]["value"])
write_fixture("saturn", evaluate_saturn, evaluate_saturn_from_arguments,
              saturn_parameters()["apogee_longitude_epoch"]["value"])
