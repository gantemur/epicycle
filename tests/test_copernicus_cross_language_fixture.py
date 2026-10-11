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
    def test_fixture_matches_python_evaluators(self):
        saved = json.loads(FIXTURE.read_text(encoding="utf-8"))
        normalized = lambda value: json.loads(json.dumps(value))
        for item in saved["earth_argument_cases"]:
            self.assertEqual(item["result"], normalized(evaluate_earth_from_arguments(*item["arguments"])))
        for item in saved["earth_date_cases"]:
            self.assertEqual(item["result"], normalized(evaluate_earth(item["days"])))
        for item in saved["mars_argument_cases"]:
            a = item["arguments"]
            self.assertEqual(item["result"], normalized(evaluate_mars_from_arguments(
                a[0], a[1], a[2], solar_mean_apogee=a[3], theta=a[4], mean_precession=a[5])))
        for item in saved["mars_date_cases"]:
            self.assertEqual(item["result"], normalized(evaluate_mars(item["days"], apsis_policy=APSIS_POLICY)))
        for item in saved["mars_exploratory_cases"]:
            self.assertEqual(item["result"], normalized(evaluate_mars(
                item["days"], apsis_policy=EXPLORATORY_APSIS_POLICY)))


if __name__ == "__main__":
    unittest.main()
