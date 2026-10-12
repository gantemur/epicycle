/** Planar Ptolemaic equant kernel shared by Mars, Jupiter and Saturn.
 * P1 IX.6 pp.443–444, XI.9 pp.544–545; mean epicycle-apogee phase: P2 p.183.
 * Angles are eastward tropical degrees; lengths are original R=60 units.
 */

export type Point = Readonly<{ x: number; y: number }>;
export type SuperiorGeometryResult = Readonly<{
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
}>;

export function wrap(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function angularDifference(first: number, second: number): number {
  return wrap(first - second + 180) - 180;
}

const radians = (degrees: number): number => degrees * Math.PI / 180;
const degrees = (radiansValue: number): number => radiansValue * 180 / Math.PI;
const polar = (radius: number, angle: number): Point => ({
  x: radius * Math.cos(radians(angle)),
  y: radius * Math.sin(radians(angle)),
});
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const direction = (point: Point): number => wrap(degrees(Math.atan2(point.y, point.x)));

export function evaluateSuperiorGeometry(radius: number, halfEccentricity: number,
  epicycleRadius: number, meanLongitude: number, meanAnomaly: number,
  apogeeLongitude: number): SuperiorGeometryResult {
  if (![radius, halfEccentricity, epicycleRadius, meanLongitude, meanAnomaly,
    apogeeLongitude].every(Number.isFinite)) {
    throw new RangeError('Superior-planet lengths and angular arguments must be finite');
  }
  if (!(radius > halfEccentricity && halfEccentricity > 0 && epicycleRadius > 0)) {
    throw new RangeError('Require R > e > 0 and epicycle radius > 0');
  }

  const L = wrap(meanLongitude);
  const alpha = wrap(meanAnomaly);
  const A = wrap(apogeeLongitude);
  const kappa = radians(L - A);
  const O = { x: 0, y: 0 };
  const D = polar(halfEccentricity, A);
  const Q = polar(2 * halfEccentricity, A);

  // Positive intersection of the equant ray with the eccentric deferent.
  const qToC = Math.sqrt(radius * radius - (halfEccentricity * Math.sin(kappa)) ** 2)
    - halfEccentricity * Math.cos(kappa);
  const C = add(Q, polar(qToC, L));
  // α starts at the mean epicycle apogee, whose radius is parallel to Q→C.
  const P = add(C, polar(epicycleRadius, L + alpha));
  const centerLongitude = direction(C);
  const longitude = direction(P);

  return {
    earth: O, deferentCenter: D, equant: Q, epicycleCenter: C, planet: P,
    deferentRadius: radius, epicycleRadius,
    meanLongitude: L, meanAnomaly: alpha, apogeeLongitude: A,
    meanCentrum: wrap(L - A), epicycleCenterLongitude: centerLongitude,
    equationOfCenter: angularDifference(centerLongitude, L),
    epicycleEquation: angularDifference(longitude, centerLongitude), longitude,
    equantToEpicycleCenter: qToC,
    earthToEpicycleCenter: Math.hypot(C.x, C.y),
    earthToPlanet: Math.hypot(P.x, P.y),
  };
}
