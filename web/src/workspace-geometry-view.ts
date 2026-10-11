import { daysToEgyptian, daysToJulian, yearLabel } from './chronology.ts';
import { evaluateSelectedModel } from './comparison.ts';
import { copernicusTrail, renderCopernicusDiagram } from './copernicus-diagram.ts';
import type { ApsisPolicy } from './copernicus.ts';
import { renderDiagram, trailPoints } from './diagram.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { modelCapabilities, modelIds, models, type ModelId } from './model-registry.ts';
import { displayAvailabilityAt, type Availability } from './workspace-validation.ts';
import type { GeometryDisplay } from './workspace-types.ts';

const t = (language: Language, key: MessageKey): string => message(language, key);
const formatAngle = (value: number): string => `${value.toFixed(3)}°`;

function modelOptions(selected: string, language: Language): string {
  return modelIds.map(id => `<option value="${id}" ${id === selected ? 'selected' : ''}>${t(language, models[id].label)}</option>`).join('');
}

function policyOptions(selected: string, language: Language): string {
  return Object.keys(modelCapabilities.copernicus.policies).map(id => {
    const key = id === 'sn-uniform-exploratory' ? 'exploratoryPolicy' : 'sourceLimitedPolicy';
    return `<option value="${id}" ${id === selected ? 'selected' : ''}>${t(language, key)}</option>`;
  }).join('');
}

function checked(value: boolean): string { return value ? 'checked' : ''; }

/** Settings are replaced on configuration/language changes, never on animation frames. */
export function renderGeometryStatic(panel: HTMLElement, display: GeometryDisplay, language: Language): void {
  const title = panel.querySelector<HTMLElement>('[data-panel-title]');
  if (title) title.textContent = `${t(language, 'geometryPanel')} · ${t(language, models[display.modelId as ModelId].label)}`;
  const settings = panel.querySelector<HTMLElement>('[data-panel-settings]');
  if (!settings) return;
  const wasOpen = settings instanceof HTMLDetailsElement ? settings.open : false;
  settings.innerHTML = `<summary>${t(language, 'panelSettings')}</summary>
    <div class="panel-settings-grid">
      <label>${t(language, 'modelSetting')}<select data-setting="model">${modelOptions(display.modelId, language)}</select></label>
      <span class="panel-static-field">${t(language, 'mars')} · ${t(language, 'earthCentred')}</span>
      ${display.modelId === 'copernicus' ? `<label>${t(language, 'policySetting')}<select data-setting="policy">${policyOptions(display.policyId, language)}</select></label>` : ''}
      <label class="panel-check"><input type="checkbox" data-setting="trail" ${checked(display.trail.enabled)}> ${t(language, 'trail')}</label>
      <label>${t(language, 'trailLength')}<input type="range" min="30" max="720" step="10" data-setting="trail-days" value="${display.trail.days}"><span data-trail-value>${display.trail.days} ${t(language, 'days')}</span></label>
      <label class="panel-check"><input type="checkbox" data-setting="circles" ${checked(display.showCircles)}> ${t(language, 'circlesSetting')}</label>
      <label class="panel-check"><input type="checkbox" data-setting="lines" ${checked(display.showConstructionLines)}> ${t(language, 'linesSetting')}</label>
      <label class="panel-check"><input type="checkbox" data-setting="labels" ${checked(display.showAnnotations)}> ${t(language, 'labelsSetting')}</label>
    </div>`;
  if (settings instanceof HTMLDetailsElement) settings.open = wasOpen;
  const hint = panel.querySelector<HTMLElement>('[data-panel-hint]');
  if (hint) hint.textContent = t(language, display.modelId === 'ptolemy' ? 'ptolemyPanelHint' : 'copernicusPanelHint');
  const labels = display.modelId === 'ptolemy'
    ? [['O', 'earth'], ['D', 'deferentCenter'], ['Q', 'equant'], ['C', 'epicycleCenter'], ['P', 'mars']]
    : [['S', 'trueSun'], ['G', 'meanSun'], ['E', 'earth'], ['P', 'mars']];
  const legend = panel.querySelector<HTMLElement>('[data-panel-legend]');
  if (legend) legend.innerHTML = labels.map(([symbol, key]) =>
    `<li><span class="legend-symbol">${symbol}</span>${t(language, key as MessageKey)}</li>`).join('');
  const readouts = panel.querySelector<HTMLElement>('[data-panel-readouts]');
  if (readouts) readouts.innerHTML = `<div><dt>${t(language, 'nativeTropical')}</dt><dd data-tropical></dd></div>
    ${display.modelId === 'copernicus'
      ? `<div><dt>${t(language, 'nativeSidereal')}</dt><dd data-sidereal></dd></div>
         <div><dt>${t(language, 'truePrecession')}</dt><dd data-precession></dd></div>
         <div><dt>${t(language, display.policyId === 'sn-uniform-exploratory' ? 'marsApogeeExploratory' : 'marsApogee')}</dt><dd data-apogee></dd></div>`
      : `<div><dt>${t(language, 'meanLongitude')}</dt><dd data-mean-longitude></dd></div>
         <div><dt>${t(language, 'meanAnomaly')}</dt><dd data-mean-anomaly></dd></div>
         <div><dt>${t(language, 'centreCorrection')}</dt><dd data-centre-correction></dd></div>
         <div><dt>${t(language, 'egyptianDate')}</dt><dd data-egyptian-date></dd></div>
         <div><dt>${t(language, 'julianDate')}</dt><dd data-julian-date></dd></div>`}`;
}

function setValue(panel: HTMLElement, selector: string, value: string): void {
  const node = panel.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== value) node.textContent = value;
}

export function geometryUnavailableMessageKey(display: GeometryDisplay,
  availability: Availability): MessageKey {
  if (availability.issues.some(item => item.code === 'renderer-unavailable')) return 'rendererUnavailable';
  if (display.modelId === 'copernicus' && display.policyId === 'sn-local-uniform-1473-1523' &&
      availability.issues.some(item => item.code === 'outside-policy-domain')) {
    return 'geometryGuardUnavailable';
  }
  return 'currentUnavailable';
}

export function renderGeometryDynamic(panel: HTMLElement, display: GeometryDisplay,
  ut1Jd: number, language: Language): void {
  const frame = panel.querySelector<HTMLElement>('[data-geometry-frame]');
  if (!frame) return;
  const readouts = panel.querySelector<HTMLElement>('[data-panel-readouts]');
  const availability = displayAvailabilityAt(display, ut1Jd);
  const unavailable = panel.querySelector<HTMLElement>('[data-unavailable]');
  if (availability.status !== 'available') {
    if (unavailable) {
      unavailable.hidden = false;
      unavailable.textContent = t(language, geometryUnavailableMessageKey(display, availability));
    }
    if (frame.innerHTML) frame.innerHTML = '';
    if (readouts) readouts.hidden = true;
    return;
  }
  if (unavailable) unavailable.hidden = true;
  if (readouts) readouts.hidden = false;
  frame.classList.toggle('hide-circles', !display.showCircles);
  frame.classList.toggle('hide-lines', !display.showConstructionLines);
  frame.classList.toggle('hide-labels', !display.showAnnotations);
  const evaluation = evaluateSelectedModel(display.modelId as ModelId, ut1Jd,
    display.policyId as ApsisPolicy);
  setValue(panel, '[data-tropical]', formatAngle(evaluation.tropical));
  if (evaluation.model === 'ptolemy') {
    const trail = display.trail.enabled ? trailPoints(evaluation.days, display.trail.days, 48) : [];
    frame.innerHTML = renderDiagram(evaluation.result, trail, language, `-${display.id}`);
    setValue(panel, '[data-mean-longitude]', formatAngle(evaluation.result.meanLongitude));
    setValue(panel, '[data-mean-anomaly]', formatAngle(evaluation.result.meanAnomaly));
    setValue(panel, '[data-centre-correction]', formatAngle(evaluation.result.equationOfCenter));
    const egyptian = daysToEgyptian(evaluation.days);
    const julian = daysToJulian(evaluation.days);
    setValue(panel, '[data-egyptian-date]', `${egyptian.year} · ${egyptian.month} · ${egyptian.day}`);
    setValue(panel, '[data-julian-date]', `${yearLabel(julian.year, t(language, 'bce'), t(language, 'ce'))} · ${julian.month} · ${julian.day}`);
  } else {
    const trail = display.trail.enabled
      ? copernicusTrail(evaluation.days, display.trail.days, 48, display.policyId as ApsisPolicy) : [];
    frame.innerHTML = renderCopernicusDiagram(evaluation.result, language, trail, `-${display.id}`);
    setValue(panel, '[data-sidereal]', formatAngle(evaluation.result.geocentricSiderealLongitude));
    setValue(panel, '[data-precession]', formatAngle(evaluation.result.truePrecession));
    setValue(panel, '[data-apogee]', formatAngle(evaluation.result.marsApogee));
  }
}
