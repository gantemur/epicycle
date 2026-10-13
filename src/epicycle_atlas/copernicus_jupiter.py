"""Body-specific entry points for Copernicus's Jupiter (C1/C2 V.10-14)."""

from . import copernicus_superior as superior


def definition():
    return superior.definition("jupiter")


def evaluate_jupiter_from_arguments(mean_sun, mean_commutation, jupiter_apogee, *,
                                    solar_mean_apogee, theta, mean_precession):
    return superior.evaluate_from_arguments(
        "jupiter", mean_sun, mean_commutation, jupiter_apogee,
        solar_mean_apogee=solar_mean_apogee, theta=theta,
        mean_precession=mean_precession)


def analytic_longitude(mean_sun, mean_commutation, jupiter_apogee):
    return superior.analytic_longitude("jupiter", mean_sun, mean_commutation, jupiter_apogee)


def evaluate_jupiter(days_since_epoch):
    return superior.evaluate("jupiter", days_since_epoch)
