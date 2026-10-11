import { evaluateSelectedModel } from './comparison.ts';
import { computationalUt1Domain } from './comparison-time.ts';
import type { ApsisPolicy } from './copernicus.ts';
import { angularDifference } from './model.ts';
import { modelCapabilities, type ModelId } from './model-registry.ts';
import { validateDisplay } from './workspace-validation.ts';
import type { PlotTrace, TimeSeriesDisplay } from './workspace-types.ts';

export type TraceSamples = Readonly<{
  trace: PlotTrace;
  values: readonly (number | null)[];
}>;
export type WorkspacePlotSamples = Readonly<{
  startUt1: number; endUt1: number; count: number;
  mode: 'wrapped' | 'unwrapped';
  traces: readonly TraceSamples[];
  minLongitude: number; maxLongitude: number;
}>;

/** The current clock and language do not affect mathematical curve samples. */
export function workspacePlotCacheKey(plot: TimeSeriesDisplay): string {
  return JSON.stringify({
    window: [plot.window.startUt1, plot.window.endUt1],
    mode: plot.longitudeMode, alignment: plot.frameAlignment,
    traces: plot.traces.map(trace => [trace.body, trace.modelId, trace.observableId, trace.policyId]),
  });
}

/** A null is a genuine unavailable point and must start a new SVG segment. */
export function traceLongitudeAt(trace: PlotTrace, ut1Jd: number): number | null {
  const model = modelCapabilities[trace.modelId];
  if (!model || model.body !== trace.body ||
      !model.observables.some(observable => observable.id === trace.observableId) ||
      !Object.hasOwn(model.policies, trace.policyId) ||
      ut1Jd < computationalUt1Domain.start || ut1Jd > computationalUt1Domain.end) return null;
  const policyRange = model.policies[trace.policyId];
  if (policyRange && (ut1Jd < policyRange.start || ut1Jd > policyRange.end)) return null;
  // Only these two registered evaluators exist. A future model needs an explicit dispatch.
  if (trace.modelId !== 'ptolemy' && trace.modelId !== 'copernicus') return null;
  const result = evaluateSelectedModel(trace.modelId as ModelId, ut1Jd, trace.policyId as ApsisPolicy);
  if (trace.observableId === 'geocentric-sidereal-longitude' && result.model === 'copernicus') {
    return result.result.geocentricSiderealLongitude;
  }
  return trace.observableId === 'geocentric-tropical-longitude' ? result.tropical : null;
}

function unwrapAvailable(values: readonly (number | null)[]): (number | null)[] {
  const result: (number | null)[] = [];
  let previousRaw: number | null = null;
  let previousContinuous: number | null = null;
  for (const value of values) {
    if (value === null) {
      result.push(null);
      previousRaw = null;
      previousContinuous = null;
      continue;
    }
    const continuous: number = previousRaw === null || previousContinuous === null
      ? value : previousContinuous + angularDifference(value, previousRaw);
    result.push(continuous);
    previousRaw = value;
    previousContinuous = continuous;
  }
  return result;
}

/** The original comparison's whole-turn branch choice applies only under declared alignment. */
function alignWholeTurns(traces: { trace: PlotTrace; values: (number | null)[] }[]): void {
  const reference = traces[0]?.values;
  if (!reference) return;
  for (const trace of traces.slice(1)) {
    const index = trace.values.findIndex((value, position) => value !== null && reference[position] !== null);
    if (index < 0) continue;
    const turns = Math.round(((reference[index] as number) - (trace.values[index] as number)) / 360);
    trace.values = trace.values.map(value => value === null ? null : value + 360 * turns);
  }
}

/** At most three historical days per sample segment, as in the Phase 3C plot. */
export function sampleWorkspacePlot(plot: TimeSeriesDisplay): WorkspacePlotSamples {
  if (validateDisplay(plot).length) throw new RangeError('Unsupported plot configuration');
  const { startUt1, endUt1 } = plot.window;
  const span = endUt1 - startUt1;
  const count = Math.max(2, Math.ceil(span / 3));
  const traces: { trace: PlotTrace; values: (number | null)[] }[] = plot.traces.map(trace => {
    const raw = Array.from({ length: count + 1 }, (_, index) =>
      traceLongitudeAt(trace, startUt1 + span * index / count));
    return { trace, values: plot.longitudeMode === 'wrapped' ? raw : unwrapAvailable(raw) };
  });
  if (plot.longitudeMode === 'unwrapped' &&
      plot.frameAlignment === 'nominal-historical-tropical') alignWholeTurns(traces);
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const trace of traces) for (const value of trace.values) {
    if (value !== null) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
    }
  }
  return { startUt1, endUt1, count, mode: plot.longitudeMode, traces,
    minLongitude: plot.longitudeMode === 'wrapped' ? 0 : Number.isFinite(minimum) ? minimum : 0,
    maxLongitude: plot.longitudeMode === 'wrapped' ? 360 : Number.isFinite(maximum) ? maximum : 360 };
}

/** Returns only a justified same-body, same-observable model disagreement. */
export function modelDisagreementAt(plot: TimeSeriesDisplay, ut1Jd: number): number | null {
  const analysis = plot.analysis;
  if (analysis.kind !== 'model-disagreement' || validateDisplay(plot).length) return null;
  const first = plot.traces.find(trace => trace.id === analysis.firstTraceId);
  const second = plot.traces.find(trace => trace.id === analysis.secondTraceId);
  if (!first || !second) return null;
  const a = traceLongitudeAt(first, ut1Jd);
  const b = traceLongitudeAt(second, ut1Jd);
  return a === null || b === null ? null : angularDifference(b, a);
}

/** Converts null gaps and wrapped jumps to independent SVG subpaths. */
export function plotSegments(values: readonly (number | null)[], mode: 'wrapped' | 'unwrapped'):
  { index: number; value: number }[][] {
  const segments: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  let previous: number | null = null;
  values.forEach((value, index) => {
    if (value === null || (previous !== null && mode === 'wrapped' && Math.abs(value - previous) > 180)) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (value !== null) current.push({ index, value });
    previous = value;
  });
  if (current.length) segments.push(current);
  return segments;
}
