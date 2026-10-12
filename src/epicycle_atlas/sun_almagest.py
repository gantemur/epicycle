"""Ptolemy's geocentric solar eccentric, *Almagest* III.2–8.

East-positive longitude is measured in Ptolemy's tropical ecliptic frame.
Distance is in original R=60 radius units. Date arguments are continuous
Alexandria mean local days since Nabonassar 1 Thoth 1 noon; they are not TT.
See docs/sun-almagest.md for the source and table/geometry distinction.
"""

import json
import math
from functools import lru_cache
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "sun-almagest-v1.json"


@lru_cache(maxsize=1)
def parameters():
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))["parameters"]


def _value(name):
    return parameters()[name]["value"]


def _normalize(angle):
    return angle % 360.0


def _signed_difference(first, second):
    """Principal first minus second in [-180°, 180°)."""
    return (first - second + 180.0) % 360.0 - 180.0


def _validated_arguments(mean_longitude, apogee_longitude, radius, eccentricity):
    if not all(math.isfinite(value) for value in
               (mean_longitude, apogee_longitude, radius, eccentricity)):
        raise ValueError("solar arguments must be finite")
    if radius <= 0 or eccentricity < 0 or eccentricity >= radius:
        raise ValueError("require radius > eccentricity >= 0")


def evaluate_sun_from_arguments(mean_longitude, apogee_longitude,
                                radius=None, eccentricity=None):
    """Evaluate original eccentric-circle points from supplied angular arguments.

    P1 III.3–5 pp. 144–165 and III.8 p. 169. L is the uniform direction
    around the eccentric centre, not the observed geocentric solar direction.
    Optional lengths permit independent geometric checks; defaults are sourced.
    """
    if radius is None:
        radius = _value("eccentric_radius")
    if eccentricity is None:
        eccentricity = _value("eccentricity")
    _validated_arguments(mean_longitude, apogee_longitude, radius, eccentricity)

    mean_longitude = _normalize(mean_longitude)
    apogee_longitude = _normalize(apogee_longitude)
    mean_anomaly = _normalize(mean_longitude - apogee_longitude)
    apogee_radians = math.radians(apogee_longitude)
    mean_radians = math.radians(mean_longitude)

    earth = (0.0, 0.0)
    eccentric_center = (eccentricity * math.cos(apogee_radians),
                        eccentricity * math.sin(apogee_radians))
    sun = (eccentric_center[0] + radius * math.cos(mean_radians),
           eccentric_center[1] + radius * math.sin(mean_radians))
    longitude = _normalize(math.degrees(math.atan2(sun[1], sun[0])))

    return {
        "model_id": "ptolemy-almagest-sun-longitude",
        "frame_id": "ptolemy-almagest-tropical",
        "earth": earth,
        "eccentric_center": eccentric_center,
        "sun": sun,
        "eccentric_radius": radius,
        "eccentricity": eccentricity,
        "mean_longitude": mean_longitude,
        "apogee_longitude": apogee_longitude,
        "mean_anomaly": mean_anomaly,
        "longitude": longitude,
        "solar_equation": _signed_difference(longitude, mean_longitude),
        "earth_to_sun": math.hypot(*sun),
    }


def analytic_solar_equation(mean_anomaly, radius=None, eccentricity=None):
    """Independent scalar correction from the Sun-to-centre right triangle.

    P1 III.5 pp. 158–164. In the first anomalistic half-cycle the Sun
    lags its mean direction, so the atan2 correction is negative.
    """
    if radius is None:
        radius = _value("eccentric_radius")
    if eccentricity is None:
        eccentricity = _value("eccentricity")
    _validated_arguments(mean_anomaly, 0.0, radius, eccentricity)
    anomaly_radians = math.radians(_normalize(mean_anomaly))
    across = -eccentricity * math.sin(anomaly_radians)
    along = radius + eccentricity * math.cos(anomaly_radians)
    return math.degrees(math.atan2(across, along))


def evaluate_sun(days_since_epoch):
    """Evaluate from Nabonassar 1 Thoth 1 Alexandria mean local noon.

    The printed six-place daily motion is retained (P1 III.1–2, pp. 140,
    142–143); the more precise quotient of 360° by the tropical year is not
    silently substituted for it.
    """
    if not math.isfinite(days_since_epoch):
        raise ValueError("days_since_epoch must be finite")
    mean_longitude = (_value("mean_longitude_epoch") +
                      days_since_epoch * _value("mean_longitude_daily_motion"))
    result = evaluate_sun_from_arguments(mean_longitude, _value("apogee_longitude"))
    result["days_since_epoch"] = days_since_epoch
    return result
