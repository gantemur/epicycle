import assert from 'node:assert/strict';
import test from 'node:test';
import { formatFrauenburgInput, frauenburgCivilToUt1,
  parseFrauenburgInput } from '../../web/src/comparison-time.ts';
import { applyPlotWindowInputs, parsePlotBoundary } from '../../web/src/workspace-plot-window.ts';
import { applyWorkspacePreset, emptyWorkspace, updateDisplay } from '../../web/src/workspace-state.ts';
import { traceCoverage } from '../../web/src/workspace-validation.ts';
import type { TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

function plot(): TimeSeriesDisplay {
  return applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes').displays[0] as TimeSeriesDisplay;
}

test('plot boundaries accept a Julian year, date, and full local date-time', () => {
  assert.deepEqual(parsePlotBoundary('1500'),
    { ok: true, ut1Jd: frauenburgCivilToUt1(1500, 1, 1) });
  assert.deepEqual(parsePlotBoundary('1500-06-01'),
    { ok: true, ut1Jd: frauenburgCivilToUt1(1500, 6, 1) });
  assert.deepEqual(parsePlotBoundary('1500-06-01T12:30'),
    { ok: true, ut1Jd: frauenburgCivilToUt1(1500, 6, 1, 12, 30) });
  assert.deepEqual(parsePlotBoundary(' -0001 '),
    { ok: true, ut1Jd: frauenburgCivilToUt1(-1, 1, 1) });
  assert.deepEqual(parsePlotBoundary('-0001-03-01T12:30'),
    { ok: true, ut1Jd: frauenburgCivilToUt1(-1, 3, 1, 12, 30) });
  assert.deepEqual(parsePlotBoundary('0000-02-29'),
    { ok: true, ut1Jd: frauenburgCivilToUt1(0, 2, 29) });
  assert.throws(() => parseFrauenburgInput('1500')); // Main clock remains strict.
});

test('1500–1600 is exactly the permitted 36,525-day endpoint interval', () => {
  const original = plot();
  const result = applyPlotWindowInputs(original, '1500', '1600');
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.display.window.endUt1 - result.display.window.startUt1, 36525);
  assert.equal(formatFrauenburgInput(result.display.window.startUt1), '1500-01-01T00:00');
  assert.equal(formatFrauenburgInput(result.display.window.endUt1), '1600-01-01T00:00');
  assert.equal(traceCoverage(result.display, result.display.traces[0]).status, 'full');
  assert.equal(traceCoverage(result.display, result.display.traces[1]).status, 'full');
  assert.equal(result.display.traces[1].policyId, original.traces[1].policyId);
  assert.deepEqual(applyPlotWindowInputs(original, '1500', '1600-01-01T00:01'),
    { ok: false, display: original, issue: 'limit', field: 'end' });
});

test('plot boundary feedback distinguishes format, Julian validity, ordering, limit, and domain', () => {
  const original = plot();
  for (const bad of ['', '1500/01/01', '1500-6-1', '1500-01-01T12']) {
    assert.deepEqual(parsePlotBoundary(bad), { ok: false, issue: 'format' });
  }
  for (const bad of ['1501-02-29', '1500-13-01', '1500-06-01T24:00']) {
    assert.deepEqual(parsePlotBoundary(bad), { ok: false, issue: 'julian-date' });
  }
  assert.deepEqual(applyPlotWindowInputs(original, '1500/', '1600'),
    { ok: false, display: original, issue: 'format', field: 'start' });
  assert.deepEqual(applyPlotWindowInputs(original, '1500', '1501-02-29'),
    { ok: false, display: original, issue: 'julian-date', field: 'end' });
  assert.deepEqual(applyPlotWindowInputs(original, '1600', '1500'),
    { ok: false, display: original, issue: 'order', field: 'end' });
  assert.deepEqual(applyPlotWindowInputs(original, '1500', '1500'),
    { ok: false, display: original, issue: 'order', field: 'end' });
  assert.deepEqual(applyPlotWindowInputs(original, '1500', '1601'),
    { ok: false, display: original, issue: 'limit', field: 'end' });
  assert.deepEqual(applyPlotWindowInputs(original, '1500', '4000'),
    { ok: false, display: original, issue: 'domain', field: 'end' });
  assert.deepEqual(applyPlotWindowInputs(original, '-5000', '1500'),
    { ok: false, display: original, issue: 'domain', field: 'start' });
});

test('rejected input leaves the valid display and shared clock untouched', () => {
  const state = applyWorkspacePreset(emptyWorkspace(), 'compare-longitudes');
  const original = state.displays[0] as TimeSeriesDisplay;
  const failed = applyPlotWindowInputs(original, '1500', '1501-02-29');
  assert.equal(failed.ok, false);
  assert.strictEqual(failed.display, original);
  const after = failed.ok ? updateDisplay(state, failed.display) : state;
  assert.strictEqual(after, state);
  assert.strictEqual(after.displays[0], original);
  assert.strictEqual(after.displays[1], state.displays[1]);
  assert.strictEqual(after.clock, state.clock);
});
