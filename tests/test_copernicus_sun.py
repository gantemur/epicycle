import math
import unittest

from epicycle_atlas.chronology import civil_to_local_jd
from epicycle_atlas.copernicus_earth import EPOCH_LOCAL_JD, evaluate_earth
from epicycle_atlas.copernicus_sun import evaluate_sun, evaluate_sun_from_arguments


class CopernicusSunStandalone(unittest.TestCase):
    def test_reuses_original_earth_construction(self):
        for days in (0, 1525 * 365 + 122,
                     civil_to_local_jd(2026, 10, 12) - EPOCH_LOCAL_JD):
            earth = evaluate_earth(days)
            sun = evaluate_sun(days)
            self.assertEqual(sun["model_id"], "copernicus-1543-sun-longitude")
            self.assertEqual(sun["underlying_model_id"], earth["model_id"])
            for key, value in earth.items():
                if key == "model_id":
                    continue
                self.assertEqual(sun[key], value, msg=key)
            self.assertEqual(sun["longitude"], earth["solar_tropical_longitude"])
            # Observational target is the true Sun from Earth, not Earth from Sun.
            vector = (sun["true_sun"][0] - sun["earth"][0],
                      sun["true_sun"][1] - sun["earth"][1])
            self.assertEqual(vector, sun["earth_to_sun"])
            native = math.degrees(math.atan2(vector[1], vector[0])) % 360
            self.assertAlmostEqual(native, sun["solar_sidereal_longitude"])
            self.assertAlmostEqual((native + sun["true_precession"]) % 360,
                                   sun["longitude"])

    def test_direct_arguments_and_1525_example(self):
        result = evaluate_sun_from_arguments(6 + 54 / 60, 71.5,
                                             166 + 40 / 60, 27)
        self.assertEqual(result["body"], "Sun")
        self.assertEqual(result["annual_radius"], 10000)
        self.assertEqual(result["eccentric_component"], 369)
        self.assertEqual(result["small_eccentric_radius"], 48)
        # Existing Earth test documents the printed 35;50 and sub-arcminute
        # continuous/table discrepancy. No new solar constants are introduced.
        date_result = evaluate_sun(1525 * 365 + 122)
        self.assertLess(abs(date_result["longitude"] - (35 + 50 / 60)), 3 / 60)


if __name__ == "__main__":
    unittest.main()
