import assert from 'node:assert/strict';
import test from 'node:test';
import { example1512Ut1 } from '../../web/src/comparison-time.ts';
import { message } from '../../web/src/i18n.ts';
import { angularLongitudeAt, angularTrailCacheKey } from '../../web/src/angular-map.ts';
import { changeMap } from '../../web/src/workspace-panel-actions.ts';
import { samePanelContent } from '../../web/src/workspace-panel-layout.ts';
import { mapTrailCacheKey } from '../../web/src/workspace-map-view.ts';
import { workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { addDisplay, applyWorkspacePreset, copernicanMap, emptyWorkspace, migrateWorkspace,
  moveDisplay, restoreWorkspace, setClockPlaying, setDisplayCollapsed, setDisplayColumnSpan,
  updateDisplay, workspacePresets } from '../../web/src/workspace-state.ts';
import { validateDisplay, validateWorkspace } from '../../web/src/workspace-validation.ts';
import type { DisplayConfig, PlanetaryMapDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

test('every display kind accepts both widths and presets keep their scientific choices', () => {
  const expected = [
    ['explore-one', ['geometry'], [1]],
    ['compare-longitudes', ['time-series'], [2]],
    ['detailed-comparison', ['time-series', 'geometry', 'geometry'], [2, 1, 1]],
    ['copernican-map', ['planetary-map'], [1]],
    ['ptolemaic-angular-map', ['planetary-map'], [1]],
    ['copernican-angular-map', ['planetary-map'], [1]],
  ] as const;
  for (const [preset, kinds, widths] of expected) {
    const state = applyWorkspacePreset(emptyWorkspace(), preset);
    assert.deepEqual(state.displays.map(panel => panel.kind), kinds);
    assert.deepEqual(state.displays.map(panel => panel.columnSpan), widths);
    for (const panel of state.displays) for (const columnSpan of [1, 2] as const) {
      assert.deepEqual(validateDisplay({ ...panel, columnSpan }), []);
    }
  }
  const draft = workspacePresets['explore-one'][0];
  const noWidth = { ...draft, columnSpan: undefined };
  assert.equal(addDisplay(emptyWorkspace(), noWidth).displays[0].columnSpan, 1);
  assert.equal(addDisplay(emptyWorkspace(), { ...draft, columnSpan: 7 as 1 }).displays.length, 0);
});

test('width transitions preserve model data, clock, panel identity, caches, and other panels', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'desktop-explore');
  state = addDisplay(state, copernicanMap);
  const [plot, geometry, map] = state.displays as [TimeSeriesDisplay, DisplayConfig, PlanetaryMapDisplay];
  const plotKey = workspacePlotCacheKey(plot);
  const mapKey = mapTrailCacheKey(map, example1512Ut1);
  const angularTrack = map.angular.tracks[0];
  const angularKey = angularTrailCacheKey(angularTrack, example1512Ut1, map.angular.trailDays,
    map.angular.frameAlignment);
  const longitude = angularLongitudeAt(angularTrack, example1512Ut1);
  const clock = state.clock;
  state = setDisplayColumnSpan(state, map.id, 2);
  const widerMap = state.displays[2] as PlanetaryMapDisplay;
  assert.equal(widerMap.columnSpan, 2);
  assert.equal(widerMap.id, map.id);
  assert.equal(state.clock, clock);
  assert.equal(state.displays[0], plot);
  assert.equal(state.displays[1], geometry);
  assert.deepEqual({ ...widerMap, columnSpan: 1 }, map);
  assert.equal(samePanelContent(map, widerMap), true);
  assert.equal(mapTrailCacheKey(widerMap, example1512Ut1), mapKey);
  assert.equal(angularTrailCacheKey(widerMap.angular.tracks[0], example1512Ut1,
    widerMap.angular.trailDays, widerMap.angular.frameAlignment), angularKey);
  assert.deepEqual(angularLongitudeAt(widerMap.angular.tracks[0], example1512Ut1), longitude);
  state = setDisplayColumnSpan(state, plot.id, 1);
  assert.equal(workspacePlotCacheKey(state.displays[0] as TimeSeriesDisplay), plotKey);
  assert.equal(samePanelContent(plot, state.displays[0]), true);
  assert.equal(setDisplayColumnSpan(state, plot.id, 1), state);
  assert.equal(setDisplayColumnSpan(state, plot.id, 0 as 1), state);
  assert.equal(samePanelContent(map, changeMap(map, 'map-centre', 'earth')!), false);
});

test('reorder, collapse, and Spatial/Angular switching preserve panel-local widths', () => {
  let state = addDisplay(addDisplay(emptyWorkspace(), copernicanMap),
    workspacePresets['ptolemaic-angular-map'][0]);
  state = setDisplayColumnSpan(state, state.displays[1].id, 2);
  const firstId = state.displays[0].id;
  const secondId = state.displays[1].id;
  state = moveDisplay(state, firstId, 'down');
  assert.deepEqual(state.displays.map(panel => [panel.id, panel.columnSpan]),
    [[secondId, 2], [firstId, 1]]);
  state = setDisplayCollapsed(state, secondId, true);
  assert.equal(state.displays[0].columnSpan, 2);
  assert.equal(samePanelContent(state.displays[0],
    { ...state.displays[0], collapsed: false }), true);
  state = setDisplayCollapsed(state, secondId, false);
  const angular = state.displays[0] as PlanetaryMapDisplay;
  const spatial = changeMap(angular, 'map-representation', 'spatial')!;
  assert.equal(spatial.columnSpan, 2);
  const restoredAngular = changeMap(spatial, 'map-representation', 'angular')!;
  state = updateDisplay(state, restoredAngular);
  assert.equal(state.displays[0].columnSpan, 2);
  assert.equal(state.displays[1].columnSpan, 1);
});

test('schema 1 and 2 receive deterministic widths; schema 3 rejects malformed widths', () => {
  const current = addDisplay(applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison'), copernicanMap);
  const saved = setClockPlaying(current, true);
  const withoutWidths = saved.displays.map(({ columnSpan: _columnSpan, ...panel }) => panel);
  const versionTwo = { ...saved, schemaVersion: 2, displays: withoutWidths };
  const migratedTwo = migrateWorkspace(versionTwo) as typeof current;
  assert.deepEqual(migratedTwo.displays.map(panel => panel.columnSpan), [2, 1, 1, 1]);
  assert.equal(validateWorkspace(migratedTwo).length, 0);
  const versionTwoWithWidth = { ...versionTwo, displays: [
    { ...withoutWidths[0], columnSpan: 1 }, ...withoutWidths.slice(1),
  ] };
  assert.equal((migrateWorkspace(versionTwoWithWidth) as typeof current).displays[0].columnSpan, 1);
  const restored = restoreWorkspace(versionTwo)!;
  assert.equal(restored.clock.playing, false);
  assert.equal(restored.nextPanelNumber, saved.nextPanelNumber);
  const map = current.displays[3] as PlanetaryMapDisplay;
  const versionOneMap = { id: map.id, kind: map.kind, collapsed: map.collapsed, ...map.spatial };
  const versionOne = { ...versionTwo, schemaVersion: 1,
    displays: [...withoutWidths.slice(0, 3), versionOneMap] };
  const migratedOne = migrateWorkspace(versionOne) as typeof current;
  assert.equal(validateWorkspace(migratedOne).length, 0);
  assert.deepEqual((migratedOne.displays[3] as PlanetaryMapDisplay).spatial, map.spatial);
  assert.deepEqual(migratedOne.displays.map(panel => panel.columnSpan), [2, 1, 1, 1]);
  const malformedOld = { ...versionTwo, displays: [
    { ...withoutWidths[0], columnSpan: 0 }, ...withoutWidths.slice(1),
  ] };
  assert.equal(restoreWorkspace(malformedOld), null);
  assert.equal(restoreWorkspace({ ...saved, displays: [
    { ...saved.displays[0], columnSpan: 3 }, ...saved.displays.slice(1),
  ] }), null);
  assert.equal(restoreWorkspace({ ...saved, displays: withoutWidths }), null);
});

test('width actions have synchronized English and Mongolian labels', () => {
  for (const language of ['en', 'mn'] as const) {
    assert.ok(message(language, 'halfWidth'));
    assert.ok(message(language, 'fullWidth'));
  }
});
