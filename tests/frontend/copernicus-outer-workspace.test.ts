import assert from 'node:assert/strict';
import test from 'node:test';
import { modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { copernicusOuterTrail, renderCopernicusOuterDiagram,
  copernicusOuterViewOrigin } from '../../web/src/copernicus-outer-diagram.ts';
import { evaluateSuperiorDays } from '../../web/src/copernicus-superior.ts';
import { message } from '../../web/src/i18n.ts';
import { modelCapabilities } from '../../web/src/model-registry.ts';
import { changeGeometry, changePlot, changeTrace } from '../../web/src/workspace-panel-actions.ts';
import { modelDisagreementAt, sampleWorkspacePlot,
  workspacePlotCacheKey } from '../../web/src/workspace-plot.ts';
import { renderWorkspaceSources } from '../../web/src/workspace-sources.ts';
import { applyWorkspacePreset, emptyWorkspace, setClockPlaying,
  tickClock } from '../../web/src/workspace-state.ts';
import { validateDisplay } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

test('Jupiter and Saturn comparison presets add valid independent panels', () => {
  for (const [preset, body, model] of [
    ['jupiter-comparison', 'Jupiter', 'copernicus-jupiter'],
    ['saturn-comparison', 'Saturn', 'copernicus-saturn'],
  ] as const) {
    const state = applyWorkspacePreset(emptyWorkspace(), preset);
    assert.equal(state.displays.length, 3);
    assert.ok(state.displays.every(display => validateDisplay(display).length === 0));
    const plot = state.displays[0] as TimeSeriesDisplay;
    assert.deepEqual(plot.traces.map(trace => trace.body), [body, body]);
    assert.equal(plot.traces[1].modelId, model);
    assert.equal((state.displays[2] as GeometryDisplay).modelId, model);
    assert.notStrictEqual((state.displays[1] as GeometryDisplay).trail,
      (state.displays[2] as GeometryDisplay).trail);
    assert.deepEqual(modelCapabilities[model].renderedViewCenters, ['earth', 'true-sun']);
    const moved = tickClock(setClockPlaying(state, true), 0.1);
    assert.ok(moved.clock.ut1Jd > state.clock.ut1Jd);
    assert.equal(moved.displays[0], state.displays[0]);
  }
});

test('moving centre changes drawing positions, not the geocentric sight line or longitude', () => {
  const day = 551900;
  for (const body of ['jupiter', 'saturn'] as const) {
    const result = evaluateSuperiorDays(body, day);
    const earthTrail = copernicusOuterTrail(body, day, 720, 'earth', 48);
    const sunTrail = copernicusOuterTrail(body, day, 720, 'true-sun', 48);
    const planet = result.planetGeometry.planet;
    const earth = result.earthGeometryInPlanetUnits.earth;
    const sun = result.earthGeometryInPlanetUnits.trueSun;
    assert.ok(Math.abs(earthTrail.at(-1)!.x - (planet.x - earth.x)) < 1e-9);
    assert.ok(Math.abs(sunTrail.at(-1)!.y - (planet.y - sun.y)) < 1e-9);
    assert.notDeepEqual(earthTrail[0], sunTrail[0]);
    assert.deepEqual(copernicusOuterViewOrigin(result, 'earth'), earth);
    assert.deepEqual(copernicusOuterViewOrigin(result, 'true-sun'), sun);
    for (const language of ['en', 'mn'] as const) {
      const earthSvg = renderCopernicusOuterDiagram(result, language, earthTrail, `-${body}-earth`, 'earth');
      const sunSvg = renderCopernicusOuterDiagram(result, language, sunTrail, `-${body}-sun`, 'true-sun');
      for (const svg of [earthSvg, sunSvg]) {
        assert.match(svg, /class="sight-line"/);
        assert.match(svg, /class="copernicus-principal-circle"/);
        assert.match(svg, /class="epicycle-circle"/);
        assert.match(svg, /class="solar-mean-ray"/);
        assert.ok(svg.includes(message(language, body === 'jupiter'
          ? 'copernicusJupiterDiagramAccessible' : 'copernicusSaturnDiagramAccessible')));
      }
      assert.match(sunSvg, /class="sun-earth-ray"/);
    }
  }
});

test('same-body signed disagreement works; different bodies remain overlays', () => {
  for (const preset of ['jupiter-comparison', 'saturn-comparison'] as const) {
    const state = applyWorkspacePreset(emptyWorkspace(), preset);
    const plot = state.displays[0] as TimeSeriesDisplay;
    const residual = changePlot(plot, 'analysis', 'model-disagreement')!;
    assert.equal(validateDisplay(residual).length, 0);
    const when = state.clock.ut1Jd;
    const value = modelDisagreementAt(residual, when);
    assert.notEqual(value, null);
    const swapped = changePlot(residual, 'first-trace', residual.traces[1].id)!;
    assert.ok(Math.abs(modelDisagreementAt(swapped, when)! + value!) < 1e-10);
    assert.notEqual(workspacePlotCacheKey(plot), workspacePlotCacheKey(residual));
    assert.notEqual(workspacePlotCacheKey(residual), workspacePlotCacheKey(swapped));
    const sampled = sampleWorkspacePlot(residual);
    assert.ok(sampled.disagreement?.values.some(item => item !== null));
    const crossBody = changeTrace(plot, plot.traces[1].id, 'body',
      preset === 'jupiter-comparison' ? 'Saturn' : 'Jupiter')!;
    assert.equal(changePlot(crossBody, 'analysis', 'model-disagreement'), null);
    assert.equal(crossBody.analysis.kind, 'overlay');
    assert.ok(sampleWorkspacePlot(crossBody).traces.every(trace => trace.values.some(value => value !== null)));
  }
});

test('Copernican outer plots and geometry use one historical day mapping', () => {
  const state = applyWorkspacePreset(emptyWorkspace(), 'jupiter-comparison');
  const time = state.clock.ut1Jd;
  const result = evaluateSuperiorDays('jupiter', modelDaysAtUt1(time).copernicus);
  const plot = state.displays[0] as TimeSeriesDisplay;
  const fromPlot = sampleWorkspacePlot(plot);
  const nearest = fromPlot.times.reduce((best, current) =>
    Math.abs(current - time) < Math.abs(best - time) ? current : best);
  assert.ok(Math.abs(nearest - time) <= 1.5);
  const atMarker = modelDisagreementAt(changePlot(plot, 'analysis', 'model-disagreement')!, time);
  assert.notEqual(atMarker, null);
  assert.ok(Number.isFinite(result.geocentricTropicalLongitude));
  const geometry = state.displays[2] as GeometryDisplay;
  const switched = changeGeometry(geometry, 'view-center', 'true-sun')!;
  assert.equal(switched.viewCenter, 'true-sun');
  assert.equal(state.displays[0], plot);
});

test('three-day samples resolve repeated Jupiter and Saturn stations', () => {
  for (const preset of ['jupiter-comparison', 'saturn-comparison'] as const) {
    const state = applyWorkspacePreset(emptyWorkspace(), preset);
    const base = state.displays[0] as TimeSeriesDisplay;
    const plot: TimeSeriesDisplay = { ...base, longitudeMode: 'unwrapped',
      window: { startUt1: 2269000, endUt1: 2305525 } };
    const samples = sampleWorkspacePlot(plot);
    assert.ok(samples.times.every((time, index) => index === 0 ||
      time - samples.times[index - 1] <= 3.001));
    const values = samples.traces[1].values;
    let stations = 0;
    for (let index = 2; index < values.length; index += 1) {
      const previous = values[index - 2];
      const middle = values[index - 1];
      const next = values[index];
      if (previous === null || middle === null || next === null) continue;
      if ((middle - previous) * (next - middle) < 0) stations += 1;
    }
    assert.ok(stations > 10, `${preset} has only ${stations} sampled stations`);
  }
});

test('new source cards preserve original numbers and complete bilingual explanations', () => {
  for (const language of ['en', 'mn'] as const) {
    const html = renderWorkspaceSources(language);
    assert.match(html, /sources-copernicus-outer/);
    for (const sourceNumber of ['917', '916', '687', '229', '1916', '1139', '854', '285', '1090',
      '347;32,3,9,40', '12;12,45,57,24']) assert.ok(html.includes(sourceNumber));
    for (const key of ['copernicusOuterValidation', 'copernicusJupiterReading',
      'copernicusSaturnReading', 'copernicusOuterContinuation'] as const) {
      assert.ok(html.includes(message(language, key)));
    }
  }
});
