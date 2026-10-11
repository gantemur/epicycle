import { evaluateMarsDays, type ApsisPolicy, type CopernicusMarsResult } from './copernicus.ts';
import { modelDaysAtUt1 } from './comparison-time.ts';
import { angularDifference, evaluateDays, type MarsResult } from './model.ts';
import type { ModelId } from './model-registry.ts';

export type Comparison = Readonly<{
  instantUt1: number;
  ptolemyDays: number;
  copernicusDays: number;
  ptolemy: MarsResult;
  copernicus: CopernicusMarsResult;
  frameAlignment: 'nominal-historical-tropical' | null;
  copernicusMinusPtolemy: number | null;
}>;

/** Geocentric geometric directions at one assumed UT1 instant. A residual is conditional. */
export function compareAtUt1(instantUt1: number, nominalAlignment: boolean,
  policy?: ApsisPolicy): Comparison {
  const days = modelDaysAtUt1(instantUt1);
  const ptolemy = evaluateDays(days.ptolemy);
  const copernicus = evaluateMarsDays(days.copernicus, policy);
  return {
    instantUt1, ptolemyDays: days.ptolemy, copernicusDays: days.copernicus,
    ptolemy, copernicus,
    frameAlignment: nominalAlignment ? 'nominal-historical-tropical' : null,
    copernicusMinusPtolemy: nominalAlignment
      ? angularDifference(copernicus.geocentricTropicalLongitude, ptolemy.longitude) : null,
  };
}

export type ModelEvaluation =
  | Readonly<{ model: 'ptolemy'; days: number; result: MarsResult; tropical: number }>
  | Readonly<{ model: 'copernicus'; days: number; result: CopernicusMarsResult; tropical: number }>;

export function evaluateSelectedModel(model: ModelId, instantUt1: number,
  policy: ApsisPolicy): ModelEvaluation {
  const days = modelDaysAtUt1(instantUt1);
  if (model === 'ptolemy') {
    const result = evaluateDays(days.ptolemy);
    return { model, days: days.ptolemy, result, tropical: result.longitude };
  }
  const result = evaluateMarsDays(days.copernicus, policy);
  return { model, days: days.copernicus, result, tropical: result.geocentricTropicalLongitude };
}

export function selectedDifference(a: ModelEvaluation, b: ModelEvaluation,
  nominalAlignment: boolean): number | null {
  // Native equinoxes are identified only under the declared nominal alignment.
  return nominalAlignment ? angularDifference(b.tropical, a.tropical) : null;
}

export function unwrapLongitudes(values: readonly number[]): number[] {
  if (!values.length) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) result.push(result[i - 1] + angularDifference(values[i], values[i - 1]));
  return result;
}

export type PlotSamples = Readonly<{
  startUt1: number; endUt1: number; ptolemy: readonly number[];
  copernicus: readonly number[]; minLongitude: number; maxLongitude: number;
}>;

export type SelectedPlotSamples = Readonly<{
  startUt1: number; endUt1: number; a: readonly number[]; b: readonly number[];
  difference: readonly number[]; minLongitude: number; maxLongitude: number;
  mode: 'wrapped' | 'unwrapped'; count: number;
}>;

export function selectedPlotCacheKey(startUt1: number, endUt1: number,
  modelA: ModelId, modelB: ModelId, policy: ApsisPolicy,
  mode: 'wrapped' | 'unwrapped', language: string): string {
  // The playback instant is deliberately absent: only the marker moves.
  return [startUt1, endUt1, modelA, modelB, policy, mode, language].join('|');
}

/** At most three historical days per segment resolves the Mars retrograde loops. */
export function sampleSelectedPlot(startUt1: number, endUt1: number,
  modelA: ModelId, modelB: ModelId, policy: ApsisPolicy,
  mode: 'wrapped' | 'unwrapped'): SelectedPlotSamples {
  const span = endUt1 - startUt1;
  if (!Number.isFinite(span) || span <= 0 || span > 365 * 50) {
    throw new RangeError('Plot span must be within a 50-year computational limit');
  }
  const count = Math.max(2, Math.ceil(span / 3));
  const first: number[] = [], second: number[] = [], difference: number[] = [];
  for (let index = 0; index <= count; index++) {
    const instant = startUt1 + span * index / count;
    const a = evaluateSelectedModel(modelA, instant, policy);
    const b = evaluateSelectedModel(modelB, instant, policy);
    first.push(a.tropical);
    second.push(b.tropical);
    difference.push(angularDifference(b.tropical, a.tropical));
  }
  const a = mode === 'wrapped' ? first : unwrapLongitudes(first);
  const b = mode === 'wrapped' ? second : unwrapLongitudes(second);
  if (mode === 'unwrapped') {
    // A whole-turn branch choice only; no fractional fitted alignment.
    const turns = Math.round((a[0] - b[0]) / 360);
    for (let index = 0; index < b.length; index++) b[index] += 360 * turns;
  }
  return {
    startUt1, endUt1, a, b, difference, mode, count,
    minLongitude: mode === 'wrapped' ? 0 : Math.min(...a, ...b),
    maxLongitude: mode === 'wrapped' ? 360 : Math.max(...a, ...b),
  };
}

export function wrappedSegments(values: readonly number[]): number[][] {
  if (values.length === 0) return [];
  const segments = [[values[0]]];
  for (let index = 1; index < values.length; index++) {
    if (Math.abs(values[index] - values[index - 1]) > 180) segments.push([]);
    segments[segments.length - 1].push(values[index]);
  }
  return segments;
}

export function sampleComparisonPlot(startUt1: number, endUt1: number, count = 96): PlotSamples {
  if (!Number.isFinite(startUt1) || !Number.isFinite(endUt1) || endUt1 <= startUt1 ||
      !Number.isInteger(count) || count < 2) throw new RangeError('Invalid plot sampling interval');
  const samples = Array.from({ length: count + 1 }, (_, index) =>
    compareAtUt1(startUt1 + (endUt1 - startUt1) * index / count, true));
  const ptolemy = unwrapLongitudes(samples.map(sample => sample.ptolemy.longitude));
  const copernicus = unwrapLongitudes(samples.map(sample => sample.copernicus.geocentricTropicalLongitude));
  // A whole-turn branch choice for display continuity; it is not a fitted model offset.
  const turns = Math.round((ptolemy[0] - copernicus[0]) / 360);
  for (let i = 0; i < copernicus.length; i++) copernicus[i] += turns * 360;
  const minLongitude = Math.min(...ptolemy, ...copernicus);
  const maxLongitude = Math.max(...ptolemy, ...copernicus);
  return { startUt1, endUt1, ptolemy, copernicus, minLongitude, maxLongitude };
}
