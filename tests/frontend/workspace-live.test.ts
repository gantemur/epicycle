import assert from 'node:assert/strict';
import test from 'node:test';
import { example1512Ut1, frauenburgCivilToUt1, modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { evaluateSelectedModel } from '../../web/src/comparison.ts';
import { changeGeometry, changePlot, changeTrace, addTrace, removeTrace } from '../../web/src/workspace-panel-actions.ts';
import { modelDisagreementAt, plotSegments, sampleWorkspacePlot, traceLongitudeAt,
  workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { addDisplay, applyWorkspacePreset, emptyWorkspace, followWorkspaceClock,
  setClockInstant, setClockPlaying, tickClock, updateDisplay } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt, traceCoverage } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

test('all live panels derive historical arguments from the one clock', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const ptolemy = evaluateSelectedModel('ptolemy', state.clock.ut1Jd, 'mathematical-continuation');
  const copernicus = evaluateSelectedModel('copernicus', state.clock.ut1Jd, 'sn-local-uniform-1473-1523');
  assert.equal(ptolemy.days, modelDaysAtUt1(state.clock.ut1Jd).ptolemy);
  assert.equal(copernicus.days, modelDaysAtUt1(state.clock.ut1Jd).copernicus);
  assert.ok(Math.abs(ptolemy.tropical - 210.909404) < .000002);
  assert.ok(Math.abs(copernicus.tropical - 218.639983) < .000002);
  state = tickClock(setClockPlaying(state, true), .05);
  assert.ok(state.clock.ut1Jd > example1512Ut1);
  assert.equal(state.displays.length, 3);
  assert.equal(state.displays[0].kind, 'time-series');
  assert.equal(state.displays[1].kind, 'geometry');
  assert.equal(state.displays[2].kind, 'geometry');
});

test('panel settings and policies are independent, with four ordinary traces', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const oldPtolemy = state.displays[1] as GeometryDisplay;
  const oldCopernicus = state.displays[2] as GeometryDisplay;
  const changed = changeGeometry(oldPtolemy, 'trail-days', '90')!;
  state = updateDisplay(state, changed);
  assert.equal((state.displays[1] as GeometryDisplay).trail.days, 90);
  assert.equal((state.displays[2] as GeometryDisplay).trail.days, 180);
  const exploratory = changeGeometry(oldCopernicus, 'policy', 'sn-uniform-exploratory')!;
  state = updateDisplay(state, exploratory);
  assert.equal((state.displays[2] as GeometryDisplay).policyId, 'sn-uniform-exploratory');
  let plot = state.displays[0] as TimeSeriesDisplay;
  plot = addTrace(addTrace(plot)!)!;
  assert.equal(plot.traces.length, 4);
  assert.equal(addTrace(plot), null);
  const third = plot.traces[2].id;
  plot = changeTrace(plot, third, 'model', 'copernicus')!;
  plot = changeTrace(plot, third, 'observable', 'geocentric-sidereal-longitude')!;
  assert.equal(plot.traces[2].modelId, 'copernicus');
  assert.equal(plot.traces[2].observableId, 'geocentric-sidereal-longitude');
  assert.equal(plot.frameAlignment, 'native');
  assert.equal(plot.traces[1].observableId, 'geocentric-tropical-longitude');
  assert.equal(removeTrace(plot, third)!.traces.length, 3);
  state = addDisplay(state, plot);
  assert.notStrictEqual((state.displays[0] as TimeSeriesDisplay).window,
    (state.displays[3] as TimeSeriesDisplay).window);
  const secondPlot = state.displays[3] as TimeSeriesDisplay;
  const changedWindow = { ...secondPlot, window: { ...secondPlot.window,
    startUt1: secondPlot.window.startUt1 - 30 } };
  state = updateDisplay(state, changedWindow);
  assert.equal((state.displays[0] as TimeSeriesDisplay).window.startUt1,
    plot.window.startUt1);
  assert.equal((state.displays[3] as TimeSeriesDisplay).window.startUt1,
    secondPlot.window.startUt1 - 30);
});

test('a 1500–1600 window preserves Ptolemy and gaps source-limited Copernicus after 1523', () => {
  const state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const original = state.displays[0] as TimeSeriesDisplay;
  const plot = { ...original, window: { ...original.window,
    startUt1: frauenburgCivilToUt1(1500, 1, 1),
    endUt1: frauenburgCivilToUt1(1600, 1, 1) } };
  assert.equal(traceCoverage(plot, plot.traces[0]).status, 'full');
  assert.equal(traceCoverage(plot, plot.traces[1]).status, 'partial');
  const sampled = sampleWorkspacePlot(plot);
  assert.ok(sampled.count >= 12170);
  const after1523 = sampled.count - 100;
  assert.notEqual(sampled.traces[0].values[after1523], null);
  assert.equal(sampled.traces[1].values[after1523], null);
  assert.ok(plotSegments(sampled.traces[1].values, 'unwrapped').length >= 1);
  assert.equal(traceLongitudeAt(plot.traces[1], frauenburgCivilToUt1(1600, 1, 1)), null);
  const laterClock = setClockInstant(updateDisplay(state, plot), frauenburgCivilToUt1(2026, 10, 11));
  assert.equal(displayAvailabilityAt(laterClock.displays[0], laterClock.clock.ut1Jd).status, 'partial');
  assert.equal(sampled.traces[1].values.some(value => value !== null), true);
});

test('wrapped cuts, unwrapped branches, and disagreement respect frame conventions', () => {
  const plot = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  const small = { ...plot, window: { ...plot.window,
    startUt1: example1512Ut1 - 90, endUt1: example1512Ut1 + 90 } };
  const continuous = sampleWorkspacePlot(small);
  for (const trace of continuous.traces) for (let index = 1; index < trace.values.length; index++) {
    const a = trace.values[index - 1], b = trace.values[index];
    if (a !== null && b !== null) assert.ok(Math.abs(b - a) < 180);
  }
  assert.ok(Math.abs((continuous.traces[0].values[30] as number) -
    (continuous.traces[1].values[30] as number)) < 180);
  assert.deepEqual(plotSegments([358, 359, 1, 2, null, 4], 'wrapped').map(part =>
    part.map(point => point.value)), [[358, 359], [1, 2], [4]]);
  const analysis = { ...small, analysis: { kind: 'model-disagreement' as const,
    firstTraceId: small.traces[0].id, secondTraceId: small.traces[1].id } };
  assert.ok(Math.abs(modelDisagreementAt(analysis, example1512Ut1)! - 7.730579) < .000002);
  assert.equal(modelDisagreementAt({ ...analysis, frameAlignment: 'native' }, example1512Ut1), null);
  assert.equal(changePlot(analysis, 'frame-alignment', 'native'), null);
});

test('plot cache ignores the clock and language; follow shifts only at the central threshold', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const original = state.displays[0] as TimeSeriesDisplay;
  const key = workspacePlotCacheKey(original);
  state = setClockInstant(state, state.clock.ut1Jd + 1);
  assert.equal(workspacePlotCacheKey(state.displays[0] as TimeSeriesDisplay), key);
  const following = updateDisplay(state, { ...original,
    window: { ...original.window, followsClock: true } });
  assert.equal(followWorkspaceClock(following), following);
  const movedClock = setClockInstant(following, original.window.endUt1 - 10);
  const shifted = followWorkspaceClock(movedClock);
  const movedPlot = shifted.displays[0] as TimeSeriesDisplay;
  assert.notEqual(workspacePlotCacheKey(movedPlot), key);
  assert.equal(movedPlot.window.endUt1 - movedPlot.window.startUt1,
    original.window.endUt1 - original.window.startUt1);
  assert.equal((movedPlot.window.startUt1 + movedPlot.window.endUt1) / 2, shifted.clock.ut1Jd);
  assert.equal(shifted.clock.ut1Jd, movedClock.clock.ut1Jd);
});
