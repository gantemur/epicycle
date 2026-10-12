import assert from 'node:assert/strict';
import test from 'node:test';
import { daysToEgyptian } from '../../web/src/chronology.ts';
import { ptolemyDayToAssumedUt1 } from '../../web/src/comparison-time.ts';
import { outerTrailPoints, trailPoints } from '../../web/src/diagram.ts';
import { message } from '../../web/src/i18n.ts';
import { evaluateDays } from '../../web/src/model.ts';
import { evaluatePtolemyJupiterDays } from '../../web/src/ptolemy-jupiter.ts';
import { evaluatePtolemySaturnDays } from '../../web/src/ptolemy-saturn.ts';
import { formatPtolemaicDates, renderGeometryDynamic } from '../../web/src/workspace-geometry-view.ts';
import { applyWorkspacePreset, emptyWorkspace } from '../../web/src/workspace-state.ts';
import type { GeometryDisplay } from '../../web/src/workspace-types.ts';

function geometryPanel(): { panel: HTMLElement; values: Map<string, { textContent: string }> } {
  const values = new Map<string, { textContent: string }>();
  for (const selector of ['[data-tropical]', '[data-mean-longitude]', '[data-mean-anomaly]',
    '[data-centre-correction]', '[data-egyptian-date]', '[data-julian-date]']) {
    values.set(selector, { textContent: '' });
  }
  const frame = { innerHTML: '', classList: { toggle: () => false } };
  const readouts = { hidden: false };
  const unavailable = { hidden: true, textContent: '' };
  const panel = {
    querySelector: (selector: string) => ({
      '[data-geometry-frame]': frame,
      '[data-panel-readouts]': readouts,
      '[data-unavailable]': unavailable,
    } as Record<string, object>)[selector] ?? values.get(selector) ?? null,
  } as unknown as HTMLElement;
  return { panel, values };
}

test('negative days have a Julian readout and bilingual continuation notice, never an Egyptian year zero', () => {
  assert.throws(() => daysToEgyptian(-1), RangeError);
  for (const language of ['en', 'mn'] as const) {
    for (const [day, date] of [[-1 / 24, `747 ${message(language, 'bce')} · 2 · 26`],
      [-80000, `966 ${message(language, 'bce')} · 2 · 16`]] as const) {
      const dates = formatPtolemaicDates(day, language);
      assert.equal(dates.egyptian, message(language, 'beforeNabonassarEpoch'));
      assert.equal(dates.julian, date);
    }
    assert.equal(formatPtolemaicDates(0, language).egyptian, '1 · 1 · 1');
    assert.equal(formatPtolemaicDates(1, language).egyptian, '1 · 1 · 2');
  }
});

test('Mars, Jupiter and Saturn geometry render just before and long before the epoch', () => {
  const outer = applyWorkspacePreset(emptyWorkspace(), 'outer-planets').displays;
  const mars = applyWorkspacePreset(emptyWorkspace(), 'desktop-explore').displays
    .find(display => display.kind === 'geometry') as GeometryDisplay;
  const displays = [mars, ...outer.filter(display => display.kind === 'geometry') as GeometryDisplay[]];
  assert.deepEqual(displays.map(display => display.body), ['Mars', 'Jupiter', 'Saturn']);
  for (const day of [-1 / 24, -80000, 0, 1]) {
    for (const display of displays) {
      for (const language of ['en', 'mn'] as const) {
        const { panel, values } = geometryPanel();
        renderGeometryDynamic(panel, display, ptolemyDayToAssumedUt1(day), language);
        assert.equal(values.get('[data-egyptian-date]')?.textContent,
          formatPtolemaicDates(day, language).egyptian, display.body);
        assert.equal(values.get('[data-julian-date]')?.textContent,
          formatPtolemaicDates(day, language).julian, display.body);
        assert.match((panel.querySelector('[data-geometry-frame]') as HTMLElement).innerHTML,
          /<svg\b/, display.body);
        assert.match(values.get('[data-tropical]')?.textContent ?? '', /°$/, display.body);
      }
    }
  }
});

test('superior-planet trails end at the requested negative day and follow its preceding interval', () => {
  for (const day of [-1 / 24, -80000]) {
    const span = 90;
    const mars = trailPoints(day, span, 9);
    assert.deepEqual(mars[0], evaluateDays(day - span).planet);
    assert.deepEqual(mars.at(-1), evaluateDays(day).planet);
    for (const [body, evaluate] of [
      ['Jupiter', evaluatePtolemyJupiterDays],
      ['Saturn', evaluatePtolemySaturnDays],
    ] as const) {
      const trail = outerTrailPoints(body, day, span, 9);
      assert.deepEqual(trail[0], evaluate(day - span).planet);
      assert.deepEqual(trail.at(-1), evaluate(day).planet);
    }
  }
  // The original Mars trail clamp at and after Nabonassar remains in force.
  assert.deepEqual(trailPoints(0, 90, 9)[0], evaluateDays(0).planet);
  assert.deepEqual(trailPoints(5, 90, 9)[0], evaluateDays(0).planet);
});
