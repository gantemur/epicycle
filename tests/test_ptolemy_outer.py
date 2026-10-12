"""Independent source and geometric checks for Almagest Jupiter and Saturn."""

from fractions import Fraction
import json
import math
from pathlib import Path
import unittest

from epicycle_atlas.chronology import EPOCH_LOCAL_JDN, egyptian_to_days
from epicycle_atlas.jupiter import evaluate_jupiter, evaluate_jupiter_from_arguments
from epicycle_atlas.mars import evaluate_mars_from_arguments
from epicycle_atlas.saturn import evaluate_saturn, evaluate_saturn_from_arguments
from epicycle_atlas.superior_geometry import (
    analytic_superior_longitude, evaluate_superior_geometry, signed_difference,
)


ROOT = Path(__file__).resolve().parents[1]
ZODIAC = {"Cancer": 90, "Virgo": 150, "Scorpio": 210, "Pisces": 330}
BODIES = {
    "jupiter": (evaluate_jupiter, evaluate_jupiter_from_arguments),
    "saturn": (evaluate_saturn, evaluate_saturn_from_arguments),
}


def record(body):
    return json.loads((ROOT / "data" / f"{body}-almagest-v1.json").read_text())


def source_cases(body):
    return json.loads((ROOT / "tests" / "fixtures" /
                       f"{body}-source-cases.json").read_text())


def sexagesimal(text):
    """Parse source sexagesimal notation exactly, including a zodiac sign."""
    sign = -1 if text.startswith("-") else 1
    stripped = text.lstrip("+-")
    parts = stripped.split()
    zodiac = Fraction(ZODIAC[parts[0]]) if len(parts) == 2 else Fraction(0)
    digits = parts[-1].replace(";", ",").split(",")
    return sign * (zodiac + sum(Fraction(int(item), 60 ** place)
                                for place, item in enumerate(digits)))


class PtolemaicOuterPlanetTests(unittest.TestCase):
    def test_epoch_and_solar_coupling_use_versioned_records(self):
        solar = record("sun")["parameters"]
        solar_longitude = sexagesimal(solar["mean_longitude_epoch"]["sexagesimal"])
        solar_rate = sexagesimal(solar["mean_longitude_daily_motion"]["sexagesimal"])
        self.assertEqual(EPOCH_LOCAL_JDN, record("sun")["epoch"]["local_julian_day"])
        self.assertEqual(EPOCH_LOCAL_JDN, egyptian_to_days(1, 1, 1) + EPOCH_LOCAL_JDN)

        for body, (evaluate_days, _) in BODIES.items():
            with self.subTest(body=body):
                historical = record(body)
                parameters = historical["parameters"]
                cases = source_cases(body)
                self.assertEqual(historical["epoch"]["local_julian_day"], EPOCH_LOCAL_JDN)
                self.assertEqual(cases["epoch"]["mean_longitude"],
                                 parameters["mean_longitude_epoch"]["sexagesimal"])
                self.assertEqual(cases["epoch"]["mean_anomaly"],
                                 parameters["mean_anomaly_epoch"]["sexagesimal"])
                longitude = sexagesimal(parameters["mean_longitude_epoch"]["sexagesimal"])
                anomaly = sexagesimal(parameters["mean_anomaly_epoch"]["sexagesimal"])
                longitude_rate = sexagesimal(parameters["mean_longitude_daily_motion"]["sexagesimal"])
                anomaly_rate = sexagesimal(parameters["mean_anomaly_daily_motion"]["sexagesimal"])
                self.assertEqual((longitude + anomaly) % 360, solar_longitude)
                self.assertEqual(longitude_rate + anomaly_rate, solar_rate)
                result = evaluate_days(0)
                self.assertAlmostEqual(result["mean_longitude"], float(longitude), places=12)
                self.assertAlmostEqual(result["mean_anomaly"], float(anomaly), places=12)
                self.assertEqual(result["frame"], historical["frame"]["id"])

    def test_original_mean_motion_table_rows(self):
        for body in BODIES:
            parameters = record(body)["parameters"]
            rows = source_cases(body)["mean_motion_rows"]
            self.assertEqual([row["days"] for row in rows], [365, 1])
            for row in rows:
                with self.subTest(body=body, days=row["days"]):
                    longitude_rate = sexagesimal(parameters["mean_longitude_daily_motion"]["sexagesimal"])
                    anomaly_rate = sexagesimal(parameters["mean_anomaly_daily_motion"]["sexagesimal"])
                    self.assertEqual((longitude_rate * row["days"]) % 360,
                                     sexagesimal(row["longitude_increment"]))
                    self.assertEqual((anomaly_rate * row["days"]) % 360,
                                     sexagesimal(row["anomaly_increment"]))

    def test_historical_day_count_and_later_continuation(self):
        for body, (evaluate_days, _) in BODIES.items():
            parameters = record(body)["parameters"]
            for days in (0, egyptian_to_days(450, 10, 8),
                         egyptian_to_days(884, 1, 1), 365.25 * 2200):
                with self.subTest(body=body, days=days):
                    result = evaluate_days(days)
                    expected_apogee = (parameters["apogee_longitude_epoch"]["value"]
                                       + days / 36500) % 360
                    self.assertAlmostEqual(result["apogee_longitude"],
                                           expected_apogee, places=11)
                    self.assertEqual(result["days_since_epoch"], days)
                    self.assertTrue(0 <= result["longitude"] < 360)

    def test_geometry_and_independent_triangle_route(self):
        for body, (_, evaluate_arguments) in BODIES.items():
            parameters = record(body)["parameters"]
            radius = parameters["deferent_radius"]["value"]
            eccentricity = parameters["half_eccentricity"]["value"]
            epicycle = parameters["epicycle_radius"]["value"]
            apogee = parameters["apogee_longitude_epoch"]["value"]
            for centrum in (0, 1, 45, 90, 96, 135, 179, 180, 225, 270, 315, 359):
                for anomaly in (0, 30, 90, 150, 179, 180, 210, 270, 359):
                    with self.subTest(body=body, centrum=centrum, anomaly=anomaly):
                        result = evaluate_arguments(apogee + centrum, anomaly, apogee)
                        O, D, Q = (result[key] for key in ("earth", "deferent_center", "equant"))
                        C, P = result["epicycle_center"], result["planet"]
                        self.assertAlmostEqual(math.dist(O, D), eccentricity, places=12)
                        self.assertAlmostEqual(math.dist(O, Q), 2 * eccentricity, places=12)
                        self.assertAlmostEqual(math.dist(C, D), radius, places=12)
                        self.assertAlmostEqual(math.dist(P, C), epicycle, places=12)
                        self.assertAlmostEqual(result["longitude"],
                                               math.degrees(math.atan2(P[1], P[0])) % 360,
                                               places=12)
                        independent = analytic_superior_longitude(
                            radius, eccentricity, epicycle,
                            apogee + centrum, anomaly, apogee,
                        )
                        self.assertLess(abs(signed_difference(result["longitude"], independent)), 1e-10)
            far = evaluate_arguments(apogee, 0, apogee)
            near = evaluate_arguments(apogee + 180, 0, apogee)
            self.assertAlmostEqual(far["earth_to_epicycle_center"], radius + eccentricity, places=12)
            self.assertAlmostEqual(near["earth_to_epicycle_center"], radius - eccentricity, places=12)

    def test_original_derived_observations_are_close_but_not_fitted(self):
        for body, (_, evaluate_arguments) in BODIES.items():
            case = source_cases(body)["ancient_derived_case"]
            apogee = float(sexagesimal(case["apogee"]))
            longitude = apogee + float(sexagesimal(case["mean_centrum"]))
            anomaly = float(sexagesimal(case["mean_anomaly"]))
            printed = float(sexagesimal(case["observed_longitude"]))
            calculated = evaluate_arguments(longitude, anomaly, apogee)["longitude"]
            with self.subTest(body=body):
                self.assertLess(abs(signed_difference(calculated, printed)) * 60, 3)

    def test_selected_original_anomaly_table_centre_rows(self):
        # XI.11 centre columns are rounded table arithmetic, not exact circles.
        for body, (_, evaluate_arguments) in BODIES.items():
            apogee = record(body)["parameters"]["apogee_longitude_epoch"]["value"]
            for row in source_cases(body)["anomaly_table_rows"]:
                with self.subTest(body=body, argument=row["mean_centrum"]):
                    expected = float(sexagesimal(row["c3"]) + sexagesimal(row["c4"]))
                    result = evaluate_arguments(apogee + row["mean_centrum"], 0, apogee)
                    table_correction = -expected if row["mean_centrum"] <= 180 else expected
                    self.assertLess(abs(result["equation_of_center"] - table_correction) * 60, 1)

    def test_saturn_epoch_variants_remain_unused(self):
        saturn = record("saturn")
        selected = saturn["parameters"]["mean_longitude_epoch"]["sexagesimal"]
        self.assertEqual(selected, "296;43")
        self.assertEqual([item["sexagesimal"] for item in saturn["unused_source_alternatives"]],
                         ["296;44", "296;45"])
        base = evaluate_saturn(0)["longitude"]
        anomaly = saturn["parameters"]["mean_anomaly_epoch"]["value"]
        apogee = saturn["parameters"]["apogee_longitude_epoch"]["value"]
        one_minute = evaluate_saturn_from_arguments(296 + 44 / 60, anomaly, apogee)["longitude"]
        two_minutes = evaluate_saturn_from_arguments(296 + 45 / 60, anomaly, apogee)["longitude"]
        self.assertAlmostEqual(signed_difference(one_minute, base) * 60, 0.9670082117, places=7)
        self.assertAlmostEqual(signed_difference(two_minutes, base) * 60, 1.9340438681, places=7)

    def test_shared_kernel_matches_mars_public_wrapper(self):
        # Existing Mars source and generated fixtures also guard this refactor.
        for centrum in (0, 30, 90, 135, 180, 240, 270, 359):
            for anomaly in (0, 45, 90, 179, 270, 359):
                old = evaluate_mars_from_arguments(106 + 40 / 60 + centrum,
                                                   anomaly, 106 + 40 / 60)
                common = evaluate_superior_geometry(60, 6, 39.5,
                                                    106 + 40 / 60 + centrum,
                                                    anomaly, 106 + 40 / 60)
                with self.subTest(centrum=centrum, anomaly=anomaly):
                    for key in old:
                        if isinstance(old[key], tuple):
                            for a, b in zip(old[key], common[key]):
                                self.assertAlmostEqual(a, b, places=12)
                        else:
                            self.assertAlmostEqual(old[key], common[key], places=12)


if __name__ == "__main__":
    unittest.main()
