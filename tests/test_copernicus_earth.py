import math
import unittest

from epicycle_atlas.chronology import civil_to_local_jd, ScaledJulianDay
from epicycle_atlas.copernicus_earth import (
    EPOCH_LOCAL_JD, evaluate_earth, evaluate_earth_from_arguments,
    analytic_solar_longitude, copernicus_days_at_ut1)
from epicycle_atlas.mars import signed_difference


class EarthCheckpoint(unittest.TestCase):
    def test_circular_construction_and_scalar_equation(self):
        for L in range(0, 360, 17):
            for theta in (0, 45, 90, 165.65, 180, 270, 359):
                x = evaluate_earth_from_arguments(L, 71.5, theta, 27)
                F, G, E = (x[k] for k in ("eccentric_center", "mean_sun", "earth"))
                self.assertAlmostEqual(math.hypot(*F), 369, places=10)
                self.assertAlmostEqual(math.hypot(G[0]-F[0], G[1]-F[1]), 48, places=10)
                self.assertAlmostEqual(math.hypot(E[0]-G[0], E[1]-G[1]), 10000, places=9)
                self.assertAlmostEqual(signed_difference(x["solar_sidereal_longitude"],
                    analytic_solar_longitude(L, 71.5, theta)), 0, places=10)
        self.assertAlmostEqual(evaluate_earth_from_arguments(0, 0, 0, 0)["eccentricity"], 417)
        self.assertAlmostEqual(evaluate_earth_from_arguments(0, 0, 180, 0)["eccentricity"], 321)

    def test_epoch_and_historical_intervals(self):
        x = evaluate_earth(0)
        self.assertAlmostEqual(x["mean_sun_longitude"], 272+31/60)
        self.assertAlmostEqual(x["mean_solar_anomaly"], 211+14/60)
        self.assertAlmostEqual(x["mean_solar_apogee"], 61+17/60)
        self.assertEqual(civil_to_local_jd(1525,4,17)-EPOCH_LOCAL_JD, 1525*365+122)
        self.assertEqual(civil_to_local_jd(1512,1,1,6/24)-EPOCH_LOCAL_JD, 1512*365+12.25)
        jd = ScaledJulianDay(EPOCH_LOCAL_JD-20/360, "UT1")
        self.assertEqual(copernicus_days_at_ut1(jd, 20), 0)
        with self.assertRaises(ValueError):
            copernicus_days_at_ut1(ScaledJulianDay(EPOCH_LOCAL_JD, "TT"), 20)

    def test_1515_eccentricity_derivation(self):
        # C1 III.21 f.92v; C3 p.163: rounded e=323, apsidal equation 2;6,30.
        x = evaluate_earth_from_arguments(0, 0, 165+39/60, 0)
        self.assertLess(abs(x["eccentricity"]-323), .5)
        self.assertLess(abs(x["apsidal_equation"]+(2+6.5/60)), 1/60)

    def test_1525_source_example_geometry_not_table(self):
        # C1 III.12,25; C3 pp.146,169-170. Source table longitude 35;50.
        x = evaluate_earth(1525*365+122)
        self.assertLess(abs(x["mean_sun_longitude"]-(6+54/60)), 1/60)
        self.assertLess(abs(x["theta"]-(166+40/60)), 1/60)
        self.assertLess(abs(x["true_precession"]-(27+20/60)), 1/60)
        self.assertLess(abs(x["solar_tropical_longitude"]-(35+50/60)), 3/60)

    def test_supplementary_1500_epoch_anomaly_from_original_rate(self):
        # C3 p.543's supplementary 1500 Jan 0 value 2,24;0,11 disagrees
        # with its Christ epoch/rate and with the C3 pp.145-146 1525 case.
        days = civil_to_local_jd(1499, 12, 31) - EPOCH_LOCAL_JD
        self.assertEqual(days, 1500 * 365 + 8)
        result = evaluate_earth(days)
        source_epoch = 6 + 45/60
        source_annual_motion = 6/60 + 17/3600 + 24/216000 + 9/12960000
        expected = (source_epoch + (1500 + 8/365) * source_annual_motion) % 360
        self.assertAlmostEqual(result["theta"], expected, places=10)
        self.assertLess(abs(result["theta"] - (164 + 12/3600)), 1/3600)
        self.assertGreater(abs(result["theta"] - (144 + 11/3600)), 19)

    def test_invalid_arguments(self):
        for bad in (float('nan'), float('inf'), -float('inf')):
            with self.assertRaises(ValueError):
                evaluate_earth(bad)
            with self.assertRaises(ValueError):
                evaluate_earth_from_arguments(0, 0, bad, 0)


if __name__ == "__main__":
    unittest.main()
