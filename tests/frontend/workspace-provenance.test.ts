import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonUt1Domain, frauenburgCivilToUt1 } from '../../web/src/comparison-time.ts';
import { exploratoryApsisPolicy } from '../../web/src/copernicus.ts';
import { messages } from '../../web/src/i18n.ts';
import { sampleWorkspacePlot, styledPlotSegments, traceLongitudeAt,
  workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { applyWorkspacePreset, emptyWorkspace, suggestedWorkspace } from '../../web/src/workspace-state.ts';
import { traceCoverage } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, PlotTrace, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

const sourcePolicy = 'sn-local-uniform-1473-1523';

function comparisonPlot(startYear: number, endYear: number): TimeSeriesDisplay {
  const original = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  return { ...original, window: { ...original.window,
    startUt1: frauenburgCivilToUt1(startYear, 1, 1),
    endUt1: frauenburgCivilToUt1(endYear, 1, 1) } };
}

test('new comparison plots explicitly select exploratory Copernicus; geometry stays source-limited', () => {
  for (const preset of ['compare-longitudes', 'desktop-explore', 'detailed-comparison'] as const) {
    const state = applyWorkspacePreset(emptyWorkspace(), preset);
    const plot = state.displays[0] as TimeSeriesDisplay;
    assert.equal(plot.traces[1].policyId, exploratoryApsisPolicy);
  }
  for (const width of [375, 1200]) {
    const plot = suggestedWorkspace(width).displays[0] as TimeSeriesDisplay;
    assert.equal(plot.traces[1].policyId, exploratoryApsisPolicy);
  }
  const geometry = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison').displays[2] as GeometryDisplay;
  assert.equal(geometry.policyId, sourcePolicy);
});

test('both apsis policies agree inside the project guard; only exploratory continues outside', () => {
  const trace = comparisonPlot(1500, 1600).traces[1];
  const source: PlotTrace = { ...trace, policyId: sourcePolicy };
  for (const ut1Jd of [comparisonUt1Domain.start,
    frauenburgCivilToUt1(1512, 1, 1), comparisonUt1Domain.end]) {
    const guarded = traceLongitudeAt(source, ut1Jd);
    const exploratory = traceLongitudeAt(trace, ut1Jd);
    assert.notEqual(guarded, null);
    assert.ok(Math.abs(guarded! - exploratory!) < 1e-11);
  }
  for (const ut1Jd of [comparisonUt1Domain.start - 1, comparisonUt1Domain.end + 1]) {
    assert.equal(traceLongitudeAt(source, ut1Jd), null);
    assert.notEqual(traceLongitudeAt(trace, ut1Jd), null);
  }
});

test('1500–1600 continues through an exact solid-to-dashed boundary without a longitude jump', () => {
  const plot = comparisonPlot(1500, 1600);
  const samples = sampleWorkspacePlot(plot);
  const boundary = samples.times.indexOf(comparisonUt1Domain.end);
  assert.ok(boundary > 0 && boundary < samples.count);
  assert.equal(traceCoverage(plot, plot.traces[0]).status, 'full');
  assert.equal(traceCoverage(plot, plot.traces[1]).status, 'full');
  assert.ok(samples.traces[0].values.every(value => value !== null));
  assert.ok(samples.traces[1].values.every(value => value !== null));
  const ptolemy = styledPlotSegments(samples.traces[0], samples.times, 'unwrapped');
  const copernicus = styledPlotSegments(samples.traces[1], samples.times, 'unwrapped');
  assert.deepEqual(ptolemy.map(segment => segment.style), ['solid']);
  assert.deepEqual(copernicus.map(segment => segment.style), ['solid', 'dashed']);
  const before = copernicus[0].points.at(-1)!;
  const after = copernicus[1].points[0];
  assert.equal(before.index, boundary);
  assert.deepEqual(after, before);
  assert.ok(Math.abs(samples.traces[1].values[boundary]! - samples.traces[1].values[boundary - 1]!) < 180);
  assert.ok(Math.abs(samples.traces[1].values[boundary + 1]! - samples.traces[1].values[boundary]!) < 180);
});

test('1400–1500 crosses the first guard boundary from dashed to solid', () => {
  const plot = comparisonPlot(1400, 1500);
  const samples = sampleWorkspacePlot(plot);
  const boundary = samples.times.indexOf(comparisonUt1Domain.start);
  assert.ok(boundary > 0 && boundary < samples.count);
  const segments = styledPlotSegments(samples.traces[1], samples.times, 'unwrapped');
  assert.deepEqual(segments.map(segment => segment.style), ['dashed', 'solid']);
  assert.deepEqual(segments[0].points.at(-1), segments[1].points[0]);
  assert.equal(segments[1].points[0].index, boundary);
});

test('wrapped jumps and policy provenance split independently; traces keep separate policies', () => {
  const plot = comparisonPlot(1500, 1600);
  const source: PlotTrace = { ...plot.traces[1], id: 'trace-3', policyId: sourcePolicy };
  const mixed = { ...plot, traces: [...plot.traces, source] };
  const sampled = sampleWorkspacePlot(mixed);
  const late = sampled.times.findIndex(time => time > comparisonUt1Domain.end + 1);
  assert.notEqual(sampled.traces[1].values[late], null);
  assert.equal(sampled.traces[2].values[late], null);
  assert.equal(traceCoverage(mixed, source).status, 'partial');
  assert.notEqual(workspacePlotCacheKey(mixed), workspacePlotCacheKey(plot));
  assert.equal(workspacePlotCacheKey(plot), workspacePlotCacheKey(comparisonPlot(1500, 1600)));

  const boundary = comparisonUt1Domain.end;
  const times = [boundary - 2, boundary - 1, boundary, boundary + 1];
  const wrapped = styledPlotSegments({ trace: plot.traces[1], values: [358, 359, 1, 2] },
    times, 'wrapped');
  assert.deepEqual(wrapped.map(segment => segment.style), ['solid', 'dashed']);
  assert.deepEqual(wrapped.map(segment => segment.points.map(point => point.value)),
    [[358, 359], [1, 2]]);
  const unwrapped = styledPlotSegments({ trace: plot.traces[1], values: [358, 359, 361, 362] },
    times, 'unwrapped');
  assert.deepEqual(unwrapped.map(segment => segment.points.map(point => point.value)),
    [[358, 359, 361], [361, 362]]);
});

test('a policy change reuses unchanged trace evaluations on the same time grid', () => {
  const plot = comparisonPlot(1500, 1600);
  const first = sampleWorkspacePlot(plot);
  const source: PlotTrace = { ...plot.traces[1], policyId: sourcePolicy };
  const changed = { ...plot, traces: [plot.traces[0], source] };
  const second = sampleWorkspacePlot(changed, first);
  assert.strictEqual(second.rawTraces[0], first.rawTraces[0]);
  assert.notStrictEqual(second.rawTraces[1], first.rawTraces[1]);
  const late = second.times.findIndex(time => time > comparisonUt1Domain.end + 1);
  assert.notEqual(first.rawTraces[1].values[late], null);
  assert.equal(second.rawTraces[1].values[late], null);
  assert.equal(second.traces[0].values[late], first.traces[0].values[late]);
});

test('both languages explain source limits, exploratory dashes, and the missing general law', () => {
  for (const language of ['en', 'mn'] as const) {
    assert.ok(messages[language].exploratoryCurveNote.length > 100);
    assert.ok(messages[language].sourceLimitedCurveNote.length > 70);
  }
});
