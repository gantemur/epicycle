import earthRecord from '../../data/earth-copernicus-1543-v1.json' with { type: 'json' };
import marsRecord from '../../data/mars-copernicus-1543-v1.json' with { type: 'json' };
import { civilToLocalJd } from './comparison-time.ts';
import { angularDifference, wrap, type Point } from './model.ts';

export { earthRecord, marsRecord };
export const apsisPolicy = 'sn-local-uniform-1473-1523';
export const exploratoryApsisPolicy = 'sn-uniform-exploratory';
export type ApsisPolicy = typeof apsisPolicy | typeof exploratoryApsisPolicy;
export const copernicusEpochJd = civilToLocalJd(1, 1, 1);
const radians = (a: number): number => a * Math.PI / 180;
const degrees = (a: number): number => a * 180 / Math.PI;
const polar = (r: number, a: number): Point => ({ x: r * Math.cos(radians(wrap(a))), y: r * Math.sin(radians(wrap(a))) });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Point, factor: number): Point => ({ x: a.x * factor, y: a.y * factor });
const angle = (a: Point): number => wrap(degrees(Math.atan2(a.y, a.x)));
const finite = (...values: number[]): void => { if (!values.every(Number.isFinite)) throw new RangeError('Arguments must be finite'); };
type EarthParameter = keyof typeof earthRecord.parameters;
type MarsParameter = keyof typeof marsRecord.parameters;
const ep = (name: EarthParameter): number => earthRecord.parameters[name].value;
const mp = (name: MarsParameter): number => marsRecord.parameters[name].value;

export type EarthResult = Readonly<{
  trueSun: Point; eccentricCenter: Point; meanSun: Point; earth: Point;
  earthFromMeanSun: Point; earthToSun: Point;
  annualRadius: number; eccentricComponent: number; smallEccentricRadius: number;
  eccentricity: number; meanSunLongitude: number; earthAnnualDirection: number;
  meanSolarApogee: number; trueSolarApogee: number; apsidalEquation: number;
  theta: number; meanSolarAnomaly: number; trueSolarAnomaly: number;
  solarEquation: number; solarSiderealLongitude: number;
  meanPrecession: number; precessionEquation: number; truePrecession: number;
  solarTropicalLongitude: number; daysSinceEpoch?: number;
}>;

export type CopernicusMarsResult = Readonly<{
  earthModel: EarthResult;
  earthToMarsScale: number;
  earthGeometryInMarsUnits: { trueSun: Point; eccentricCenter: Point; meanSun: Point; earth: Point };
  marsGeometry: { meanSun: Point; eccentricCenter: Point; epicycleCenter: Point; mars: Point;
    principalRadius: number; eccentricComponent: number; smallEpicycleRadius: number;
    marsFromMeanSun: Point; meanSunToEpicycleCenter: number; meanSunToMars: number };
  earthToMars: Point; earthToMarsDistance: number; meanCommutation: number;
  meanPlanetLongitude: number; marsApogee: number; eccentricAnomaly: number;
  epicycleOffsetDirection: number; meanSunMarsLongitude: number;
  equationOfCenter: number; correctedCommutation: number; annualParallaxEquation: number;
  geocentricSiderealLongitude: number; geocentricTropicalLongitude: number;
  truePrecession: number; daysSinceEpoch?: number;
  apsisAssignment: { status: string; policy?: string; source?: string };
}>;

export function validateCopernicusRecords(): void {
  const dependency = marsRecord.dependencies[0];
  if (earthRecord.schema_version !== 1 || marsRecord.schema_version !== 1 ||
      dependency.model_id !== earthRecord.model_id ||
      dependency.required_schema_version !== earthRecord.schema_version ||
      marsRecord.frame.id !== earthRecord.frame.id ||
      marsRecord.epoch.astronomical_julian_date !== earthRecord.epoch.astronomical_julian_date ||
      marsRecord.epoch.calendar !== earthRecord.epoch.calendar ||
      marsRecord.epoch.day_fraction !== earthRecord.epoch.day_fraction) {
    throw new Error('Incompatible Copernican Earth and Mars records');
  }
}

export function evaluateEarthArguments(meanSun: number, meanApogee: number, theta: number, meanPrecession: number): EarthResult {
  finite(meanSun, meanApogee, theta, meanPrecession);
  // C1 III.13–25; C3 pp.159–170: all angular arguments are degrees in the
  // native sidereal plane. S is true Sun, F the first eccentric centre,
  // G the mean Sun, E Earth. Negative radii encode directions opposite
  // the corresponding apogee or mean-Sun angle.
  const meanSunLongitude = wrap(meanSun);
  const meanSolarApogee = wrap(meanApogee);
  const precessionAnomaly = wrap(theta);
  const annualRadius = ep('annual_radius');
  const eccentricComponent = ep('eccentric_component');
  const smallEccentricRadius = ep('small_eccentric_radius');
  const trueSunPoint = { x: 0, y: 0 };
  const eccentricCenterPoint = polar(-eccentricComponent, meanSolarApogee);
  const meanSunPoint = add(eccentricCenterPoint,
    polar(-smallEccentricRadius, meanSolarApogee - precessionAnomaly));
  const earthPoint = add(meanSunPoint, polar(-annualRadius, meanSunLongitude));
  const earthToSun = sub(trueSunPoint, earthPoint);
  const trueSolarApogee = angle(sub(trueSunPoint, meanSunPoint));
  const solarSiderealLongitude = angle(earthToSun);
  // C1 III.1–12; C3 pp.143–146: the historical precession equation is
  // subtracted from mean precession. Tropical = sidereal + true precession.
  const precessionEquation = -ep('precession_equation_amplitude') *
    Math.sin(radians(2 * precessionAnomaly));
  const truePrecession = wrap(meanPrecession + precessionEquation);
  return {
    trueSun: trueSunPoint, eccentricCenter: eccentricCenterPoint,
    meanSun: meanSunPoint, earth: earthPoint,
    earthFromMeanSun: sub(earthPoint, meanSunPoint), earthToSun,
    annualRadius, eccentricComponent, smallEccentricRadius,
    eccentricity: Math.hypot(meanSunPoint.x, meanSunPoint.y), meanSunLongitude,
    earthAnnualDirection: wrap(meanSunLongitude + 180), meanSolarApogee,
    trueSolarApogee, apsidalEquation: angularDifference(trueSolarApogee, meanSolarApogee),
    theta: precessionAnomaly,
    meanSolarAnomaly: wrap(meanSunLongitude - meanSolarApogee),
    trueSolarAnomaly: wrap(meanSunLongitude - trueSolarApogee),
    solarEquation: angularDifference(solarSiderealLongitude, meanSunLongitude),
    solarSiderealLongitude,
    meanPrecession: wrap(meanPrecession), precessionEquation, truePrecession,
    solarTropicalLongitude: wrap(solarSiderealLongitude + truePrecession),
  };
}

export function evaluateEarthDays(daysSinceEpoch: number): EarthResult {
  finite(daysSinceEpoch);
  const years = daysSinceEpoch / 365;
  const motion = (epoch: EarthParameter, rate: EarthParameter): number => wrap(ep(epoch) + years * ep(rate));
  return { ...evaluateEarthArguments(
    motion('mean_sun_epoch', 'mean_sun_annual_motion'),
    motion('mean_apogee_epoch', 'mean_apogee_annual_motion'),
    motion('theta_epoch', 'theta_annual_motion'),
    motion('mean_precession_epoch', 'mean_precession_annual_motion'),
  ), daysSinceEpoch };
}

function couple(earth: EarthResult, meanCommutation: number, apogee: number): Omit<CopernicusMarsResult, 'apsisAssignment'> {
  finite(meanCommutation, apogee);
  // C1 V.16–19; C3 pp.356–366. L = mean Sun − mean commutation. Earth R=10000
  // is scaled to Mars units using r=6580; G remains the mean Sun. M, C, P
  // are the Mars eccentric, small-epicycle, and planet points.
  const meanCommutationAngle = wrap(meanCommutation);
  const marsApogee = wrap(apogee);
  const meanPlanetLongitude = wrap(earth.meanSunLongitude - meanCommutationAngle);
  const principalRadius = mp('principal_radius');
  const eccentricComponent = mp('eccentric_component');
  const smallEpicycleRadius = mp('small_epicycle_radius');
  const earthAnnualRadius = mp('earth_annual_radius');
  const earthToMarsScale = earthAnnualRadius / earth.annualRadius;
  const earthGeometryInMarsUnits = {
    trueSun: scale(earth.trueSun, earthToMarsScale),
    eccentricCenter: scale(earth.eccentricCenter, earthToMarsScale),
    meanSun: scale(earth.meanSun, earthToMarsScale),
    earth: scale(earth.earth, earthToMarsScale),
  };
  const meanSunPoint = earthGeometryInMarsUnits.meanSun;
  const earthPoint = earthGeometryInMarsUnits.earth;
  const eccentricCenterPoint = add(meanSunPoint, polar(eccentricComponent, marsApogee));
  const epicycleCenterPoint = add(eccentricCenterPoint,
    polar(principalRadius, meanPlanetLongitude));
  const marsPoint = add(epicycleCenterPoint,
    polar(-smallEpicycleRadius, 2 * meanPlanetLongitude - marsApogee));
  // Both positions include G. Subtracting P−E cancels that translation;
  // substituting the apparent solar longitude here would change the theory.
  const earthToMars = sub(marsPoint, earthPoint);
  const marsFromMeanSun = sub(marsPoint, meanSunPoint);
  const meanSunMarsLongitude = angle(marsFromMeanSun);
  const geocentricSiderealLongitude = angle(earthToMars);
  const equationOfCenter = angularDifference(meanSunMarsLongitude, meanPlanetLongitude);
  return {
    earthModel: earth, earthToMarsScale, earthGeometryInMarsUnits,
    marsGeometry: {
      meanSun: meanSunPoint, eccentricCenter: eccentricCenterPoint,
      epicycleCenter: epicycleCenterPoint, mars: marsPoint,
      principalRadius, eccentricComponent, smallEpicycleRadius, marsFromMeanSun,
      meanSunToEpicycleCenter: Math.hypot(
        epicycleCenterPoint.x - meanSunPoint.x,
        epicycleCenterPoint.y - meanSunPoint.y),
      meanSunToMars: Math.hypot(marsFromMeanSun.x, marsFromMeanSun.y),
    },
    earthToMars, earthToMarsDistance: Math.hypot(earthToMars.x, earthToMars.y),
    meanCommutation: meanCommutationAngle, meanPlanetLongitude, marsApogee,
    eccentricAnomaly: wrap(meanPlanetLongitude - marsApogee),
    epicycleOffsetDirection: wrap(2 * meanPlanetLongitude - marsApogee + 180),
    meanSunMarsLongitude, equationOfCenter,
    // Equation of centre has the sign of heliocentric minus mean longitude.
    correctedCommutation: wrap(meanCommutationAngle - equationOfCenter),
    annualParallaxEquation: angularDifference(geocentricSiderealLongitude, meanSunMarsLongitude),
    geocentricSiderealLongitude,
    geocentricTropicalLongitude: wrap(geocentricSiderealLongitude + earth.truePrecession),
    truePrecession: earth.truePrecession,
  };
}

export function evaluateMarsArguments(meanSun: number, meanCommutation: number, marsApogee: number,
  solarMeanApogee: number, theta: number, meanPrecession: number): CopernicusMarsResult {
  return { ...couple(evaluateEarthArguments(meanSun, solarMeanApogee, theta, meanPrecession),
    meanCommutation, marsApogee), apsisAssignment: { status: 'explicit angular argument, no date law' } };
}

function localDays(date: readonly number[]): number {
  const [year, month, day, hour, minute] = date;
  return civilToLocalJd(year, month, day, (hour + minute / 60) / 24) - copernicusEpochJd;
}

export const apsisDomainLocalDays = {
  start: localDays(marsRecord.optional_reconstructions[apsisPolicy].domain_start_local_julian),
  end: localDays(marsRecord.optional_reconstructions[apsisPolicy].domain_end_local_julian),
} as const;

export function evaluateMarsDays(daysSinceEpoch: number, selectedPolicy: ApsisPolicy = apsisPolicy): CopernicusMarsResult {
  finite(daysSinceEpoch);
  if (selectedPolicy !== apsisPolicy && selectedPolicy !== exploratoryApsisPolicy) {
    throw new RangeError('Unknown Mars apsis policy');
  }
  if (selectedPolicy === apsisPolicy &&
      (daysSinceEpoch < apsisDomainLocalDays.start || daysSinceEpoch > apsisDomainLocalDays.end)) {
    throw new RangeError('Scholarly Mars apsis is restricted to 1473-02-19 through 1523-02-22 05:00 Julian Frauenburg local time');
  }
  const scholarlyPolicy = marsRecord.optional_reconstructions[apsisPolicy];
  const policy = selectedPolicy === apsisPolicy
    ? scholarlyPolicy : marsRecord.exploratory_policies[exploratoryApsisPolicy];
  const anchor = marsRecord.parameters.apogee_1523;
  // C3 p.363 rate is degrees per 365-day Egyptian year. Both policies use
  // the 1523 Frauenburg LMT anchor (C1 V.16; C3 pp.357–358); only the
  // exploratory policy continues it beyond the project's guarded interval.
  const apogee = anchor.value + (daysSinceEpoch - localDays(anchor.epoch_local_julian)) / 365 * scholarlyPolicy.annual_motion.value;
  const alpha = mp('mean_commutation_epoch') + daysSinceEpoch / 365 * mp('mean_commutation_annual_motion');
  return { ...couple(evaluateEarthDays(daysSinceEpoch), alpha, apogee), daysSinceEpoch,
    apsisAssignment: { policy: selectedPolicy, status: policy.status, source: policy.source } };
}
