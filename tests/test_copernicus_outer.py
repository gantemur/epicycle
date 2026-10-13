"""Source and independent geometric checks for 1543 Jupiter and Saturn."""

import json
import math
import unittest
from fractions import Fraction
from pathlib import Path

from epicycle_atlas import copernicus_earth, copernicus_jupiter, copernicus_mars, copernicus_saturn
from epicycle_atlas.chronology import civil_to_local_jd
from epicycle_atlas.copernicus_superior import to_common_earth_units
from epicycle_atlas.mars import signed_difference

FIXTURES = Path(__file__).parent / "fixtures"


def sexagesimal(text):
    """Exact rational value of source notation, including signed corrections."""
    sign = -1 if text.startswith("-") else 1
    whole, _, fractions = text.removeprefix("-").partition(";")
    result = Fraction(int(whole))
    if fractions:
        for index, value in enumerate(fractions.split(","), start=1):
            result += Fraction(int(value), 60**index)
    return sign * result


class CopernicanOuterTests(unittest.TestCase):
    def test_original_table_year_and_sixty_year_rows(self):
        for module, body in ((copernicus_jupiter, "jupiter"), (copernicus_saturn, "saturn")):
            source = json.loads((FIXTURES / f"{body}-copernicus-source-cases.json").read_text())
            table = source["original_commutation_table"]
            def table_degrees(notation):
                integer, fractions = notation.split(";")
                high, low = (int(part) for part in integer.split(","))
                return Fraction(60 * high + low) + sum(
                    (Fraction(int(part), 60**index)
                     for index, part in enumerate(fractions.split(","), start=1)), Fraction())
            annual = sexagesimal(module.definition()["parameters"]["mean_commutation_annual_motion"]["sexagesimal"])
            # The annual printed row omits the fourth fractional place.
            self.assertLess(abs(table_degrees(table["one_egyptian_year"]) - annual), Fraction(1, 60**3))
            self.assertEqual(table_degrees(table["sixty_egyptian_years"]), (60 * annual) % 360)

    def test_original_records_and_exact_mean_sun_identity(self):
        earth = copernicus_earth.parameters()
        for module, body, reported, eccentric, small, annual_radius in (
                (copernicus_jupiter, "jupiter", 917, 687, 229, 1916),
                (copernicus_saturn, "saturn", 1139, 854, 285, 1090)):
            record = module.definition()
            self.assertEqual(record["model_id"], f"copernicus-1543-{body}-longitude")
            self.assertEqual(record["parameters"]["reported_double_eccentricity"]["value"], reported)
            self.assertEqual(record["parameters"]["eccentric_component"]["value"], eccentric)
            self.assertEqual(record["parameters"]["small_epicycle_radius"]["value"], small)
            self.assertEqual(record["parameters"]["earth_annual_radius"]["value"], annual_radius)
            p = record["parameters"]
            epoch_sum = sexagesimal(p["mean_commutation_epoch"]["sexagesimal"]) + sexagesimal(p["mean_proper_longitude_epoch"]["sexagesimal"])
            rate_sum = sexagesimal(p["mean_commutation_annual_motion"]["sexagesimal"]) + sexagesimal(p["mean_proper_longitude_annual_motion"]["sexagesimal"])
            self.assertEqual(epoch_sum, sexagesimal(earth["mean_sun_epoch"]["sexagesimal"]))
            self.assertEqual(rate_sum, sexagesimal(earth["mean_sun_annual_motion"]["sexagesimal"]))
        self.assertEqual(687 + 229, 916)
        self.assertEqual(854 + 285, 1139)

    def test_saturn_rate_pairs_and_cumulative_variant(self):
        record = copernicus_saturn.definition()
        p = record["parameters"]
        alternative = record["alternatives_not_used"]["manuscript_C1_prose_rate_pair"]
        mean_sun = sexagesimal("359;44,49,7,4")
        self.assertEqual(sexagesimal(p["mean_commutation_annual_motion"]["sexagesimal"]) +
                         sexagesimal(p["mean_proper_longitude_annual_motion"]["sexagesimal"]), mean_sun)
        self.assertEqual(sexagesimal(alternative["mean_commutation_annual_motion"]["sexagesimal"]) +
                         sexagesimal(alternative["mean_proper_longitude_annual_motion"]["sexagesimal"]), mean_sun)
        delta = (sexagesimal(alternative["mean_commutation_annual_motion"]["sexagesimal"]) -
                 sexagesimal(p["mean_commutation_annual_motion"]["sexagesimal"]))
        self.assertEqual(delta, -sexagesimal("0;0,0,15,28"))
        self.assertAlmostEqual(float(1514 * delta), -0.10840987654320988)

    def test_source_cases_against_continuous_geometry(self):
        for module, body, call in (
                (copernicus_jupiter, "jupiter", copernicus_jupiter.evaluate_jupiter_from_arguments),
                (copernicus_saturn, "saturn", copernicus_saturn.evaluate_saturn_from_arguments)):
            source = json.loads((FIXTURES / f"{body}-copernicus-source-cases.json").read_text())
            a = source["source_arguments"]
            mean_sun = float(sexagesimal(a["mean_sun_sidereal"]))
            alpha = float(sexagesimal(a["mean_commutation"]))
            apogee = float(sexagesimal(a["sidereal_apogee_approximate"]))
            result = call(mean_sun, alpha, apogee, solar_mean_apogee=61,
                          theta=0, mean_precession=0)
            self.assertAlmostEqual(result["mean_planet_longitude"],
                                   float(sexagesimal(a["mean_planet_sidereal"])))
            scalar = module.analytic_longitude(mean_sun, alpha, apogee)
            self.assertAlmostEqual(result["geocentric_sidereal_longitude"], scalar, places=11)
            source_longitude = float(sexagesimal(a["reported_geocentric_sidereal_longitude"]))
            # The source's rounded table arguments/triangles need not equal exact circles.
            self.assertLess(abs(signed_difference(result["geocentric_sidereal_longitude"], source_longitude)), 1 / 60)
            source_distance = float(a["intermediate_mean_sun_planet_distance"])
            self.assertLess(abs(result["planet_geometry"]["mean_sun_to_planet"] - source_distance), 11)

    def test_independent_scalar_quadrants_and_circle_invariants(self):
        for module, body, call in (
                (copernicus_jupiter, "jupiter", copernicus_jupiter.evaluate_jupiter_from_arguments),
                (copernicus_saturn, "saturn", copernicus_saturn.evaluate_saturn_from_arguments)):
            p = module.definition()["parameters"]
            for mean_sun in (0, 90, 180, 270, 359.99):
                for alpha in (0, 38, 111, 183, 301):
                    for apogee in (0, 49, 159, 240, 359):
                        x = call(mean_sun, alpha, apogee, solar_mean_apogee=61,
                                 theta=113, mean_precession=5)
                        self.assertLess(abs(signed_difference(
                            x["geocentric_sidereal_longitude"],
                            module.analytic_longitude(mean_sun, alpha, apogee))), 1e-10)
                        g = x["planet_geometry"]
                        G, M, C, P = (g[key] for key in ("mean_sun", "eccentric_center", "epicycle_center", "planet"))
                        self.assertAlmostEqual(math.dist(G, M), p["eccentric_component"]["value"], places=9)
                        self.assertAlmostEqual(math.dist(M, C), 10000, places=9)
                        self.assertAlmostEqual(math.dist(C, P), p["small_epicycle_radius"]["value"], places=9)
                        E = x["earth_geometry_in_planet_units"]["earth"]
                        S = x["earth_geometry_in_planet_units"]["true_sun"]
                        for coordinate in (0, 1):
                            self.assertAlmostEqual((P[coordinate]-S[coordinate])-(E[coordinate]-S[coordinate]),
                                                   x["earth_to_planet"][coordinate], places=9)

    def test_uniform_apogee_and_common_earth_scale(self):
        mars_days = civil_to_local_jd(1512, 1, 1) - copernicus_earth.EPOCH_LOCAL_JD
        for days in (0, mars_days, -100000, 1000000):
            j = copernicus_jupiter.evaluate_jupiter(days)
            s = copernicus_saturn.evaluate_saturn(days)
            mars = copernicus_mars.evaluate_mars(days, apsis_policy="sn-uniform-exploratory")
            common = [to_common_earth_units(result) for result in (j, s, mars)]
            earth = copernicus_earth.evaluate_earth(days)
            for coordinate in (0, 1):
                for result in common:
                    self.assertAlmostEqual(result["earth"][coordinate], earth["earth"][coordinate], places=9)
                    self.assertAlmostEqual(result["mean_sun"][coordinate], earth["mean_sun"][coordinate], places=9)
                    self.assertAlmostEqual(result["true_sun"][coordinate], earth["true_sun"][coordinate], places=9)
            for module, result in ((copernicus_jupiter, j), (copernicus_saturn, s)):
                p = module.definition()["parameters"]
                expected = float(sexagesimal(p["sidereal_apogee_epoch"]["sexagesimal"])) + days/365 * float(sexagesimal(p["sidereal_apogee_annual_motion"]["sexagesimal"]))
                self.assertLess(abs(signed_difference(result["planet_apogee"], expected % 360)), 1e-10)

    def test_nonfinite_and_wrong_body_rejected(self):
        with self.assertRaises(ValueError):
            copernicus_jupiter.evaluate_jupiter(math.nan)
        with self.assertRaises(ValueError):
            copernicus_saturn.analytic_longitude(0, math.inf, 0)


if __name__ == "__main__":
    unittest.main()
