import assert from 'node:assert/strict';
import test from 'node:test';
import { example1512Ut1, frauenburgCivilToUt1, modelDaysAtUt1,
  ptolemyDayToAssumedUt1 } from '../../web/src/comparison-time.ts';
import { exampleDay as sharedExampleDay } from '../../web/src/historical-examples.ts';
import { modelCapabilities, type CapabilityRegistry } from '../../web/src/model-registry.ts';
import { addDisplay, applyWorkspacePreset, emptyWorkspace, moveDisplay, removeDisplay,
  followWorkspaceClock, jumpToExample, jumpToToday, panPlotWindow, restoreWorkspace, setClockInstant,
  setClockPlaying, setDisplayCollapsed, stepClock, suggestedWorkspace, tickClock,
  updateDisplay, workspacePresets, zoomPlotWindow, type DisplayDraft } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt, isValidWorkspace, nativeFrameForTrace, traceCoverage, validateDisplay,
  validateWorkspace } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

const geometry: DisplayDraft = {
  kind: 'geometry', collapsed: false, body: 'Mars', modelId: 'ptolemy',
  policyId: 'mathematical-continuation', viewCenter: 'earth',
  trail: { enabled: true, days: 180 }, showCircles: true,
  showConstructionLines: true, showAnnotations: true,
};

test('four panels count collapsed panels and IDs are stable through reorder and removal', () => {
  let state = emptyWorkspace();
  for (let index = 0; index < 4; index++) state = addDisplay(state, geometry);
  assert.deepEqual(state.displays.map(panel => panel.id), ['panel-1', 'panel-2', 'panel-3', 'panel-4']);
  state = setDisplayCollapsed(state, 'panel-1', true);
  assert.equal(addDisplay(state, geometry), state);
  state = moveDisplay(state, 'panel-1', 'down');
  assert.deepEqual(state.displays.map(panel => panel.id), ['panel-2', 'panel-1', 'panel-3', 'panel-4']);
  state = setDisplayCollapsed(state, 'panel-1', false);
  assert.equal(state.displays[1].collapsed, false);
  state = removeDisplay(state, 'panel-3');
  state = addDisplay(state, geometry);
  assert.deepEqual(state.displays.map(panel => panel.id), ['panel-2', 'panel-1', 'panel-4', 'panel-5']);
  assert.equal(moveDisplay(state, 'panel-2', 'up'), state);
  assert.equal(removeDisplay(state, 'missing'), state);
});

test('a panel update changes only that panel; duplicate models have independent settings', () => {
  let state = addDisplay(addDisplay(emptyWorkspace(), geometry), geometry);
  const first = state.displays[0] as GeometryDisplay;
  const replacement = { ...first, trail: { enabled: false, days: 90 }, showAnnotations: false };
  state = updateDisplay(state, replacement);
  assert.notStrictEqual((state.displays[0] as GeometryDisplay).trail, replacement.trail);
  assert.equal((state.displays[0] as GeometryDisplay).trail.enabled, false);
  assert.equal((state.displays[1] as GeometryDisplay).trail.enabled, true);
  assert.equal((state.displays[1] as GeometryDisplay).showAnnotations, true);
  assert.equal(state.displays[0].id, first.id);
  state = removeDisplay(removeDisplay(state, 'panel-1'), 'panel-2');
  assert.deepEqual(state.displays, []);
});

test('panels made from shared preset drafts own distinct nested configurations', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const firstGeometry = state.displays[1] as GeometryDisplay;
  const secondGeometry = state.displays[2] as GeometryDisplay;
  assert.notStrictEqual((workspacePresets['detailed-comparison'][1] as GeometryDisplay).trail,
    (workspacePresets['detailed-comparison'][2] as GeometryDisplay).trail);
  assert.notStrictEqual(firstGeometry.trail, secondGeometry.trail);
  assert.notStrictEqual(firstGeometry.trail, geometry.trail);
  const plotDraft = workspacePresets['compare-longitudes'][0];
  state = addDisplay(state, plotDraft);
  const firstPlot = state.displays[0] as TimeSeriesDisplay;
  const secondPlot = state.displays[3] as TimeSeriesDisplay;
  assert.notStrictEqual(firstPlot.window, secondPlot.window);
  assert.notStrictEqual(firstPlot.traces, secondPlot.traces);
  assert.notStrictEqual(firstPlot.traces[0], secondPlot.traces[0]);
  assert.notStrictEqual(firstPlot.analysis, secondPlot.analysis);
  assert.notStrictEqual(firstPlot.window, (plotDraft as TimeSeriesDisplay).window);
  assert.deepEqual(firstPlot, { ...secondPlot, id: firstPlot.id });
});

test('presets retain the global clock and viewport suggestions never mutate a workspace', () => {
  const instant = frauenburgCivilToUt1(2026, 10, 11);
  const original = setClockInstant(suggestedWorkspace(900), instant);
  assert.deepEqual(original.displays.map(panel => panel.kind), ['time-series', 'geometry']);
  assert.deepEqual(suggestedWorkspace(390).displays.map(panel => panel.kind), ['time-series']);
  assert.equal(original.displays.length, 2); // a resize only selects a future suggestion
  const detailed = applyWorkspacePreset(original, 'detailed-comparison');
  assert.deepEqual(detailed.displays.map(panel => panel.kind), ['time-series', 'geometry', 'geometry']);
  assert.equal(detailed.clock.ut1Jd, instant);
  assert.equal(detailed.displays[0].id, 'panel-3');
  assert.deepEqual(applyWorkspacePreset(original, 'explore-one').displays.map(panel => panel.kind), ['geometry']);
});

test('plot windows and per-display availability do not control the one shared clock', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const plot = state.displays[0] as TimeSeriesDisplay;
  state = updateDisplay(state, { ...plot, window: { ...plot.window,
    startUt1: plot.window.startUt1 - 20, endUt1: plot.window.endUt1 + 20 } });
  assert.equal(state.clock.ut1Jd, example1512Ut1);
  const future = frauenburgCivilToUt1(2026, 10, 11);
  state = setClockPlaying(setClockInstant(state, future), true);
  const later = tickClock(state, 0.05);
  assert.ok(later.clock.ut1Jd > future);
  assert.equal(displayAvailabilityAt(later.displays[1], later.clock.ut1Jd).status, 'available');
  assert.equal(displayAvailabilityAt(later.displays[2], later.clock.ut1Jd).status, 'unavailable');
  assert.equal(displayAvailabilityAt(later.displays[0], later.clock.ut1Jd).status, 'partial');
  assert.ok(displayAvailabilityAt(later.displays[2], later.clock.ut1Jd).issues.some(
    item => item.code === 'outside-policy-domain'));
  assert.equal(stepClock(later, -1).clock.playing, false);
  const copernicus = later.displays[2] as GeometryDisplay;
  const exploratory = updateDisplay(later, { ...copernicus, policyId: 'sn-uniform-exploratory' });
  assert.equal(displayAvailabilityAt(exploratory.displays[2], future).status, 'available');
  assert.equal(later.displays[2], copernicus); // no automatic extrapolation
});

test('pan and zoom transform only authoritative plot endpoints', () => {
  const original = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const plot = original.displays[0] as TimeSeriesDisplay;
  const span = plot.window.endUt1 - plot.window.startUt1;
  const zoomed = zoomPlotWindow(original, plot.id, 0.5);
  const zoomedPlot = zoomed.displays[0] as TimeSeriesDisplay;
  assert.equal(zoomedPlot.window.endUt1 - zoomedPlot.window.startUt1, span / 2);
  assert.equal((zoomedPlot.window.startUt1 + zoomedPlot.window.endUt1) / 2, example1512Ut1);
  const panned = panPlotWindow(zoomed, plot.id, 10);
  assert.equal((panned.displays[0] as TimeSeriesDisplay).window.startUt1,
    zoomedPlot.window.startUt1 + 10);
  assert.equal(panned.clock.ut1Jd, original.clock.ut1Jd);
  assert.deepEqual(original.displays[0], plot);
  assert.deepEqual(Object.keys(plot.window).sort(), ['endUt1', 'followsClock', 'startUt1']);
});

test('legacy Nabonassar days cross the assumed UT1 boundary explicitly', () => {
  assert.equal(sharedExampleDay, 164162);
  for (const day of [0, 1000, 825000]) {
    const ut1 = ptolemyDayToAssumedUt1(day);
    assert.ok(Math.abs(modelDaysAtUt1(ut1).ptolemy - day) < 1e-9);
  }
  const playing = setClockPlaying(emptyWorkspace(), true);
  const nabonassar = jumpToExample(playing, 'nabonassar');
  assert.equal(nabonassar.clock.playing, false);
  assert.ok(Math.abs(modelDaysAtUt1(nabonassar.clock.ut1Jd).ptolemy - sharedExampleDay) < 1e-9);
  assert.equal(jumpToExample(playing, '1512').clock.ut1Jd, example1512Ut1);
  const today = jumpToToday(playing, Date.UTC(2026, 9, 11));
  assert.equal(today.clock.playing, false);
  assert.ok(today.clock.ut1Jd > example1512Ut1);
});

test('unsupported model, observable, policy, and physical view centre are rejected', () => {
  const state = addDisplay(emptyWorkspace(), geometry);
  const panel = state.displays[0] as GeometryDisplay;
  assert.ok(validateDisplay({ ...panel, viewCenter: 'true-sun' }).some(
    item => item.code === 'unsupported-center'));
  assert.ok(validateDisplay({ ...panel, modelId: 'missing' }).some(item => item.code === 'unknown-model'));
  assert.ok(validateDisplay({ ...panel, policyId: 'sn-uniform-exploratory' }).some(
    item => item.code === 'unsupported-policy'));
  assert.equal(addDisplay(emptyWorkspace(), { ...geometry, viewCenter: 'true-sun' }).displays.length, 0);
  const plot = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  const badTrace = { ...plot.traces[0], observableId: 'geocentric-latitude' };
  assert.ok(validateDisplay({ ...plot, traces: [badTrace] }).some(
    item => item.code === 'unsupported-observable'));
  assert.deepEqual(modelCapabilities.copernicus.viewCenters, ['earth', 'true-sun']);
  assert.deepEqual(modelCapabilities.copernicus.renderedViewCenters, ['earth']);
  const copernicus = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison').displays[2] as GeometryDisplay;
  const sunView = { ...copernicus, viewCenter: 'true-sun' as const };
  assert.deepEqual(validateDisplay(sunView), []);
  assert.ok(displayAvailabilityAt(sunView, example1512Ut1).issues.some(
    item => item.code === 'renderer-unavailable'));
  assert.equal(modelCapabilities.copernicus.sourceStatus, 'source-checked');
  assert.match(modelCapabilities.copernicus.validationStatus, /partially numerically validated/);
});

test('several traces can overlay bodies, while model disagreement requires comparable predictions', () => {
  // Synthetic capability tests extension rules only; no Saturn evaluator is supplied.
  const registry: CapabilityRegistry = {
    ...modelCapabilities,
    syntheticSaturn: { ...modelCapabilities.ptolemy, id: 'syntheticSaturn', body: 'Saturn',
      recordId: 'test-only', source: 'synthetic test capability',
      sourceStatus: 'test-only', validationStatus: 'test-only' },
  };
  const plot = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  assert.equal(nativeFrameForTrace(plot.traces[0]), 'ptolemaic-tropical');
  assert.equal(nativeFrameForTrace(plot.traces[1]), 'copernican-tropical');
  assert.deepEqual(validateDisplay({ ...plot, frameAlignment: 'native' }), []);
  const saturn = { id: 'trace-3', body: 'Saturn', modelId: 'syntheticSaturn',
    observableId: 'geocentric-tropical-longitude', policyId: 'mathematical-continuation' };
  const overlay = { ...plot, traces: [...plot.traces, saturn], analysis: { kind: 'overlay' } as const };
  assert.deepEqual(validateDisplay(overlay, registry), []);
  assert.equal(overlay.traces.length, 3);
  const fourTraces = { ...overlay, traces: [...overlay.traces, { ...saturn, id: 'trace-4' }] };
  assert.deepEqual(validateDisplay(fourTraces, registry), []);
  assert.ok(validateDisplay({ ...overlay, analysis: {
    kind: 'model-disagreement', firstTraceId: 'trace-1', secondTraceId: 'trace-3',
  } }, registry).some(item => item.code === 'invalid-disagreement'));
  assert.deepEqual(validateDisplay({ ...plot, analysis: {
    kind: 'model-disagreement', firstTraceId: 'trace-1', secondTraceId: 'trace-2',
  } }), []);
  assert.ok(validateDisplay({ ...plot, frameAlignment: 'native', analysis: {
    kind: 'model-disagreement', firstTraceId: 'trace-1', secondTraceId: 'trace-2',
  } }).some(item => item.code === 'incompatible-frame'));
  assert.ok(validateDisplay({ ...fourTraces, traces: [...fourTraces.traces, { ...saturn, id: 'trace-5' }] }, registry)
    .some(item => item.code === 'trace-limit'));
});

test('plot coverage exposes unavailable source-limited dates as a gap', () => {
  const plot = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  const window = { ...plot.window, startUt1: frauenburgCivilToUt1(1522, 1, 1),
    endUt1: frauenburgCivilToUt1(1524, 1, 1) };
  const expanded = { ...plot, window };
  assert.deepEqual(validateDisplay(expanded), []);
  assert.equal(traceCoverage(expanded, expanded.traces[0]).status, 'full');
  const copernicus = traceCoverage(expanded, expanded.traces[1]);
  assert.equal(copernicus.status, 'partial');
  assert.ok(copernicus.availableRange!.end < window.endUt1);
});

test('historical plot coverage survives a current-time marker outside the source domain', () => {
  const state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const plot = state.displays[0] as TimeSeriesDisplay;
  const sourceCoverage = traceCoverage(plot, plot.traces[1]);
  assert.equal(sourceCoverage.status, 'full');
  const future = setClockInstant(state, frauenburgCivilToUt1(2026, 10, 11));
  assert.equal(displayAvailabilityAt(future.displays[0], future.clock.ut1Jd).status, 'partial');
  assert.deepEqual(traceCoverage(future.displays[0] as TimeSeriesDisplay, plot.traces[1]), sourceCoverage);
  assert.equal((future.displays[0] as TimeSeriesDisplay).window.startUt1, plot.window.startUt1);
});

test('workspace JSON has a version, round-trips, and rejects malformed saved state', () => {
  const state = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const parsed: unknown = JSON.parse(JSON.stringify(state));
  assert.equal(isValidWorkspace(parsed), true);
  assert.deepEqual(parsed, state);
  assert.ok(validateWorkspace({ ...state, schemaVersion: 2 }).some(item => item.code === 'invalid-schema'));
  assert.ok(validateWorkspace({ ...state, displays: [state.displays[0], state.displays[0]] })
    .some(item => item.code === 'duplicate-id'));
  assert.ok(validateWorkspace({ ...state, clock: { ...state.clock, speedDaysPerSecond: 0 } })
    .some(item => item.code === 'invalid-clock'));
});

test('restoration validates IDs and counter, copies panels, and never resumes playback', () => {
  const running = setClockPlaying(applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison'), true);
  const saved: unknown = JSON.parse(JSON.stringify(running));
  const restored = restoreWorkspace(saved);
  assert.ok(restored);
  assert.equal(restored.clock.playing, false);
  assert.deepEqual(restored.displays.map(panel => panel.id), running.displays.map(panel => panel.id));
  assert.equal(restored.nextPanelNumber, 4);
  assert.notStrictEqual((restored.displays[0] as TimeSeriesDisplay).window,
    ((saved as typeof running).displays[0] as TimeSeriesDisplay).window);
  assert.equal(addDisplay(restored, geometry).displays[3].id, 'panel-4');
  assert.equal(restoreWorkspace({ ...running, schemaVersion: 2 }), null);
  assert.equal(restoreWorkspace({ ...running, displays: [
    { ...running.displays[0], id: 'unsafe-id' }, ...running.displays.slice(1),
  ] }), null);
  assert.equal(restoreWorkspace({ ...running, nextPanelNumber: 3 }), null);
  assert.equal(restoreWorkspace({ ...running, displays: [running.displays[0], running.displays[0]] }), null);
  const stalePlot = running.displays[0] as TimeSeriesDisplay;
  const savedWithOldFields = { ...running, displays: [
    { ...stalePlot, window: { ...stalePlot.window, zoom: 2, panDays: 10 } },
    ...running.displays.slice(1),
  ] };
  const normalized = restoreWorkspace(savedWithOldFields)!;
  assert.deepEqual(Object.keys((normalized.displays[0] as TimeSeriesDisplay).window).sort(),
    ['endUt1', 'followsClock', 'startUt1']);
});
