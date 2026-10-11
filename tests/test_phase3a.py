import json
from fractions import Fraction
from pathlib import Path
import unittest

from epicycle_atlas.chronology import (
    EPOCH_LOCAL_JDN, ScaledJulianDay, civil_to_jdn, days_to_local_jd,
    jdn_to_civil, ptolemy_days_at_ut1, ut1_to_local_mean, ut1_to_tt,
)
from epicycle_atlas.comparison import LongitudeSample, longitude_residual
from epicycle_atlas.mars import evaluate_mars_from_arguments, signed_difference
from epicycle_atlas.mars_tables import TableCoverageError, evaluate_mars_tabular, sexagesimal


FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "mars-table-cases.json").read_text())


class HistoricalMarsTable(unittest.TestCase):
    def test_source_rows_and_limited_interpolation(self):
        apogee = sexagesimal(FIXTURE["apogee"])
        for case in FIXTURE["cases"]:
            with self.subTest(row=case["row"]):
                longitude = (apogee + sexagesimal(case["mean_centrum"])) % 360
                result = evaluate_mars_tabular(_sex(longitude), case["mean_anomaly"], FIXTURE["apogee"])
                self.assertEqual(result.equation_of_center, sexagesimal(case["center"]))
                self.assertEqual(result.mean_distance_equation, sexagesimal(case["mean_equation"]))
                # P2's rounded intermediate c7 differs by 1' from linear
                # interpolation of the printed P1 rows in rows 1 and 4.
                difference = {1: "5;25", 4: "6;46"}.get(case["row"], case["distance_difference"])
                self.assertEqual(result.distance_difference, sexagesimal(difference))
                if case["status"] == "reproduced":
                    self.assertEqual(result.distance_adjustment, sexagesimal(case["distance_adjustment"]))
                    self.assertEqual(result.epicycle_equation, sexagesimal(case["epicycle"]))
                    self.assertEqual(result.longitude, sexagesimal(case["longitude"]))
                else:
                    # Row 3 lies at a minute-rounding threshold. Literal linear
                    # interpolation of P1 gives 0;46 rather than P2's 0;47.
                    self.assertEqual(result.distance_adjustment, sexagesimal("0;46"))
                    self.assertEqual(result.longitude, sexagesimal("57;21"))
                geometry = evaluate_mars_from_arguments(float(longitude),
                                                        float(sexagesimal(case["mean_anomaly"])), float(apogee))
                self.assertGreater(abs(signed_difference(geometry["longitude"], float(result.longitude))) * 60, 1)
        with self.assertRaises(TableCoverageError):
            evaluate_mars_tabular("200;0", "0;0", "0;0")

    def test_neugebauer_gap_is_derived_from_table_operations(self):
        case = FIXTURE["cases"][0]
        apogee = sexagesimal(FIXTURE["apogee"])
        longitude = (apogee + sexagesimal(case["mean_centrum"])) % 360
        table = evaluate_mars_tabular(_sex(longitude), case["mean_anomaly"], FIXTURE["apogee"])
        geometry = evaluate_mars_from_arguments(float(longitude), float(sexagesimal(case["mean_anomaly"])), float(apogee))
        center_arcminutes = 60 * (geometry["equation_of_center"] - float(table.equation_of_center))
        epicycle_arcminutes = 60 * (geometry["epicycle_equation"] - float(table.epicycle_equation))
        rounding_arcminutes = 60 * (table.longitude_before_final_rounding - table.longitude)
        self.assertAlmostEqual(center_arcminutes, 0.29698549578, places=6)
        self.assertAlmostEqual(epicycle_arcminutes, 5.91270386483, places=6)
        self.assertEqual(rounding_arcminutes, Fraction(25, 60))
        self.assertAlmostEqual(60 * signed_difference(geometry["longitude"], float(table.longitude)),
                               center_arcminutes + epicycle_arcminutes + float(rounding_arcminutes), places=9)


def _sex(value):
    """Exact source argument composition, without decimal float formatting."""
    degree = int(value)
    minutes = (value - degree) * 60
    minute = int(minutes)
    seconds = (minutes - minute) * 60
    return f"{degree};{minute},{int(seconds)}"


class CommonChronology(unittest.TestCase):
    def test_calendar_and_day_boundaries(self):
        self.assertEqual(civil_to_jdn(0, 2, 29, "julian") + 1, civil_to_jdn(0, 3, 1, "julian"))
        self.assertEqual(civil_to_jdn(0, 2, 29, "gregorian") + 1, civil_to_jdn(0, 3, 1, "gregorian"))
        with self.assertRaises(ValueError):
            civil_to_jdn(-1, 2, 29, "julian")
        for calendar in ("julian", "gregorian"):
            for year in (-746, -1, 0, 1, 2000):
                self.assertEqual(jdn_to_civil(civil_to_jdn(year, 12, 31, calendar), calendar), (year, 12, 31))

    def test_explicit_ut1_local_mean_tt_chain(self):
        # Meridian 30° is synthetic, chosen for an exact two-hour test;
        # no Alexandria longitude or ancient ΔT is asserted here.
        ut1 = ScaledJulianDay(EPOCH_LOCAL_JDN - 1 / 12, "UT1", provenance="synthetic fixture")
        local = ut1_to_local_mean(ut1, 30)
        self.assertEqual(local.scale, "LMT")
        self.assertEqual(local.value, days_to_local_jd(0))
        self.assertEqual(ptolemy_days_at_ut1(ut1, 30), 0)
        self.assertAlmostEqual(ut1_to_tt(ut1, 120, "synthetic ΔT").value - ut1.value, 120 / 86400)
        with self.assertRaises(ValueError):
            ut1_to_local_mean(ut1_to_tt(ut1, 120, "synthetic ΔT"), 30)
        with self.assertRaises(ValueError):
            ut1_to_tt(ut1, 120, "")


class ComparableLongitudes(unittest.TestCase):
    def test_wrapping_and_metadata(self):
        instant = ScaledJulianDay(2451545.0, "UT1")
        base = LongitudeSample(359, "Mars", instant, "synthetic-ecliptic-date", "geometric")
        other = LongitudeSample(1, "Mars", instant, "synthetic-ecliptic-date", "geometric")
        self.assertEqual(longitude_residual(base, other), -2)
        self.assertEqual(longitude_residual(other, base), 2)
        self.assertEqual(longitude_residual(LongitudeSample(180, "Mars", instant, base.frame_id, "geometric"),
                                            LongitudeSample(0, "Mars", instant, base.frame_id, "geometric")), -180)
        for changed in (
            LongitudeSample(1, "Mars", instant, "different-equinox", "geometric"),
            LongitudeSample(1, "Mars", instant, base.frame_id, "apparent"),
            LongitudeSample(1, "Jupiter", instant, base.frame_id, "geometric"),
            LongitudeSample(1, "Mars", ScaledJulianDay(2451546.0, "UT1"), base.frame_id, "geometric"),
        ):
            with self.assertRaises(ValueError):
                longitude_residual(base, changed)
        with self.assertRaises(ValueError):
            LongitudeSample(1, "Mars", ScaledJulianDay(2451545.0, "TT"), base.frame_id, "geometric")


if __name__ == "__main__":
    unittest.main()
