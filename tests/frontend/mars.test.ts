import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from '../fixtures/mars-cross-language.json' with { type: 'json' };
import source from '../fixtures/mars-source-cases.json' with { type: 'json' };
import model from '../../data/mars-almagest-v1.json' with { type: 'json' };
import { angularDifference, evaluateArguments, evaluateDays, modelRecord, parameter, validateModel, type MarsResult } from '../../web/src/model.ts';
import { civilToJdn, daysToEgyptian, daysToJulian, egyptianToDays, epochLocalJdn, jdnToCivil } from '../../web/src/chronology.ts';
import { isLanguage, message, messages } from '../../web/src/i18n.ts';
import { exampleDay } from '../../web/src/historical-examples.ts';
import { modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { emptyWorkspace, jumpToExample, setClockInstant, setClockPlaying,
  setClockSpeed, stepClock, tickClock } from '../../web/src/workspace-state.ts';
import { screenPoint, trailPoints } from '../../web/src/diagram.ts';

const nearly = (actual: number, expected: number, tolerance = 2e-9): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

function compare(result: MarsResult, expected: Record<string, unknown>): void {
  const points: readonly [keyof MarsResult, string][] = [
    ['earth', 'earth'], ['deferentCenter', 'deferent_center'], ['equant', 'equant'],
    ['epicycleCenter', 'epicycle_center'], ['planet', 'planet'],
  ];
  for (const [tsKey, pythonKey] of points) {
    const point = result[tsKey] as { x: number; y: number };
    const values = expected[pythonKey] as number[];
    nearly(point.x, values[0]);
    nearly(point.y, values[1]);
  }
  const scalars: readonly [keyof MarsResult, string][] = [
    ['deferentRadius', 'deferent_radius'], ['epicycleRadius', 'epicycle_radius'],
    ['meanLongitude', 'mean_longitude'], ['meanAnomaly', 'mean_anomaly'],
    ['apogeeLongitude', 'apogee_longitude'], ['meanCentrum', 'mean_centrum'],
    ['epicycleCenterLongitude', 'epicycle_center_longitude'],
    ['equationOfCenter', 'equation_of_center'], ['epicycleEquation', 'epicycle_equation'],
    ['longitude', 'longitude'], ['equantToEpicycleCenter', 'equant_to_epicycle_center'],
    ['earthToEpicycleCenter', 'earth_to_epicycle_center'], ['earthToPlanet', 'earth_to_planet'],
  ];
  for (const [tsKey, pythonKey] of scalars) nearly(result[tsKey] as number, expected[pythonKey] as number);
  nearly(Math.hypot(result.epicycleCenter.x - result.deferentCenter.x,
    result.epicycleCenter.y - result.deferentCenter.y), parameter('deferent_radius'), 1e-11);
  nearly(Math.hypot(result.planet.x - result.epicycleCenter.x,
    result.planet.y - result.epicycleCenter.y), parameter('epicycle_radius'), 1e-11);
  nearly(Math.hypot(result.equant.x - result.deferentCenter.x,
    result.equant.y - result.deferentCenter.y), parameter('half_eccentricity'), 1e-11);
}

test('browser model uses the versioned source record', () => {
  validateModel();
  assert.equal(modelRecord, model);
  for (const name of Object.keys(model.parameters) as (keyof typeof model.parameters)[]) {
    assert.equal(parameter(name), model.parameters[name].value);
  }
});

test('TypeScript agrees with independent Python geometry for source and synthetic arguments', () => {
  for (const item of fixture.argument_cases) {
    compare(evaluateArguments(...item.arguments as [number, number, number]), item.result);
  }
});

test('TypeScript agrees with Python for continuous Egyptian day cases', () => {
  for (const item of fixture.time_cases) compare(evaluateDays(item.days), item.result);
});

test('Neugebauer example retains the geometric/tabular distinction', () => {
  const item = fixture.argument_cases.find(item => item.id === source.scholarly_table_case.id);
  assert.ok(item);
  const result = evaluateArguments(...item.arguments as [number, number, number]);
  nearly(result.longitude, 47.66043926712124, 1e-10);
  nearly(result.equationOfCenter, source.scholarly_table_case.computed_cartesian_equation_of_center_degrees, 1e-10);
  nearly(result.epicycleEquation, source.scholarly_table_case.computed_cartesian_epicycle_equation_degrees, 1e-10);
  nearly(angularDifference(result.longitude, 47 + 33 / 60) * 60,
    source.scholarly_table_case.computed_minus_table_arcminutes, 1e-8);
  const dated = evaluateDays(exampleDay);
  nearly(dated.longitude, result.longitude, 0.001);
});

test('chronology, playback, and example jump are continuous', () => {
  assert.equal(epochLocalJdn, 1448638);
  assert.deepEqual(jdnToCivil(civilToJdn(-746, 2, 26)), { year: -746, month: 2, day: 26 });
  assert.equal(exampleDay, egyptianToDays({ year: 450, month: 10, day: 8, fraction: 0 }));
  assert.equal(exampleDay, 164162);
  assert.deepEqual(daysToEgyptian(exampleDay), { year: 450, month: 10, day: 8, fraction: 0 });
  assert.deepEqual(daysToJulian(exampleDay), { year: -297, month: 8, day: 10, fraction: 0.5 });
  assert.deepEqual(daysToJulian(0.5), { year: -746, month: 2, day: 27, fraction: 0 });
  let state = jumpToExample(emptyWorkspace(), 'nabonassar');
  state = setClockPlaying(state, true);
  state = tickClock(state, 0.05);
  nearly(modelDaysAtUt1(state.clock.ut1Jd).ptolemy, exampleDay + 0.6);
  state = stepClock(state, 10);
  nearly(modelDaysAtUt1(state.clock.ut1Jd).ptolemy, exampleDay + 10.6);
  state = jumpToExample(state, 'nabonassar');
  nearly(modelDaysAtUt1(state.clock.ut1Jd).ptolemy, exampleDay);
  assert.equal(state.clock.playing, false);
  assert.equal(setClockInstant(state, -1), state);
});

test('trail comes from evaluated model and fixed viewport scale', () => {
  const points = trailPoints(exampleDay, 180, 12);
  assert.equal(points.length, 13);
  const final = evaluateDays(exampleDay).planet;
  nearly(points.at(-1)!.x, final.x);
  nearly(points.at(-1)!.y, final.y);
  assert.deepEqual(screenPoint({ x: 0, y: 0 }), { x: 320, y: 320 });
});

test('both languages cover every interface key and language actions work', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.mn).sort());
  for (const language of ['en', 'mn'] as const) {
    for (const key of Object.keys(messages.en) as (keyof typeof messages.en)[]) {
      assert.ok(message(language, key).trim(), `${language}:${key}`);
    }
  }
  assert.equal(isLanguage('mn'), true);
  assert.equal(isLanguage('ru'), false);
  assert.equal(setClockSpeed(emptyWorkspace(), 20).clock.speedDaysPerSecond, 20);
});
