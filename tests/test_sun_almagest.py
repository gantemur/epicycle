"""Historical and mathematical checks for *Almagest* III solar longitude."""

import json
import math
from pathlib import Path
import unittest

from epicycle_atlas.chronology import EPOCH_LOCAL_JDN, civil_to_local_jd, egyptian_to_days
from epicycle_atlas.sun_almagest import (
    analytic_solar_equation, evaluate_sun, evaluate_sun_from_arguments,
    parameters,
)


SOURCES = json.loads((Path(__file__).parent / "fixtures" / "sun-source-cases.json").read_text())


def sexagesimal(text):
    parts = [int(part) for part in text.replace(";", ",").split(",")]
    return sum(part / 60 ** index for index, part in enumerate(parts))


def signed_difference(first, second):
    return (first - second + 180) % 360 - 180


class SunSourceChecks(unittest.TestCase):
    def test_source_record_notation(self):
        expected = {
            "eccentric_radius": 60,
            "eccentricity": 2.5,
            "apogee_longitude": 65.5,
            "mean_longitude_epoch": 330.75,
            "mean_anomaly_epoch": 265.25,
            "tropical_year": 365 + 14 / 60 + 48 / 3600,
            "mean_longitude_daily_motion": sexagesimal("0;59,8,17,13,12,31"),
        }
        for name, original_value in expected.items():
            with self.subTest(name=name):
                self.assertAlmostEqual(parameters()[name]["value"], original_value, places=12)
        # Printed six-place motion is close to, but distinct from, the exact quotient.
        self.assertNotEqual(parameters()["mean_longitude_daily_motion"]["value"],
                            360 / parameters()["tropical_year"]["value"])

    def test_epoch_table_result_and_sign(self):
        result = evaluate_sun(0)
        self.assertEqual(EPOCH_LOCAL_JDN, 1448638)
        self.assertAlmostEqual(result["mean_longitude"], 330.75)
        self.assertAlmostEqual(result["mean_anomaly"], 265.25)
        self.assertGreater(result["solar_equation"], 0)
        # P1 III.6 / P2 p. 60 round the continuous correction to 2;23.
        self.assertLess(abs(result["solar_equation"] - sexagesimal("2;23")), 0.5 / 60)
        self.assertLess(abs(result["longitude"] - (330 + sexagesimal("3;8"))), 0.5 / 60)

    def test_original_anomaly_table_subset(self):
        # The table uses 6° steps near apogee and 3° steps nearer perigee.
        # Continuous geometry is compared at historical minute precision.
        for row in SOURCES["table_rows"]:
            expected = row["equation_magnitude_degrees"]
            for anomaly, sign in ((row["mean_anomaly_degrees"], -1),
                                  (row["symmetric_anomaly_degrees"], 1)):
                with self.subTest(anomaly=anomaly):
                    computed = analytic_solar_equation(anomaly)
                    if anomaly == 180:
                        sign = 0
                    self.assertLessEqual(abs(computed - sign * expected), 0.7 / 60)

    def test_nabonassar_845_source_computation(self):
        source = SOURCES["nabonassar_845_example"]
        days = egyptian_to_days(845, 6, 18, source["elapsed_hours"] / 24)
        self.assertEqual(days, (source["elapsed_egyptian_years"] * 365 +
                                source["elapsed_months"] * 30 +
                                source["elapsed_days"] + source["elapsed_hours"] / 24))
        result = evaluate_sun(days)
        printed_mean = 270 + sexagesimal("20;57")
        printed_anomaly = sexagesimal(source["mean_anomaly_sexagesimal"])
        printed_equation = sexagesimal("1;45")
        printed_true = 270 + sexagesimal("22;42")
        self.assertLess(abs(result["mean_longitude"] - printed_mean), 0.5 / 60)
        self.assertLess(abs(result["mean_anomaly"] - printed_anomaly), 0.5 / 60)
        self.assertLess(abs(result["solar_equation"] - printed_equation), 0.5 / 60)
        self.assertLess(abs(result["longitude"] - printed_true), 0.5 / 60)


class SunGeometryChecks(unittest.TestCase):
    def test_cartesian_and_independent_scalar_equation(self):
        for apogee in (0, 65.5, 219.75):
            for mean_longitude in range(0, 360, 7):
                result = evaluate_sun_from_arguments(mean_longitude, apogee)
                center = result["eccentric_center"]
                sun = result["sun"]
                self.assertAlmostEqual(math.hypot(*center), 2.5, places=12)
                self.assertAlmostEqual(math.dist(center, sun), 60, places=12)
                self.assertAlmostEqual(result["earth_to_sun"], math.hypot(*sun), places=12)
                scalar = analytic_solar_equation(result["mean_anomaly"])
                self.assertAlmostEqual(result["solar_equation"], scalar, places=11)
                rotated = evaluate_sun_from_arguments(mean_longitude + 47,
                                                      apogee + 47)
                self.assertAlmostEqual(signed_difference(rotated["longitude"],
                                                         result["longitude"]), 47, places=10)

    def test_apsides_and_sign_quadrants(self):
        for anomaly, distance, sign in ((0, 62.5, 0), (90, None, -1),
                                        (180, 57.5, 0), (270, None, 1)):
            result = evaluate_sun_from_arguments(65.5 + anomaly, 65.5)
            if distance is not None:
                self.assertAlmostEqual(result["earth_to_sun"], distance)
                self.assertAlmostEqual(result["solar_equation"], 0, places=11)
            if sign:
                self.assertEqual(math.copysign(1, result["solar_equation"]), sign)

    def test_dates_boundaries_and_invalid_arguments(self):
        self.assertEqual(civil_to_local_jd(-746, 2, 26, 0.5), EPOCH_LOCAL_JDN)
        for year, month, day in ((-747, 1, 1), (-746, 2, 26), (0, 1, 1),
                                 (1, 1, 1), (845, 1, 1), (2026, 10, 12)):
            days = civil_to_local_jd(year, month, day) - EPOCH_LOCAL_JDN
            result = evaluate_sun(days)
            self.assertTrue(0 <= result["longitude"] < 360)
            self.assertEqual(result["apogee_longitude"], 65.5)
        for invalid in (float("nan"), float("inf"), -float("inf")):
            with self.assertRaises(ValueError):
                evaluate_sun(invalid)
            with self.assertRaises(ValueError):
                evaluate_sun_from_arguments(invalid, 65.5)
            with self.assertRaises(ValueError):
                analytic_solar_equation(invalid)
        for radius, eccentricity in ((0, 0), (60, -1), (60, 60)):
            with self.assertRaises(ValueError):
                evaluate_sun_from_arguments(0, 0, radius, eccentricity)


if __name__ == "__main__":
    unittest.main()
