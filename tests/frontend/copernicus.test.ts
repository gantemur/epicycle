import assert from 'node:assert/strict';
import test from 'node:test';
import fixture from '../fixtures/copernicus-cross-language.json' with { type: 'json' };
import { apsisDomainLocalDays, copernicusEpochJd, earthRecord, evaluateEarthArguments, evaluateEarthDays,
  exploratoryApsisPolicy,
  evaluateMarsArguments, evaluateMarsDays, marsRecord, validateCopernicusRecords } from '../../web/src/copernicus.ts';
import { compareAtUt1, evaluateSelectedModel, sampleComparisonPlot, sampleSelectedPlot,
  selectedPlotCacheKey, unwrapLongitudes, wrappedSegments } from '../../web/src/comparison.ts';
import { civilToLocalJd, comparisonUt1Domain, example1473Ut1, example1512Ut1,
  formatFrauenburgInput, frauenburgCivilToUt1, modelDaysAtUt1, parseFrauenburgInput,
  utcMillisToAssumedUt1 } from '../../web/src/comparison-time.ts';
import { angularDifference } from '../../web/src/model.ts';
import { dateAllowed, models } from '../../web/src/model-registry.ts';
import { applyWorkspacePreset, emptyWorkspace, setClockInstant, setClockPlaying,
  tickClock, updateDisplay } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt } from '../../web/src/workspace-validation.ts';
import type { TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

const nearly = (actual: number, expected: number, tolerance = 3e-8): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const point = (actual: { x: number; y: number }, expected: number[]): void => {
  nearly(actual.x, expected[0]); nearly(actual.y, expected[1]);
};

test('all Python fixture numeric fields agree across the port', () => {
  let compared = 0;
  const compare = (actual: unknown, expected: unknown, path: string): void => {
    if (typeof actual === 'number') {
      assert.equal(typeof expected, 'number', path);
      nearly(actual, expected as number);
      compared++;
    } else if (actual && typeof actual === 'object' && 'x' in actual && 'y' in actual) {
      assert.ok(Array.isArray(expected), path);
      compare(actual.x, expected[0], `${path}.x`);
      compare(actual.y, expected[1], `${path}.y`);
    } else if (actual && typeof actual === 'object') {
      assert.ok(expected && typeof expected === 'object', path);
      for (const [key, value] of Object.entries(actual)) {
        const pythonKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        assert.ok(pythonKey in expected, `${path}.${pythonKey}`);
        compare(value, (expected as Record<string, unknown>)[pythonKey], `${path}.${pythonKey}`);
      }
    }
  };
  for (const item of fixture.earth_argument_cases) compare(evaluateEarthArguments(...item.arguments as [number, number, number, number]), item.result, 'earth argument');
  for (const item of fixture.earth_date_cases) compare(evaluateEarthDays(item.days), item.result, 'earth date');
  for (const item of fixture.mars_argument_cases) compare(evaluateMarsArguments(...item.arguments as [number, number, number, number, number, number]), item.result, 'mars argument');
  for (const item of fixture.mars_date_cases) compare(evaluateMarsDays(item.days), item.result, 'mars date');
  for (const item of fixture.mars_exploratory_cases) {
    compare(evaluateMarsDays(item.days, exploratoryApsisPolicy), item.result, 'exploratory Mars date');
  }
  assert.ok(compared >= 600);
});

test('exploratory policy agrees with Python through 2026 and keeps historical constants', () => {
  for (const item of fixture.mars_exploratory_cases) {
    const result = evaluateMarsDays(item.days, exploratoryApsisPolicy);
    mars(result, item.result);
    assert.equal(result.apsisAssignment.policy, exploratoryApsisPolicy);
    assert.equal(result.marsGeometry.eccentricComponent, 1460);
    assert.equal(result.marsGeometry.smallEpicycleRadius, 500);
  }
  const inside = fixture.mars_date_cases[1].days;
  nearly(evaluateMarsDays(inside).geocentricTropicalLongitude,
    evaluateMarsDays(inside, exploratoryApsisPolicy).geocentricTropicalLongitude, 1e-11);
});

test('registry selectors and policy domain act only on selected models', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  assert.equal(models.copernicus.dependencies[0], 'copernicus-1543-earth-longitude');
  const plot = state.displays[0] as TimeSeriesDisplay;
  assert.deepEqual(plot.traces.map(trace => trace.modelId), ['ptolemy', 'copernicus']);
  const future = frauenburgCivilToUt1(2026, 10, 11);
  assert.equal(dateAllowed(future, ['ptolemy'], plot.traces[0].policyId), true);
  assert.equal(dateAllowed(future, ['copernicus'], plot.traces[1].policyId), false);
  state = setClockInstant(state, future);
  assert.equal(state.clock.ut1Jd, future);
  assert.equal(displayAvailabilityAt(state.displays[0], future).status, 'partial');
  const changed = updateDisplay(state, { ...plot, traces: [plot.traces[0],
    { ...plot.traces[1], policyId: exploratoryApsisPolicy }] });
  assert.equal(displayAvailabilityAt(changed.displays[0], future).status, 'available');
  assert.equal((state.displays[0] as TimeSeriesDisplay).traces[1].policyId, plot.traces[1].policyId);
  assert.equal(evaluateSelectedModel('ptolemy', future, exploratoryApsisPolicy).model, 'ptolemy');
  assert.equal(evaluateSelectedModel('copernicus', future, exploratoryApsisPolicy).model, 'copernicus');
});

test('Julian input and Today conversion keep civil systems distinct', () => {
  const valid = '1513-06-02T23:57';
  const instant = parseFrauenburgInput(valid);
  assert.equal(formatFrauenburgInput(instant), valid);
  assert.equal(dateAllowed(instant, ['copernicus'], 'sn-local-uniform-1473-1523'), true);
  assert.throws(() => parseFrauenburgInput('1513-06-31T23:57'));
  assert.equal(formatFrauenburgInput(parseFrauenburgInput('-0500-03-01T12:00')),
    '-0500-03-01T12:00');
  // 2026-10-11T00:00Z is Gregorian civil time. In 2026 the Julian label is Sep 28.
  const modernUtcMilliseconds = 1791676800000;
  const modernInstant = utcMillisToAssumedUt1(modernUtcMilliseconds);
  assert.equal(formatFrauenburgInput(modernInstant).slice(0, 10), '2026-09-28');
});

test('plot range stays fixed during playback, with wrapped breaks and stable unwrapping', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const start = example1512Ut1 - 45, end = example1512Ut1 + 45;
  const old = state.displays[0] as TimeSeriesDisplay;
  state = updateDisplay(state, { ...old, window: { ...old.window, startUt1: start, endUt1: end } });
  const plot = state.displays[0] as TimeSeriesDisplay;
  const key = selectedPlotCacheKey(plot.window.startUt1, plot.window.endUt1,
    'ptolemy', 'copernicus', 'sn-local-uniform-1473-1523', plot.longitudeMode, 'en');
  state = tickClock(setClockPlaying(state, true), .05);
  assert.equal((state.displays[0] as TimeSeriesDisplay).window.startUt1, start);
  assert.equal(selectedPlotCacheKey(plot.window.startUt1, plot.window.endUt1,
    'ptolemy', 'copernicus', 'sn-local-uniform-1473-1523', plot.longitudeMode, 'en'), key);
  const continuous = sampleSelectedPlot(start, end, 'ptolemy', 'copernicus',
    'sn-local-uniform-1473-1523', 'unwrapped');
  assert.equal(continuous.count, 30);
  for (let index = 1; index < continuous.a.length; index++) {
    assert.ok(Math.abs(continuous.a[index] - continuous.a[index - 1]) < 180);
  }
  assert.ok(Math.abs(continuous.a[0] - continuous.b[0]) <= 180);
  const wrapped = sampleSelectedPlot(start, end, 'ptolemy', 'copernicus',
    'sn-local-uniform-1473-1523', 'wrapped');
  assert.equal(wrapped.minLongitude, 0);
  assert.equal(wrapped.maxLongitude, 360);
  for (let index = 0; index < wrapped.difference.length; index++) {
    nearly(wrapped.difference[index],
      angularDifference(wrapped.b[index], wrapped.a[index]), 1e-11);
  }
  assert.deepEqual(wrappedSegments([358, 359, 1, 2]), [[358, 359], [1, 2]]);
  const twoYears = sampleSelectedPlot(example1512Ut1 - 365, example1512Ut1 + 365,
    'ptolemy', 'copernicus', 'sn-local-uniform-1473-1523', 'unwrapped');
  const slopes = twoYears.a.slice(1).map((value, index) => Math.sign(value - twoYears.a[index]));
  assert.ok(slopes.some((slope, index) => index > 0 && slope !== slopes[index - 1]),
    'three-day samples retain retrograde stationary reversals');
  assert.throws(() => sampleSelectedPlot(start, start + 365 * 51,
    'ptolemy', 'ptolemy', 'sn-local-uniform-1473-1523', 'wrapped'));
});

function earth(actual: ReturnType<typeof evaluateEarthDays>, expected: Record<string, unknown>): void {
  const points = {
    trueSun: 'true_sun', eccentricCenter: 'eccentric_center', meanSun: 'mean_sun',
    earth: 'earth', earthFromMeanSun: 'earth_from_mean_sun', earthToSun: 'earth_to_sun',
  } as const;
  for (const [ts, py] of Object.entries(points)) point(actual[ts as keyof typeof points], expected[py] as number[]);
  const scalars = {
    annualRadius: 'annual_radius', eccentricComponent: 'eccentric_component',
    smallEccentricRadius: 'small_eccentric_radius', eccentricity: 'eccentricity',
    meanSunLongitude: 'mean_sun_longitude', earthAnnualDirection: 'earth_annual_direction',
    meanSolarApogee: 'mean_solar_apogee', trueSolarApogee: 'true_solar_apogee',
    apsidalEquation: 'apsidal_equation', theta: 'theta', meanSolarAnomaly: 'mean_solar_anomaly',
    trueSolarAnomaly: 'true_solar_anomaly', solarEquation: 'solar_equation',
    solarSiderealLongitude: 'solar_sidereal_longitude', meanPrecession: 'mean_precession',
    precessionEquation: 'precession_equation', truePrecession: 'true_precession',
    solarTropicalLongitude: 'solar_tropical_longitude',
  } as const;
  for (const [ts, py] of Object.entries(scalars)) nearly(actual[ts as keyof typeof scalars], expected[py] as number);
}

function mars(actual: ReturnType<typeof evaluateMarsDays>, expected: Record<string, unknown>): void {
  earth(actual.earthModel, expected.earth_model as Record<string, unknown>);
  nearly(actual.earthToMarsScale, expected.earth_to_mars_scale as number);
  const scaled = expected.earth_geometry_in_mars_units as Record<string, number[]>;
  point(actual.earthGeometryInMarsUnits.trueSun, scaled.true_sun);
  point(actual.earthGeometryInMarsUnits.eccentricCenter, scaled.eccentric_center);
  point(actual.earthGeometryInMarsUnits.meanSun, scaled.mean_sun);
  point(actual.earthGeometryInMarsUnits.earth, scaled.earth);
  const geometry = expected.mars_geometry as Record<string, number | number[]>;
  for (const [ts, py] of [['meanSun', 'mean_sun'], ['eccentricCenter', 'eccentric_center'],
    ['epicycleCenter', 'epicycle_center'], ['mars', 'mars'], ['marsFromMeanSun', 'mars_from_mean_sun']] as const) {
    point(actual.marsGeometry[ts], geometry[py] as number[]);
  }
  for (const [ts, py] of [['principalRadius', 'principal_radius'], ['eccentricComponent', 'eccentric_component'],
    ['smallEpicycleRadius', 'small_epicycle_radius'], ['meanSunToEpicycleCenter', 'mean_sun_to_epicycle_center'],
    ['meanSunToMars', 'mean_sun_to_mars']] as const) nearly(actual.marsGeometry[ts], geometry[py] as number);
  point(actual.earthToMars, expected.earth_to_mars as number[]);
  const scalars = {
    earthToMarsDistance: 'earth_to_mars_distance', meanCommutation: 'mean_commutation',
    meanPlanetLongitude: 'mean_planet_longitude', marsApogee: 'mars_apogee',
    eccentricAnomaly: 'eccentric_anomaly', epicycleOffsetDirection: 'epicycle_offset_direction',
    meanSunMarsLongitude: 'mean_sun_mars_longitude', equationOfCenter: 'equation_of_center',
    correctedCommutation: 'corrected_commutation', annualParallaxEquation: 'annual_parallax_equation',
    geocentricSiderealLongitude: 'geocentric_sidereal_longitude',
    geocentricTropicalLongitude: 'geocentric_tropical_longitude', truePrecession: 'true_precession',
  } as const;
  for (const [ts, py] of Object.entries(scalars)) nearly(actual[ts as keyof typeof scalars], expected[py] as number);
}

test('Copernican records and Python Earth geometry agree for arguments and dates', () => {
  validateCopernicusRecords();
  assert.equal(earthRecord.parameters.annual_radius.value, 10000);
  assert.equal(marsRecord.parameters.earth_annual_radius.value, 6580);
  assert.equal(copernicusEpochJd, 1721423.5);
  for (const item of fixture.earth_argument_cases) earth(evaluateEarthArguments(...item.arguments as [number, number, number, number]), item.result);
  for (const item of fixture.earth_date_cases) earth(evaluateEarthDays(item.days), item.result);
});

test('Copernican Mars port agrees with Python points, lengths, corrections and precession', () => {
  for (const item of fixture.mars_argument_cases) mars(evaluateMarsArguments(...item.arguments as [number, number, number, number, number, number]), item.result);
  for (const item of fixture.mars_date_cases) mars(evaluateMarsDays(item.days), item.result);
  const sample = evaluateMarsDays(fixture.mars_date_cases[1].days);
  nearly(Math.hypot(sample.earthGeometryInMarsUnits.earth.x - sample.earthGeometryInMarsUnits.meanSun.x,
    sample.earthGeometryInMarsUnits.earth.y - sample.earthGeometryInMarsUnits.meanSun.y), 6580);
  nearly(sample.geocentricTropicalLongitude,
    (sample.geocentricSiderealLongitude + sample.truePrecession) % 360);
  const translated = evaluateMarsArguments(262, 98 + 28 / 60, 119 + 40 / 60, 61 + 17 / 60, 165 + 39 / 60, 26);
  const shifted = evaluateMarsArguments(262, 98 + 28 / 60, 119 + 40 / 60, 240, 23, 26);
  nearly(translated.geocentricSiderealLongitude, shifted.geocentricSiderealLongitude);
  nearly(translated.earthToMarsDistance, shifted.earthToMarsDistance);
});

test('Julian chronology, policy endpoints and one shared UT1 instant', () => {
  nearly(modelDaysAtUt1(example1512Ut1).copernicus, civilToLocalJd(1512, 1, 1, .25) - copernicusEpochJd);
  nearly(modelDaysAtUt1(example1473Ut1).ptolemy - modelDaysAtUt1(example1512Ut1).ptolemy,
    example1473Ut1 - example1512Ut1);
  assert.equal(formatFrauenburgInput(example1512Ut1), '1512-01-01T06:00');
  nearly(parseFrauenburgInput('1512-01-01T06:00'), example1512Ut1);
  assert.equal(frauenburgCivilToUt1(1500, 2, 29) < example1512Ut1, true); // Julian leap year.
  assert.throws(() => parseFrauenburgInput('1501-02-29T00:00'));
  nearly(modelDaysAtUt1(comparisonUt1Domain.start).copernicus, apsisDomainLocalDays.start);
  nearly(modelDaysAtUt1(comparisonUt1Domain.end).copernicus, apsisDomainLocalDays.end);
  evaluateMarsDays(apsisDomainLocalDays.start);
  evaluateMarsDays(apsisDomainLocalDays.end);
  assert.throws(() => evaluateMarsDays(apsisDomainLocalDays.start - .001));
  assert.throws(() => evaluateMarsDays(apsisDomainLocalDays.end + .001));
});

test('model disagreement requires declared alignment; plot unwraps whole turns', () => {
  const native = compareAtUt1(example1512Ut1, false);
  assert.equal(native.frameAlignment, null);
  assert.equal(native.copernicusMinusPtolemy, null);
  const aligned = compareAtUt1(example1512Ut1, true);
  nearly(aligned.ptolemy.longitude, 210.909404, .000002);
  nearly(aligned.copernicus.geocentricTropicalLongitude, 218.639983, .000002);
  nearly(aligned.copernicusMinusPtolemy!, 7.730579, .000002);
  nearly(aligned.copernicusMinusPtolemy!, angularDifference(aligned.copernicus.geocentricTropicalLongitude, aligned.ptolemy.longitude));
  assert.deepEqual(unwrapLongitudes([358, 359, 1, 3, 359]), [358, 359, 361, 363, 359]);
  const plot = sampleComparisonPlot(example1512Ut1 - 90, example1512Ut1 + 90, 24);
  assert.equal(plot.ptolemy.length, 25);
  assert.equal(plot.copernicus.length, 25);
  for (const curve of [plot.ptolemy, plot.copernicus]) for (let i = 1; i < curve.length; i++) {
    assert.ok(Math.abs(curve[i] - curve[i - 1]) < 180);
  }
  assert.throws(() => sampleComparisonPlot(comparisonUt1Domain.start - 1, comparisonUt1Domain.end));
});

test('one playback state advances both models and continues beyond a panel policy boundary', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  assert.equal(state.clock.ut1Jd, example1512Ut1);
  for (let i = 0; i < 3; i++) {
    state = tickClock(setClockPlaying(state, true), .05);
    const a = compareAtUt1(state.clock.ut1Jd, true);
    nearly(a.ptolemyDays - a.copernicusDays,
      modelDaysAtUt1(example1512Ut1).ptolemy - modelDaysAtUt1(example1512Ut1).copernicus);
    state = setClockPlaying(state, false);
    const paused = state.clock.ut1Jd;
    state = tickClock(state, .1);
    assert.equal(state.clock.ut1Jd, paused);
  }
  state = tickClock(setClockPlaying(setClockInstant(state, comparisonUt1Domain.end - .01), true), .1);
  assert.ok(state.clock.ut1Jd > comparisonUt1Domain.end);
  assert.equal(state.clock.playing, true);
  assert.equal(displayAvailabilityAt(state.displays[0], state.clock.ut1Jd).status, 'partial');
});
