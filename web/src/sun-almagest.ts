import sunRecord from '../../data/sun-almagest-v1.json' with { type: 'json' };
import { angularDifference, wrap, type Point } from './model.ts';

export { sunRecord };

export type PtolemySunResult = Readonly<{
  modelId: 'ptolemy-almagest-sun-longitude';
  frameId: 'ptolemy-almagest-tropical';
  earth: Point; eccentricCenter: Point; sun: Point;
  eccentricRadius: number; eccentricity: number;
  meanLongitude: number; apogeeLongitude: number; meanAnomaly: number;
  longitude: number; solarEquation: number; earthToSun: number;
  daysSinceEpoch?: number;
}>;

type Parameter = keyof typeof sunRecord.parameters;
const value = (name: Parameter): number => sunRecord.parameters[name].value;
const radians = (degrees: number): number => degrees * Math.PI / 180;
const degrees = (radiansValue: number): number => radiansValue * 180 / Math.PI;

function validArguments(meanLongitude: number, apogeeLongitude: number,
  radius: number, eccentricity: number): void {
  if (![meanLongitude, apogeeLongitude, radius, eccentricity].every(Number.isFinite)) {
    throw new RangeError('Solar arguments must be finite');
  }
  if (radius <= 0 || eccentricity < 0 || eccentricity >= radius) {
    throw new RangeError('Require radius > eccentricity >= 0');
  }
}

/** Continuous *Almagest* III.3–5 eccentric circle; L is centred at D, not O. */
export function evaluatePtolemySunArguments(meanLongitudeInput: number,
  apogeeLongitudeInput: number, radius = value('eccentric_radius'),
  eccentricity = value('eccentricity')): PtolemySunResult {
  validArguments(meanLongitudeInput, apogeeLongitudeInput, radius, eccentricity);
  const meanLongitude = wrap(meanLongitudeInput);
  const apogeeLongitude = wrap(apogeeLongitudeInput);
  const meanAnomaly = wrap(meanLongitude - apogeeLongitude);
  const earth = { x: 0, y: 0 };
  const eccentricCenter = {
    x: eccentricity * Math.cos(radians(apogeeLongitude)),
    y: eccentricity * Math.sin(radians(apogeeLongitude)),
  };
  const sun = {
    x: eccentricCenter.x + radius * Math.cos(radians(meanLongitude)),
    y: eccentricCenter.y + radius * Math.sin(radians(meanLongitude)),
  };
  const longitude = wrap(degrees(Math.atan2(sun.y, sun.x)));
  return {
    modelId: 'ptolemy-almagest-sun-longitude',
    frameId: 'ptolemy-almagest-tropical',
    earth, eccentricCenter, sun, eccentricRadius: radius, eccentricity,
    meanLongitude, apogeeLongitude, meanAnomaly, longitude,
    solarEquation: angularDifference(longitude, meanLongitude),
    earthToSun: Math.hypot(sun.x, sun.y),
  };
}

/** Independent scalar equation, negative from apogee to perigee (III.8). */
export function analyticPtolemySolarEquation(meanAnomaly: number,
  radius = value('eccentric_radius'), eccentricity = value('eccentricity')): number {
  validArguments(meanAnomaly, 0, radius, eccentricity);
  const anomalyRadians = radians(wrap(meanAnomaly));
  const across = -eccentricity * Math.sin(anomalyRadians);
  const along = radius + eccentricity * Math.cos(anomalyRadians);
  return degrees(Math.atan2(across, along));
}

/** Mean local days from Nabonassar 1 Thoth 1 Alexandria noon (III.2, III.7). */
export function evaluatePtolemySunDays(daysSinceEpoch: number): PtolemySunResult {
  if (!Number.isFinite(daysSinceEpoch)) throw new RangeError('Days must be finite');
  const meanLongitude = value('mean_longitude_epoch') +
    daysSinceEpoch * value('mean_longitude_daily_motion');
  return { ...evaluatePtolemySunArguments(meanLongitude, value('apogee_longitude')),
    daysSinceEpoch };
}
