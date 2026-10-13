"""Independent Python reproducibility of generated Phase 6A spatial checks."""

import json
import math
import unittest
from pathlib import Path

from epicycle_atlas import copernicus_earth, copernicus_jupiter, copernicus_mars, copernicus_saturn
from epicycle_atlas.copernicus_superior import to_common_earth_units

FIXTURE = Path(__file__).parent / "fixtures" / "copernicus-map-generated.json"


class MapFixtureTests(unittest.TestCase):
    def test_generated_points_and_pairwise_distances(self):
        document = json.loads(FIXTURE.read_text(encoding="utf-8"))
        self.assertEqual(document["mars_policy"], "sn-uniform-exploratory")
        self.assertIn("not a source table", document["provenance"])
        for case in document["cases"]:
            days = case["local_days"]
            earth = copernicus_earth.evaluate_earth(days)
            self.assertEqual(case["frame_id"], "copernicus-1543-sidereal")
            self.assertEqual(case["length_unit"], "historical Earth annual radius = 10000")
            for actual, expected in zip(earth["earth"], case["positions"]["earth"]):
                self.assertAlmostEqual(actual, expected, places=8)
            planet_results = {
                "mars": copernicus_mars.evaluate_mars(days, apsis_policy="sn-uniform-exploratory"),
                "jupiter": copernicus_jupiter.evaluate_jupiter(days),
                "saturn": copernicus_saturn.evaluate_saturn(days),
            }
            for body, original in planet_results.items():
                common = to_common_earth_units(original)
                self.assertAlmostEqual(common["planet_to_common_scale"],
                                       case["planet_to_common_scales"][body], places=12)
                for actual, expected in zip(common["planet"], case["positions"][body]):
                    self.assertAlmostEqual(actual, expected, places=7)
                distance = math.dist(earth["earth"], common["planet"])
                self.assertAlmostEqual(distance, case["earth_to_planet_distances"][f"earth-{body}"],
                                       places=7)


if __name__ == "__main__":
    unittest.main()
