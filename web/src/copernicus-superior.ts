/** Copernicus's 1543 Jupiter/Saturn compound circles (V.2–4; C3 pp.291–301).
 * Mars retains its established evaluator and source-specific apsis policy.
 */
import jupiterRecord from '../../data/jupiter-copernicus-1543-v1.json' with { type: 'json' };
import saturnRecord from '../../data/saturn-copernicus-1543-v1.json' with { type: 'json' };
import { earthRecord, evaluateEarthArguments, evaluateEarthDays, type CopernicusMarsResult,
  type EarthResult } from './copernicus.ts';
import { angularDifference, wrap, type Point } from './model.ts';

export { jupiterRecord, saturnRecord };
export type SuperiorBody = 'jupiter' | 'saturn';
const recordFor = (body: SuperiorBody) => body === 'jupiter' ? jupiterRecord : saturnRecord;
type Parameter = keyof typeof jupiterRecord.parameters;
const value = (body: SuperiorBody, name: Parameter): number => recordFor(body).parameters[name].value;
const radians = (angle: number): number => angle * Math.PI / 180;
const degrees = (angle: number): number => angle * 180 / Math.PI;
const polar = (radius: number, angle: number): Point => ({
  x: radius * Math.cos(radians(wrap(angle))),
  y: radius * Math.sin(radians(wrap(angle))),
});
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (point: Point, factor: number): Point => ({ x: point.x * factor, y: point.y * factor });
const angle = (point: Point): number => wrap(degrees(Math.atan2(point.y, point.x)));
const finite = (...values: number[]): void => {
  if (!values.every(Number.isFinite)) throw new RangeError('Arguments must be finite');
};

export type CopernicusSuperiorResult = Readonly<{
  modelId: string; body: SuperiorBody; frameId: string;
  earthModel: EarthResult; earthToPlanetScale: number;
  earthGeometryInPlanetUnits: { trueSun: Point; eccentricCenter: Point; meanSun: Point; earth: Point };
  planetGeometry: {
    meanSun: Point; trueSun: Point; eccentricCenter: Point; epicycleCenter: Point; planet: Point;
    principalRadius: number; eccentricComponent: number; smallEpicycleRadius: number;
    planetFromMeanSun: Point; planetFromTrueSun: Point;
    meanSunToEpicycleCenter: number; meanSunToPlanet: number; trueSunToPlanet: number;
  };
  earthToPlanet: Point; earthToPlanetDistance: number;
  meanCommutation: number; meanPlanetLongitude: number; planetApogee: number;
  eccentricAnomaly: number; epicycleOffsetDirection: number;
  meanSunPlanetLongitude: number; equationOfCenter: number;
  correctedCommutation: number; annualParallaxEquation: number;
  geocentricSiderealLongitude: number; geocentricTropicalLongitude: number;
  truePrecession: number; daysSinceEpoch?: number;
  apsisAssignment: { status: string; source?: string };
}>;

export function validateSuperiorRecord(body: SuperiorBody): void {
  const record = recordFor(body);
  const earth = record.dependencies[0];
  if (record.schema_version !== 1 || record.model_id !== `copernicus-1543-${body}-longitude` ||
      earth.model_id !== earthRecord.model_id ||
      earth.required_schema_version !== earthRecord.schema_version ||
      record.frame.id !== earthRecord.frame.id ||
      record.epoch.astronomical_julian_date !== earthRecord.epoch.astronomical_julian_date ||
      record.epoch.calendar !== earthRecord.epoch.calendar ||
      record.epoch.day_fraction !== earthRecord.epoch.day_fraction) {
    throw new Error('Incompatible Copernican Earth dependency');
  }
}

function couple(body: SuperiorBody, earth: EarthResult,
  meanCommutation: number, apogee: number): Omit<CopernicusSuperiorResult, 'apsisAssignment'> {
  finite(meanCommutation, apogee);
  validateSuperiorRecord(body);
  const alpha = wrap(meanCommutation);
  const B = wrap(apogee);
  const L = wrap(earth.meanSunLongitude - alpha); // The historical mean Sun, not true solar longitude.
  const principalRadius = value(body, 'principal_radius');
  const eccentricComponent = value(body, 'eccentric_component');
  const smallEpicycleRadius = value(body, 'small_epicycle_radius');
  const earthAnnualRadius = value(body, 'earth_annual_radius');
  const earthToPlanetScale = earthAnnualRadius / earth.annualRadius;
  const earthGeometryInPlanetUnits = {
    trueSun: scale(earth.trueSun, earthToPlanetScale),
    eccentricCenter: scale(earth.eccentricCenter, earthToPlanetScale),
    meanSun: scale(earth.meanSun, earthToPlanetScale),
    earth: scale(earth.earth, earthToPlanetScale),
  };
  const G = earthGeometryInPlanetUnits.meanSun;
  const S = earthGeometryInPlanetUnits.trueSun;
  const E = earthGeometryInPlanetUnits.earth;
  const M = add(G, polar(eccentricComponent, B));
  const C = add(M, polar(principalRadius, L));
  const P = add(C, polar(-smallEpicycleRadius, 2 * L - B));
  const earthToPlanet = sub(P, E);
  const planetFromMeanSun = sub(P, G);
  const planetFromTrueSun = sub(P, S);
  const meanSunPlanetLongitude = angle(planetFromMeanSun);
  const geocentricSiderealLongitude = angle(earthToPlanet);
  const equationOfCenter = angularDifference(meanSunPlanetLongitude, L);
  return {
    modelId: recordFor(body).model_id, body, frameId: recordFor(body).frame.id,
    earthModel: earth, earthToPlanetScale, earthGeometryInPlanetUnits,
    planetGeometry: {
      meanSun: G, trueSun: S, eccentricCenter: M, epicycleCenter: C, planet: P,
      principalRadius, eccentricComponent, smallEpicycleRadius,
      planetFromMeanSun, planetFromTrueSun,
      meanSunToEpicycleCenter: Math.hypot(C.x - G.x, C.y - G.y),
      meanSunToPlanet: Math.hypot(planetFromMeanSun.x, planetFromMeanSun.y),
      trueSunToPlanet: Math.hypot(planetFromTrueSun.x, planetFromTrueSun.y),
    },
    earthToPlanet,
    earthToPlanetDistance: Math.hypot(earthToPlanet.x, earthToPlanet.y),
    meanCommutation: alpha, meanPlanetLongitude: L, planetApogee: B,
    eccentricAnomaly: wrap(L - B), epicycleOffsetDirection: wrap(2 * L - B + 180),
    meanSunPlanetLongitude, equationOfCenter,
    correctedCommutation: wrap(alpha - equationOfCenter),
    annualParallaxEquation: angularDifference(geocentricSiderealLongitude, meanSunPlanetLongitude),
    geocentricSiderealLongitude,
    geocentricTropicalLongitude: wrap(geocentricSiderealLongitude + earth.truePrecession),
    truePrecession: earth.truePrecession,
  };
}

export function evaluateSuperiorArguments(body: SuperiorBody, meanSun: number,
  meanCommutation: number, apogee: number, solarMeanApogee: number,
  theta: number, meanPrecession: number): CopernicusSuperiorResult {
  finite(meanSun, meanCommutation, apogee, solarMeanApogee, theta, meanPrecession);
  return { ...couple(body, evaluateEarthArguments(meanSun, solarMeanApogee, theta, meanPrecession),
    meanCommutation, apogee), apsisAssignment: { status: 'explicit source argument; no date law invoked' } };
}

export function evaluateSuperiorDays(body: SuperiorBody, daysSinceEpoch: number): CopernicusSuperiorResult {
  finite(daysSinceEpoch);
  const years = daysSinceEpoch / 365; // C1 V.1: 365-day Egyptian years.
  const alpha = value(body, 'mean_commutation_epoch') + years * value(body, 'mean_commutation_annual_motion');
  const B = value(body, 'sidereal_apogee_epoch') + years * value(body, 'sidereal_apogee_annual_motion');
  return { ...couple(body, evaluateEarthDays(daysSinceEpoch), alpha, B), daysSinceEpoch,
    apsisAssignment: {
      status: 'source-prescribed uniform sidereal motion; mathematical continuation outside historical checks',
      source: recordFor(body).parameters.sidereal_apogee_annual_motion.source,
    } };
}

/** Independent scalar route, using the source-supported radial/tangential identities. */
export function analyticSuperiorLongitude(body: SuperiorBody, meanSun: number,
  meanCommutation: number, apogee: number): number {
  finite(meanSun, meanCommutation, apogee);
  const L = wrap(meanSun - meanCommutation);
  const k = radians(wrap(L - apogee));
  const R = value(body, 'principal_radius');
  const e1 = value(body, 'eccentric_component');
  const smallRadius = value(body, 'small_epicycle_radius');
  const earthRadius = value(body, 'earth_annual_radius');
  const radial = R + (e1 - smallRadius) * Math.cos(k);
  const tangential = -(e1 + smallRadius) * Math.sin(k);
  const centreEquation = Math.atan2(tangential, radial);
  const distance = Math.hypot(radial, tangential);
  const correctedCommutation = radians(wrap(meanCommutation)) - centreEquation;
  const annualCorrection = Math.atan2(
    earthRadius * Math.sin(correctedCommutation),
    distance + earthRadius * Math.cos(correctedCommutation));
  return wrap(L + degrees(centreEquation + annualCorrection));
}

/** Historical common Earth-R=10000 units; reversible, not modern physical AU. */
export function toCommonEarthUnits(result: CopernicusSuperiorResult | CopernicusMarsResult): {
  body: SuperiorBody | 'mars'; lengthUnit: string;
  planetToCommonScale: number; commonToPlanetScale: number;
  trueSun: Point; meanSun: Point; earth: Point; planet: Point;
} {
  if ('planetGeometry' in result) {
    const factor = 1 / result.earthToPlanetScale;
    return { body: result.body, lengthUnit: 'historical Earth annual radius = 10000',
      planetToCommonScale: factor, commonToPlanetScale: 1 / factor,
      trueSun: scale(result.earthGeometryInPlanetUnits.trueSun, factor),
      meanSun: scale(result.earthGeometryInPlanetUnits.meanSun, factor),
      earth: scale(result.earthGeometryInPlanetUnits.earth, factor),
      planet: scale(result.planetGeometry.planet, factor) };
  }
  const factor = 1 / result.earthToMarsScale;
  return { body: 'mars', lengthUnit: 'historical Earth annual radius = 10000',
    planetToCommonScale: factor, commonToPlanetScale: 1 / factor,
    trueSun: scale(result.earthGeometryInMarsUnits.trueSun, factor),
    meanSun: scale(result.earthGeometryInMarsUnits.meanSun, factor),
    earth: scale(result.earthGeometryInMarsUnits.earth, factor),
    planet: scale(result.marsGeometry.mars, factor) };
}
