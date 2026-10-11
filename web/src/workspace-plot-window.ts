import { computationalUt1Domain, frauenburgCivilToUt1 } from './comparison-time.ts';
import { maxPlotWindowDays, type TimeSeriesDisplay } from './workspace-types.ts';

export type PlotWindowInputIssue = 'format' | 'julian-date' | 'order' | 'limit' | 'domain';
export type PlotWindowInputResult =
  | { ok: true; display: TimeSeriesDisplay }
  | { ok: false; display: TimeSeriesDisplay; issue: PlotWindowInputIssue; field: 'start' | 'end' };

type BoundaryResult = { ok: true; ut1Jd: number } |
  { ok: false; issue: 'format' | 'julian-date' };

/** Plot boundaries alone accept a Julian year or date; the shared clock stays strict. */
export function parsePlotBoundary(input: string): BoundaryResult {
  const match = /^([+-]?\d{4,6})(?:-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?)?$/.exec(input.trim());
  if (!match) return { ok: false, issue: 'format' };
  const year = Number(match[1]);
  const month = match[2] === undefined ? 1 : Number(match[2]);
  const day = match[3] === undefined ? 1 : Number(match[3]);
  const hour = match[4] === undefined ? 0 : Number(match[4]);
  const minute = match[5] === undefined ? 0 : Number(match[5]);
  try {
    // frauenburgCivilToUt1 validates the proleptic Julian civil date and
    // translates local midnight to assumed UT1 without JavaScript Date.
    return { ok: true, ut1Jd: frauenburgCivilToUt1(year, month, day, hour, minute) };
  } catch (error) {
    if (error instanceof RangeError) return { ok: false, issue: 'julian-date' };
    throw error;
  }
}

/** A rejected range returns the original display, leaving all settings intact. */
export function applyPlotWindowInputs(display: TimeSeriesDisplay,
  startInput: string, endInput: string): PlotWindowInputResult {
  const start = parsePlotBoundary(startInput);
  if (!start.ok) return { ok: false, display, issue: start.issue, field: 'start' };
  const end = parsePlotBoundary(endInput);
  if (!end.ok) return { ok: false, display, issue: end.issue, field: 'end' };
  if (end.ut1Jd <= start.ut1Jd) {
    return { ok: false, display, issue: 'order', field: 'end' };
  }
  if (start.ut1Jd < computationalUt1Domain.start ||
      start.ut1Jd > computationalUt1Domain.end) {
    return { ok: false, display, issue: 'domain', field: 'start' };
  }
  if (end.ut1Jd < computationalUt1Domain.start ||
      end.ut1Jd > computationalUt1Domain.end) {
    return { ok: false, display, issue: 'domain', field: 'end' };
  }
  if (end.ut1Jd - start.ut1Jd > maxPlotWindowDays) {
    return { ok: false, display, issue: 'limit', field: 'end' };
  }
  return { ok: true, display: { ...display, window: {
    ...display.window, startUt1: start.ut1Jd, endUt1: end.ut1Jd,
  } } };
}
