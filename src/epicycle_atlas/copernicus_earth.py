"""1543 annual circular geometry. See docs/copernicus-earth-mars.md.

Coordinates have the true Sun at the origin, and the first star of Aries
on +x. G, the moving annual-circle centre, is Copernicus's mean Sun.
This is continuous geometry, not interpolation of his correction tables.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

from .chronology import civil_to_local_jd, ut1_to_local_mean
from .mars import normalize, signed_difference

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "earth-copernicus-1543-v1.json"
EPOCH_LOCAL_JD = civil_to_local_jd(1, 1, 1)


@lru_cache(maxsize=1)
def parameters():
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))["parameters"]


def _value(name):
    return parameters()[name]["value"]


def _finite(*values):
    if not all(math.isfinite(x) for x in values):
        raise ValueError("arguments must be finite")


def _polar(radius, angle):
    a = math.radians(normalize(angle))
    return radius * math.cos(a), radius * math.sin(a)


def _add(a, b):
    return a[0] + b[0], a[1] + b[1]


def _sub(a, b):
    return a[0] - b[0], a[1] - b[1]


def _angle(vector):
    return normalize(math.degrees(math.atan2(vector[1], vector[0])))


def precession(mean_precession, theta):
    """Historical plane libration: π = πbar − (1;10°) sin(2θ)."""
    _finite(mean_precession, theta)
    correction = -_value("precession_equation_amplitude") * math.sin(math.radians(2 * normalize(theta)))
    return {"mean_precession": normalize(mean_precession),
            "precession_equation": correction,
            "true_precession": normalize(mean_precession + correction)}


def evaluate_earth_from_arguments(mean_sun, mean_apogee, theta, mean_precession):
    """Angles in degrees; solar apogee convention, NOT Earth's aphelion.

    F = −e1 u(A), G = F − e2 u(A−θ), E = G − R u(Lsun).
    π is the positive sidereal-to-tropical longitude addition.
    """
    _finite(mean_sun, mean_apogee, theta, mean_precession)
    L, A, theta = map(normalize, (mean_sun, mean_apogee, theta))
    R, e1, e2 = (_value(k) for k in ("annual_radius", "eccentric_component", "small_eccentric_radius"))
    F = _polar(-e1, A)
    G = _add(F, _polar(-e2, A - theta))
    E = _add(G, _polar(-R, L))
    sun_vector = _sub((0.0, 0.0), E)
    true_apogee = _angle(_sub((0.0, 0.0), G))
    solar_longitude = _angle(sun_vector)
    result = {
        "model_id": "copernicus-1543-earth-longitude",
        "frame_id": "copernicus-1543-sidereal", "origin": "true Sun",
        "true_sun": (0.0, 0.0), "eccentric_center": F, "mean_sun": G,
        "earth": E, "earth_from_mean_sun": _sub(E, G), "earth_to_sun": sun_vector,
        "annual_radius": R, "eccentric_component": e1, "small_eccentric_radius": e2,
        "eccentricity": math.hypot(*G), "mean_sun_longitude": L,
        "earth_annual_direction": normalize(L + 180),
        "mean_solar_apogee": A, "true_solar_apogee": true_apogee,
        "apsidal_equation": signed_difference(true_apogee, A),
        "theta": theta, "mean_solar_anomaly": normalize(L - A),
        "true_solar_anomaly": normalize(L - true_apogee),
        "solar_equation": signed_difference(solar_longitude, L),
        "solar_sidereal_longitude": solar_longitude,
    }
    result.update(precession(mean_precession, theta))
    result["solar_tropical_longitude"] = normalize(solar_longitude + result["true_precession"])
    return result


def analytic_solar_longitude(mean_sun, mean_apogee, theta):
    """Independent scalar eccentricity / correction calculation."""
    _finite(mean_sun, mean_apogee, theta)
    e1, e2, R = (_value(k) for k in ("eccentric_component", "small_eccentric_radius", "annual_radius"))
    t = math.radians(normalize(theta))
    e = math.sqrt(e1**2 + e2**2 + 2 * e1 * e2 * math.cos(t))
    delta = math.atan2(e2 * math.sin(t), e1 + e2 * math.cos(t))
    alpha = math.radians(normalize(mean_sun - mean_apogee)) + delta
    correction = -math.atan2(e * math.sin(alpha), R + e * math.cos(alpha))
    return normalize(mean_sun + math.degrees(correction))


def evaluate_earth(days_since_epoch):
    """Continuous historical mean local days after 1 January 1 midnight."""
    _finite(days_since_epoch)
    years = days_since_epoch / 365.0
    def motion(epoch, rate):
        return normalize(_value(epoch) + years * _value(rate))
    result = evaluate_earth_from_arguments(
        motion("mean_sun_epoch", "mean_sun_annual_motion"),
        motion("mean_apogee_epoch", "mean_apogee_annual_motion"),
        motion("theta_epoch", "theta_annual_motion"),
        motion("mean_precession_epoch", "mean_precession_annual_motion"))
    result["days_since_epoch"] = days_since_epoch
    return result


def copernicus_days_at_ut1(instant_ut1, meridian_east_degrees):
    """Explicit modern boundary; caller declares the historical meridian."""
    return ut1_to_local_mean(instant_ut1, meridian_east_degrees).value - EPOCH_LOCAL_JD
