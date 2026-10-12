"""Ptolemy's Almagest Mars longitude geometry, in deferent-radius units.

Angles are tropical ecliptic longitudes in degrees, positive eastward. The
continuous argument is Egyptian days after Nabonassar 1 Thoth 1 local noon.
"""

from functools import lru_cache
from pathlib import Path
import json
import math

from .superior_geometry import evaluate_superior_geometry


DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "mars-almagest-v1.json"


@lru_cache(maxsize=1)
def parameters():
    """Read the versioned source record; return its parameter mapping."""
    with DATA_PATH.open(encoding="utf-8") as stream:
        return json.load(stream)["parameters"]


def _value(name):
    return parameters()[name]["value"]


def normalize(degrees):
    return degrees % 360.0


def signed_difference(a, b):
    """Signed shortest angular difference a − b in [-180, 180)."""
    return (a - b + 180.0) % 360.0 - 180.0


def evaluate_mars_from_arguments(mean_longitude, mean_anomaly, apogee_longitude):
    """Evaluate Cartesian geometry for supplied historical angular arguments.

    This entry point permits direct checks of Almagest worked cases without
    imposing a possibly different time or epoch convention on their arguments.
    """
    return evaluate_superior_geometry(
        _value("deferent_radius"), _value("half_eccentricity"),
        _value("epicycle_radius"), mean_longitude, mean_anomaly,
        apogee_longitude,
    )


def evaluate_mars(days_since_epoch):
    """Evaluate from continuous mean local days since historical epoch."""
    if not math.isfinite(days_since_epoch):
        raise ValueError("days_since_epoch must be finite")
    theta = _value("mean_longitude_epoch") + days_since_epoch * _value("mean_longitude_daily_motion")
    alpha = _value("mean_anomaly_epoch") + days_since_epoch * _value("mean_anomaly_daily_motion")
    apsis = _value("apogee_longitude_epoch") + days_since_epoch * _value("apogee_motion")
    result = evaluate_mars_from_arguments(theta, alpha, apsis)
    result["days_since_epoch"] = days_since_epoch
    return result


def analytic_longitude(mean_longitude, mean_anomaly, apogee_longitude):
    """Independent trigonometric correction calculation for cross-checks.

    This uses correction angles and scalar distances, not Cartesian planet
    coordinates or evaluate_mars_from_arguments.
    """
    R = _value("deferent_radius")
    e = _value("half_eccentricity")
    r = _value("epicycle_radius")
    k = math.radians(mean_longitude - apogee_longitude)
    radial = math.sqrt(R * R - e * e * math.sin(k) ** 2) - e * math.cos(k)
    # Relative to the equant ray, the Earth lies at -2e along the apsidal axis.
    along = radial + 2.0 * e * math.cos(k)
    across = -2.0 * e * math.sin(k)
    center_correction = math.atan2(across, along)
    center_distance = math.hypot(along, across)
    relative_anomaly = math.radians(mean_anomaly) - center_correction
    epicycle_correction = math.atan2(r * math.sin(relative_anomaly),
                                      center_distance + r * math.cos(relative_anomaly))
    return normalize(mean_longitude + math.degrees(center_correction + epicycle_correction))
