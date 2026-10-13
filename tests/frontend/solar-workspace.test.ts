import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { modelDaysAtUt1, frauenburgCivilToUt1 } from '../../web/src/comparison-time.ts';
import { evaluateCopernicusSunDays } from '../../web/src/copernicus-sun.ts';
import { message } from '../../web/src/i18n.ts';
import { modelCapabilities, modelIdsForBody } from '../../web/src/model-registry.ts';
import { copernicusSunTrail, ptolemySunTrail, renderCopernicusSunDiagram,
  renderPtolemySunDiagram } from '../../web/src/sun-diagram.ts';
import { evaluatePtolemySunDays } from '../../web/src/sun-almagest.ts';
import { addTrace, changeGeometry, changeTrace, removeTrace } from '../../web/src/workspace-panel-actions.ts';
import { modelDisagreementAt, sampleWorkspacePlot, traceLongitudeAt,
  workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { renderWorkspaceSources } from '../../web/src/workspace-sources.ts';
import { applyWorkspacePreset, emptyWorkspace, setClockInstant, updateDisplay } from '../../web/src/workspace-state.ts';
import { validateDisplay } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

const near = (actual: number, expected: number, tolerance = 1e-9): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('solar registry identities and body-aware choices preserve Mars defaults', () => {
  assert.deepEqual(modelIdsForBody('Mars'), ['ptolemy', 'copernicus']);
  assert.deepEqual(modelIdsForBody('Sun'), ['ptolemy-sun', 'copernicus-sun']);
  assert.equal(modelCapabilities['copernicus-sun'].recordId,
    'copernicus-1543-earth-longitude');
  assert.equal(modelCapabilities['ptolemy-sun'].recordId,
    'ptolemy-almagest-sun-longitude');
  assert.deepEqual(Object.keys(modelCapabilities['copernicus-sun'].policies),
    ['mathematical-continuation']);
  const initial = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  assert.deepEqual(initial.displays.map(display => display.kind === 'geometry'
    ? display.modelId : display.traces.map(trace => trace.modelId)),
  [['ptolemy', 'copernicus'], 'ptolemy', 'copernicus']);
});

test('body changes choose a compatible solar model and leave other panels alone', () => {
  const original = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison');
  const marsGeometry = original.displays[2] as GeometryDisplay;
  const solarGeometry = changeGeometry(marsGeometry, 'body', 'Sun')!;
  assert.equal(solarGeometry.body, 'Sun');
  assert.equal(solarGeometry.modelId, 'copernicus-sun');
  assert.equal(solarGeometry.policyId, 'mathematical-continuation');
  assert.equal(solarGeometry.viewCenter, 'earth');
  const moved = updateDisplay(original, solarGeometry);
  assert.strictEqual(moved.displays[0], original.displays[0]);
  assert.strictEqual(moved.displays[1], original.displays[1]);
  assert.deepEqual(validateDisplay(moved.displays[2]), []);
  const plot = original.displays[0] as TimeSeriesDisplay;
  const changedTrace = changeTrace(plot, 'trace-2', 'body', 'Sun')!;
  assert.equal(changedTrace.traces[1].modelId, 'copernicus-sun');
  assert.equal(changedTrace.traces[1].body, 'Sun');
  assert.equal(changedTrace.traces[1].policyId, 'mathematical-continuation');
  assert.equal(original.displays[0], plot);
});

test('Add trace follows an all-solar or all-Mars plot and keeps independent valid traces', () => {
  const solar = applyWorkspacePreset(emptyWorkspace(), 'solar-comparison').displays[0] as TimeSeriesDisplay;
  const withSolar = addTrace(solar)!;
  const solarTrace = withSolar.traces[2];
  assert.deepEqual([solarTrace.body, solarTrace.modelId, solarTrace.policyId],
    ['Sun', 'ptolemy-sun', 'mathematical-continuation']);
  assert.equal(solarTrace.id, 'trace-3');
  assert.equal(solar.traces.length, 2);
  assert.notStrictEqual(withSolar.traces, solar.traces);
  assert.notStrictEqual(solarTrace, solar.traces[0]);
  assert.deepEqual(validateDisplay(withSolar), []);

  const changedBody = changeTrace(withSolar, solarTrace.id, 'body', 'Mars')!;
  assert.equal(changedBody.traces[2].modelId, 'ptolemy');
  assert.equal(withSolar.traces[2].body, 'Sun');
  assert.deepEqual(validateDisplay(changedBody), []);
  const mixedAddition = addTrace(changedBody)!;
  assert.equal(mixedAddition.traces[3].body, 'Mars');
  assert.equal(new Set(mixedAddition.traces.map(trace => trace.id)).size, 4);
  assert.equal(addTrace(mixedAddition), null);

  const mars = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  const withMars = addTrace(mars)!;
  assert.deepEqual([withMars.traces[2].body, withMars.traces[2].modelId], ['Mars', 'ptolemy']);
  assert.deepEqual(validateDisplay(withMars), []);
  const readded = addTrace(removeTrace(withMars, 'trace-1')!)!;
  assert.equal(new Set(readded.traces.map(trace => trace.id)).size, readded.traces.length);
  assert.deepEqual(validateDisplay(readded), []);
});

test('shared trail wording is body-neutral in both languages', () => {
  assert.equal(message('en', 'trail'), 'Show trail');
  assert.equal(message('mn', 'trail'), 'Мөрийг харуулах');
  for (const language of ['en', 'mn'] as const) {
    const help = message(language, 'trailHelp');
    assert.ok(help.length > 0);
    assert.ok(message(language, 'trailLengthHelp').length > 0);
    assert.doesNotMatch(`${message(language, 'trail')} ${help}`, /Mars|Ангараг/);
  }
});

test('solar comparison uses one clock, supports two solar traces and rejects mixed-body residuals', () => {
  const workspace = applyWorkspacePreset(emptyWorkspace(), 'solar-comparison');
  const plot = workspace.displays[0] as TimeSeriesDisplay;
  const geometry = workspace.displays[1] as GeometryDisplay;
  assert.deepEqual(plot.traces.map(trace => trace.modelId),
    ['ptolemy-sun', 'copernicus-sun']);
  assert.equal(geometry.modelId, 'copernicus-sun');
  assert.equal(geometry.viewCenter, 'true-sun');
  const when = frauenburgCivilToUt1(1512, 1, 1, 6);
  const moved = setClockInstant(workspace, when);
  assert.equal(moved.clock.ut1Jd, when);
  const days = modelDaysAtUt1(when);
  near(traceLongitudeAt(plot.traces[0], when)!, evaluatePtolemySunDays(days.ptolemy).longitude);
  near(traceLongitudeAt(plot.traces[1], when)!,
    evaluateCopernicusSunDays(days.copernicus).solarTropicalLongitude);
  const disagreement = { ...plot, analysis: { kind: 'model-disagreement' as const,
    firstTraceId: 'trace-1', secondTraceId: 'trace-2' } };
  assert.deepEqual(validateDisplay(disagreement), []);
  const first = modelDisagreementAt(disagreement, when)!;
  const swapped = { ...disagreement, analysis: { ...disagreement.analysis,
    firstTraceId: 'trace-2', secondTraceId: 'trace-1' } };
  near(modelDisagreementAt(swapped, when)!, -first);
  assert.notEqual(workspacePlotCacheKey(disagreement), workspacePlotCacheKey(swapped));
  const mixed = { ...disagreement,
    traces: [plot.traces[0], { ...plot.traces[1], body: 'Mars', modelId: 'copernicus',
      policyId: 'sn-uniform-exploratory' }] };
  assert.ok(validateDisplay(mixed).some(issue => issue.code === 'invalid-disagreement'));
  assert.equal(modelDisagreementAt(mixed, when), null);
});

test('solar and Mars longitude can overlay as distinct traces, including today', () => {
  const solar = applyWorkspacePreset(emptyWorkspace(), 'solar-comparison').displays[0] as TimeSeriesDisplay;
  const mars = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
  const mixed = { ...solar, traces: [...solar.traces, { ...mars.traces[0], id: 'trace-3' },
    { ...mars.traces[1], id: 'trace-4' }] };
  assert.deepEqual(validateDisplay(mixed), []);
  const samples = sampleWorkspacePlot(mixed);
  assert.equal(samples.traces.length, 4);
  assert.ok(samples.rawTraces.every(trace => trace.values.some(value => value !== null)));
  const today = frauenburgCivilToUt1(2026, 10, 12);
  assert.notEqual(traceLongitudeAt(solar.traces[0], today), null);
  assert.notEqual(traceLongitudeAt(solar.traces[1], today), null);
  assert.equal(traceLongitudeAt({ ...mars.traces[1], policyId: 'sn-local-uniform-1473-1523' },
    today), null);
});

test('solar diagrams and trails retain original lengths and moving viewing origins', () => {
  const days = modelDaysAtUt1(frauenburgCivilToUt1(1525, 4, 17));
  const ptolemy = evaluatePtolemySunDays(days.ptolemy);
  const ptolemyTrail = ptolemySunTrail(days.ptolemy, 180);
  near(ptolemyTrail.at(-1)!.x, ptolemy.sun.x);
  near(ptolemyTrail.at(-1)!.y, ptolemy.sun.y);
  const original = renderPtolemySunDiagram(ptolemy, ptolemyTrail, 'en');
  assert.match(original, /deferent-circle/);
  assert.match(original, /sight-line/);
  assert.match(original, /solar-trail/);
  assert.match(original, /<line class="solar-mean-ray"/);
  assert.doesNotMatch(original, /class="equant-ray"/);
  const stylesheet = readFileSync(new URL('../../web/src/style.css', import.meta.url), 'utf8');
  assert.match(stylesheet, /\.equant-ray, \.solar-mean-ray, \.solar-eccentric-offset\s*\{/);
  assert.match(stylesheet, /\[data-geometry-frame\]\.hide-lines \.solar-mean-ray[^{}]*\{\s*opacity: 0;/);
  const copernicus = evaluateCopernicusSunDays(days.copernicus);
  const earthTrail = copernicusSunTrail(days.copernicus, 180, 'true-sun');
  const sunTrail = copernicusSunTrail(days.copernicus, 180, 'earth');
  near(earthTrail.at(-1)!.x, copernicus.earth.x);
  near(sunTrail.at(-1)!.x, copernicus.earthToSun.x);
  const sunView = renderCopernicusSunDiagram(copernicus, 'true-sun', earthTrail, 'en');
  const earthView = renderCopernicusSunDiagram(copernicus, 'earth', sunTrail, 'mn');
  for (const svg of [sunView, earthView]) {
    assert.match(svg, /deferent-circle/);
    assert.match(svg, /sight-line/);
    assert.match(svg, /mean-sun-dot/);
    assert.match(svg, /solar-trail/);
  }
  assert.notEqual(sunView, earthView);
});

test('English and Mongolian source cards distinguish solar provenance and numerical status', () => {
  for (const language of ['en', 'mn'] as const) {
    const sources = renderWorkspaceSources(language);
    assert.ok(sources.includes(message(language, 'ptolemySunSourceIntro')));
    assert.ok(sources.includes(message(language, 'copernicusSunSourceIntro')));
    assert.ok(sources.includes(message(language, 'solarFrameLimit')));
    assert.ok(sources.includes('0;59,8,17,13,12,31'));
    assert.ok(sources.includes('369'));
    assert.ok(sources.includes('48'));
  }
});
