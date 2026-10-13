"""Copernicus's 1543 compound circular longitude geometry for superior planets.

Jupiter and Saturn use their own source records and uniform sidereal apsidal
rates. Mars retains its existing source-specific evaluator and apsis policies.
The shared construction is C1/C2 V.2-4 and C3 pp.291-301; the original
correction tables use rounded procedures and are not implemented here.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

from . import copernicus_earth as earth_model
from .copernicus_earth import _add, _angle, _finite, _polar, _sub
from .mars import normalize, signed_difference

DATA_DIRECTORY = Path(__file__).resolve().parents[2] / "data"
PLANETS = ("jupiter", "saturn")


@lru_cache(maxsize=2)
def definition(body):
    if body not in PLANETS:
        raise ValueError("unsupported Copernican superior planet")
    record = json.loads((DATA_DIRECTORY / f"{body}-copernicus-1543-v1.json").read_text(encoding="utf-8"))
    earth = json.loads(earth_model.DATA_PATH.read_text(encoding="utf-8"))
    dependency = record["dependencies"][0]
    if (record["schema_version"] != 1 or
            record["model_id"] != f"copernicus-1543-{body}-longitude" or
            dependency["model_id"] != earth["model_id"] or
            dependency["required_schema_version"] != earth["schema_version"] or
            record["frame"]["id"] != earth["frame"]["id"] or
            any(record["epoch"][key] != earth["epoch"][key]
                for key in ("astronomical_julian_date", "calendar", "day_fraction"))):
        raise ValueError("incompatible Copernican Earth dependency")
    return record


def _value(body, parameter):
    return definition(body)["parameters"][parameter]["value"]


def evaluate_from_arguments(body, mean_sun, mean_commutation, apogee, *,
                            solar_mean_apogee, theta, mean_precession):
    """Evaluate independent source arguments, all angles in degrees.

    The Earth's solar geometry is evaluated once with its own historical data.
    Its points are rescaled to the planet's separately normalized R=10000.
    """
    _finite(mean_sun, mean_commutation, apogee, solar_mean_apogee, theta, mean_precession)
    earth = earth_model.evaluate_earth_from_arguments(
        mean_sun, solar_mean_apogee, theta, mean_precession)
    result = _couple(body, earth, mean_commutation, apogee)
    result["apsis_assignment"] = {"status": "explicit source argument; no date law invoked"}
    return result


def _couple(body, earth, mean_commutation, apogee):
    _finite(mean_commutation, apogee)
    alpha = normalize(mean_commutation)
    B = normalize(apogee)
    Ls = earth["mean_sun_longitude"]
    L = normalize(Ls - alpha)  # Mean Sun, never true solar longitude.
    R = _value(body, "principal_radius")
    e1 = _value(body, "eccentric_component")
    small_radius = _value(body, "small_epicycle_radius")
    earth_radius = _value(body, "earth_annual_radius")
    scale = earth_radius / earth["annual_radius"]

    scaled_earth = {
        name: tuple(scale * coordinate for coordinate in earth[name])
        for name in ("true_sun", "eccentric_center", "mean_sun", "earth")
    }
    G = scaled_earth["mean_sun"]
    E = scaled_earth["earth"]
    S = scaled_earth["true_sun"]
    M = _add(G, _polar(e1, B))
    C = _add(M, _polar(R, L))
    # The small epicycle has the opposite twice-anomaly phase (C1 V.4).
    P = _add(C, _polar(-small_radius, 2 * L - B))
    from_earth = _sub(P, E)
    from_mean_sun = _sub(P, G)
    from_true_sun = _sub(P, S)
    mean_sun_longitude = _angle(from_mean_sun)
    longitude = _angle(from_earth)
    centre_equation = signed_difference(mean_sun_longitude, L)

    return {
        "model_id": definition(body)["model_id"],
        "body": body, "frame_id": definition(body)["frame"]["id"],
        "position_kind": "geometric", "origin": "true Sun for absolute points; planetary eccentricity referred to mean Sun",
        "length_unit": f"{body.title()} principal radius = 10000",
        "earth_model": earth, "earth_to_planet_scale": scale,
        "earth_geometry_in_planet_units": scaled_earth,
        "planet_geometry": {
            "mean_sun": G, "true_sun": S, "eccentric_center": M,
            "epicycle_center": C, "planet": P,
            "principal_radius": R, "eccentric_component": e1,
            "small_epicycle_radius": small_radius,
            "planet_from_mean_sun": from_mean_sun,
            "planet_from_true_sun": from_true_sun,
            "mean_sun_to_epicycle_center": math.hypot(*_sub(C, G)),
            "mean_sun_to_planet": math.hypot(*from_mean_sun),
            "true_sun_to_planet": math.hypot(*from_true_sun),
        },
        "earth_to_planet": from_earth,
        "earth_to_planet_distance": math.hypot(*from_earth),
        "mean_commutation": alpha, "mean_planet_longitude": L,
        "planet_apogee": B, "eccentric_anomaly": normalize(L - B),
        "epicycle_offset_direction": normalize(2 * L - B + 180),
        "mean_sun_planet_longitude": mean_sun_longitude,
        "equation_of_center": centre_equation,
        "corrected_commutation": normalize(alpha - centre_equation),
        "annual_parallax_equation": signed_difference(longitude, mean_sun_longitude),
        "geocentric_sidereal_longitude": longitude,
        "geocentric_tropical_longitude": normalize(longitude + earth["true_precession"]),
        "true_precession": earth["true_precession"],
    }


def analytic_longitude(body, mean_sun, mean_commutation, apogee):
    """Independent scalar route; does not call the Cartesian evaluator.

    In a frame rotated to mean planetary direction L, components are
    radial=R+(e1-r')cos(L-B), tangential=-(e1+r')sin(L-B).
    The second triangle couples the planet to Earth's mean-Sun-centred orbit.
    """
    _finite(mean_sun, mean_commutation, apogee)
    L = normalize(mean_sun - mean_commutation)
    k = math.radians(normalize(L - apogee))
    R = _value(body, "principal_radius")
    e1 = _value(body, "eccentric_component")
    small_radius = _value(body, "small_epicycle_radius")
    earth_radius = _value(body, "earth_annual_radius")
    radial = R + (e1 - small_radius) * math.cos(k)
    tangential = -(e1 + small_radius) * math.sin(k)
    centre_equation = math.atan2(tangential, radial)
    planet_distance = math.hypot(radial, tangential)
    corrected_commutation = math.radians(normalize(mean_commutation)) - centre_equation
    annual_correction = math.atan2(
        earth_radius * math.sin(corrected_commutation),
        planet_distance + earth_radius * math.cos(corrected_commutation))
    return normalize(L + math.degrees(centre_equation + annual_correction))


def evaluate(body, days_since_epoch):
    """Continuous local days since 1 January 1 CE, using Egyptian-year rates.

    Jupiter/Saturn possess their own approximate uniform sidereal apsis law;
    continuing it is mathematical extrapolation, not validation at distant dates.
    """
    _finite(days_since_epoch)
    years = days_since_epoch / 365.0
    alpha = _value(body, "mean_commutation_epoch") + years * _value(body, "mean_commutation_annual_motion")
    B = _value(body, "sidereal_apogee_epoch") + years * _value(body, "sidereal_apogee_annual_motion")
    earth = earth_model.evaluate_earth(days_since_epoch)
    result = _couple(body, earth, alpha, B)
    result["days_since_epoch"] = days_since_epoch
    result["apsis_assignment"] = {
        "status": "source-prescribed uniform sidereal motion; mathematical continuation outside historical checks",
        "source": definition(body)["parameters"]["sidereal_apogee_annual_motion"]["source"]}
    return result


def to_common_earth_units(result):
    """Reversible planet-unit to historical Earth R=10000 conversion.

    Accepts Mars's existing result as well as Jupiter/Saturn. All absolute
    points at a shared instant then use one true Sun, mean Sun and Earth.
    This is a normalization, never a modern physical AU conversion.
    """
    body = result.get("body", "mars" if "mars_geometry" in result else None)
    if body == "mars":
        planet = result["mars_geometry"]
        earth = result["earth_geometry_in_mars_units"]
        earth_radius = result["earth_model"]["annual_radius"] * result["earth_to_mars_scale"]
        point = planet["mars"]
    elif body in PLANETS:
        planet = result["planet_geometry"]
        earth = result["earth_geometry_in_planet_units"]
        earth_radius = _value(body, "earth_annual_radius")
        point = planet["planet"]
    else:
        raise ValueError("unsupported Copernican planet result")
    factor = result["earth_model"]["annual_radius"] / earth_radius
    return {
        "body": body, "length_unit": "historical Earth annual radius = 10000",
        "planet_to_common_scale": factor,
        "common_to_planet_scale": 1 / factor,
        "true_sun": tuple(factor * x for x in earth["true_sun"]),
        "mean_sun": tuple(factor * x for x in earth["mean_sun"]),
        "earth": tuple(factor * x for x in earth["earth"]),
        "planet": tuple(factor * x for x in point),
    }
