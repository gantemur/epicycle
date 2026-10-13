import { earthRecord, marsRecord } from './copernicus.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { modelRecord } from './model.ts';
import { sunRecord } from './sun-almagest.ts';
import { jupiterRecord } from './ptolemy-jupiter.ts';
import { saturnRecord } from './ptolemy-saturn.ts';
import { jupiterRecord as copernicusJupiterRecord,
  saturnRecord as copernicusSaturnRecord } from './copernicus-superior.ts';

const ptolemyParameters: readonly [keyof typeof modelRecord.parameters, MessageKey][] = [
  ['deferent_radius', 'radiusDeferent'], ['double_eccentricity', 'eccentricityDouble'],
  ['half_eccentricity', 'eccentricityHalf'], ['epicycle_radius', 'radiusEpicycle'],
  ['mean_longitude_epoch', 'meanLongitudeEpoch'], ['mean_anomaly_epoch', 'anomalyEpoch'],
  ['apogee_longitude_epoch', 'apogeeEpoch'],
  ['mean_longitude_daily_motion', 'meanLongitudeRate'],
  ['mean_anomaly_daily_motion', 'anomalyRate'], ['apogee_motion', 'apogeeRate'],
];
const earthParameters: readonly [keyof typeof earthRecord.parameters, string, MessageKey][] = [
  ['annual_radius', 'R', 'annualCircle'], ['eccentric_component', 'e₁', 'solarEccentric'],
  ['small_eccentric_radius', 'e₂', 'solarSmallEccentric'], ['mean_sun_epoch', 'L₀', 'meanSunEpoch'],
  ['mean_sun_annual_motion', 'n☉', 'meanSunMotion'], ['mean_apogee_epoch', 'A₀', 'meanApogeeEpoch'],
  ['solar_anomaly_epoch', 'α☉₀', 'solarAnomalyEpoch'],
  ['mean_apogee_annual_motion', 'nA', 'meanApogeeMotion'], ['theta_epoch', 'θ₀', 'thetaEpoch'],
  ['theta_annual_motion', 'nθ', 'thetaMotion'], ['mean_precession_epoch', 'π₀', 'meanPrecessionEpoch'],
  ['mean_precession_annual_motion', 'nπ', 'meanPrecessionMotion'],
  ['precession_equation_amplitude', 'b', 'precessionAmplitude'],
];
const marsParameters: readonly [keyof typeof marsRecord.parameters, string, MessageKey][] = [
  ['principal_radius', 'R', 'principalRadius'], ['eccentric_component', 'e₁', 'marsEccentric'],
  ['double_eccentricity', '2e', 'marsDoubleEccentricity'],
  ['small_epicycle_radius', 'r′', 'smallEpicycleRadius'], ['earth_annual_radius', 'r', 'earthAnnualRadius'],
  ['mean_commutation_epoch', 'α₀', 'commutationEpoch'],
  ['mean_commutation_annual_motion', 'nα', 'commutationMotion'], ['apogee_1523', 'B', 'marsApogeeAnchor'],
];
const sunParameters: readonly [keyof typeof sunRecord.parameters, string, MessageKey][] = [
  ['eccentric_radius', 'R', 'solarEccentricRadius'],
  ['eccentricity', 'e', 'solarEccentricity'],
  ['apogee_longitude', 'A', 'solarApogeeSource'],
  ['mean_longitude_epoch', 'L₀', 'solarMeanEpoch'],
  ['mean_anomaly_epoch', 'κ₀', 'solarMeanAnomalyEpoch'],
  ['tropical_year', 'T', 'tropicalYear'],
  ['mean_longitude_daily_motion', 'n☉', 'solarDailyMotion'],
];
const outerParameters: readonly [keyof typeof jupiterRecord.parameters, string, MessageKey][] = [
  ['deferent_radius', 'R', 'radiusDeferent'],
  ['half_eccentricity', 'e', 'eccentricityHalf'],
  ['double_eccentricity', '2e', 'eccentricityDouble'],
  ['epicycle_radius', 'r', 'radiusEpicycle'],
  ['mean_longitude_epoch', 'L₀', 'meanLongitudeEpoch'],
  ['mean_anomaly_epoch', 'α₀', 'anomalyEpoch'],
  ['apogee_longitude_epoch', 'A₀', 'apogeeEpoch'],
  ['mean_longitude_daily_motion', 'nL', 'meanLongitudeRate'],
  ['mean_anomaly_daily_motion', 'nα', 'anomalyRate'],
  ['apogee_motion', 'nA', 'apogeeRate'],
];
const copernicusOuterParameters: readonly [keyof typeof copernicusJupiterRecord.parameters, string, MessageKey][] = [
  ['principal_radius', 'R', 'outerPrincipalRadius'],
  ['reported_double_eccentricity', '2e', 'reportedDoubleEccentricity'],
  ['eccentric_component', 'e₁', 'outerEccentricComponent'],
  ['small_epicycle_radius', 'r′', 'smallEpicycleRadius'],
  ['earth_annual_radius', 'r', 'outerEarthRadius'],
  ['mean_commutation_epoch', 'α₀', 'commutationEpoch'],
  ['mean_commutation_annual_motion', 'nα', 'commutationMotion'],
  ['mean_proper_longitude_epoch', 'L₀', 'meanProperEpoch'],
  ['mean_proper_longitude_annual_motion', 'nL', 'meanProperMotion'],
  ['sidereal_apogee_epoch', 'B₀', 'siderealApogeeEpoch'],
  ['sidereal_apogee_annual_motion', 'nB', 'siderealApogeeMotion'],
];

export function renderWorkspaceSources(language: Language): string {
  const t = (key: MessageKey): string => message(language, key);
  const units: Record<string, MessageKey> = {
    'deferent units': 'unitDeferent', degree: 'unitDegree',
    'degree per Egyptian day': 'unitDaily',
    'degree per 365-day Egyptian year': 'unitYearly',
    'Earth annual-radius units': 'unitEarthRadius',
    'Mars principal-radius units': 'unitMarsRadius',
    'Jupiter principal-radius units': 'unitJupiterRadius',
    'Saturn principal-radius units': 'unitSaturnRadius',
    'historical radius units': 'unitSolarRadius',
    'tropical degree, fixed': 'unitDegree',
    'tropical degree': 'unitDegree',
    'degree from solar apogee': 'unitDegree',
    'mean day': 'unitMeanDays',
    'degree per mean day': 'unitMeanDay',
    'degree from mean epicycle apogee': 'unitDegree',
  };
  const formattedValue = (parameter: { sexagesimal: string; unit: string }): string => {
    const unitKey = units[parameter.unit];
    if (!unitKey) throw new Error(`Untranslated historical unit: ${parameter.unit}`);
    return `<span class="sexagesimal">${parameter.sexagesimal}</span> <span class="parameter-unit">${t(unitKey)}</span>`;
  };
  const ptolemyRows = ptolemyParameters.map(([key, label]) =>
    `<div><dt>${t(label)}</dt><dd>${key === 'apogee_motion'
      ? t('apogeeOriginal') : formattedValue(modelRecord.parameters[key])}</dd></div>`).join('');
  const sourceRows = <T extends { [key: string]: { sexagesimal: string; unit: string } }>(record: T,
    keys: readonly [keyof T, string, MessageKey][]): string => keys.map(([key, symbol, label]) =>
    `<div><dt><span class="parameter-symbol">${symbol}</span> · ${t(label)}</dt><dd>${String(key) === 'apogee_motion'
      ? t('apogeeOriginal') : formattedValue(record[key])}</dd></div>`).join('');
  return `<details class="info-card" id="sources-ptolemy"><summary><span><span class="section-kicker">ALMAGEST</span><strong>${t('infoTitle')} · ${t('ptolemyPanel')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${t('infoIntro')}</p><p>${t('sourceText')}</p>
        <p>${t('deferentInfo')} ${t('equantInfo')} ${t('epicycleInfo')}</p>
        <p class="scientific-note">${t('geometryNote')}</p><p class="scientific-note">${t('validationNote')}</p>
        <div class="meta-row"><strong>${t('epoch')}</strong><span>${modelRecord.epoch.astronomical_julian_date}</span></div>
        <div class="meta-row"><strong>${t('frame')}</strong><span>${t('frameValue')}</span></div>
        <h3>${t('parameterTitle')}</h3><dl class="parameters">${ptolemyRows}</dl></div></details>
    <details class="info-card" id="sources-copernicus"><summary><span><span class="section-kicker">DE REVOLUTIONIBUS</span><strong>${t('copernicusSources')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${t('copernicusSourceIntro')}</p><p>${t('copernicusSourceLine')}</p>
        <p class="scientific-note">${t('copernicusLimit')}</p><p class="scientific-note">${t('copernicusFrameLimit')}</p>
        <div class="info-columns"><div><h3>${t('earthParameters')}</h3><dl class="parameters">${sourceRows(earthRecord.parameters, earthParameters)}</dl></div>
          <div><h3>${t('marsParameters')}</h3><dl class="parameters">${sourceRows(marsRecord.parameters, marsParameters)}
            <div><dt>nB · ${t('marsApogee')}</dt><dd>${formattedValue(marsRecord.optional_reconstructions['sn-local-uniform-1473-1523'].annual_motion)}</dd></div></dl></div></div>
      </div></details>
    <details class="info-card" id="sources-sun"><summary><span><span class="section-kicker">ALMAGEST III / DE REVOLUTIONIBUS III</span><strong>${t('sunSources')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${t('ptolemySunSourceIntro')}</p>
        <p>${t('ptolemySunSourceLine')}</p><p class="scientific-note">${t('ptolemySunValidation')}</p>
        <div class="meta-row"><strong>${t('epoch')}</strong><span>${t('ptolemySolarEpoch')}</span></div>
        <h3>${t('parameterTitle')} · ${t('ptolemySunPanel')}</h3>
        <dl class="parameters">${sourceRows(sunRecord.parameters, sunParameters)}</dl>
        <h3>${t('copernicusSunModelPanel')}</h3><p>${t('copernicusSunSourceIntro')}</p>
        <p>${t('copernicusSunSourceLine')}</p><p class="scientific-note">${t('solarFrameLimit')}</p>
        <p class="scientific-note">${t('solarContinuation')}</p>
      </div></details>
    <details class="info-card" id="sources-outer"><summary><span><span class="section-kicker">ALMAGEST IX / XI</span><strong>${t('outerSources')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${t('outerSourceIntro')}</p>
        <p>${t('outerSourceLine')}</p><p>${t('outerHistoricalExamples')}</p>
        <p class="scientific-note">${t('outerValidationStatus')} ${t('outerSourceLimit')}</p>
        <p class="scientific-note">${t('saturnReadingNote')}</p>
        <div class="meta-row"><strong>${t('epoch')}</strong><span>${t('outerEpochNote')}</span></div>
        <div class="info-columns"><div><h3>${t('jupiter')}</h3><dl class="parameters">${sourceRows(jupiterRecord.parameters, outerParameters)}</dl></div>
          <div><h3>${t('saturn')}</h3><dl class="parameters">${sourceRows(saturnRecord.parameters, outerParameters)}</dl></div></div>
      </div></details>
    <details class="info-card" id="sources-copernicus-outer"><summary><span><span class="section-kicker">DE REVOLUTIONIBUS V</span><strong>${t('copernicusOuterSources')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${t('copernicusOuterSourceIntro')}</p>
        <p>${t('copernicusOuterSourceLine')}</p><p class="scientific-note">${t('copernicusOuterValidation')}</p>
        <p class="scientific-note">${t('copernicusOuterContinuation')} ${t('copernicusFrameLimit')}</p>
        <div class="meta-row"><strong>${t('epoch')}</strong><span>${copernicusJupiterRecord.epoch.astronomical_julian_date} · ${t('unitMeanDays')}</span></div>
        <div class="info-columns"><div><h3>${t('copernicusJupiterPanel')}</h3>
          <p class="scientific-note">${t('copernicusJupiterReading')}</p>
          <dl class="parameters">${sourceRows(copernicusJupiterRecord.parameters, copernicusOuterParameters)}</dl></div>
          <div><h3>${t('copernicusSaturnPanel')}</h3>
          <p class="scientific-note">${t('copernicusSaturnReading')}</p>
          <dl class="parameters">${sourceRows(copernicusSaturnRecord.parameters, copernicusOuterParameters)}</dl></div></div>
      </div></details>`;
}
