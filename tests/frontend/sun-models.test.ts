import assert from 'node:assert/strict';
import test from 'node:test';
import fixtures from '../fixtures/sun-cross-language.json' with { type: 'json' };
import source from '../fixtures/sun-source-cases.json' with { type: 'json' };
import { evaluateEarthDays } from '../../web/src/copernicus.ts';
import { evaluateCopernicusSunDays } from '../../web/src/copernicus-sun.ts';
import { angularDifference } from '../../web/src/model.ts';
import { analyticPtolemySolarEquation, evaluatePtolemySunArguments,
  evaluatePtolemySunDays, sunRecord } from '../../web/src/sun-almagest.ts';

const near = (actual: number, expected: number, tolerance = 3e-8): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by ${actual - expected}`);

function compareResult(actual: Record<string, unknown>, expected: Record<string, unknown>): number {
  let compared = 0;
  for (const [key, value] of Object.entries(actual)) {
    const pythonKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    assert.ok(Object.hasOwn(expected, pythonKey), pythonKey);
    const sourceValue = expected[pythonKey];
    if (typeof value === 'number') {
      near(value, sourceValue as number);
      compared++;
    } else if (typeof value === 'string') {
      assert.equal(value, sourceValue);
    } else if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
      assert.ok(Array.isArray(sourceValue));
      near(value.x as number, sourceValue[0]);
      near(value.y as number, sourceValue[1]);
      compared += 2;
    }
  }
  return compared;
}

test('Ptolemaic Sun shares its source record and agrees with independent Python outputs', () => {
  assert.equal(sunRecord.model_id, 'ptolemy-almagest-sun-longitude');
  let numericFields = 0;
  for (const item of fixtures.ptolemy_argument_cases) {
    numericFields += compareResult(evaluatePtolemySunArguments(...item.arguments as [number, number]),
      item.result);
  }
  for (const item of fixtures.ptolemy_date_cases) {
    numericFields += compareResult(evaluatePtolemySunDays(item.days), item.result);
  }
  assert.ok(numericFields >= 150);
});

test('original source cases, equation sign and eccentric invariants stay separate from the fixture', () => {
  const epoch = evaluatePtolemySunDays(0);
  near(epoch.meanLongitude, 330.75);
  near(epoch.meanAnomaly, 265.25);
  near(epoch.longitude, 333 + 8 / 60, 0.5 / 60);
  for (const row of source.table_rows) {
    const first = analyticPtolemySolarEquation(row.mean_anomaly_degrees);
    const second = analyticPtolemySolarEquation(row.symmetric_anomaly_degrees);
    near(Math.abs(first), row.equation_magnitude_degrees, 0.7 / 60);
    near(Math.abs(second), row.equation_magnitude_degrees, 0.7 / 60);
    near(first, -second, 1e-10);
  }
  for (let anomaly = 0; anomaly < 360; anomaly += 13) {
    const state = evaluatePtolemySunArguments(65.5 + anomaly, 65.5);
    near(Math.hypot(state.eccentricCenter.x, state.eccentricCenter.y), 2.5);
    near(Math.hypot(state.sun.x - state.eccentricCenter.x,
      state.sun.y - state.eccentricCenter.y), 60);
    near(state.solarEquation, analyticPtolemySolarEquation(anomaly), 1e-10);
  }
});

test('Copernican solar prediction is the original Earth theory without a Mars policy', () => {
  for (const item of fixtures.copernicus_date_cases) {
    const solar = evaluateCopernicusSunDays(item.days);
    const earth = evaluateEarthDays(item.days);
    compareResult(solar, item.result);
    assert.equal(solar.underlyingModelId, 'copernicus-1543-earth-longitude');
    assert.equal(solar.longitude, earth.solarTropicalLongitude);
    near(solar.solarSiderealLongitude,
      (Math.atan2(solar.earthToSun.y, solar.earthToSun.x) * 180 / Math.PI + 360) % 360);
    near(angularDifference(solar.longitude,
      solar.solarSiderealLongitude + solar.truePrecession), 0);
  }
});
