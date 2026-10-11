"""Ptolemy's Almagest Mars longitude geometry, in deferent-radius units.

Angles are tropical ecliptic longitudes in degrees, positive eastward. The
continuous argument is Egyptian days after Nabonassar 1 Thoth 1 local noon.
"""

from functools import lru_cache
from pathlib import Path
import json
import math


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


def _polar(length, degrees):
    angle = math.radians(degrees)
    return (length * math.cos(angle), length * math.sin(angle))


def _angle(point):
    return normalize(math.degrees(math.atan2(point[1], point[0])))


def evaluate_mars_from_arguments(mean_longitude, mean_anomaly, apogee_longitude):
    """Evaluate Cartesian geometry for supplied historical angular arguments.

    This entry point permits direct checks of Almagest worked cases without
    imposing a possibly different time or epoch convention on their arguments.
    """
    R = _value("deferent_radius")
    e = _value("half_eccentricity")
    r = _value("epicycle_radius")
    theta = normalize(mean_longitude)
    alpha = normalize(mean_anomaly)
    apsis = normalize(apogee_longitude)
    kappa = normalize(theta - apsis)

    earth = (0.0, 0.0)
    deferent_center = _polar(e, apsis)
    equant = _polar(2.0 * e, apsis)
    kappa_rad = math.radians(kappa)
    ray_length = -e * math.cos(kappa_rad) + math.sqrt(R * R - e * e * math.sin(kappa_rad) ** 2)
    ray = _polar(ray_length, theta)
    epicycle_center = (equant[0] + ray[0], equant[1] + ray[1])
    epicycle_offset = _polar(r, theta + alpha)
    planet = (epicycle_center[0] + epicycle_offset[0], epicycle_center[1] + epicycle_offset[1])
    center_longitude = _angle(epicycle_center)
    longitude = _angle(planet)

    return {
        "earth": earth,
        "deferent_center": deferent_center,
        "equant": equant,
        "deferent_radius": R,
        "epicycle_radius": r,
        "epicycle_center": epicycle_center,
        "planet": planet,
        "mean_longitude": theta,
        "mean_anomaly": alpha,
        "apogee_longitude": apsis,
        "mean_centrum": kappa,
        "epicycle_center_longitude": center_longitude,
        "equation_of_center": signed_difference(center_longitude, theta),
        "epicycle_equation": signed_difference(longitude, center_longitude),
        "longitude": longitude,
        "equant_to_epicycle_center": ray_length,
        "earth_to_epicycle_center": math.hypot(*epicycle_center),
        "earth_to_planet": math.hypot(*planet),
    }


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
