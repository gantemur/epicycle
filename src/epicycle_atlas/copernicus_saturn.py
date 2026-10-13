"""Body-specific entry points for Copernicus's Saturn (C1/C2 V.5-9)."""

from . import copernicus_superior as superior


def definition():
    return superior.definition("saturn")


def evaluate_saturn_from_arguments(mean_sun, mean_commutation, saturn_apogee, *,
                                   solar_mean_apogee, theta, mean_precession):
    return superior.evaluate_from_arguments(
        "saturn", mean_sun, mean_commutation, saturn_apogee,
        solar_mean_apogee=solar_mean_apogee, theta=theta,
        mean_precession=mean_precession)


def analytic_longitude(mean_sun, mean_commutation, saturn_apogee):
    return superior.analytic_longitude("saturn", mean_sun, mean_commutation, saturn_apogee)


def evaluate_saturn(days_since_epoch):
    return superior.evaluate("saturn", days_since_epoch)
