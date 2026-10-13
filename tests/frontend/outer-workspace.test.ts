import assert from 'node:assert/strict';
import test from 'node:test';
import { ptolemyDayToAssumedUt1, modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { outerTrailPoints, renderDiagram, screenPoint } from '../../web/src/diagram.ts';
import { message } from '../../web/src/i18n.ts';
import { historicalBodies, modelIdsForBody } from '../../web/src/model-registry.ts';
import { evaluatePtolemyJupiterDays } from '../../web/src/ptolemy-jupiter.ts';
import { evaluatePtolemySaturnDays } from '../../web/src/ptolemy-saturn.ts';
import { addTrace, changeGeometry, changePlot, changeTrace } from '../../web/src/workspace-panel-actions.ts';
import { sampleWorkspacePlot, traceLongitudeAt, workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { renderWorkspaceSources } from '../../web/src/workspace-sources.ts';
import { applyWorkspacePreset, emptyWorkspace, setClockPlaying, tickClock,
  updateDisplay } from '../../web/src/workspace-state.ts';
import { validateDisplay } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

test('the four-body registry and outer preset preserve the original first visit', () => {
  assert.deepEqual(historicalBodies, ['Mars', 'Sun', 'Jupiter', 'Saturn']);
  assert.deepEqual(modelIdsForBody('Jupiter'), ['ptolemy-jupiter', 'copernicus-jupiter']);
  assert.deepEqual(modelIdsForBody('Saturn'), ['ptolemy-saturn', 'copernicus-saturn']);
  assert.deepEqual(applyWorkspacePreset(emptyWorkspace(), 'desktop-explore').displays.map(d => d.kind),
    ['time-series', 'geometry']);
  const state = applyWorkspacePreset(emptyWorkspace(), 'outer-planets');
  assert.deepEqual(state.displays.map(d => d.kind === 'geometry' ? d.modelId : d.traces.map(t => t.modelId)),
    [['ptolemy-jupiter', 'ptolemy-saturn'], 'ptolemy-jupiter', 'ptolemy-saturn']);
  assert.ok(state.displays.every(display => validateDisplay(display).length === 0));
  assert.notStrictEqual((state.displays[1] as GeometryDisplay).trail,
    (state.displays[2] as GeometryDisplay).trail);
});

test('body changes select compatible Copernican policy and retain a supported viewing centre', () => {
  const original = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const copernicus = { ...(original.displays[2] as GeometryDisplay), viewCenter: 'true-sun' as const };
  const jupiter = changeGeometry(copernicus, 'body', 'Jupiter')!;
  assert.deepEqual([jupiter.body, jupiter.modelId, jupiter.policyId, jupiter.viewCenter],
    ['Jupiter', 'copernicus-jupiter', 'mathematical-continuation', 'true-sun']);
  assert.equal(changeGeometry(jupiter, 'view-center', 'true-sun')?.viewCenter, 'true-sun');
  const state = updateDisplay(original, jupiter);
  assert.strictEqual(state.displays[0], original.displays[0]);
  const plot = original.displays[0] as TimeSeriesDisplay;
  const changed = changeTrace(plot, 'trace-2', 'body', 'Saturn')!;
  assert.deepEqual([changed.traces[1].body, changed.traces[1].modelId,
    changed.traces[1].policyId], ['Saturn', 'copernicus-saturn', 'mathematical-continuation']);
  assert.equal(changed.analysis.kind, 'overlay');
});

test('planet geometry, fixed scale, trail endpoint, and bilingual labels agree', () => {
  for (const [body, evaluate] of [
    ['Jupiter', evaluatePtolemyJupiterDays], ['Saturn', evaluatePtolemySaturnDays],
  ] as const) {
    const day = 825000;
    const result = evaluate(day);
    const trail = outerTrailPoints(body, day, 540, 36);
    assert.deepEqual(trail.at(-1), result.planet);
    assert.deepEqual(outerTrailPoints(body, -10, 90, 9)[0], evaluate(-100).planet);
    assert.deepEqual(screenPoint(result.earth), { x: 320, y: 320 });
    assert.equal(result.deferentRadius, 60);
    assert.ok(result.epicycleRadius < 12);
    for (const language of ['en', 'mn'] as const) {
      const svg = renderDiagram(result, trail, language, `-${body}`, body);
      assert.match(svg, /class="epicycle-circle"/);
      assert.match(svg, /class="equant-ray"/);
      assert.match(svg, /class="sight-line"/);
      assert.match(svg, new RegExp(message(language,
        body === 'Jupiter' ? 'jupiterDiagramAccessible' : 'saturnDiagramAccessible')));
      assert.match(svg, new RegExp(message(language,
        body === 'Jupiter' ? 'jupiterDescription' : 'saturnDescription')));
    }
  }
});

test('outer and four-body overlays follow one clock; cross-body disagreement is rejected', () => {
  let state = applyWorkspacePreset(emptyWorkspace(), 'outer-planets');
  const plot = state.displays[0] as TimeSeriesDisplay;
  const when = ptolemyDayToAssumedUt1(825000);
  const days = modelDaysAtUt1(when).ptolemy;
  assert.ok(Math.abs(traceLongitudeAt(plot.traces[0], when)! -
    evaluatePtolemyJupiterDays(days).longitude) < 1e-9);
  assert.ok(Math.abs(traceLongitudeAt(plot.traces[1], when)! -
    evaluatePtolemySaturnDays(days).longitude) < 1e-9);
  assert.equal(changePlot(plot, 'analysis', 'model-disagreement'), null);
  const four = addTrace(addTrace(plot)!)!;
  const withSun = changeTrace(four, four.traces[2].id, 'body', 'Sun')!;
  const withMars = changeTrace(withSun, withSun.traces[3].id, 'body', 'Mars')!;
  assert.deepEqual(withMars.traces.map(trace => trace.body), ['Jupiter', 'Saturn', 'Sun', 'Mars']);
  assert.deepEqual(validateDisplay(withMars), []);
  assert.equal(new Set(withMars.traces.map(trace => trace.id)).size, 4);
  assert.ok(sampleWorkspacePlot(withMars).traces.every(trace => trace.values.some(value => value !== null)));
  const key = workspacePlotCacheKey(withMars);
  state = setClockPlaying(state, true);
  const after = tickClock(state, 0.1);
  assert.ok(after.clock.ut1Jd > state.clock.ut1Jd);
  assert.equal(workspacePlotCacheKey(withMars), key);
  assert.equal(after.displays.length, 3);
});

test('three-day sampling retains Jupiter and Saturn retrograde turns', () => {
  const plot = applyWorkspacePreset(emptyWorkspace(), 'outer-planets').displays[0] as TimeSeriesDisplay;
  const start = ptolemyDayToAssumedUt1(825000);
  const window = { startUt1: start, endUt1: start + 730, followsClock: false };
  const sampled = sampleWorkspacePlot({ ...plot, window });
  assert.ok(sampled.times.every((time, i) => i === 0 || time - sampled.times[i - 1] <= 3.001));
  for (const trace of sampled.traces) {
    const values = trace.values as number[];
    const steps = values.slice(1).map((value, i) => value - values[i]);
    assert.ok(steps.some(step => step > 0), `${trace.trace.body} should move eastward`);
    assert.ok(steps.some(step => step < 0), `${trace.trace.body} should retrograde`);
  }
});

test('outer source cards show original notation and validation limits in both languages', () => {
  for (const language of ['en', 'mn'] as const) {
    const html = renderWorkspaceSources(language);
    assert.match(html, /sources-outer/);
    assert.match(html, /296;43/);
    assert.match(html, /296;44/);
    assert.match(html, /296;45/);
    assert.match(html, /0;4,59,14,26,46,31/);
    assert.match(html, /0;2,0,33,31,28,51/);
    assert.ok(html.includes(message(language, 'outerSourceLimit')));
    assert.ok(html.includes(message(language, 'outerValidationStatus')));
    assert.ok(html.includes(message(language, 'apogeeOriginal')));
  }
});
