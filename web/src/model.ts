import record from '../../data/mars-almagest-v1.json' with { type: 'json' };
import { evaluateSuperiorGeometry } from './superior-geometry.ts';
import type { SuperiorGeometryResult } from './superior-geometry.ts';

export type { Point } from './superior-geometry.ts';
export { wrap, angularDifference } from './superior-geometry.ts';
export type MarsResult = SuperiorGeometryResult & Readonly<{ daysSinceEpoch?: number }>;

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

/** All distances are historical deferent units; angles are degrees. */
export function evaluateArguments(meanLongitude: number, meanAnomaly: number, apogeeLongitude: number): MarsResult {
  return evaluateSuperiorGeometry(
    parameter('deferent_radius'), parameter('half_eccentricity'),
    parameter('epicycle_radius'), meanLongitude, meanAnomaly,
    apogeeLongitude,
  );
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
