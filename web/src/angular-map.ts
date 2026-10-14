import { computationalUt1Domain, comparisonUt1Domain } from './comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy } from './copernicus.ts';
import { modelCapabilities } from './model-registry.ts';
import { angularDifference } from './model.ts';
import { traceLongitudeAt } from './workspace-plot.ts';
import type { AngularBody, AngularTrack } from './workspace-types.ts';

/** Historical order is sourced; these fractions are only illustrative screen spacing. */
export { angularBodies, maxAngularTracks } from './workspace-types.ts';
export const angularRingFractions: Readonly<Record<AngularBody, number>> = {
  Sun: 0.25, Mars: 0.45, Jupiter: 0.65, Saturn: 0.85,
};
export const angularDrawingRadius = 300;

export type AngularLongitude = Readonly<{
  ut1Jd: number; longitude: number; provenance: 'ordinary' | 'exploratory-continuation';
}>;
export type AngularPoint = Readonly<{ x: number; y: number }>;

export function angularPoint(body: AngularBody, longitude: number,
  drawingRadius = angularDrawingRadius): AngularPoint {
  const ring = drawingRadius * angularRingFractions[body];
  const radians = longitude * Math.PI / 180;
  return { x: ring * Math.cos(radians), y: ring * Math.sin(radians) };
}

/** One shared evaluator dispatch; no orbital or epicycle equation is repeated here. */
export function angularLongitudeAt(track: AngularTrack, ut1Jd: number): AngularLongitude | null {
  const longitude = traceLongitudeAt({ id: track.id, body: track.body, modelId: track.modelId,
    observableId: 'geocentric-tropical-longitude', policyId: track.policyId }, ut1Jd);
  if (longitude === null) return null;
  const range = modelCapabilities[track.modelId]?.exploratoryReferenceRanges?.[track.policyId];
  return { ut1Jd, longitude, provenance: range && (ut1Jd < range.start || ut1Jd > range.end)
    ? 'exploratory-continuation' : 'ordinary' };
}

/** Second minus first; only predictions of the same body in compatible declared frames. */
export function angularModelDifferenceAt(first: AngularTrack, second: AngularTrack,
  frameAlignment: 'native' | 'nominal-historical-tropical', ut1Jd: number): number | null {
  if (first.body !== second.body || first.modelId === second.modelId) return null;
  const frame = (track: AngularTrack): string | undefined => modelCapabilities[track.modelId]
    ?.observables.find(item => item.id === 'geocentric-tropical-longitude')?.frame;
  const firstFrame = frame(first);
  const secondFrame = frame(second);
  if (!firstFrame || !secondFrame ||
      (firstFrame !== secondFrame && frameAlignment !== 'nominal-historical-tropical')) return null;
  const a = angularLongitudeAt(first, ut1Jd);
  const b = angularLongitudeAt(second, ut1Jd);
  return a && b ? angularDifference(b.longitude, a.longitude) : null;
}

/** Fixed historical-day grid permits longitude samples to be cached across frames and ring styles. */
export function angularTrailCadence(days: number): number { return days > 365 * 5 ? 6 : 3; }

export function angularGridWindow(ut1Jd: number, durationDays: number):
  Readonly<{ start: number; end: number; step: number }> {
  const step = angularTrailCadence(durationDays);
  return { start: Math.ceil((ut1Jd - durationDays) / step) * step,
    end: Math.floor(ut1Jd / step) * step, step };
}

export function angularTrailCacheKey(track: AngularTrack, ut1Jd: number,
  durationDays: number, frameAlignment: string): string {
  const grid = angularGridWindow(ut1Jd, durationDays);
  return [track.body, track.modelId, track.policyId, frameAlignment,
    durationDays, grid.step, grid.start, grid.end].join('|');
}

/** Nulls retain genuine policy/computational gaps; the historical guard is sampled exactly. */
export function sampleAngularTrail(track: AngularTrack, startUt1: number,
  endUt1: number, step: number): readonly (AngularLongitude | null)[] {
  if (!Number.isFinite(startUt1) || !Number.isFinite(endUt1) || step <= 0 ||
      endUt1 < startUt1) throw new RangeError('Invalid angular trail interval');
  const times: number[] = [];
  for (let time = startUt1; time <= endUt1; time += step) times.push(time);
  if (track.modelId === 'copernicus') {
    for (const boundary of [comparisonUt1Domain.start, comparisonUt1Domain.end]) {
      if (boundary > startUt1 && boundary < endUt1) times.push(boundary);
    }
  }
  times.sort((a, b) => a - b);
  return times.filter((time, index) => index === 0 || time !== times[index - 1])
    .map(time => time >= computationalUt1Domain.start && time <= computationalUt1Domain.end
      ? angularLongitudeAt(track, time) : null);
}

export function angularTrailWithEndpoints(track: AngularTrack, gridSamples: readonly (AngularLongitude | null)[],
  ut1Jd: number, durationDays: number): readonly (AngularLongitude | null)[] {
  const exactStart = ut1Jd - durationDays;
  const start = exactStart >= computationalUt1Domain.start ? angularLongitudeAt(track, exactStart) : null;
  const end = angularLongitudeAt(track, ut1Jd);
  return [start, ...gridSamples, end];
}

export function angularModelFor(body: AngularBody, tradition: 'ptolemy' | 'copernicus'): string {
  const id = Object.values(modelCapabilities).find(model => model.body === body &&
    (tradition === 'ptolemy' ? model.id.startsWith('ptolemy') : model.id.startsWith('copernicus')))?.id;
  if (!id) throw new RangeError(`No ${tradition} model for ${body}`);
  return id;
}

export function defaultAngularTrack(body: AngularBody, tradition: 'ptolemy' | 'copernicus',
  id: string): AngularTrack {
  const modelId = angularModelFor(body, tradition);
  return { id, body, modelId, policyId: modelId === 'copernicus' ? apsisPolicy
    : 'mathematical-continuation', visible: true, trail: false };
}

export function exploratoryAngularTrack(track: AngularTrack): AngularTrack {
  return track.modelId === 'copernicus' ? { ...track, policyId: exploratoryApsisPolicy } : track;
}
