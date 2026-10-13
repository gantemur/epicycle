import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { comparisonUt1Domain, example1512Ut1, frauenburgCivilToUt1,
  modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { apsisPolicy, earthRecord, evaluateEarthDays, evaluateMarsDays,
  exploratoryApsisPolicy } from '../../web/src/copernicus.ts';
import { evaluateSuperiorDays, toCommonEarthUnits } from '../../web/src/copernicus-superior.ts';
import { evaluateCopernicusMap, mapBodies, mapView, sampleMapTrail, sampleMapTrails,
  type MapBody } from '../../web/src/copernicus-map.ts';
import { message } from '../../web/src/i18n.ts';
import { changeMap } from '../../web/src/workspace-panel-actions.ts';
import { mapTrailCacheKey, mapTrailCadence, renderMapMarkers,
  renderMapTrails } from '../../web/src/workspace-map-view.ts';
import { addDisplay, applyWorkspacePreset, copernicanMap, emptyWorkspace, fitMap,
  moveDisplay, panMap, removeDisplay, resetMapCamera, restoreWorkspace,
  setClockInstant, setClockPlaying, setDisplayCollapsed, tickClock, updateDisplay,
  workspacePresets, zoomMap } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt, validateDisplay, validateWorkspace } from '../../web/src/workspace-validation.ts';
import type { PlanetaryMapDisplay } from '../../web/src/workspace-types.ts';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/copernicus-map-generated.json', import.meta.url),
  'utf8')) as { cases: Array<{ ut1_jd: number; local_days: number; frame_id: string;
  length_unit: string; mean_sun: [number, number];
  positions: Record<MapBody, [number, number]>;
  earth_to_planet_distances: Record<string, number>;
  planet_to_common_scales: Record<string, number> }> };
const close = (actual: number, expected: number, tolerance = 1e-7): void => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
};
const subtract = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  ({ x: a.x - b.x, y: a.y - b.y });

test('Python generated 1512 and 2026 common positions agree with the existing TypeScript kernels', () => {
  for (const item of fixture.cases) {
    const snapshot = evaluateCopernicusMap(item.ut1_jd, exploratoryApsisPolicy);
    assert.equal(snapshot.frameId, item.frame_id);
    assert.equal(snapshot.lengthUnit, item.length_unit);
    close(snapshot.copernicusDays, item.local_days, 1e-8);
    close(snapshot.meanSun.x, item.mean_sun[0]);
    close(snapshot.meanSun.y, item.mean_sun[1]);
    for (const body of mapBodies) {
      const point = snapshot.bodies[body].point!;
      close(point.x, item.positions[body][0]);
      close(point.y, item.positions[body][1]);
    }
    const day = modelDaysAtUt1(item.ut1_jd).copernicus;
    const earth = evaluateEarthDays(day);
    for (const [body, result] of [
      ['mars', toCommonEarthUnits(evaluateMarsDays(day, exploratoryApsisPolicy))],
      ['jupiter', toCommonEarthUnits(evaluateSuperiorDays('jupiter', day))],
      ['saturn', toCommonEarthUnits(evaluateSuperiorDays('saturn', day))],
    ] as const) {
      close(result.planetToCommonScale, item.planet_to_common_scales[body], 1e-12);
      close(result.earth.x, earth.earth.x);
      close(result.earth.y, earth.earth.y);
      close(result.trueSun.x, earth.trueSun.x);
      close(result.meanSun.y, earth.meanSun.y);
      close(Math.hypot(result.planet.x - earth.earth.x, result.planet.y - earth.earth.y),
        item.earth_to_planet_distances[`earth-${body}`]);
    }
    assert.equal(snapshot.frameId, earthRecord.frame.id);
  }
});

test('viewing-centre translation preserves all pairwise vectors and native sidereal angles', () => {
  const snapshot = evaluateCopernicusMap(example1512Ut1, apsisPolicy);
  const earth = mapView(snapshot, 'earth');
  const sun = mapView(snapshot, 'true-sun');
  const mars = mapView(snapshot, 'mars');
  assert.deepEqual(earth.bodies.earth!.point, { x: 0, y: 0 });
  assert.deepEqual(sun.bodies['true-sun']!.point, { x: 0, y: 0 });
  assert.deepEqual(mars.bodies.mars!.point, { x: 0, y: 0 });
  for (const first of mapBodies) for (const second of mapBodies) {
    const original = subtract(snapshot.bodies[first].point!, snapshot.bodies[second].point!);
    for (const view of [earth, sun, mars]) {
      const relative = subtract(view.bodies[first]!.point, view.bodies[second]!.point);
      close(relative.x, original.x);
      close(relative.y, original.y);
    }
  }
  const day = modelDaysAtUt1(example1512Ut1).copernicus;
  for (const [body, expected] of [
    ['mars', evaluateMarsDays(day, apsisPolicy).geocentricSiderealLongitude],
    ['jupiter', evaluateSuperiorDays('jupiter', day).geocentricSiderealLongitude],
    ['saturn', evaluateSuperiorDays('saturn', day).geocentricSiderealLongitude],
    ['true-sun', evaluateEarthDays(day).solarSiderealLongitude],
  ] as const) close(earth.bodies[body]!.siderealAngle, expected, 1e-9);
  const opposite = (earth.bodies['true-sun']!.siderealAngle + 180) % 360;
  close(sun.bodies.earth!.siderealAngle, opposite, 1e-9);
});

test('source-limited Mars is absent without erasing other bodies or replacing an unavailable centre', () => {
  const today = frauenburgCivilToUt1(2026, 10, 13);
  const guarded = evaluateCopernicusMap(today, apsisPolicy);
  assert.equal(guarded.bodies.mars.status, 'unavailable');
  assert.equal(guarded.bodies.mars.point, undefined);
  for (const body of ['true-sun', 'earth', 'jupiter', 'saturn'] as const) {
    assert.equal(guarded.bodies[body].status, 'available');
  }
  assert.equal(mapView(guarded, 'mars').available, false);
  assert.equal(mapView(guarded, 'earth').available, true);
  const exploratory = evaluateCopernicusMap(today, exploratoryApsisPolicy);
  assert.equal(exploratory.bodies.mars.provenance, 'exploratory-continuation');
  assert.equal(mapView(exploratory, 'mars').available, true);
  for (const edge of [comparisonUt1Domain.start, comparisonUt1Domain.end]) {
    assert.equal(evaluateCopernicusMap(edge, apsisPolicy).bodies.mars.status, 'available');
  }
  assert.throws(() => evaluateCopernicusMap(today, 'invalid' as typeof apsisPolicy));
});

test('moving-centre trail evaluates the centre anew at every time and ends at the live point', () => {
  const end = example1512Ut1;
  const start = end - 90;
  const trail = sampleMapTrail('jupiter', 'mars', apsisPolicy, start, end, 3);
  const first = trail[0]!;
  const current = trail.at(-1)!;
  assert.ok(first && current);
  const atStart = evaluateCopernicusMap(start, apsisPolicy);
  const atEnd = evaluateCopernicusMap(end, apsisPolicy);
  close(first.point.x, atStart.bodies.jupiter.point!.x - atStart.bodies.mars.point!.x);
  close(current.point.y, mapView(atEnd, 'mars').bodies.jupiter!.point.y);
  const wrongFixedTranslation = atStart.bodies.jupiter.point!.x - atEnd.bodies.mars.point!.x;
  assert.ok(Math.abs(first.point.x - wrongFixedTranslation) > 100);
  assert.deepEqual(sampleMapTrail('mars', 'mars', apsisPolicy, start, end, 3), []);
  assert.notDeepEqual(sampleMapTrail('jupiter', 'mars', apsisPolicy, start, end, 3)[0],
    sampleMapTrail('jupiter', 'true-sun', apsisPolicy, start, end, 3)[0]);
});

test('guard boundaries split Mars trails; outer planets remain available', () => {
  const start = comparisonUt1Domain.end - 9;
  const end = comparisonUt1Domain.end + 9;
  const source = sampleMapTrails(['mars', 'jupiter'], 'earth', apsisPolicy, start, end, 3);
  assert.ok(source.mars!.some(sample => sample === null));
  assert.ok(source.mars!.some(sample => sample?.ut1Jd === comparisonUt1Domain.end));
  assert.ok(source.jupiter!.every(sample => sample !== null));
  const moving = sampleMapTrail('jupiter', 'mars', apsisPolicy, start, end, 3);
  assert.ok(moving.some(sample => sample === null));
  const continued = sampleMapTrails(['mars'], 'earth', exploratoryApsisPolicy, start, end, 3);
  assert.ok(continued.mars!.some(sample => sample?.provenance === 'exploratory-continuation'));
  const map = applyWorkspacePreset(emptyWorkspace(), 'copernican-map').displays[0] as PlanetaryMapDisplay;
  const withTrail = { ...map, bodyTrails: { ...map.bodyTrails, mars: true } };
  const svg = renderMapTrails(withTrail, continued);
  assert.match(svg, /data-provenance="solid"/);
  assert.match(svg, /data-provenance="dashed"/);
  assert.equal(renderMapTrails(withTrail, source).includes('data-provenance="dashed"'), false);
});

test('30-year Saturn trail retains a finite, resolved relative trajectory', () => {
  const end = example1512Ut1;
  const samples = sampleMapTrail('saturn', 'mars', exploratoryApsisPolicy,
    end - 365 * 30, end, 6);
  assert.ok(samples.length >= 1826);
  assert.ok(samples.every(sample => sample &&
    Number.isFinite(sample.point.x) && Number.isFinite(sample.point.y)));
  const last = samples.at(-1)!;
  const current = mapView(evaluateCopernicusMap(end, exploratoryApsisPolicy), 'mars').bodies.saturn!;
  close(last!.point.x, current.point.x);
  close(last!.point.y, current.point.y);
  const varied = new Set(samples.filter(sample => sample).map(sample =>
    `${Math.round(sample!.point.x / 100)},${Math.round(sample!.point.y / 100)}`));
  assert.ok(varied.size > 100);
});

test('map panels validate, restore paused, copy settings, and retain one global clock', () => {
  const linearMap = { ...copernicanMap, radialProjection: 'linear' as const,
    camera: { offsetX: 0, offsetY: 0, radiusUnits: 120000 } };
  let state = addDisplay(addDisplay(emptyWorkspace(), linearMap), linearMap);
  const first = state.displays[0] as PlanetaryMapDisplay;
  const second = state.displays[1] as PlanetaryMapDisplay;
  assert.notStrictEqual(first.camera, second.camera);
  assert.notStrictEqual(first.visibleBodies, second.visibleBodies);
  assert.notStrictEqual(first.bodyTrails, second.bodyTrails);
  assert.equal(first.marsPolicyId, exploratoryApsisPolicy);
  assert.equal(changeMap(first, 'map-centre', 'unrecognized'), null);
  state = updateDisplay(state, changeMap(first, 'map-centre', 'mars')!);
  assert.equal((state.displays[1] as PlanetaryMapDisplay).viewCenter, 'true-sun');
  const zoomed = zoomMap(state, first.id, 0.5);
  assert.equal((zoomed.displays[0] as PlanetaryMapDisplay).camera.radiusUnits, 60000);
  assert.equal((zoomed.displays[1] as PlanetaryMapDisplay).camera.radiusUnits, 120000);
  const panned = panMap(zoomed, first.id, 0.25, -0.25);
  assert.notEqual((panned.displays[0] as PlanetaryMapDisplay).camera.offsetX, 0);
  const fitted = fitMap(panned, first.id, [{ x: -20000, y: 0 }, { x: 40000, y: 10000 }]);
  assert.equal((fitted.displays[0] as PlanetaryMapDisplay).camera.offsetX, 10000);
  assert.equal((resetMapCamera(fitted, first.id).displays[0] as PlanetaryMapDisplay).camera.radiusUnits, 120000);
  const later = tickClock(setClockPlaying(setClockInstant(state, example1512Ut1), true), 0.1);
  assert.ok(later.clock.ut1Jd > example1512Ut1);
  assert.equal(later.displays[0], state.displays[0]);
  assert.equal(restoreWorkspace(JSON.parse(JSON.stringify(later)))?.clock.playing, false);
  assert.equal(validateWorkspace({ ...later, displays: [{ ...first, camera: { ...first.camera,
    radiusUnits: Infinity } }] }).some(issue => issue.code === 'invalid-settings'), true);
  assert.equal(validateDisplay({ ...first, systemId: 'unknown' as 'copernicus-1543' }).length > 0, true);
  assert.equal(displayAvailabilityAt({ ...first, viewCenter: 'mars',
    marsPolicyId: apsisPolicy }, frauenburgCivilToUt1(2026, 10, 13)).status, 'unavailable');
  assert.equal(mapTrailCadence(365 * 30), 6);
  assert.equal(mapTrailCadence(365), 3);
  const key = mapTrailCacheKey(first, example1512Ut1);
  assert.equal(mapTrailCacheKey(first, example1512Ut1 + 0.01), key);
  assert.notEqual(mapTrailCacheKey({ ...first, marsPolicyId: apsisPolicy }, example1512Ut1), key);
  assert.notEqual(mapTrailCacheKey({ ...first, viewCenter: 'earth' }, example1512Ut1), key);
  assert.notEqual(mapTrailCacheKey({ ...first, trailDays: 730 }, example1512Ut1), key);
  assert.notEqual(mapTrailCacheKey({ ...first, bodyTrails: { ...first.bodyTrails, saturn: true } },
    example1512Ut1), key);
});

test('two Maps coexist with geometry and longitude panels under the four-panel limit', () => {
  let state = addDisplay(addDisplay(emptyWorkspace(), copernicanMap), copernicanMap);
  const first = state.displays[0] as PlanetaryMapDisplay;
  const second = state.displays[1] as PlanetaryMapDisplay;
  state = updateDisplay(state, changeMap(second, 'map-centre', 'jupiter')!);
  state = addDisplay(state, workspacePresets['explore-one'][0]);
  state = addDisplay(state, workspacePresets['compare-longitudes'][0]);
  assert.deepEqual(state.displays.map(display => display.kind),
    ['planetary-map', 'planetary-map', 'geometry', 'time-series']);
  assert.equal(addDisplay(state, copernicanMap), state);
  assert.equal((state.displays[0] as PlanetaryMapDisplay).viewCenter, 'true-sun');
  assert.equal((state.displays[1] as PlanetaryMapDisplay).viewCenter, 'jupiter');
  const moved = moveDisplay(state, second.id, 'up');
  assert.equal(moved.displays[0].id, second.id);
  const collapsed = setDisplayCollapsed(moved, first.id, true);
  assert.equal(collapsed.displays.find(display => display.id === first.id)?.collapsed, true);
  assert.equal(collapsed.displays.length, 4);
  const reduced = removeDisplay(collapsed, first.id);
  assert.equal(reduced.displays.length, 3);
  assert.equal(reduced.displays[0].id, second.id);
  assert.equal(validateWorkspace(JSON.parse(JSON.stringify(reduced))).length, 0);
  const malformed = { ...reduced, displays: [{ ...second, visibleBodies: null }] };
  assert.equal(restoreWorkspace(malformed), null);
  assert.equal(validateDisplay({ ...second, viewCenter: 'moon' as MapBody }).length > 0, true);
});

test('body labels and revised deferent tooltip are bilingual and markers have text alternatives', () => {
  const snapshot = evaluateCopernicusMap(example1512Ut1, apsisPolicy);
  const map = applyWorkspacePreset(emptyWorkspace(), 'copernican-map').displays[0] as PlanetaryMapDisplay;
  for (const language of ['en', 'mn'] as const) {
    assert.match(renderMapMarkers(map, snapshot, language), /role="img" aria-label=/);
    assert.ok(message(language, 'deferentDescription'));
    assert.doesNotMatch(message(language, 'deferentDescription'), /Mars|Ангараг/);
    assert.ok(message(language, 'mapUnavailableCenter').length > 30);
  }
});
