/** A spatial view of the existing Copernicus 1543 evaluators, in Earth R=10000 units.
 * The historical kernels remain the authority for every position. Coordinates
 * share their native sidereal ecliptic plane and one Frauenburg local day.
 */
import { comparisonUt1Domain, computationalUt1Domain, modelDaysAtUt1 } from './comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy, earthRecord, evaluateEarthDays,
  evaluateMarsDays, type ApsisPolicy } from './copernicus.ts';
import { evaluateSuperiorDays, toCommonEarthUnits } from './copernicus-superior.ts';
import { wrap, type Point } from './model.ts';

export const mapBodies = ['true-sun', 'earth', 'mars', 'jupiter', 'saturn'] as const;
export type MapBody = typeof mapBodies[number];
export type MapPosition = Readonly<{
  status: 'available' | 'unavailable'; point?: Point;
  provenance: 'historical-construction' | 'source-limited' | 'exploratory-continuation' |
    'uniform-motion-continuation' | 'outside-mars-guard';
}>;
export type MapSnapshot = Readonly<{
  ut1Jd: number; copernicusDays: number;
  frameId: string; lengthUnit: 'historical Earth annual radius = 10000';
  marsPolicyId: ApsisPolicy;
  meanSun: Point;
  bodies: Readonly<Record<MapBody, MapPosition>>;
}>;
export type MapRelativePosition = Readonly<{
  body: MapBody; point: Point; distance: number; siderealAngle: number;
  provenance: MapPosition['provenance'];
}>;
export type MapView = Readonly<{
  center: MapBody; available: boolean;
  bodies: Readonly<Partial<Record<MapBody, MapRelativePosition>>>;
}>;
export type MapTrailSample = Readonly<{
  ut1Jd: number; point: Point; provenance: MapPosition['provenance'];
}>;

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const angle = (point: Point): number => wrap(Math.atan2(point.y, point.x) * 180 / Math.PI);
export const marsWithinGuard = (ut1Jd: number): boolean =>
  ut1Jd >= comparisonUt1Domain.start && ut1Jd <= comparisonUt1Domain.end;

export function evaluateCopernicusMap(ut1Jd: number, marsPolicyId: ApsisPolicy): MapSnapshot {
  if (!Number.isFinite(ut1Jd) || ut1Jd < computationalUt1Domain.start ||
      ut1Jd > computationalUt1Domain.end) throw new RangeError('Map instant outside computational domain');
  if (marsPolicyId !== apsisPolicy && marsPolicyId !== exploratoryApsisPolicy) {
    throw new RangeError('Unknown Mars apsis policy');
  }
  const copernicusDays = modelDaysAtUt1(ut1Jd).copernicus;
  const earth = evaluateEarthDays(copernicusDays);
  const jupiter = toCommonEarthUnits(evaluateSuperiorDays('jupiter', copernicusDays));
  const saturn = toCommonEarthUnits(evaluateSuperiorDays('saturn', copernicusDays));
  const guarded = marsWithinGuard(ut1Jd);
  const mars = marsPolicyId === apsisPolicy && !guarded ? null
    : toCommonEarthUnits(evaluateMarsDays(copernicusDays, marsPolicyId));
  const outerProvenance = 'uniform-motion-continuation' as const;
  return {
    ut1Jd, copernicusDays, frameId: earthRecord.frame.id,
    lengthUnit: 'historical Earth annual radius = 10000', marsPolicyId,
    meanSun: earth.meanSun,
    bodies: {
      'true-sun': { status: 'available', point: earth.trueSun, provenance: 'historical-construction' },
      earth: { status: 'available', point: earth.earth, provenance: 'historical-construction' },
      mars: mars
        ? { status: 'available', point: mars.planet,
          provenance: !guarded ? 'exploratory-continuation' : 'source-limited' }
        : { status: 'unavailable', provenance: 'outside-mars-guard' },
      jupiter: { status: 'available', point: jupiter.planet, provenance: outerProvenance },
      saturn: { status: 'available', point: saturn.planet, provenance: outerProvenance },
    },
  };
}

/** Recentring is a translation in the native sidereal plane, never a rotation. */
export function mapView(snapshot: MapSnapshot, center: MapBody): MapView {
  const origin = snapshot.bodies[center].point;
  if (!origin) return { center, available: false, bodies: {} };
  const bodies: Partial<Record<MapBody, MapRelativePosition>> = {};
  for (const body of mapBodies) {
    const source = snapshot.bodies[body];
    if (!source.point) continue;
    const point = body === center ? { x: 0, y: 0 } : sub(source.point, origin);
    bodies[body] = { body, point, distance: Math.hypot(point.x, point.y),
      siderealAngle: body === center ? 0 : angle(point), provenance: source.provenance };
  }
  return { center, available: true, bodies };
}

/** Direct reference sampler: each body's centre is evaluated at that sample's time.
 * A null sample is a real availability gap. Grid caching belongs to the view.
 */
export function sampleMapTrail(body: MapBody, center: MapBody, marsPolicyId: ApsisPolicy,
  startUt1: number, endUt1: number, stepDays: number): readonly (MapTrailSample | null)[] {
  if (!Number.isFinite(startUt1) || !Number.isFinite(endUt1) ||
      !Number.isFinite(stepDays) || stepDays <= 0 || startUt1 > endUt1) {
    throw new RangeError('Invalid map trail interval');
  }
  if (body === center) return [];
  const count = Math.ceil((endUt1 - startUt1) / stepDays);
  if (count > 5000) throw new RangeError('Map trail sample budget exceeded');
  const times = new Set<number>([startUt1, endUt1]);
  for (let index = 1; index < count; index++) times.add(startUt1 + index * stepDays);
  // Include the exact inclusive Mars guard endpoints, avoiding a visually
  // shortened source-limited arc when the regular grid straddles a boundary.
  if (body === 'mars' || center === 'mars') {
    for (const boundary of [comparisonUt1Domain.start, comparisonUt1Domain.end]) {
      if (boundary > startUt1 && boundary < endUt1) times.add(boundary);
    }
  }
  return [...times].sort((a, b) => a - b).map(ut1Jd => {
    if (ut1Jd < computationalUt1Domain.start || ut1Jd > computationalUt1Domain.end) return null;
    const view = mapView(evaluateCopernicusMap(ut1Jd, marsPolicyId), center);
    const relative = view.bodies[body];
    return relative ? { ut1Jd, point: relative.point, provenance: relative.provenance } : null;
  });
}

/** Shared reference pass for several trails; one historical snapshot per date. */
export function sampleMapTrails(bodies: readonly MapBody[], center: MapBody,
  marsPolicyId: ApsisPolicy, startUt1: number, endUt1: number,
  stepDays: number): Readonly<Partial<Record<MapBody, readonly (MapTrailSample | null)[]>>> {
  if (!Number.isFinite(startUt1) || !Number.isFinite(endUt1) ||
      !Number.isFinite(stepDays) || stepDays <= 0 || startUt1 > endUt1) {
    throw new RangeError('Invalid map trail interval');
  }
  const count = Math.ceil((endUt1 - startUt1) / stepDays);
  if (count > 5000) throw new RangeError('Map trail sample budget exceeded');
  const times = new Set<number>([startUt1, endUt1]);
  for (let index = 1; index < count; index++) times.add(startUt1 + index * stepDays);
  if (bodies.includes('mars') || center === 'mars') {
    for (const boundary of [comparisonUt1Domain.start, comparisonUt1Domain.end]) {
      if (boundary > startUt1 && boundary < endUt1) times.add(boundary);
    }
  }
  const trails: Partial<Record<MapBody, (MapTrailSample | null)[]>> = {};
  for (const body of bodies) if (body !== center) trails[body] = [];
  for (const ut1Jd of [...times].sort((a, b) => a - b)) {
    const view = ut1Jd >= computationalUt1Domain.start && ut1Jd <= computationalUt1Domain.end
      ? mapView(evaluateCopernicusMap(ut1Jd, marsPolicyId), center) : null;
    for (const body of bodies) {
      const trail = trails[body];
      if (!trail) continue;
      const relative = view?.bodies[body];
      trail.push(relative ? { ut1Jd, point: relative.point, provenance: relative.provenance } : null);
    }
  }
  return trails;
}
