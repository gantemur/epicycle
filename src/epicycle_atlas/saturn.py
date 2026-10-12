"""Ptolemy's Almagest Saturn longitude in historical radius units and days."""

from functools import lru_cache
from pathlib import Path
import json
import math

from .superior_geometry import evaluate_superior_geometry


DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "saturn-almagest-v1.json"


@lru_cache(maxsize=1)
def parameters():
    """Load the original, versioned Saturn parameter record."""
    with DATA_PATH.open(encoding="utf-8") as stream:
        return json.load(stream)["parameters"]


def _value(name):
    return parameters()[name]["value"]


def evaluate_saturn_from_arguments(mean_longitude, mean_anomaly, apogee_longitude):
    """Evaluate supplied Ptolemaic tropical angular arguments in degrees."""
    result = evaluate_superior_geometry(
        _value("deferent_radius"), _value("half_eccentricity"),
        _value("epicycle_radius"), mean_longitude, mean_anomaly,
        apogee_longitude,
    )
    result.update({
        "half_eccentricity": _value("half_eccentricity"),
        "double_eccentricity": _value("double_eccentricity"),
        "model_id": "almagest-saturn-longitude",
        "frame": "ptolemy-almagest-tropical",
    })
    return result


def evaluate_saturn(days_since_epoch):
    """Evaluate after Alexandria noon, Nabonassar 1 Thoth 1, in mean days."""
    if not math.isfinite(days_since_epoch):
        raise ValueError("days_since_epoch must be finite")
    mean_longitude = (_value("mean_longitude_epoch")
                      + days_since_epoch * _value("mean_longitude_daily_motion"))
    mean_anomaly = (_value("mean_anomaly_epoch")
                    + days_since_epoch * _value("mean_anomaly_daily_motion"))
    apogee = (_value("apogee_longitude_epoch")
              + days_since_epoch * _value("apogee_motion"))
    result = evaluate_saturn_from_arguments(mean_longitude, mean_anomaly, apogee)
    result["days_since_epoch"] = days_since_epoch
    return result
