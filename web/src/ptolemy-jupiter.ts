import record from '../../data/jupiter-almagest-v1.json' with { type: 'json' };
import { evaluateSuperiorGeometry, type SuperiorGeometryResult } from './superior-geometry.ts';

export const jupiterRecord = record;
type Parameter = keyof typeof record.parameters;
const value = (name: Parameter): number => record.parameters[name].value;

export type PtolemyJupiterResult = SuperiorGeometryResult & Readonly<{
  halfEccentricity: number;
  doubleEccentricity: number;
  modelId: 'almagest-jupiter-longitude';
  frame: 'ptolemy-almagest-tropical';
  daysSinceEpoch?: number;
}>;

/** P1 IX.6 and XI.9: equant mean longitude and mean-epicycle-apogee anomaly. */
export function evaluatePtolemyJupiterArguments(meanLongitude: number,
  meanAnomaly: number, apogeeLongitude: number): PtolemyJupiterResult {
  const geometry = evaluateSuperiorGeometry(
    value('deferent_radius'), value('half_eccentricity'),
    value('epicycle_radius'), meanLongitude, meanAnomaly, apogeeLongitude,
  );
  return { ...geometry,
    halfEccentricity: value('half_eccentricity'),
    doubleEccentricity: value('double_eccentricity'),
    modelId: 'almagest-jupiter-longitude', frame: 'ptolemy-almagest-tropical' };
}

/** Egyptian mean days after Nabonassar 1 Thoth 1, Alexandria local noon. */
export function evaluatePtolemyJupiterDays(daysSinceEpoch: number): PtolemyJupiterResult {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError('Day count must be finite');
  const meanLongitude = value('mean_longitude_epoch') +
    daysSinceEpoch * value('mean_longitude_daily_motion');
  const meanAnomaly = value('mean_anomaly_epoch') +
    daysSinceEpoch * value('mean_anomaly_daily_motion');
  const apogeeLongitude = value('apogee_longitude_epoch') +
    daysSinceEpoch * value('apogee_motion');
  return { ...evaluatePtolemyJupiterArguments(meanLongitude, meanAnomaly, apogeeLongitude),
    daysSinceEpoch };
}
