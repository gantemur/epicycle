import { evaluateEarthArguments, evaluateEarthDays, type EarthResult } from './copernicus.ts';

export type CopernicusSunResult = EarthResult & Readonly<{
  modelId: 'copernicus-1543-sun-longitude';
  body: 'Sun';
  underlyingModelId: 'copernicus-1543-earth-longitude';
  longitude: number;
}>;

function asSolarPrediction(earth: EarthResult): CopernicusSunResult {
  return { ...earth, modelId: 'copernicus-1543-sun-longitude',
    body: 'Sun', underlyingModelId: 'copernicus-1543-earth-longitude',
    longitude: earth.solarTropicalLongitude };
}

/** Original Earth geometry gives the true Sun's geocentric direction S−E. */
export function evaluateCopernicusSunArguments(meanSun: number, meanApogee: number,
  theta: number, meanPrecession: number): CopernicusSunResult {
  return asSolarPrediction(evaluateEarthArguments(meanSun, meanApogee, theta, meanPrecession));
}

export function evaluateCopernicusSunDays(daysSinceEpoch: number): CopernicusSunResult {
  return asSolarPrediction(evaluateEarthDays(daysSinceEpoch));
}
