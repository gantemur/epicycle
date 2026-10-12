import assert from 'node:assert/strict';
import test from 'node:test';
import jupiterFixture from '../fixtures/jupiter-cross-language.json' with { type: 'json' };
import saturnFixture from '../fixtures/saturn-cross-language.json' with { type: 'json' };
import jupiterSource from '../fixtures/jupiter-source-cases.json' with { type: 'json' };
import saturnSource from '../fixtures/saturn-source-cases.json' with { type: 'json' };
import { epochLocalJdn } from '../../web/src/chronology.ts';
import { angularDifference } from '../../web/src/model.ts';
import { evaluatePtolemyJupiterArguments, evaluatePtolemyJupiterDays,
  jupiterRecord } from '../../web/src/ptolemy-jupiter.ts';
import { evaluatePtolemySaturnArguments, evaluatePtolemySaturnDays,
  saturnRecord } from '../../web/src/ptolemy-saturn.ts';

const near = (actual: number, expected: number, tolerance = 3e-8): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by ${actual - expected}`);

function compareResult(actual: Record<string, unknown>, expected: Record<string, unknown>): number {
  let numericFields = 0;
  for (const [key, value] of Object.entries(actual)) {
    const pythonKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    assert.ok(Object.hasOwn(expected, pythonKey), `Python fixture lacks ${pythonKey}`);
    const fixtureValue = expected[pythonKey];
    if (typeof value === 'number') {
      near(value, fixtureValue as number);
      numericFields++;
    } else if (typeof value === 'string') {
      assert.equal(value, fixtureValue);
    } else if (value && typeof value === 'object' && 'x' in value && 'y' in value) {
      assert.ok(Array.isArray(fixtureValue));
      near(value.x as number, fixtureValue[0]);
      near(value.y as number, fixtureValue[1]);
      numericFields += 2;
    }
  }
  assert.equal(Object.keys(actual).length, Object.keys(expected).length);
  return numericFields;
}

function sexagesimal(text: string): number {
  const zodiac: Record<string, number> = { Cancer: 90, Virgo: 150, Scorpio: 210 };
  const sign = text.startsWith('-') ? -1 : 1;
  const parts = text.replace(/^[+-]/, '').split(' ');
  const origin = parts.length === 2 ? zodiac[parts[0]] : 0;
  const digits = parts.at(-1)!.replace(';', ',').split(',').map(Number);
  return sign * (origin + digits.reduce((total, digit, place) =>
    total + digit / 60 ** place, 0));
}

const models = [
  { record: jupiterRecord, fixture: jupiterFixture, source: jupiterSource,
    arguments: evaluatePtolemyJupiterArguments, days: evaluatePtolemyJupiterDays },
  { record: saturnRecord, fixture: saturnFixture, source: saturnSource,
    arguments: evaluatePtolemySaturnArguments, days: evaluatePtolemySaturnDays },
] as const;

test('Jupiter and Saturn preserve source identities, common epoch and printed mean rates', () => {
  for (const model of models) {
    assert.equal(model.record.epoch.local_julian_day, epochLocalJdn);
    assert.equal(model.source.epoch.mean_longitude,
      model.record.parameters.mean_longitude_epoch.sexagesimal);
    assert.equal(model.source.epoch.mean_anomaly,
      model.record.parameters.mean_anomaly_epoch.sexagesimal);
    near(model.record.parameters.mean_longitude_daily_motion.value +
      model.record.parameters.mean_anomaly_daily_motion.value,
    0.9856352784422152, 1e-15);
    assert.equal(model.days(0).modelId, model.record.model_id);
  }
  assert.equal(saturnRecord.parameters.mean_longitude_epoch.sexagesimal, '296;43');
  assert.deepEqual(saturnRecord.unused_source_alternatives.map(item => item.sexagesimal),
    ['296;44', '296;45']);
});

test('Jupiter and Saturn agree with independent Python geometry and date fixtures', () => {
  let fields = 0;
  for (const model of models) {
    for (const item of model.fixture.argument_cases) {
      fields += compareResult(model.arguments(...item.arguments as [number, number, number]),
        item.result);
    }
    for (const item of model.fixture.date_cases) {
      fields += compareResult(model.days(item.days), item.result);
    }
  }
  assert.ok(fields >= 700);
});

test('independent Almagest cases retain rounded source and exact-circle distinctions', () => {
  for (const model of models) {
    const ancient = model.source.ancient_derived_case;
    const apogee = sexagesimal(ancient.apogee);
    const result = model.arguments(apogee + sexagesimal(ancient.mean_centrum),
      sexagesimal(ancient.mean_anomaly), apogee);
    assert.ok(Math.abs(angularDifference(result.longitude,
      sexagesimal(ancient.observed_longitude))) * 60 < 3);
    for (const row of model.source.anomaly_table_rows) {
      const tableMagnitude = sexagesimal(row.c3) + sexagesimal(row.c4);
      const exact = model.arguments(apogee + row.mean_centrum, 0, apogee);
      assert.ok(Math.abs(exact.equationOfCenter + tableMagnitude) * 60 < 1);
    }
  }
});

test('superior-planet circles retain original radii and wrapped angular quadrants', () => {
  for (const model of models) {
    const historical = model.record.parameters;
    const apogee = historical.apogee_longitude_epoch.value;
    for (const centrum of [0, 90, 135, 180, 270, 359]) {
      for (const anomaly of [0, 90, 179, 180, 270, 359]) {
        const result = model.arguments(apogee + centrum, anomaly, apogee);
        near(Math.hypot(result.deferentCenter.x, result.deferentCenter.y),
          historical.half_eccentricity.value, 1e-11);
        near(Math.hypot(result.equant.x, result.equant.y),
          historical.double_eccentricity.value, 1e-11);
        near(Math.hypot(result.epicycleCenter.x - result.deferentCenter.x,
          result.epicycleCenter.y - result.deferentCenter.y), 60, 1e-11);
        near(Math.hypot(result.planet.x - result.epicycleCenter.x,
          result.planet.y - result.epicycleCenter.y), historical.epicycle_radius.value, 1e-11);
        assert.ok(result.longitude >= 0 && result.longitude < 360);
      }
    }
  }
});
