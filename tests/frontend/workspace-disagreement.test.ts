import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonUt1Domain, example1512Ut1, frauenburgCivilToUt1 } from '../../web/src/comparison-time.ts';
import { messages } from '../../web/src/i18n.ts';
import { changePlot } from '../../web/src/workspace-panel-actions.ts';
import { plotSvg } from '../../web/src/workspace-plot-view.ts';
import { modelDisagreementAt, plotSegments, sampleWorkspacePlot, styledPlotSegments,
  workspacePlotCacheKey, type WorkspacePlotSamples } from '../../web/src/workspace-plot.ts';
import { applyWorkspacePreset, emptyWorkspace } from '../../web/src/workspace-state.ts';
import { validateDisplay } from '../../web/src/workspace-validation.ts';
import type { TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

function comparisonPlot(startYear: number, endYear: number): TimeSeriesDisplay {
  const original = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  return { ...original, window: { ...original.window,
    startUt1: frauenburgCivilToUt1(startYear, 1, 1),
    endUt1: frauenburgCivilToUt1(endYear, 1, 1) } };
}

function disagreementPlot(startYear: number, endYear: number): TimeSeriesDisplay {
  const plot = comparisonPlot(startYear, endYear);
  return { ...plot, analysis: { kind: 'model-disagreement',
    firstTraceId: plot.traces[0].id, secondTraceId: plot.traces[1].id } };
}

test('1512 difference is Copernicus minus Ptolemy; selecting the other trace reverses it', () => {
  const plot = disagreementPlot(1511, 1513);
  const instant = example1512Ut1;
  const first = modelDisagreementAt(plot, instant)!;
  assert.ok(Math.abs(first - 7.730579) < .000002);
  const reversed = changePlot(plot, 'first-trace', plot.analysis.kind === 'model-disagreement'
    ? plot.analysis.secondTraceId : '')!;
  assert.equal(reversed.analysis.kind, 'model-disagreement');
  assert.ok(Math.abs(modelDisagreementAt(reversed, instant)! + first) < 1e-10);
  const samples = sampleWorkspacePlot({ ...plot, window: { ...plot.window,
    startUt1: instant, endUt1: instant + 90 } });
  assert.ok(Math.abs(samples.disagreement!.values[0]! - first) < 1e-10);
  const svg = plotSvg(samples, 'en');
  assert.match(svg, /data-curve="disagreement"/);
  assert.doesNotMatch(svg, /data-curve="longitude"/);
  assert.match(svg, /class="plot-zero"/);
  assert.match(svg, /B − A \(°\)/);
  assert.match(plotSvg(samples, 'mn'), /загваруудын зөрүү/);
});

test('principal-branch jumps and unavailable samples create separate paths', () => {
  const plot = disagreementPlot(1511, 1513);
  const sampled = sampleWorkspacePlot(plot);
  const values = [178, 179, -179, -178, null, 4, 5];
  const synthetic: WorkspacePlotSamples = { ...sampled,
    times: values.map((_, index) => sampled.startUt1 + index),
    endUt1: sampled.startUt1 + values.length - 1,
    disagreement: { ...sampled.disagreement!, values } };
  assert.deepEqual(plotSegments(values, 'wrapped').map(segment => segment.map(point => point.value)),
    [[178, 179], [-179, -178], [4, 5]]);
  const svg = plotSvg(synthetic, 'en');
  assert.equal((svg.match(/data-curve="disagreement"/g) ?? []).length, 3);
  assert.equal((svg.match(/class="plot-zero"/g) ?? []).length, 1);
});

test('century disagreement continues dashed after 1523, or stays blank under source limit', () => {
  const exploratory = disagreementPlot(1500, 1600);
  const sampled = sampleWorkspacePlot(exploratory);
  const boundary = sampled.times.indexOf(comparisonUt1Domain.end);
  const late = sampled.times.findIndex(time => time > comparisonUt1Domain.end + 3);
  assert.ok(boundary > 0 && late > boundary);
  assert.notEqual(sampled.disagreement!.values[late], null);
  const styled = styledPlotSegments({ trace: sampled.disagreement!.first,
    values: sampled.disagreement!.values }, sampled.times, 'wrapped',
    [sampled.disagreement!.first, sampled.disagreement!.second]);
  assert.ok(styled.some(segment => segment.style === 'solid'));
  assert.ok(styled.some(segment => segment.style === 'dashed' &&
    segment.points.some(point => point.index >= late)));
  assert.match(plotSvg(sampled, 'en'), /data-curve="disagreement" data-provenance="dashed"/);

  const sourceLimited = { ...exploratory, traces: exploratory.traces.map(trace =>
    trace.modelId === 'copernicus' ? { ...trace,
      policyId: 'sn-local-uniform-1473-1523' } : trace) };
  const guarded = sampleWorkspacePlot(sourceLimited, sampled);
  assert.equal(guarded.times.indexOf(comparisonUt1Domain.end), boundary);
  assert.notEqual(guarded.disagreement!.values[boundary], null);
  assert.equal(guarded.disagreement!.values[late], null);
  const guardedSegments = styledPlotSegments({ trace: guarded.disagreement!.first,
    values: guarded.disagreement!.values }, guarded.times, 'wrapped',
    [guarded.disagreement!.first, guarded.disagreement!.second]);
  assert.ok(guardedSegments.every(segment => segment.style === 'solid'));
  assert.ok(guardedSegments.every(segment => segment.points.at(-1)!.index <= boundary));
  assert.doesNotMatch(plotSvg(guarded, 'en'), /data-curve="disagreement" data-provenance="dashed"/);
});

test('incompatible pair or frames cannot produce a numerical disagreement', () => {
  const plot = disagreementPlot(1511, 1513);
  const instant = frauenburgCivilToUt1(1512, 1, 1);
  const native = { ...plot, frameAlignment: 'native' as const };
  assert.ok(validateDisplay(native).some(issue => issue.code === 'incompatible-frame'));
  assert.equal(modelDisagreementAt(native, instant), null);
  assert.throws(() => sampleWorkspacePlot(native));
  const sidereal = { ...plot, traces: plot.traces.map(trace => trace.modelId === 'copernicus'
    ? { ...trace, observableId: 'geocentric-sidereal-longitude' } : trace) };
  assert.ok(validateDisplay(sidereal).some(issue => issue.code === 'invalid-disagreement'));
  assert.equal(modelDisagreementAt(sidereal, instant), null);
  const otherBody = { ...plot, traces: plot.traces.map(trace => trace.modelId === 'copernicus'
    ? { ...trace, body: 'Venus' } : trace) };
  assert.ok(validateDisplay(otherBody).some(issue => issue.code === 'invalid-disagreement'));
  assert.equal(modelDisagreementAt(otherBody, instant), null);
  for (const language of ['en', 'mn'] as const) {
    assert.ok(messages[language].disagreementFrameIncompatible.length > 30);
    assert.ok(messages[language].disagreementDateUnavailable.length > 30);
  }
});

test('a source-limited window entirely after 1523 has no invented residual', () => {
  const plot = disagreementPlot(1550, 1560);
  const guarded = { ...plot, traces: plot.traces.map(trace => trace.modelId === 'copernicus'
    ? { ...trace, policyId: 'sn-local-uniform-1473-1523' } : trace) };
  const samples = sampleWorkspacePlot(guarded);
  assert.ok(samples.disagreement!.values.every(value => value === null));
  assert.doesNotMatch(plotSvg(samples, 'en'), /data-curve="disagreement"/);
  assert.equal(modelDisagreementAt(guarded, frauenburgCivilToUt1(1555, 1, 1)), null);
  assert.ok(messages.en.disagreementNoData.includes('unavailable'));
  assert.ok(messages.mn.disagreementNoData.includes('боломжгүй'));
});

test('cache key changes with interpretation and ordered pair, but not clock time', () => {
  const plot = comparisonPlot(1511, 1513);
  const difference = disagreementPlot(1511, 1513);
  const overlaySvg = plotSvg(sampleWorkspacePlot(plot), 'en');
  assert.equal((overlaySvg.match(/data-curve="longitude"/g) ?? []).length, 2);
  assert.doesNotMatch(overlaySvg, /class="plot-zero"/);
  assert.notEqual(workspacePlotCacheKey(plot), workspacePlotCacheKey(difference));
  const reverse = changePlot(difference, 'second-trace', difference.traces[0].id)!;
  assert.notEqual(workspacePlotCacheKey(difference), workspacePlotCacheKey(reverse));
  assert.equal(workspacePlotCacheKey(difference), workspacePlotCacheKey({ ...difference }));
});
