import record from '../../data/mars-almagest-v1.json' with { type: 'json' };

export type Point = Readonly<{ x: number; y: number }>;
export type MarsResult = Readonly<{
  earth: Point;
  deferentCenter: Point;
  equant: Point;
  epicycleCenter: Point;
  planet: Point;
  deferentRadius: number;
  epicycleRadius: number;
  meanLongitude: number;
  meanAnomaly: number;
  apogeeLongitude: number;
  meanCentrum: number;
  epicycleCenterLongitude: number;
  equationOfCenter: number;
  epicycleEquation: number;
  longitude: number;
  equantToEpicycleCenter: number;
  earthToEpicycleCenter: number;
  earthToPlanet: number;
  daysSinceEpoch?: number;
}>;

type ParameterName = keyof typeof record.parameters;

export const modelRecord = record;

export function parameter(name: ParameterName): number {
  const item = record.parameters[name];
  if (!Number.isFinite(item.value)) throw new Error(`Invalid historical parameter: ${name}`);
  return item.value;
}

export function validateModel(): void {
  if (record.schema_version !== 1 || record.model_id !== 'almagest-mars-longitude') {
    throw new Error('Unsupported Mars model record');
  }
  const R = parameter('deferent_radius');
  const e = parameter('half_eccentricity');
  const r = parameter('epicycle_radius');
  if (!(R > e && e > 0 && r > 0) ||
      Math.abs(parameter('double_eccentricity') - 2 * e) > 1e-12) {
    throw new Error('Inconsistent historical Mars geometry');
  }
  for (const name of Object.keys(record.parameters) as ParameterName[]) parameter(name);
}

export function wrap(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function angularDifference(a: number, b: number): number {
  return wrap(a - b + 180) - 180;
}

const radians = (degrees: number): number => degrees * Math.PI / 180;
const degrees = (radiansValue: number): number => radiansValue * 180 / Math.PI;
const polar = (radius: number, angle: number): Point => ({
  x: radius * Math.cos(radians(angle)),
  y: radius * Math.sin(radians(angle)),
});
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const direction = (p: Point): number => wrap(degrees(Math.atan2(p.y, p.x)));

/** All distances are historical deferent units; angles are degrees. */
export function evaluateArguments(meanLongitude: number, meanAnomaly: number, apogeeLongitude: number): MarsResult {
  if (![meanLongitude, meanAnomaly, apogeeLongitude].every(Number.isFinite)) {
    throw new RangeError('Angular arguments must be finite');
  }
  const R = parameter('deferent_radius');
  const e = parameter('half_eccentricity');
  const r = parameter('epicycle_radius');
  const L = wrap(meanLongitude);
  const alpha = wrap(meanAnomaly);
  const A = wrap(apogeeLongitude);
  const k = radians(L - A);
  const O = { x: 0, y: 0 };
  const D = polar(e, A);
  const Q = polar(parameter('double_eccentricity'), A);
  // Choose the outward intersection of the equant ray with the deferent.
  const qToC = Math.sqrt(R * R - (e * Math.sin(k)) ** 2) - e * Math.cos(k);
  const C = add(Q, polar(qToC, L));
  const P = add(C, polar(r, L + alpha));
  const centerLongitude = direction(C);
  const longitude = direction(P);
  return {
    earth: O, deferentCenter: D, equant: Q, epicycleCenter: C, planet: P,
    deferentRadius: R, epicycleRadius: r,
    meanLongitude: L, meanAnomaly: alpha, apogeeLongitude: A,
    meanCentrum: wrap(L - A), epicycleCenterLongitude: centerLongitude,
    equationOfCenter: angularDifference(centerLongitude, L),
    epicycleEquation: angularDifference(longitude, centerLongitude), longitude,
    equantToEpicycleCenter: qToC,
    earthToEpicycleCenter: Math.hypot(C.x, C.y),
    earthToPlanet: Math.hypot(P.x, P.y),
  };
}

/** Continuous Egyptian mean local days since Nabonassar 1 Thoth 1 noon. */
export function evaluateDays(daysSinceEpoch: number): MarsResult {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError('Day count must be finite');
  const result = evaluateArguments(
    parameter('mean_longitude_epoch') + daysSinceEpoch * parameter('mean_longitude_daily_motion'),
    parameter('mean_anomaly_epoch') + daysSinceEpoch * parameter('mean_anomaly_daily_motion'),
    parameter('apogee_longitude_epoch') + daysSinceEpoch * parameter('apogee_motion'),
  );
  return { ...result, daysSinceEpoch };
}
