"""Small, source-transcribed Almagest XI.11 Mars table evaluator.

This is tabular arithmetic, distinct from the exact-circle evaluator in mars.py.
Only intervals bounded by transcribed rows are supported. The minute rounding
at each column follows the displayed precision in P2 HAMA Table 15; Ptolemy
does not specify every intermediate rounding tie rule.
"""

from dataclasses import dataclass
from fractions import Fraction
from functools import lru_cache
import json
from math import floor
from pathlib import Path


TABLE_PATH = Path(__file__).resolve().parents[2] / "data" / "mars-almagest-table-subset.json"


class TableCoverageError(ValueError):
    """The requested argument needs a row outside the transcribed subset."""


def sexagesimal(value):
    """Parse a signed sexagesimal degree or sixtieths string exactly."""
    sign = -1 if value.startswith("-") else 1
    parts = value.lstrip("+-").replace(",", ";").split(";")
    if not 1 <= len(parts) <= 3 or any(not part.isdigit() for part in parts):
        raise ValueError(f"invalid sexagesimal value: {value}")
    if any(int(part) >= 60 for part in parts[1:]):
        raise ValueError(f"invalid sexagesimal digit: {value}")
    return sign * sum((Fraction(int(part), 60 ** i) for i, part in enumerate(parts)), Fraction())


def _round_minute(value):
    return Fraction(floor(value * 60 + Fraction(1, 2)), 60)


@lru_cache(maxsize=1)
def _rows():
    with TABLE_PATH.open(encoding="utf-8") as stream:
        source = json.load(stream)
    return {row["argument"]: {name: sexagesimal(row[name]) for name in ("c3", "c4", "c5", "c6", "c7", "c8")}
            for row in source["rows"]}


def _interpolate(argument, column):
    """Linear interpolation of printed XI.11 entries, with no extrapolation."""
    rows = _rows()
    if argument in rows:
        return rows[argument][column]
    lower = [key for key in rows if key < argument]
    upper = [key for key in rows if key > argument]
    if not lower or not upper:
        raise TableCoverageError(f"no {column} table interval around {float(argument):.6f}°")
    lo, hi = max(lower), min(upper)
    if hi - lo != 3:
        raise TableCoverageError(f"untranscribed {column} rows between {lo}° and {hi}°")
    return rows[lo][column] + (rows[hi][column] - rows[lo][column]) * (argument - lo) / (hi - lo)


@dataclass(frozen=True)
class TabularMarsLongitude:
    mean_centrum: Fraction
    equation_of_center: Fraction
    corrected_anomaly: Fraction
    mean_distance_equation: Fraction
    distance_difference: Fraction
    distance_coefficient_sixtieths: Fraction
    distance_adjustment: Fraction
    epicycle_equation: Fraction
    longitude_before_final_rounding: Fraction
    longitude: Fraction


def evaluate_mars_tabular(mean_longitude, mean_anomaly, apogee_longitude):
    """XI.11-12 correction method for source sexagesimal angular arguments.

    P1 XI.11 p.551 supplies c3-c8; XI.12 pp.554-555 specifies composition.
    Inputs are sexagesimal strings (degrees;minutes,seconds). Operations use
    exact rational arithmetic; displayed column results are rounded to minutes.
    The limited table coverage is intentional and explicit.
    """
    longitude = sexagesimal(mean_longitude) % 360
    anomaly = sexagesimal(mean_anomaly) % 360
    apogee = sexagesimal(apogee_longitude) % 360
    centrum = (longitude - apogee) % 360
    folded_centrum = min(centrum, 360 - centrum)
    center_magnitude = _round_minute(_interpolate(folded_centrum, "c3") +
                                     _interpolate(folded_centrum, "c4"))
    center = center_magnitude if centrum > 180 else -center_magnitude
    corrected_anomaly = (anomaly - center) % 360
    folded_anomaly = min(corrected_anomaly, 360 - corrected_anomaly)
    mean_equation = _round_minute(_interpolate(folded_anomaly, "c6"))
    sixtieths = _interpolate(folded_centrum, "c8")
    difference_column = "c7" if sixtieths >= 0 else "c5"
    distance_difference = _round_minute(_interpolate(folded_anomaly, difference_column))
    distance_adjustment = _round_minute(distance_difference * sixtieths / 60)
    equation_magnitude = mean_equation + distance_adjustment
    epicycle_equation = equation_magnitude if corrected_anomaly < 180 else -equation_magnitude
    unrounded = (longitude + center + epicycle_equation) % 360
    return TabularMarsLongitude(centrum, center, corrected_anomaly, mean_equation,
                               distance_difference, sixtieths, distance_adjustment,
                               epicycle_equation, unrounded, _round_minute(unrounded) % 360)
