import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from '../fixtures/copernicus-outer-cross-language.json' with { type: 'json' };
import jupiterSource from '../fixtures/jupiter-copernicus-source-cases.json' with { type: 'json' };
import saturnSource from '../fixtures/saturn-copernicus-source-cases.json' with { type: 'json' };
import { evaluateSuperiorArguments, evaluateSuperiorDays, analyticSuperiorLongitude,
  jupiterRecord, saturnRecord, toCommonEarthUnits,
  type SuperiorBody } from '../../web/src/copernicus-superior.ts';
import { evaluateEarthDays, evaluateMarsDays, exploratoryApsisPolicy } from '../../web/src/copernicus.ts';
import { angularDifference } from '../../web/src/model.ts';

const close = (actual: number, expected: number, tolerance = 3e-8): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const point = (actual: { x: number; y: number }, expected: readonly number[]): void => {
  close(actual.x, expected[0]); close(actual.y, expected[1]);
};

function compare(result: ReturnType<typeof evaluateSuperiorDays>, expected: typeof fixture.date_cases[number]['result']): void {
  for (const [key, actual] of [
    ['mean_commutation', result.meanCommutation], ['mean_planet_longitude', result.meanPlanetLongitude],
    ['planet_apogee', result.planetApogee], ['equation_of_center', result.equationOfCenter],
    ['annual_parallax_equation', result.annualParallaxEquation],
    ['geocentric_sidereal_longitude', result.geocentricSiderealLongitude],
    ['geocentric_tropical_longitude', result.geocentricTropicalLongitude],
    ['earth_to_planet_distance', result.earthToPlanetDistance],
    ['mean_sun_to_planet', result.planetGeometry.meanSunToPlanet],
    ['true_sun_to_planet', result.planetGeometry.trueSunToPlanet],
  ] as const) close(actual, expected[key]);
  point(result.earthToPlanet, expected.earth_to_planet);
  point(result.planetGeometry.meanSun, expected.mean_sun);
  point(result.planetGeometry.trueSun, expected.true_sun);
  point(result.earthGeometryInPlanetUnits.earth, expected.earth);
  point(result.planetGeometry.eccentricCenter, expected.eccentric_center);
  point(result.planetGeometry.epicycleCenter, expected.epicycle_center);
  point(result.planetGeometry.planet, expected.planet);
  const common = toCommonEarthUnits(result);
  point(common.earth, expected.common_earth);
  point(common.meanSun, expected.common_mean_sun);
  point(common.trueSun, expected.common_true_sun);
  point(common.planet, expected.common_planet);
  close(common.planetToCommonScale, expected.planet_to_common_scale);
}

test('generated Python cases agree for direct angles and historical dates', () => {
  for (const item of fixture.date_cases) {
    compare(evaluateSuperiorDays(item.body as SuperiorBody, item.days), item.result);
  }
  for (const item of fixture.argument_cases) {
    const args = item.arguments as [number, number, number, number, number, number];
    compare(evaluateSuperiorArguments(item.body as SuperiorBody, ...args), item.result);
  }
});

test('source cases and independent scalar longitude retain printed distinctions', () => {
  for (const [body, source] of [['jupiter', jupiterSource], ['saturn', saturnSource]] as const) {
    const a = source.source_arguments;
    const sexagesimal = (s: string): number => {
      const sign = s.startsWith('-') ? -1 : 1;
      const [whole, fractions = ''] = s.replace('-', '').split(';');
      return sign * (Number(whole) + fractions.split(',').filter(Boolean)
        .reduce((sum, part, index) => sum + Number(part) / 60 ** (index + 1), 0));
    };
    const meanSun = sexagesimal(a.mean_sun_sidereal);
    const alpha = sexagesimal(a.mean_commutation);
    const B = sexagesimal(a.sidereal_apogee_approximate);
    const result = evaluateSuperiorArguments(body, meanSun, alpha, B, 61, 0, 0);
    close(result.geocentricSiderealLongitude, analyticSuperiorLongitude(body, meanSun, alpha, B), 1e-10);
    assert.ok(Math.abs(angularDifference(result.geocentricSiderealLongitude,
      sexagesimal(a.reported_geocentric_sidereal_longitude))) < 1 / 60);
  }
});

test('historical Earth common scale and source record roundings', () => {
  assert.equal(jupiterRecord.parameters.reported_double_eccentricity.value, 917);
  assert.equal(jupiterRecord.parameters.eccentric_component.value +
    jupiterRecord.parameters.small_epicycle_radius.value, 916);
  assert.equal(saturnRecord.parameters.reported_double_eccentricity.value, 1139);
  assert.equal(saturnRecord.alternatives_not_used.manuscript_C1_prose_rate_pair
    .mean_commutation_annual_motion.sexagesimal, '347;32,2,54,12');
  for (const days of [0, 551900, -100000, 740000]) {
    const earth = evaluateEarthDays(days);
    const results = [evaluateSuperiorDays('jupiter', days), evaluateSuperiorDays('saturn', days),
      evaluateMarsDays(days, exploratoryApsisPolicy)];
    for (const result of results) {
      const common = toCommonEarthUnits(result);
      close(common.earth.x, earth.earth.x, 1e-9);
      close(common.earth.y, earth.earth.y, 1e-9);
      close(common.meanSun.x, earth.meanSun.x, 1e-9);
      close(common.meanSun.y, earth.meanSun.y, 1e-9);
    }
  }
});
