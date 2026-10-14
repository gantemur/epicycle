import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { angularBodies, angularDrawingRadius, angularGridWindow, angularLongitudeAt,
  angularModelDifferenceAt, angularPoint, angularRingFractions, angularTrailCacheKey,
  angularTrailWithEndpoints, defaultAngularTrack, sampleAngularTrail } from '../../web/src/angular-map.ts';
import { renderAngularMarkers, renderAngularRings, renderAngularTrail } from '../../web/src/angular-map-view.ts';
import { comparisonUt1Domain, example1512Ut1, frauenburgCivilToUt1 } from '../../web/src/comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy } from '../../web/src/copernicus.ts';
import { message } from '../../web/src/i18n.ts';
import { angularDifference } from '../../web/src/model.ts';
import { changeMap } from '../../web/src/workspace-panel-actions.ts';
import { traceLongitudeAt } from '../../web/src/workspace-plot.ts';
import { addDisplay, applyWorkspacePreset, copernicanMap, emptyWorkspace,
  migrateWorkspace, ptolemaicAngularMap, restoreWorkspace, setClockInstant,
  workspacePresets } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt, validateDisplay, validateWorkspace } from '../../web/src/workspace-validation.ts';
import type { AngularBody, PlanetaryMapDisplay } from '../../web/src/workspace-types.ts';

const close = (a: number, b: number, tolerance = 1e-9): void =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
const panel = (draft: typeof ptolemaicAngularMap): PlanetaryMapDisplay =>
  addDisplay(emptyWorkspace(), draft).displays[0] as PlanetaryMapDisplay;

test('nested-sphere metadata preserves original readings and cannot be a longitude model', () => {
  const record = JSON.parse(readFileSync(new URL('../../data/ptolemy-nested-spheres-v1.json',
    import.meta.url), 'utf8'));
  assert.equal(record.kind, 'historical-cosmological-distance-bounds');
  assert.equal(record.unit, 'Earth radius');
  assert.deepEqual(record.orderFromEarth,
    ['Moon', 'Mercury', 'Venus', 'Sun', 'Mars', 'Jupiter', 'Saturn']);
  assert.deepEqual(record.textualBounds.map((row: { body: string; minimum: number; maximum: number }) =>
    [row.body, row.minimum, row.maximum]), [
    ['Moon', 33, 64], ['Mercury', 64, 166], ['Venus', 166, 1079],
    ['Sun', 1160, 1260], ['Mars', 1260, 8820],
    ['Jupiter', 8820, 14187], ['Saturn', 14187, 19865],
  ]);
  assert.equal(record.textualBounds[3].minimum - record.textualBounds[2].maximum, 81);
  assert.equal(record.scholarlyCorrection.JupiterMaximum, 14189);
  assert.equal(record.scholarlyCorrection.SaturnMinimum, 14189);
  assert.match(record.angularMapUse, /order only/);
  assert.equal(Object.hasOwn(record, 'longitudeEvaluator'), false);
});

test('all eight body/model choices follow the existing tropical-longitude dispatch and fixed rings', () => {
  assert.deepEqual(angularBodies, ['Sun', 'Mars', 'Jupiter', 'Saturn']);
  assert.deepEqual(angularBodies.map(body => angularRingFractions[body]), [0.25, 0.45, 0.65, 0.85]);
  const dates = [example1512Ut1, example1512Ut1 + 91.25, example1512Ut1 + 182.5,
    example1512Ut1 + 273.75];
  for (const body of angularBodies) for (const tradition of ['ptolemy', 'copernicus'] as const) {
    const track = defaultAngularTrack(body, tradition, 'track-1');
    for (const ut1Jd of dates) {
      const result = angularLongitudeAt(track, ut1Jd)!;
      assert.ok(result);
      const expected = traceLongitudeAt({ id: track.id, body, modelId: track.modelId,
        observableId: 'geocentric-tropical-longitude', policyId: track.policyId }, ut1Jd)!;
      close(result.longitude, expected);
      const point = angularPoint(body, result.longitude);
      close(Math.hypot(point.x, point.y), angularDrawingRadius * angularRingFractions[body]);
      const angle = (Math.atan2(point.y, point.x) * 180 / Math.PI + 360) % 360;
      close(angle, expected);
      const enlarged = angularPoint(body, result.longitude, 400);
      close((Math.atan2(enlarged.y, enlarged.x) * 180 / Math.PI + 360) % 360, expected);
    }
  }
  for (const body of angularBodies) {
    const a = angularPoint(body, 60);
    const b = angularPoint(body, 210);
    close(Math.hypot(a.x, a.y), Math.hypot(b.x, b.y));
  }
});

test('same-body models share a ring and signed difference requires declared compatible frames', () => {
  const first = defaultAngularTrack('Mars', 'ptolemy', 'track-1');
  const second = defaultAngularTrack('Mars', 'copernicus', 'track-2');
  close(Math.hypot(...Object.values(angularPoint('Mars', angularLongitudeAt(first,
    example1512Ut1)!.longitude))),
  Math.hypot(...Object.values(angularPoint('Mars', angularLongitudeAt(second,
    example1512Ut1)!.longitude))));
  assert.equal(angularModelDifferenceAt(first, second, 'native', example1512Ut1), null);
  const difference = angularModelDifferenceAt(first, second,
    'nominal-historical-tropical', example1512Ut1)!;
  close(difference, 7.730579, 0.00001);
  close(angularModelDifferenceAt(second, first, 'nominal-historical-tropical',
    example1512Ut1)!, -difference);
  assert.equal(angularModelDifferenceAt(first, defaultAngularTrack('Jupiter', 'copernicus',
    'track-3'), 'nominal-historical-tropical', example1512Ut1), null);
  assert.equal(angularModelDifferenceAt(first, second, 'nominal-historical-tropical',
    comparisonUt1Domain.end + 1), null);
});

test('model selection, dual tracks, limits and frame declaration stay panel-local', () => {
  const initial = panel(ptolemaicAngularMap);
  assert.equal(validateDisplay(initial).length, 0);
  assert.equal(changeMap(initial, 'angular:track-2:model', 'copernicus'), null);
  const aligned = changeMap(initial, 'angular-frame', 'nominal-historical-tropical')!;
  const mixed = changeMap(aligned, 'angular:track-2:model', 'copernicus')!;
  assert.equal(mixed.angular.systemSelection, 'custom');
  assert.equal(mixed.angular.tracks[1].modelId, 'copernicus');
  assert.equal(changeMap(mixed, 'angular-frame', 'native'), null);
  const dual = changeMap(mixed, 'angular-add:Mars', true)!;
  assert.equal(dual.angular.tracks.filter(track => track.body === 'Mars').length, 2);
  assert.notEqual(dual.angular.tracks[1].id, dual.angular.tracks.at(-1)!.id);
  assert.equal(changeMap(dual, 'angular-add:Mars', true), null);
  assert.equal(changeMap(dual, `angular:${dual.angular.tracks.at(-1)!.id}:model`,
    'copernicus'), null);
  const one = changeMap(dual, `angular-remove:${dual.angular.tracks.at(-1)!.id}`, true)!;
  assert.equal(one.angular.tracks.length, 4);
  const copied = addDisplay(addDisplay(emptyWorkspace(), ptolemaicAngularMap),
    ptolemaicAngularMap);
  const a = copied.displays[0] as PlanetaryMapDisplay;
  const b = copied.displays[1] as PlanetaryMapDisplay;
  assert.notStrictEqual(a.spatial.camera, b.spatial.camera);
  assert.notStrictEqual(a.angular.tracks, b.angular.tracks);
  assert.notStrictEqual(a.angular.tracks[0], b.angular.tracks[0]);
  assert.equal(setClockInstant(copied, example1512Ut1 + 1).displays[0], a);
  assert.equal(changeMap(initial, 'angular:track-1:model', 'copernicus-jupiter'), null);
  const partial = { ...initial, angular: { ...initial.angular,
    systemSelection: 'custom' as const, tracks: [initial.angular.tracks[0]] } };
  assert.equal(validateDisplay(partial).length, 0);
});

test('source-limited gaps, exact guard boundaries and exploratory styles survive ring trails', () => {
  const source = defaultAngularTrack('Mars', 'copernicus', 'track-1');
  const start = comparisonUt1Domain.end - 9;
  const end = comparisonUt1Domain.end + 9;
  const limited = sampleAngularTrail(source, start, end, 3);
  assert.ok(limited.some(item => item?.ut1Jd === comparisonUt1Domain.end));
  assert.ok(limited.some(item => item === null));
  assert.ok(limited.some(item => item !== null));
  assert.doesNotMatch(renderAngularTrail(source, limited), /data-provenance="dashed"/);
  const continued = { ...source, policyId: exploratoryApsisPolicy };
  const exploratory = sampleAngularTrail(continued, start, end, 3);
  const svg = renderAngularTrail(continued, exploratory);
  assert.match(svg, /data-provenance="solid"/);
  assert.match(svg, /data-provenance="dashed"/);
  const future = frauenburgCivilToUt1(2026, 10, 13);
  assert.equal(angularLongitudeAt(source, future), null);
  assert.ok(angularLongitudeAt(continued, future));
  assert.ok(angularLongitudeAt(defaultAngularTrack('Jupiter', 'ptolemy', 'track-2'), future));
  const map = panel(ptolemaicAngularMap);
  assert.equal(displayAvailabilityAt({ ...map, angular: { ...map.angular,
    frameAlignment: 'nominal-historical-tropical',
    tracks: [source, defaultAngularTrack('Jupiter', 'ptolemy', 'track-2')] } }, future).status,
  'partial');
});

test('trail points remain on one ring across 0/360 and retrograde reverses angular order', () => {
  const track = defaultAngularTrack('Mars', 'ptolemy', 'track-1');
  const end = example1512Ut1 + 365 * 2;
  const grid = angularGridWindow(end, 365 * 2);
  const samples = sampleAngularTrail(track, grid.start, grid.end, grid.step);
  const full = angularTrailWithEndpoints(track, samples, end, 365 * 2);
  close(full.at(-1)!.longitude, angularLongitudeAt(track, end)!.longitude);
  const values = full.filter(item => item !== null);
  assert.ok(values.length > 200);
  for (const item of values) {
    const point = angularPoint('Mars', item!.longitude);
    close(Math.hypot(point.x, point.y), angularDrawingRadius * angularRingFractions.Mars);
  }
  const differences = values.slice(1).map((item, index) =>
    angularDifference(item!.longitude, values[index]!.longitude));
  assert.ok(differences.some(value => value < 0));
  assert.ok(differences.some(value => value > 0));
  const synthetic = [
    { ut1Jd: 1, longitude: 359, provenance: 'ordinary' as const },
    { ut1Jd: 2, longitude: 1, provenance: 'ordinary' as const },
  ];
  const svg = renderAngularTrail(track, synthetic);
  assert.equal((svg.match(/<path/g) ?? []).length, 1);
  const a = angularPoint('Mars', 359);
  const b = angularPoint('Mars', 1);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 5);
  assert.notEqual(angularTrailCacheKey(track, end, 365, 'native'),
    angularTrailCacheKey({ ...track, policyId: apsisPolicy }, end, 365, 'native'));
  assert.equal(angularTrailCacheKey(track, end, 365, 'native'),
    angularTrailCacheKey(track, end + 0.01, 365, 'native'));
});

test('schema-1 spatial Maps migrate without changing geometry, and both modes retain settings', () => {
  const current = applyWorkspacePreset(emptyWorkspace(), 'copernican-map');
  const map = current.displays[0] as PlanetaryMapDisplay;
  const old = { ...current, schemaVersion: 1, displays: [
    { id: map.id, kind: map.kind, collapsed: map.collapsed, ...map.spatial },
  ] };
  const migrated = migrateWorkspace(old) as typeof current;
  assert.equal(validateWorkspace(migrated).length, 0);
  assert.deepEqual((migrated.displays[0] as PlanetaryMapDisplay).spatial, map.spatial);
  const restored = restoreWorkspace({ ...old, clock: { ...old.clock, playing: true } })!;
  assert.equal(restored.clock.playing, false);
  let display = restored.displays[0] as PlanetaryMapDisplay;
  display = changeMap(display, 'map-centre', 'jupiter')!;
  display = changeMap(display, 'map-representation', 'angular')!;
  display = changeMap(display, 'angular-frame', 'nominal-historical-tropical')!;
  display = changeMap(display, 'map-representation', 'spatial')!;
  assert.equal(display.spatial.viewCenter, 'jupiter');
  assert.equal(display.angular.frameAlignment, 'nominal-historical-tropical');
  assert.equal(validateDisplay({ ...display, angular: { ...display.angular,
    tracks: [{ ...display.angular.tracks[0], id: 'bad-id' }] } }).length > 0, true);
  assert.equal(validateWorkspace({ ...restored, displays: [{ ...display, angular: {
    ...display.angular, tracks: [display.angular.tracks[0], null],
  } }] }).some(item => item.code === 'invalid-settings'), true);
  assert.equal(restoreWorkspace({ ...restored, displays: [{ ...display, angular: {
    ...display.angular, tracks: [null],
  } }] }), null);
  assert.ok(workspacePresets['ptolemaic-angular-map']);
  assert.ok(workspacePresets['copernican-angular-map']);
  assert.equal(copernicanMap.representation, 'spatial');
});

test('rings and bilingual model descriptions are visible without a physical-distance scale', () => {
  const map = panel(ptolemaicAngularMap);
  const rings = renderAngularRings(map, 'en');
  for (const body of angularBodies) assert.match(rings, new RegExp(`data-ring="${body}"`));
  assert.match(rings, /class="angular-earth" cx="340" cy="340"/);
  const marker = renderAngularMarkers(map, example1512Ut1, 'en');
  assert.match(marker, /data-track-id="track-1"/);
  assert.match(marker, /aria-label="Sun · Ptolemy/);
  assert.doesNotMatch(rings, /R=10000|Earth annual-radius/);
  for (const language of ['en', 'mn'] as const) {
    assert.ok(message(language, 'mapRepresentation'));
    assert.ok(message(language, 'angularMapNotice'));
    assert.ok(message(language, 'angularRingSource'));
    assert.ok(message(language, 'angularFrameRequired'));
  }
});
