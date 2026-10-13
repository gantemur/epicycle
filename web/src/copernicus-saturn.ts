/** Body-specific Copernican Saturn entry points; C1/C2 V.5–9. */
import { analyticSuperiorLongitude, evaluateSuperiorArguments, evaluateSuperiorDays } from './copernicus-superior.ts';

export const evaluateSaturnArguments = (meanSun: number, meanCommutation: number,
  saturnApogee: number, solarMeanApogee: number, theta: number, meanPrecession: number) =>
  evaluateSuperiorArguments('saturn', meanSun, meanCommutation, saturnApogee,
    solarMeanApogee, theta, meanPrecession);

export const evaluateSaturnDays = (daysSinceEpoch: number) =>
  evaluateSuperiorDays('saturn', daysSinceEpoch);

export const analyticSaturnLongitude = (meanSun: number, meanCommutation: number,
  saturnApogee: number) =>
  analyticSuperiorLongitude('saturn', meanSun, meanCommutation, saturnApogee);
