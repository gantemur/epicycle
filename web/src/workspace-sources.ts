import { earthRecord, marsRecord } from './copernicus.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { modelRecord } from './model.ts';

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

export function renderWorkspaceSources(language: Language): string {
  const t = (key: MessageKey): string => message(language, key);
  const units: Record<string, MessageKey> = {
    'deferent units': 'unitDeferent', degree: 'unitDegree',
    'degree per Egyptian day': 'unitDaily',
    'degree per 365-day Egyptian year': 'unitYearly',
    'Earth annual-radius units': 'unitEarthRadius',
    'Mars principal-radius units': 'unitMarsRadius',
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
    `<div><dt><span class="parameter-symbol">${symbol}</span> · ${t(label)}</dt><dd>${formattedValue(record[key])}</dd></div>`).join('');
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
      </div></details>`;
}
