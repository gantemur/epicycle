/** Body-specific Copernican Jupiter entry points; C1/C2 V.10–14. */
import { analyticSuperiorLongitude, evaluateSuperiorArguments, evaluateSuperiorDays } from './copernicus-superior.ts';

export const evaluateJupiterArguments = (meanSun: number, meanCommutation: number,
  jupiterApogee: number, solarMeanApogee: number, theta: number, meanPrecession: number) =>
  evaluateSuperiorArguments('jupiter', meanSun, meanCommutation, jupiterApogee,
    solarMeanApogee, theta, meanPrecession);

export const evaluateJupiterDays = (daysSinceEpoch: number) =>
  evaluateSuperiorDays('jupiter', daysSinceEpoch);

export const analyticJupiterLongitude = (meanSun: number, meanCommutation: number,
  jupiterApogee: number) =>
  analyticSuperiorLongitude('jupiter', meanSun, meanCommutation, jupiterApogee);
