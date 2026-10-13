import { daysToEgyptian, daysToJulian, yearLabel } from './chronology.ts';
import { evaluateSelectedModel, type MarsModelId } from './comparison.ts';
import { comparisonUt1Domain, modelDaysAtUt1 } from './comparison-time.ts';
import { copernicusTrail, renderCopernicusDiagram } from './copernicus-diagram.ts';
import { copernicusOuterTrail, renderCopernicusOuterDiagram } from './copernicus-outer-diagram.ts';
import { evaluateSuperiorDays } from './copernicus-superior.ts';
import type { ApsisPolicy } from './copernicus.ts';
import { evaluateCopernicusSunDays } from './copernicus-sun.ts';
import { outerTrailPoints, renderDiagram, trailPoints } from './diagram.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { bodyLabelKey, historicalBodies, modelCapabilities, modelIdsForBody, models,
  type ModelId } from './model-registry.ts';
import { evaluatePtolemyJupiterDays } from './ptolemy-jupiter.ts';
import { evaluatePtolemySaturnDays } from './ptolemy-saturn.ts';
import { copernicusSunTrail, ptolemySunTrail, renderCopernicusSunDiagram,
  renderPtolemySunDiagram } from './sun-diagram.ts';
import { evaluatePtolemySunDays } from './sun-almagest.ts';
import { displayAvailabilityAt, type Availability } from './workspace-validation.ts';
import type { GeometryDisplay } from './workspace-types.ts';

const t = (language: Language, key: MessageKey): string => message(language, key);
const formatAngle = (value: number): string => `${value.toFixed(3)}°`;

function modelOptions(body: string, selected: string, language: Language): string {
  return modelIdsForBody(body).map(id => `<option value="${id}" ${id === selected ? 'selected' : ''}>${t(language, models[id].label)}</option>`).join('');
}

function policyOptions(selected: string, language: Language): string {
  return Object.keys(modelCapabilities.copernicus.policies).map(id => {
    const key = id === 'sn-uniform-exploratory' ? 'exploratoryPolicy' : 'sourceLimitedPolicy';
    return `<option value="${id}" ${id === selected ? 'selected' : ''}>${t(language, key)}</option>`;
  }).join('');
}

function checked(value: boolean): string { return value ? 'checked' : ''; }

export function geometryPanelTitle(display: GeometryDisplay, language: Language): string {
  const model = t(language, models[display.modelId as ModelId].label);
  const centre = modelCapabilities[display.modelId]?.renderedViewCenters.length > 1
    ? ` · ${t(language, display.viewCenter === 'true-sun' ? 'trueSunCentred' : 'earthCentred')}` : '';
  return `${t(language, 'geometryPanel')} · ${t(language, bodyLabelKey(display.body))} · ${model}${centre}`;
}

/** Settings are replaced on configuration/language changes, never on animation frames. */
export function renderGeometryStatic(panel: HTMLElement, display: GeometryDisplay, language: Language): void {
  const title = panel.querySelector<HTMLElement>('[data-panel-title]');
  if (title) title.textContent = geometryPanelTitle(display, language);
  const settings = panel.querySelector<HTMLElement>('[data-panel-settings]');
  if (!settings) return;
  const wasOpen = settings instanceof HTMLDetailsElement ? settings.open : false;
  settings.innerHTML = `<summary>${t(language, 'panelSettings')}</summary>
    <div class="panel-settings-grid">
      <label>${t(language, 'bodySetting')}<select data-setting="body">${historicalBodies.map(body => `<option value="${body}" ${display.body === body ? 'selected' : ''}>${t(language, bodyLabelKey(body))}</option>`).join('')}</select></label>
      <label>${t(language, 'modelSetting')}<select data-setting="model">${modelOptions(display.body, display.modelId, language)}</select></label>
      ${modelCapabilities[display.modelId]?.renderedViewCenters.length > 1
        ? `<label>${t(language, 'viewingCentre')}<select data-setting="view-center">
            <option value="earth" ${display.viewCenter === 'earth' ? 'selected' : ''}>${t(language, 'earthCentred')}</option>
            <option value="true-sun" ${display.viewCenter === 'true-sun' ? 'selected' : ''}>${t(language, 'trueSunCentred')}</option>
          </select></label>`
        : `<span class="panel-static-field">${t(language, bodyLabelKey(display.body))} · ${t(language, 'earthCentred')}</span>`}
      ${display.modelId === 'copernicus' ? `<label>${t(language, 'policySetting')}<select data-setting="policy">${policyOptions(display.policyId, language)}</select></label>` : ''}
      <label class="panel-check"><input type="checkbox" data-setting="trail" ${checked(display.trail.enabled)}> ${t(language, 'trail')}</label>
      <label>${t(language, 'trailLength')}<input type="range" min="30" max="720" step="10" data-setting="trail-days" value="${display.trail.days}"><span data-trail-value>${display.trail.days} ${t(language, 'days')}</span></label>
      <label class="panel-check"><input type="checkbox" data-setting="circles" ${checked(display.showCircles)}> ${t(language, 'circlesSetting')}</label>
      <label class="panel-check"><input type="checkbox" data-setting="lines" ${checked(display.showConstructionLines)}> ${t(language, 'linesSetting')}</label>
      <label class="panel-check"><input type="checkbox" data-setting="labels" ${checked(display.showAnnotations)}> ${t(language, 'labelsSetting')}</label>
    </div>`;
  if (settings instanceof HTMLDetailsElement) settings.open = wasOpen;
  const hint = panel.querySelector<HTMLElement>('[data-panel-hint]');
  const hintKey: MessageKey = display.modelId === 'ptolemy-jupiter' || display.modelId === 'ptolemy-saturn'
    ? 'outerPanelHint' : display.modelId === 'ptolemy-sun' ? 'ptolemySunPanelHint'
    : display.modelId === 'copernicus-jupiter' || display.modelId === 'copernicus-saturn'
      ? display.viewCenter === 'true-sun' ? 'copernicusOuterSunHint' : 'copernicusOuterEarthHint'
    : display.modelId === 'copernicus-sun'
      ? display.viewCenter === 'true-sun' ? 'copernicusSolarSunHint' : 'copernicusSolarEarthHint'
      : display.modelId === 'ptolemy' ? 'ptolemyPanelHint'
        : display.viewCenter === 'true-sun' ? 'copernicusSunPanelHint' : 'copernicusPanelHint';
  if (hint) hint.textContent = t(language, hintKey);
  const labels = display.modelId === 'ptolemy' || display.modelId === 'ptolemy-jupiter' || display.modelId === 'ptolemy-saturn'
    ? [['O', 'earth'], ['D', 'deferentCenter'], ['Q', 'equant'], ['C', 'epicycleCenter'], ['P', bodyLabelKey(display.body)]]
    : display.modelId === 'ptolemy-sun'
      ? [['O', 'earth'], ['D', 'solarEccentricCenter'], ['P', 'sun']]
    : display.modelId === 'copernicus-sun'
      ? [['S', 'trueSun'], ['F', 'solarEccentricCenter'], ['G', 'meanSun'], ['E', 'earth']]
    : display.modelId === 'copernicus-jupiter' || display.modelId === 'copernicus-saturn'
      ? [['S', 'trueSun'], ['G', 'meanSun'], ['E', 'earth'], ['P', bodyLabelKey(display.body)]]
    : [['S', 'trueSun'], ['G', 'meanSun'], ['E', 'earth'], ['P', 'mars']];
  const legend = panel.querySelector<HTMLElement>('[data-panel-legend]');
  if (legend) legend.innerHTML = labels.map(([symbol, key]) =>
    `<li><span class="legend-symbol">${symbol}</span>${t(language, key as MessageKey)}</li>`).join('');
  const readouts = panel.querySelector<HTMLElement>('[data-panel-readouts]');
  if (readouts) readouts.innerHTML = `<div><dt>${t(language, 'nativeTropical')}</dt><dd data-tropical></dd></div>
    ${display.modelId === 'copernicus-sun'
      ? `<div><dt>${t(language, 'nativeSidereal')}</dt><dd data-sidereal></dd></div>
         <div><dt>${t(language, 'truePrecession')}</dt><dd data-precession></dd></div>
         <div><dt>${t(language, 'meanSunLongitude')}</dt><dd data-mean-longitude></dd></div>
         <div><dt>${t(language, 'solarEquation')}</dt><dd data-solar-equation></dd></div>
         <div><dt>${t(language, 'solarDistance')}</dt><dd data-solar-distance></dd></div>`
      : display.modelId === 'copernicus-jupiter' || display.modelId === 'copernicus-saturn'
        ? `<div><dt>${t(language, 'nativeSidereal')}</dt><dd data-sidereal></dd></div>
           <div><dt>${t(language, 'truePrecession')}</dt><dd data-precession></dd></div>
           <div><dt>${t(language, 'meanSunLongitude')}</dt><dd data-mean-sun></dd></div>
           <div><dt>${t(language, 'meanPlanetLongitude')}</dt><dd data-mean-longitude></dd></div>
           <div><dt>${t(language, 'currentSiderealApogee')}</dt><dd data-apogee></dd></div>
           <div><dt>${t(language, 'centreCorrection')}</dt><dd data-centre-correction></dd></div>
           <div><dt>${t(language, 'earthPlanetDistance')}</dt><dd data-distance></dd></div>`
      : display.modelId === 'ptolemy-sun'
        ? `<div><dt>${t(language, 'meanLongitude')}</dt><dd data-mean-longitude></dd></div>
           <div><dt>${t(language, 'meanAnomaly')}</dt><dd data-mean-anomaly></dd></div>
           <div><dt>${t(language, 'solarEquation')}</dt><dd data-solar-equation></dd></div>
           <div><dt>${t(language, 'solarApogee')}</dt><dd data-apogee></dd></div>
           <div><dt>${t(language, 'solarDistance')}</dt><dd data-solar-distance></dd></div>`
      : display.modelId === 'copernicus'
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

/** A negative elapsed day has a Julian date, but no Nabonassar calendar date. */
export function formatPtolemaicDates(days: number, language: Language):
  { egyptian: string; julian: string } {
  const julianDate = daysToJulian(days);
  const julian = `${yearLabel(julianDate.year, t(language, 'bce'), t(language, 'ce'))} · ${julianDate.month} · ${julianDate.day}`;
  if (days < 0) {
    return { egyptian: t(language, 'beforeNabonassarEpoch'), julian };
  }
  const egyptianDate = daysToEgyptian(days);
  const egyptian = `${egyptianDate.year} · ${egyptianDate.month} · ${egyptianDate.day}`;
  return { egyptian, julian };
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
  const provenance = panel.querySelector<HTMLElement>('[data-geometry-provenance]');
  if (provenance) {
    const outsideGuard = ut1Jd < comparisonUt1Domain.start || ut1Jd > comparisonUt1Domain.end;
    const exploratoryOutside = display.modelId === 'copernicus' &&
      display.policyId === 'sn-uniform-exploratory' && outsideGuard;
    const copernicusOuter = display.modelId === 'copernicus-jupiter' ||
      display.modelId === 'copernicus-saturn';
    provenance.hidden = !exploratoryOutside && !copernicusOuter;
    if (exploratoryOutside || copernicusOuter) {
      const note = t(language, copernicusOuter ? 'copernicusOuterContinuation' : 'geometryExploratoryNote');
      if (provenance.textContent !== note) provenance.textContent = note;
    }
  }
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
  if (display.modelId === 'ptolemy-sun') {
    const days = modelDaysAtUt1(ut1Jd).ptolemy;
    const result = evaluatePtolemySunDays(days);
    const trail = display.trail.enabled ? ptolemySunTrail(days, display.trail.days) : [];
    frame.innerHTML = renderPtolemySunDiagram(result, trail, language, `-${display.id}`);
    setValue(panel, '[data-tropical]', formatAngle(result.longitude));
    setValue(panel, '[data-mean-longitude]', formatAngle(result.meanLongitude));
    setValue(panel, '[data-mean-anomaly]', formatAngle(result.meanAnomaly));
    setValue(panel, '[data-solar-equation]', formatAngle(result.solarEquation));
    setValue(panel, '[data-apogee]', formatAngle(result.apogeeLongitude));
    setValue(panel, '[data-solar-distance]', result.earthToSun.toFixed(3));
    return;
  }
  if (display.modelId === 'copernicus-sun') {
    const days = modelDaysAtUt1(ut1Jd).copernicus;
    const result = evaluateCopernicusSunDays(days);
    const trail = display.trail.enabled
      ? copernicusSunTrail(days, display.trail.days, display.viewCenter) : [];
    frame.innerHTML = renderCopernicusSunDiagram(result, display.viewCenter, trail,
      language, `-${display.id}`);
    setValue(panel, '[data-tropical]', formatAngle(result.solarTropicalLongitude));
    setValue(panel, '[data-sidereal]', formatAngle(result.solarSiderealLongitude));
    setValue(panel, '[data-precession]', formatAngle(result.truePrecession));
    setValue(panel, '[data-mean-longitude]', formatAngle(result.meanSunLongitude));
    setValue(panel, '[data-solar-equation]', formatAngle(result.solarEquation));
    setValue(panel, '[data-solar-distance]', Math.hypot(result.earthToSun.x,
      result.earthToSun.y).toFixed(3));
    return;
  }
  if (display.modelId === 'ptolemy-jupiter' || display.modelId === 'ptolemy-saturn') {
    const days = modelDaysAtUt1(ut1Jd).ptolemy;
    const body = display.modelId === 'ptolemy-jupiter' ? 'Jupiter' : 'Saturn';
    const result = body === 'Jupiter' ? evaluatePtolemyJupiterDays(days)
      : evaluatePtolemySaturnDays(days);
    const trail = display.trail.enabled ? outerTrailPoints(body, days, display.trail.days) : [];
    frame.innerHTML = renderDiagram(result, trail, language, `-${display.id}`, body);
    setValue(panel, '[data-tropical]', formatAngle(result.longitude));
    setValue(panel, '[data-mean-longitude]', formatAngle(result.meanLongitude));
    setValue(panel, '[data-mean-anomaly]', formatAngle(result.meanAnomaly));
    setValue(panel, '[data-centre-correction]', formatAngle(result.equationOfCenter));
    const dates = formatPtolemaicDates(days, language);
    setValue(panel, '[data-egyptian-date]', dates.egyptian);
    setValue(panel, '[data-julian-date]', dates.julian);
    return;
  }
  if (display.modelId === 'copernicus-jupiter' || display.modelId === 'copernicus-saturn') {
    const body = display.modelId === 'copernicus-jupiter' ? 'jupiter' : 'saturn';
    const days = modelDaysAtUt1(ut1Jd).copernicus;
    const result = evaluateSuperiorDays(body, days);
    const trail = display.trail.enabled
      ? copernicusOuterTrail(body, days, display.trail.days, display.viewCenter, 48) : [];
    frame.innerHTML = renderCopernicusOuterDiagram(result, language, trail,
      `-${display.id}`, display.viewCenter);
    setValue(panel, '[data-tropical]', formatAngle(result.geocentricTropicalLongitude));
    setValue(panel, '[data-sidereal]', formatAngle(result.geocentricSiderealLongitude));
    setValue(panel, '[data-precession]', formatAngle(result.truePrecession));
    setValue(panel, '[data-mean-sun]', formatAngle(result.earthModel.meanSunLongitude));
    setValue(panel, '[data-mean-longitude]', formatAngle(result.meanPlanetLongitude));
    setValue(panel, '[data-apogee]', formatAngle(result.planetApogee));
    setValue(panel, '[data-centre-correction]', formatAngle(result.equationOfCenter));
    setValue(panel, '[data-distance]', result.earthToPlanetDistance.toFixed(3));
    return;
  }
  const evaluation = evaluateSelectedModel(display.modelId as MarsModelId, ut1Jd,
    display.policyId as ApsisPolicy);
  setValue(panel, '[data-tropical]', formatAngle(evaluation.tropical));
  if (evaluation.model === 'ptolemy') {
    const trail = display.trail.enabled ? trailPoints(evaluation.days, display.trail.days, 48) : [];
    frame.innerHTML = renderDiagram(evaluation.result, trail, language, `-${display.id}`);
    setValue(panel, '[data-mean-longitude]', formatAngle(evaluation.result.meanLongitude));
    setValue(panel, '[data-mean-anomaly]', formatAngle(evaluation.result.meanAnomaly));
    setValue(panel, '[data-centre-correction]', formatAngle(evaluation.result.equationOfCenter));
    const dates = formatPtolemaicDates(evaluation.days, language);
    setValue(panel, '[data-egyptian-date]', dates.egyptian);
    setValue(panel, '[data-julian-date]', dates.julian);
  } else {
    const trail = display.trail.enabled
      ? copernicusTrail(evaluation.days, display.trail.days, 48,
        display.policyId as ApsisPolicy, display.viewCenter) : [];
    frame.innerHTML = renderCopernicusDiagram(evaluation.result, language, trail,
      `-${display.id}`, display.viewCenter);
    setValue(panel, '[data-sidereal]', formatAngle(evaluation.result.geocentricSiderealLongitude));
    setValue(panel, '[data-precession]', formatAngle(evaluation.result.truePrecession));
    setValue(panel, '[data-apogee]', formatAngle(evaluation.result.marsApogee));
  }
}
