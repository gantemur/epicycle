import json
import math
from pathlib import Path
import unittest

from epicycle_atlas.mars import (
    analytic_longitude, evaluate_mars, evaluate_mars_from_arguments,
    parameters, signed_difference,
)
from epicycle_atlas.chronology import (
    EPOCH_LOCAL_JDN, bce_ce, civil_to_jdn, civil_to_local_jd, days_to_egyptian,
    days_to_local_jd, egyptian_to_days, jdn_to_civil, local_jd_to_civil,
)


FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "mars-source-cases.json").read_text())
CROSS_FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "mars-cross-language.json").read_text())


def sexagesimal(value):
    sign = -1 if value.startswith("-") else 1
    parts = value.removeprefix("-").replace(";", ",").split(",")
    return sign * sum(int(part) / 60 ** place for place, part in enumerate(parts))


class MarsSources(unittest.TestCase):
    def test_decimal_values_reproduce_transcription(self):
        for name, entry in parameters().items():
            if name == "apogee_motion":
                self.assertAlmostEqual(entry["value"], 1 / 36500, places=15)
            else:
                original = entry["sexagesimal"]
                zodiac_offset = 90 if original.startswith("Cancer") else 0
                sex = original.split()[-1]
                self.assertAlmostEqual(entry["value"], zodiac_offset + sexagesimal(sex), places=12, msg=name)

    def test_ptolemy_opposition_geometry(self):
        for fixture in FIXTURES["historical_cases"]:
            with self.subTest(fixture["id"]):
                kappa = sexagesimal(fixture["input"]["mean_centrum"])
                anomaly = sexagesimal(fixture["input"].get("mean_anomaly", "0"))
                result = evaluate_mars_from_arguments(kappa, anomaly, 0)
                expected = sexagesimal(fixture["expected"])
                if fixture["id"] == "X7-third-opposition-center":
                    actual = 180 - result["epicycle_center_longitude"]
                elif fixture["observable"].startswith("epicycle center"):
                    actual = signed_difference(result["epicycle_center_longitude"], 0)
                else:
                    actual = result["earth_to_epicycle_center"]
                tolerance = fixture.get("tolerance_arcminutes", 0) / 60 + fixture.get("tolerance_units", 0)
                self.assertLessEqual(abs(actual - expected), tolerance)

    def test_neugebauer_tabular_discrepancy_is_recorded(self):
        case = FIXTURES["scholarly_table_case"]
        args = case["input"]
        result = evaluate_mars_from_arguments(*(sexagesimal(args[name]) for name in
                                               ("mean_longitude", "mean_anomaly", "apogee_longitude")))
        printed = sexagesimal(case["neugebauer_reconstructed_table_longitude"])
        difference_arcminutes = 60 * signed_difference(result["longitude"], printed)
        tabular_center = sexagesimal(case["neugebauer_reconstructed_equation_of_center"])
        tabular_epicycle = sexagesimal(case["neugebauer_reconstructed_epicycle_equation"])
        tabular_unrounded = sexagesimal(case["neugebauer_unrounded_table_longitude"])
        self.assertAlmostEqual(result["equation_of_center"],
                               case["computed_cartesian_equation_of_center_degrees"], places=11)
        self.assertAlmostEqual(result["epicycle_equation"],
                               case["computed_cartesian_epicycle_equation_degrees"], places=11)
        self.assertAlmostEqual(tabular_unrounded,
                               (sexagesimal(args["mean_longitude"]) + tabular_center + tabular_epicycle) % 360,
                               places=11)
        self.assertAlmostEqual(60 * (result["equation_of_center"] - tabular_center), 0.297, places=3)
        self.assertAlmostEqual(60 * (result["epicycle_equation"] - tabular_epicycle), 5.913, places=3)
        self.assertAlmostEqual(60 * signed_difference(tabular_unrounded, printed), 25 / 60, places=11)
        self.assertAlmostEqual(difference_arcminutes, case["computed_minus_table_arcminutes"], places=9)
        # Printed to whole minutes: the gap exceeds a rounding interval and
        # must not be silently treated as agreement with the historical table.
        self.assertGreater(abs(difference_arcminutes), 1)


class MarsGeometry(unittest.TestCase):
    def test_shared_cross_language_fixtures_match_python(self):
        cases = [(item["result"], evaluate_mars_from_arguments(*item["arguments"]))
                 for item in CROSS_FIXTURES["argument_cases"]]
        cases += [(item["result"], evaluate_mars(item["days"]))
                  for item in CROSS_FIXTURES["time_cases"]]
        for expected, actual in cases:
            for name, value in expected.items():
                with self.subTest(name=name):
                    if isinstance(value, list):
                        for computed, saved in zip(actual[name], value):
                            self.assertAlmostEqual(computed, saved, delta=2e-9)
                    else:
                        self.assertAlmostEqual(actual[name], value, delta=2e-9)

    def test_analytic_cartesian_and_invariants(self):
        for theta in range(0, 360, 37):
            for anomaly in (0, 47, 121, 179, 235, 315):
                for apsis in (0, 106.6666666667, 271):
                    with self.subTest(theta=theta, anomaly=anomaly, apsis=apsis):
                        state = evaluate_mars_from_arguments(theta, anomaly, apsis)
                        analytic = analytic_longitude(theta, anomaly, apsis)
                        self.assertLess(abs(signed_difference(state["longitude"], analytic)), 1e-10)
                        D = state["deferent_center"]
                        E = state["equant"]
                        C = state["epicycle_center"]
                        P = state["planet"]
                        self.assertAlmostEqual(math.dist(C, D), 60.0, places=11)
                        self.assertAlmostEqual(math.dist(C, P), 39.5, places=11)
                        self.assertAlmostEqual(math.dist(D, E), 6.0, places=11)
                        self.assertAlmostEqual(math.dist((0, 0), E), 12.0, places=11)
                        self.assertAlmostEqual(state["earth_to_planet"], math.hypot(*P), places=11)

    def test_epoch_and_negative_continuous_days(self):
        epoch = evaluate_mars(0)
        self.assertAlmostEqual(epoch["mean_longitude"], 3 + 32 / 60)
        self.assertAlmostEqual(epoch["mean_anomaly"], 327 + 13 / 60)
        self.assertAlmostEqual(epoch["apogee_longitude"], 106 + 40 / 60)
        for day in (-36525.5, -1, 0, 1, 449 * 365 + 9 * 30 + 7, 475 * 365):
            result = evaluate_mars(day)
            self.assertTrue(0 <= result["longitude"] < 360)
        with self.assertRaises(ValueError):
            evaluate_mars(float("nan"))


class Chronology(unittest.TestCase):
    def test_nabonassar_epoch_and_boundaries(self):
        self.assertEqual(egyptian_to_days(1, 1, 1), 0)
        self.assertEqual(egyptian_to_days(1, 13, 5), 364)
        self.assertEqual(egyptian_to_days(2, 1, 1), 365)
        self.assertEqual(days_to_egyptian(364.5), (1, 13, 5, 0.5))
        self.assertEqual(days_to_egyptian(365), (2, 1, 1, 0))
        self.assertEqual(egyptian_to_days(450, 10, 8), 449 * 365 + 9 * 30 + 7)

    def test_civil_dates_bce_and_jdn(self):
        self.assertEqual(EPOCH_LOCAL_JDN, 1448638)
        self.assertEqual(jdn_to_civil(EPOCH_LOCAL_JDN), (-746, 2, 26))
        self.assertEqual(jdn_to_civil(EPOCH_LOCAL_JDN, "gregorian"), (-746, 2, 18))
        self.assertEqual(civil_to_jdn(2000, 1, 1, "gregorian"), 2451545)
        self.assertEqual(civil_to_jdn(2000, 1, 1, "julian"), 2451558)
        for calendar in ("julian", "gregorian"):
            for date in ((-1000, 3, 1), (-746, 2, 26), (-1, 12, 31), (0, 1, 1), (1, 1, 1), (2000, 2, 29)):
                self.assertEqual(jdn_to_civil(civil_to_jdn(*date, calendar), calendar), date)
        self.assertEqual(local_jd_to_civil(days_to_local_jd(0)), (-746, 2, 26, 0.5))
        self.assertEqual(local_jd_to_civil(days_to_local_jd(0.5)), (-746, 2, 27, 0.0))
        self.assertEqual(civil_to_local_jd(-746, 2, 27), days_to_local_jd(0.5))
        self.assertEqual(bce_ce(-746), "747 BCE")
        self.assertEqual(bce_ce(0), "1 BCE")
        self.assertEqual(bce_ce(1), "1 CE")


if __name__ == "__main__":
    unittest.main()
