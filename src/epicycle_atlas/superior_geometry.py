"""Shared planar equant geometry for Ptolemy's three superior planets.

P1 IX.6 pp.443–444 and XI.9 pp.544–545 describe the same equant/deferent
construction for Mars, Jupiter and Saturn. The epicyclic anomaly is measured
from the mean apogee carried by the equant ray (P1 IX.6 p.444; P2 HAMA p.183).
This module has no chronology or body-specific historical parameters.
"""

import math


def normalize(degrees):
    """Reduce an eastward longitude to [0, 360) degrees."""
    return degrees % 360.0


def signed_difference(first, second):
    """Signed first-minus-second angular difference in [-180, 180)."""
    return (first - second + 180.0) % 360.0 - 180.0


def _polar(length, degrees):
    angle = math.radians(degrees)
    return (length * math.cos(angle), length * math.sin(angle))


def _angle(point):
    return normalize(math.degrees(math.atan2(point[1], point[0])))


def evaluate_superior_geometry(radius, half_eccentricity, epicycle_radius,
                               mean_longitude, mean_anomaly, apogee_longitude):
    """Return exact Cartesian construction in original deferent-radius units.

    O is Earth, D the deferent centre, Q the equant, C the epicycle centre, P
    the planet. All three angles are tropical degrees increasing eastward.
    Mean longitude is the direction Q→C. Mean anomaly is measured from the
    mean epicycle apogee parallel to that equant ray, so C→P points at L+α.
    """
    if not all(math.isfinite(value) for value in
               (radius, half_eccentricity, epicycle_radius,
                mean_longitude, mean_anomaly, apogee_longitude)):
        raise ValueError("finite geometric lengths and angles are required")
    if not (radius > half_eccentricity > 0 and epicycle_radius > 0):
        raise ValueError("positive historical radii and radius > eccentricity are required")

    theta = normalize(mean_longitude)
    alpha = normalize(mean_anomaly)
    apsis = normalize(apogee_longitude)
    kappa = normalize(theta - apsis)

    earth = (0.0, 0.0)
    deferent_center = _polar(half_eccentricity, apsis)
    equant = _polar(2.0 * half_eccentricity, apsis)

    # Solve |Q + q u(theta) - D| = R for the outward equant-ray intersection.
    kappa_rad = math.radians(kappa)
    ray_length = (-half_eccentricity * math.cos(kappa_rad)
                  + math.sqrt(radius * radius
                              - half_eccentricity * half_eccentricity
                              * math.sin(kappa_rad) ** 2))
    ray = _polar(ray_length, theta)
    epicycle_center = (equant[0] + ray[0], equant[1] + ray[1])

    epicycle_offset = _polar(epicycle_radius, theta + alpha)
    planet = (epicycle_center[0] + epicycle_offset[0],
              epicycle_center[1] + epicycle_offset[1])
    center_longitude = _angle(epicycle_center)
    longitude = _angle(planet)

    return {
        "earth": earth,
        "deferent_center": deferent_center,
        "equant": equant,
        "deferent_radius": radius,
        "epicycle_radius": epicycle_radius,
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


def analytic_superior_longitude(radius, half_eccentricity, epicycle_radius,
                                mean_longitude, mean_anomaly, apogee_longitude):
    """Independent scalar-triangle check, without Cartesian planet coordinates.

    The two signed atan2 corrections follow from the equant triangle and the
    Earth–epicycle-centre–planet triangle. This is a validation formulation,
    not a second source parameterization.
    """
    kappa = math.radians(mean_longitude - apogee_longitude)
    ray_length = (math.sqrt(radius * radius
                            - half_eccentricity * half_eccentricity
                            * math.sin(kappa) ** 2)
                  - half_eccentricity * math.cos(kappa))
    along = ray_length + 2.0 * half_eccentricity * math.cos(kappa)
    across = -2.0 * half_eccentricity * math.sin(kappa)
    center_correction = math.atan2(across, along)
    center_distance = math.hypot(along, across)
    relative_anomaly = math.radians(mean_anomaly) - center_correction
    epicycle_correction = math.atan2(
        epicycle_radius * math.sin(relative_anomaly),
        center_distance + epicycle_radius * math.cos(relative_anomaly),
    )
    return normalize(mean_longitude
                     + math.degrees(center_correction + epicycle_correction))
