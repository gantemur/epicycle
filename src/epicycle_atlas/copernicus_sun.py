"""Standalone geocentric Sun prediction from Copernicus's 1543 Earth theory.

The historical construction and parameters live in copernicus_earth.py and
data/earth-copernicus-1543-v1.json. This adapter adds a solar model identity;
it neither evaluates Mars nor requests any Mars apsis assignment.
"""

from .copernicus_earth import evaluate_earth, evaluate_earth_from_arguments


MODEL_ID = "copernicus-1543-sun-longitude"


def _solar_result(earth_result):
    result = dict(earth_result)
    result["model_id"] = MODEL_ID
    result["body"] = "Sun"
    result["underlying_model_id"] = "copernicus-1543-earth-longitude"
    result["longitude"] = earth_result["solar_tropical_longitude"]
    return result


def evaluate_sun_from_arguments(mean_sun, mean_apogee, theta, mean_precession):
    """Return Earth's original points and geocentric solar longitudes."""
    return _solar_result(evaluate_earth_from_arguments(
        mean_sun, mean_apogee, theta, mean_precession))


def evaluate_sun(days_since_epoch):
    """Historical mean local days after Copernicus's Christ epoch."""
    return _solar_result(evaluate_earth(days_since_epoch))
