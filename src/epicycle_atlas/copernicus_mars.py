"""1543 Mars geometry coupled to the specified 1543 Earth model.

The historical arbitrary-date apsidal law is unavailable. Date evaluation
requires a caller-supplied apsis with provenance, the explicit bounded
Swerdlow–Neugebauer estimate, or its separately selected exploratory
continuation. No default apsidal motion is invented.
"""

import json
import math
from functools import lru_cache
from pathlib import Path

from .chronology import civil_to_local_jd
from . import copernicus_earth as earth_model
from .copernicus_earth import _polar, _add, _sub, _angle, _finite
from .mars import normalize, signed_difference

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "mars-copernicus-1543-v1.json"
APSIS_POLICY = "sn-local-uniform-1473-1523"
EXPLORATORY_APSIS_POLICY = "sn-uniform-exploratory"


@lru_cache(maxsize=1)
def definition():
    record = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    dependency = record["dependencies"][0]
    earth = json.loads(earth_model.DATA_PATH.read_text(encoding="utf-8"))
    if (dependency["model_id"] != earth["model_id"] or
            dependency["required_schema_version"] != earth["schema_version"] or
            record["frame"]["id"] != earth["frame"]["id"] or
            any(record["epoch"][k] != earth["epoch"][k]
                for k in ("astronomical_julian_date", "calendar", "day_fraction"))):
        raise ValueError("incompatible Copernican Earth dependency")
    return record


def _value(name):
    return definition()["parameters"][name]["value"]


def _local_days(date):
    year, month, day, hour, minute = date
    return civil_to_local_jd(year, month, day, (hour + minute / 60) / 24) - earth_model.EPOCH_LOCAL_JD


def _couple(earth, mean_commutation, apogee):
    _finite(mean_commutation, apogee)
    alpha, A = normalize(mean_commutation), normalize(apogee)
    L = normalize(earth["mean_sun_longitude"] - alpha)
    R, e1, rprime, r = (_value(k) for k in
        ("principal_radius", "eccentric_component", "small_epicycle_radius", "earth_annual_radius"))
    scale = r / earth["annual_radius"]
    scaled = {key: tuple(scale * v for v in earth[key]) for key in
              ("true_sun", "eccentric_center", "mean_sun", "earth")}
    G, E = scaled["mean_sun"], scaled["earth"]
    M = _add(G, _polar(e1, A))
    C = _add(M, _polar(R, L))
    P = _add(C, _polar(-rprime, 2 * L - A))
    relative = _sub(P, E)
    from_mean_sun = _sub(P, G)
    heliocentric = _angle(from_mean_sun)
    longitude = _angle(relative)
    eta = signed_difference(heliocentric, L)
    return {
        "model_id": "copernicus-1543-mars-longitude",
        "frame_id": "copernicus-1543-sidereal", "position_kind": "geometric",
        "origin": "true Sun for absolute points; Mars eccentricity referred to mean Sun",
        "length_unit": "Mars principal radius = 10000",
        "earth_model": earth, "earth_to_mars_scale": scale,
        "earth_geometry_in_mars_units": scaled,
        "mars_geometry": {
            "mean_sun": G, "eccentric_center": M, "epicycle_center": C, "mars": P,
            "principal_radius": R, "eccentric_component": e1, "small_epicycle_radius": rprime,
            "mars_from_mean_sun": from_mean_sun,
            "mean_sun_to_epicycle_center": math.hypot(*_sub(C, G)),
            "mean_sun_to_mars": math.hypot(*from_mean_sun),
        },
        "earth_to_mars": relative, "earth_to_mars_distance": math.hypot(*relative),
        "mean_commutation": alpha, "mean_planet_longitude": L,
        "mars_apogee": A, "eccentric_anomaly": normalize(L - A),
        "epicycle_offset_direction": normalize(2 * L - A + 180),
        "mean_sun_mars_longitude": heliocentric,
        "equation_of_center": eta, "corrected_commutation": normalize(alpha - eta),
        "annual_parallax_equation": signed_difference(longitude, heliocentric),
        "geocentric_sidereal_longitude": longitude,
        "geocentric_tropical_longitude": normalize(longitude + earth["true_precession"]),
        "true_precession": earth["true_precession"],
    }


def evaluate_mars_from_arguments(mean_sun, mean_commutation, mars_apogee, *,
                                 solar_mean_apogee, theta, mean_precession):
    """Direct construction for source arguments; all angular inputs in degrees.

    This imposes no apsidal time law. Earth uses its own R=10000 internally;
    the returned scaled construction and Mars use Mars R=10000, Earth r=6580.
    """
    earth = earth_model.evaluate_earth_from_arguments(mean_sun, solar_mean_apogee, theta, mean_precession)
    result = _couple(earth, mean_commutation, mars_apogee)
    result["apsis_assignment"] = {"status": "explicit angular argument, no date law"}
    return result


def analytic_longitude(mean_sun, mean_commutation, mars_apogee):
    """Independent scalar triangle/correction calculation; sidereal longitude.

    Uses the radial/tangential components in the rotating mean-planet basis,
    then the Earth–mean-Sun–Mars triangle, with no Cartesian point evaluator.
    """
    _finite(mean_sun, mean_commutation, mars_apogee)
    L = normalize(mean_sun - mean_commutation)
    k = math.radians(normalize(L - mars_apogee))
    R, e1, rp, r = (_value(n) for n in
                  ("principal_radius", "eccentric_component", "small_epicycle_radius", "earth_annual_radius"))
    radial = R + (e1 - rp) * math.cos(k)
    transverse = -(e1 + rp) * math.sin(k)
    eta = math.atan2(transverse, radial)
    distance = math.sqrt(radial**2 + transverse**2)
    alpha = math.radians(normalize(mean_commutation)) - eta
    parallax = math.atan2(r * math.sin(alpha), distance + r * math.cos(alpha))
    return normalize(L + math.degrees(eta + parallax))


def evaluate_mars(days_since_epoch, *, apsis_policy=None,
                  apogee_longitude=None, apogee_provenance=None):
    """Historical local days from Christ epoch, with explicit apsis assignment.

    A supplied apsis is a caller assumption, not a completed secular theory.
    The scholarly estimate is guarded at 1473–1523 (Julian Frauenburg LMT).
    The separately selected exploratory policy continues the same angular
    rate and fixed 1543 geometry outside that guard, without an accuracy claim.
    """
    _finite(days_since_epoch)
    if apsis_policy is not None:
        if apsis_policy not in (APSIS_POLICY, EXPLORATORY_APSIS_POLICY) or apogee_longitude is not None or apogee_provenance is not None:
            raise ValueError("choose one recognized apsis policy or a supplied apogee with provenance")
        scholarly = definition()["optional_reconstructions"][APSIS_POLICY]
        start, end = (_local_days(scholarly[k]) for k in ("domain_start_local_julian", "domain_end_local_julian"))
        if apsis_policy == APSIS_POLICY and not start <= days_since_epoch <= end:
            raise ValueError("scholarly apsis estimate is restricted to 1473-02-19 through 1523-02-22 05:00 Julian local time")
        policy = (scholarly if apsis_policy == APSIS_POLICY else
                  definition()["exploratory_policies"][EXPLORATORY_APSIS_POLICY])
        anchor = definition()["parameters"]["apogee_1523"]
        # C3 p.363: rate is degrees per 365-day Egyptian year, anchored at
        # 1523 February 22 05:00 Frauenburg LMT (C1 V.16; C3 pp.357–358).
        apogee = anchor["value"] + (days_since_epoch - _local_days(anchor["epoch_local_julian"])) / 365 * scholarly["annual_motion"]["value"]
        assignment = {"policy": apsis_policy, "status": policy["status"],
                      "source": policy["source"], "assumptions": policy["assumptions"]}
    else:
        if apogee_longitude is None or not isinstance(apogee_provenance, str) or not apogee_provenance.strip():
            raise ValueError("1543 has no complete date-dependent Mars apogee: supply apogee and provenance or select a scholarly policy")
        _finite(apogee_longitude)
        apogee = apogee_longitude
        assignment = {"status": "caller-supplied apogee; no secular eccentricity law",
                      "source": apogee_provenance}
    earth = earth_model.evaluate_earth(days_since_epoch)
    alpha = _value("mean_commutation_epoch") + days_since_epoch / 365 * _value("mean_commutation_annual_motion")
    result = _couple(earth, alpha, apogee)
    result["days_since_epoch"] = days_since_epoch
    result["apsis_assignment"] = assignment
    result["historical_applicability"] = definition()["applicability"]
    return result
