"""Guard the committed Python reference fixture against stale evaluator output."""

import json
import unittest
from pathlib import Path

from epicycle_atlas.copernicus_earth import evaluate_earth, evaluate_earth_from_arguments
from epicycle_atlas.copernicus_mars import (
    APSIS_POLICY, EXPLORATORY_APSIS_POLICY, evaluate_mars, evaluate_mars_from_arguments,
)


FIXTURE = Path(__file__).parent / "fixtures/copernicus-cross-language.json"


class CopernicusCrossLanguageFixtureTests(unittest.TestCase):
    def assert_fixture_equal(self, expected, actual, path="result"):
        if isinstance(expected, dict):
            self.assertIsInstance(actual, dict, path)
            self.assertEqual(expected.keys(), actual.keys(), path)
            for key in expected:
                self.assert_fixture_equal(expected[key], actual[key], f"{path}.{key}")
        elif isinstance(expected, list):
            self.assertIsInstance(actual, list, path)
            self.assertEqual(len(expected), len(actual), path)
            for index, (saved, computed) in enumerate(zip(expected, actual)):
                self.assert_fixture_equal(saved, computed, f"{path}[{index}]")
        elif isinstance(expected, float):
            # Platform math libraries can differ by a few last-place bits.
            self.assertAlmostEqual(expected, actual, delta=1e-9, msg=path)
        else:
            self.assertEqual(expected, actual, path)

    def test_fixture_matches_python_evaluators(self):
        saved = json.loads(FIXTURE.read_text(encoding="utf-8"))
        normalized = lambda value: json.loads(json.dumps(value))
        for item in saved["earth_argument_cases"]:
            self.assert_fixture_equal(item["result"], normalized(evaluate_earth_from_arguments(*item["arguments"])))
        for item in saved["earth_date_cases"]:
            self.assert_fixture_equal(item["result"], normalized(evaluate_earth(item["days"])))
        for item in saved["mars_argument_cases"]:
            a = item["arguments"]
            self.assert_fixture_equal(item["result"], normalized(evaluate_mars_from_arguments(
                a[0], a[1], a[2], solar_mean_apogee=a[3], theta=a[4], mean_precession=a[5])))
        for item in saved["mars_date_cases"]:
            self.assert_fixture_equal(item["result"], normalized(evaluate_mars(item["days"], apsis_policy=APSIS_POLICY)))
        for item in saved["mars_exploratory_cases"]:
            self.assert_fixture_equal(item["result"], normalized(evaluate_mars(
                item["days"], apsis_policy=EXPLORATORY_APSIS_POLICY)))


if __name__ == "__main__":
    unittest.main()
