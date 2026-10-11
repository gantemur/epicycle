import json
import math
from pathlib import Path
from fractions import Fraction
import tempfile
import unittest
from unittest.mock import patch

from epicycle_atlas import copernicus_mars as mars
from epicycle_atlas import copernicus_earth as earth
from epicycle_atlas.chronology import ScaledJulianDay, civil_to_local_jd
from epicycle_atlas.copernicus_diagnostic import compare_at_ut1
from epicycle_atlas.mars import signed_difference

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT / "tests/fixtures/copernicus-source-cases.json").read_text())


def sex(text):
    sign = -1 if text.startswith('-') else 1
    return sign * float(sum(Fraction(int(n), 60**i) for i, n in
                       enumerate(text.lstrip('-').replace(';', ',').split(','))))


def days(y, m, d, hour=0, minute=0):
    return civil_to_local_jd(y, m, d, (hour+minute/60)/24) - earth.EPOCH_LOCAL_JD


def normdiff(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


class CopernicusSourceRecords(unittest.TestCase):
    def test_notation_values_and_lineage(self):
        for filename in ('earth-copernicus-1543-v1.json', 'mars-copernicus-1543-v1.json'):
            record = json.loads((ROOT/'data'/filename).read_text())
            for section in ('parameters', 'alternatives_not_used'):
                for name, p in record[section].items():
                    with self.subTest(file=filename, parameter=name):
                        self.assertAlmostEqual(p['value'], sex(p['sexagesimal']), places=12)
                        self.assertTrue(p['source'] and p['unit'] and p['status'])
            self.assertEqual(record['epoch']['astronomical_julian_date'], '0001-01-01')
        r = mars.definition()
        self.assertIsNone(r['unavailable']['apogee_annual_motion']['value'])
        self.assertIsNone(r['unavailable']['eccentricity_secular_law']['value'])
        p = r['parameters']
        # The modern-observation geometry, not V.15's ancient 1500 component.
        self.assertEqual([p[k]['value'] for k in ('principal_radius', 'double_eccentricity',
            'eccentric_component', 'small_epicycle_radius', 'earth_annual_radius')],
            [10000, 1960, 1460, 500, 6580])
        self.assertAlmostEqual(p['mean_commutation_annual_motion']['value'], sex('168;28,30,36,4'))

    def test_incompatible_earth_record_rejected(self):
        record = json.loads(mars.DATA_PATH.read_text())
        record['dependencies'][0]['model_id'] = 'different-earth'
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'mars.json'
            path.write_text(json.dumps(record))
            with patch.object(mars, 'DATA_PATH', path):
                with self.assertRaisesRegex(ValueError, 'incompatible'):
                    mars.definition.__wrapped__()


class CoupledGeometry(unittest.TestCase):
    def evaluate(self, L, alpha, A, **overrides):
        args = dict(solar_mean_apogee=71.5, theta=165, mean_precession=26.7)
        args.update(overrides)
        return mars.evaluate_mars_from_arguments(L, alpha, A, **args)

    def test_circles_vectors_and_independent_scalar_calculation(self):
        for k in range(0, 360, 13):
            for alpha in range(0, 360, 19):
                A = 119+40/60
                L = A+k+alpha
                x = self.evaluate(L, alpha, A)
                g = x['mars_geometry']
                G, M, C, P = [g[key] for key in ('mean_sun','eccentric_center','epicycle_center','mars')]
                E = x['earth_geometry_in_mars_units']['earth']
                self.assertAlmostEqual(normdiff(M,G),1460,places=9)
                self.assertAlmostEqual(normdiff(C,M),10000,places=9)
                self.assertAlmostEqual(normdiff(P,C),500,places=9)
                self.assertAlmostEqual(normdiff(E,G),6580,places=9)
                self.assertAlmostEqual(x['earth_to_mars'][0],P[0]-E[0],places=10)
                self.assertAlmostEqual(x['earth_to_mars'][1],P[1]-E[1],places=10)
                self.assertAlmostEqual(signed_difference(x['geocentric_sidereal_longitude'],
                    mars.analytic_longitude(L,alpha,A)),0,places=10)
                self.assertAlmostEqual(signed_difference(x['geocentric_tropical_longitude'],
                    x['geocentric_sidereal_longitude']+x['true_precession']),0,places=10)

    def test_mean_sun_translation_cancels_and_rotation_is_covariant(self):
        x = self.evaluate(262,98.5,119.66)
        y = self.evaluate(262,98.5,119.66,solar_mean_apogee=12,theta=0)
        self.assertGreater(normdiff(x['mars_geometry']['mars'],y['mars_geometry']['mars']),100)
        self.assertAlmostEqual(normdiff(x['earth_to_mars'],y['earth_to_mars']),0,places=9)
        z = self.evaluate(262+87,98.5,119.66+87,solar_mean_apogee=71.5+87)
        self.assertAlmostEqual(signed_difference(z['geocentric_sidereal_longitude'],
            x['geocentric_sidereal_longitude']+87),0,places=10)
        for k, target in ((0,10960),(180,9040)):
            a = self.evaluate(119+k,0,119)
            self.assertAlmostEqual(a['mars_geometry']['mean_sun_to_mars'],target,places=9)
            self.assertAlmostEqual(a['equation_of_center'],0,places=10)

    def test_january_1512_derivation(self):
        f = CASES['mars_1512']
        x = self.evaluate(sex(f['mean_sun']),sex(f['mean_commutation']),sex(f['implied_apogee']))
        g = x['mars_geometry']
        self.assertLess(abs(g['mean_sun_to_epicycle_center']-f['mean_sun_to_epicycle_center_C3_corrected']), .5)
        self.assertGreater(abs(g['mean_sun_to_epicycle_center']-f['mean_sun_to_epicycle_center_Copernicus']), 1.5)
        # Preserve the exact-geometry difference from the printed distance.
        self.assertGreater(g['mean_sun_to_mars']-f['mean_sun_to_mars_printed'],2)
        self.assertLess(g['mean_sun_to_mars']-f['mean_sun_to_mars_printed'],3)
        self.assertLess(abs(x['equation_of_center']-sex(f['center_equation_C3_corrected'])),.5/60)
        self.assertLess(abs(x['annual_parallax_equation']-sex(f['annual_parallax_equation'])),.5/60)
        residual = 60*signed_difference(x['geocentric_sidereal_longitude'],sex(f['observed_geocentric_sidereal_longitude']))
        self.assertTrue(-1.6 < residual < -1.4)
        radius = 10776*math.sin(math.radians(sex('35;9')))/math.sin(math.radians(sex('70;32')))
        self.assertLess(abs(radius-6580),1)

    def test_1512_printed_sc_retention_reconstructs_sp(self):
        # C1 V.19 / C3 p.365: change only SC, retaining the computed
        # directions. This tests a plausible arithmetic path, not intent.
        f = CASES['mars_1512']
        x = self.evaluate(sex(f['mean_sun']),sex(f['mean_commutation']),sex(f['implied_apogee']))
        g = x['mars_geometry']
        G, C, P = (g[k] for k in ('mean_sun', 'epicycle_center', 'mars'))
        center = (C[0]-G[0], C[1]-G[1])
        epicycle = (P[0]-C[0], P[1]-C[1])
        cosine = sum(a*b for a,b in zip(center,epicycle)) / (math.hypot(*center)*math.hypot(*epicycle))
        def substituted_sp(sc):
            return math.sqrt(sc**2 + 500**2 + 2*sc*500*cosine)
        self.assertAlmostEqual(substituted_sp(f['mean_sun_to_epicycle_center_Copernicus']), 10776.238, delta=.001)
        self.assertAlmostEqual(substituted_sp(f['mean_sun_to_epicycle_center_C3_corrected']), 10778.237, delta=.001)

    def test_scholarly_1473_table_example(self):
        f = CASES['mars_1473']
        d = days(*f['local_julian_date'])
        self.assertAlmostEqual(d,1473*365+52.7,places=9)
        x = mars.evaluate_mars(d,apsis_policy=mars.APSIS_POLICY)
        for key, source in (('mean_commutation','mean_commutation'),('mars_apogee','apogee')):
            self.assertLess(abs(x[key]-sex(f[source])),.5/60)
        self.assertLess(abs(x['earth_model']['mean_sun_longitude']-sex(f['mean_sun'])),.5/60)
        # C3's table procedure is not the continuous geometry.
        self.assertLess(abs(x['geocentric_sidereal_longitude']-sex(f['sidereal_longitude'])),2/60)
        self.assertLess(abs(x['geocentric_tropical_longitude']-sex(f['tropical_longitude'])),2/60)

    def test_epoch_motion_and_policy_boundaries(self):
        at_epoch = mars.evaluate_mars(0,apogee_longitude=119,apogee_provenance='synthetic epoch check only')
        self.assertAlmostEqual(at_epoch['mean_planet_longitude'],34+9/60)
        later = mars.evaluate_mars(365,apogee_longitude=119,apogee_provenance='synthetic annual motion check only')
        advance = (later['mean_planet_longitude']-at_epoch['mean_planet_longitude'])%360
        self.assertAlmostEqual(advance,sex('191;16,18,31,0'),places=10)
        start, end = days(1473,2,19), days(1523,2,22,5)
        self.assertAlmostEqual(mars.evaluate_mars(end,apsis_policy=mars.APSIS_POLICY)['mars_apogee'],sex('119;40'))
        mars.evaluate_mars(start,apsis_policy=mars.APSIS_POLICY)
        for d in (start-1/86400,end+1/86400):
            with self.assertRaisesRegex(ValueError,'restricted'):
                mars.evaluate_mars(d,apsis_policy=mars.APSIS_POLICY)
        for kwargs in ({},{'apogee_longitude':119},{'apsis_policy':'unattested'},
                       {'apsis_policy':mars.APSIS_POLICY,'apogee_longitude':119},
                       {'apogee_longitude':float('nan'),'apogee_provenance':'invalid'}):
            with self.assertRaises(ValueError):
                mars.evaluate_mars(end,**kwargs)


class ConditionalComparison(unittest.TestCase):
    def test_explicit_time_and_frame_boundaries(self):
        # Geographic choices are deliberately declared assumptions in this test.
        instant = ScaledJulianDay(civil_to_local_jd(1512,1,1,.25)-20/360,'UT1')
        kwargs = dict(meridian_provenance='synthetic 30E/20E choices',apsis_policy=mars.APSIS_POLICY)
        native = compare_at_ut1(instant,30,20,**kwargs)
        self.assertIsNone(native['copernicus_minus_ptolemy_degrees'])
        self.assertAlmostEqual(native['copernicus']['days_since_christ_epoch'],1512*365+12.25)
        aligned = compare_at_ut1(instant,30,20,frame_offset_degrees=0,
                                frame_provenance='nominal common equinox of date and plane',**kwargs)
        self.assertAlmostEqual(aligned['copernicus_minus_ptolemy_degrees'],signed_difference(
            aligned['copernicus']['native_tropical_longitude'],aligned['ptolemy']['native_tropical_longitude']))
        shifted = compare_at_ut1(instant,30,20,frame_offset_degrees=1,
                                frame_provenance='synthetic rotation',**kwargs)
        self.assertAlmostEqual(shifted['copernicus_minus_ptolemy_degrees']-aligned['copernicus_minus_ptolemy_degrees'],1)
        with self.assertRaises(ValueError):
            compare_at_ut1(instant,30,20,frame_offset_degrees=0,**kwargs)
        with self.assertRaises(ValueError):
            compare_at_ut1(ScaledJulianDay(instant.value,'TT'),30,20,**kwargs)


if __name__ == '__main__':
    unittest.main()
