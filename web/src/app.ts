import './style.css';
import { daysToEgyptian, daysToJulian, yearLabel } from './chronology.ts';
import { renderDiagram, trailPoints } from './diagram.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { evaluateDays, modelRecord, type MarsResult } from './model.ts';
import { updatePlayButton } from './playback-view.ts';
import { initialState, reduce, type Action, type AppState } from './state.ts';
import { evaluateSelectedModel, sampleSelectedPlot, selectedDifference, selectedPlotCacheKey,
  type ModelEvaluation, type SelectedPlotSamples } from './comparison.ts';
import { copernicusTrail, renderCopernicusDiagram } from './copernicus-diagram.ts';
import { apsisPolicy, earthRecord, exploratoryApsisPolicy, marsRecord } from './copernicus.ts';
import { comparisonUt1Domain, formatFrauenburgInput, modelDaysAtUt1, parseFrauenburgInput,
  utcMillisToAssumedUt1 } from './comparison-time.ts';
import { dateAllowed, modelIds, models, usesCopernicus, type ModelId } from './model-registry.ts';
import { selectedModels, computationalUt1Domain } from './state.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing app root');

const translated = (key: MessageKey, tag = 'span'): string => `<${tag} data-i18n="${key}"></${tag}>`;
const label = (key: MessageKey, target: string): string => `<label for="${target}" data-i18n="${key}"></label>`;
const legend = (code: string, key: MessageKey, style: string): string =>
  `<li><span class="legend-symbol ${style}" aria-hidden="true">${code}</span>${translated(key)}</li>`;

const parameterKeys: readonly [keyof typeof modelRecord.parameters, MessageKey][] = [
  ['deferent_radius', 'radiusDeferent'],
  ['double_eccentricity', 'eccentricityDouble'],
  ['half_eccentricity', 'eccentricityHalf'],
  ['epicycle_radius', 'radiusEpicycle'],
  ['mean_longitude_epoch', 'meanLongitudeEpoch'],
  ['mean_anomaly_epoch', 'anomalyEpoch'],
  ['apogee_longitude_epoch', 'apogeeEpoch'],
  ['mean_longitude_daily_motion', 'meanLongitudeRate'],
  ['mean_anomaly_daily_motion', 'anomalyRate'],
  ['apogee_motion', 'apogeeRate'],
];

const earthParameterKeys: readonly [keyof typeof earthRecord.parameters, string, MessageKey][] = [
  ['annual_radius', 'R', 'annualCircle'], ['eccentric_component', 'e₁', 'solarEccentric'],
  ['small_eccentric_radius', 'e₂', 'solarSmallEccentric'], ['mean_sun_epoch', 'L₀', 'meanSunEpoch'],
  ['mean_sun_annual_motion', 'n☉', 'meanSunMotion'], ['mean_apogee_epoch', 'A₀', 'meanApogeeEpoch'],
  ['solar_anomaly_epoch', 'α☉₀', 'solarAnomalyEpoch'],
  ['mean_apogee_annual_motion', 'nA', 'meanApogeeMotion'], ['theta_epoch', 'θ₀', 'thetaEpoch'],
  ['theta_annual_motion', 'nθ', 'thetaMotion'], ['mean_precession_epoch', 'π₀', 'meanPrecessionEpoch'],
  ['mean_precession_annual_motion', 'nπ', 'meanPrecessionMotion'],
  ['precession_equation_amplitude', 'b', 'precessionAmplitude'],
];
const marsParameterKeys: readonly [keyof typeof marsRecord.parameters, string, MessageKey][] = [
  ['principal_radius', 'R', 'principalRadius'], ['eccentric_component', 'e₁', 'marsEccentric'],
  ['double_eccentricity', '2e', 'marsDoubleEccentricity'],
  ['small_epicycle_radius', 'r′', 'smallEpicycleRadius'], ['earth_annual_radius', 'r', 'earthAnnualRadius'],
  ['mean_commutation_epoch', 'α₀', 'commutationEpoch'],
  ['mean_commutation_annual_motion', 'nα', 'commutationMotion'], ['apogee_1523', 'B', 'marsApogeeAnchor'],
];
const sourceParameters = <T extends { [key: string]: { sexagesimal: string; unit: string } }>(
  record: T, keys: readonly [keyof T, string, MessageKey][]): string =>
  keys.map(([key, symbol, name]) => {
    const unit = record[key].unit;
    const units: Record<string, MessageKey> = {
      degree: 'unitDegree', 'degree per 365-day Egyptian year': 'unitYearly',
      'Earth annual-radius units': 'unitEarthRadius', 'Mars principal-radius units': 'unitMarsRadius',
    };
    const unitKey = units[unit];
    if (!unitKey) throw new Error(`Untranslated historical unit: ${unit}`);
    return `<div><dt><span class="parameter-symbol">${symbol}</span> · ${translated(name)}</dt><dd><span class="sexagesimal">${record[key].sexagesimal}</span><span class="parameter-unit"> ${translated(unitKey)}</span></dd></div>`;
  }).join('');

const modelOptions = (): string => modelIds.map(id =>
  `<option value="${id}" data-i18n="${models[id].label}"></option>`).join('');
const modelPanel = (slot: 'a' | 'b'): string => `
  <section class="diagram-card model-panel" data-panel="${slot}" aria-labelledby="panel-${slot}-name">
    <div class="section-heading"><div><p class="section-kicker" id="panel-${slot}-name"></p>
      <h2 data-i18n="diagramTitle"></h2></div><span class="live-indicator" aria-hidden="true"></span></div>
    <div id="panel-${slot}-diagram" class="diagram-frame"></div>
    <p id="panel-${slot}-hint" class="diagram-hint"></p>
    <ul id="panel-${slot}-legend" class="legend"></ul>
    <dl class="comparison-readouts"><div><dt data-i18n="nativeTropical"></dt><dd id="panel-${slot}-tropical"></dd></div>
      <div class="sidereal-readout"><dt data-i18n="nativeSidereal"></dt><dd id="panel-${slot}-sidereal"></dd></div>
      <div class="precession-readout"><dt data-i18n="truePrecession"></dt><dd id="panel-${slot}-precession"></dd></div>
      <div class="apogee-readout"><dt data-i18n="marsApogee"></dt><dd id="panel-${slot}-apogee"></dd></div></dl>
  </section>`;

root.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="#top"><span class="orbit-mark" aria-hidden="true">◉</span>${translated('appName')}</a>
    <nav class="site-nav">
      <a href="#model">${translated('navModel')}</a><a href="#controls">${translated('navControls')}</a><a href="#sources">${translated('navSources')}</a>
    </nav>
    <div class="language-toggle" role="group" aria-label="Language">
      <button type="button" data-language="en">English</button><span aria-hidden="true">|</span><button type="button" data-language="mn">Монгол</button>
    </div>
  </header>
  <main id="top">
    <div class="mode-switch" role="group" data-i18n-aria="modeLabel">
      <span data-i18n="modeLabel"></span><button type="button" data-mode="single" data-i18n="singleMode"></button><button type="button" data-mode="compare" data-i18n="compareMode"></button>
    </div>
    <div id="single-selector" class="model-selectors"><label for="single-model" data-i18n="singleModelLabel"></label><select id="single-model">${modelOptions()}</select></div>
    <div id="single-view">
    <section class="intro" id="model">
      <div><p class="eyebrow">${translated('eyebrow')}</p><h1>${translated('modelTitle')}</h1><p class="subtitle">${translated('subtitle')}</p><p class="intro-copy">${translated('intro')}</p></div>
      <div class="intro-readout"><span class="status">${translated('status')}</span><p class="readout-label">${translated('longitude')}</p><output id="longitude" class="longitude-number"></output><p class="readout-hint">${translated('longitudeHint')}</p></div>
    </section>
    <div class="workspace">
      <section class="diagram-card" aria-labelledby="diagram-heading">
        <div class="section-heading"><div><p class="section-kicker">${translated('geometryKicker')}</p><h2 id="diagram-heading">${translated('diagramTitle')}</h2></div><span class="live-indicator" aria-hidden="true"></span></div>
        <div id="diagram" class="diagram-frame"></div>
        <p class="diagram-hint">${translated('diagramHint')}</p>
        <ul class="legend" aria-label="Diagram legend">
          ${legend('O', 'earth', 'earth-key')}${legend('D', 'deferentCenter', 'deferent-key')}${legend('Q', 'equant', 'equant-key')}${legend('C', 'epicycleCenter', 'center-key')}${legend('P', 'mars', 'mars-key')}
        </ul>
      </section>
      <aside class="side-stack">
        <section class="control-card" id="controls" aria-labelledby="controls-heading">
          <div class="section-heading"><div><p class="section-kicker">${translated('timeKicker')}</p><h2 id="controls-heading">${translated('timeTitle')}</h2></div></div>
          <div class="date-grid"><div><span class="small-label">${translated('egyptianDate')}</span><strong id="egyptian-date"></strong></div><div><span class="small-label">${translated('julianDate')}</span><strong id="julian-date"></strong></div></div>
          <p class="local-time">${translated('alexandriaTime')}: <span id="local-clock"></span></p>
          <button id="example" type="button" class="example-button" data-i18n-title="jumpHelp">↗ ${translated('example')}</button>
          <button id="single-today" type="button" class="example-button" data-i18n="today"></button>
          <p class="field-help">${translated('todayConversion')}</p>
          <div class="transport"><button id="back" type="button" data-i18n-title="back">−10<span class="transport-unit" data-i18n="dayAbbrev"></span></button><button id="play" type="button" class="play-button" data-i18n-title="playHelp"></button><button id="forward" type="button" data-i18n-title="forward">+10<span class="transport-unit" data-i18n="dayAbbrev"></span></button></div>
          <div class="field"><div class="field-heading">${label('dayCount', 'day-input')}<span class="field-unit" data-i18n="days"></span></div><div class="input-row"><input id="day-input" type="number" min="0" step="any" inputmode="decimal"><button id="set-day" type="button">${translated('setDay')}</button></div><p class="field-help">${translated('dayCountHint')}</p><p id="day-error" class="error" role="alert" hidden></p></div>
          <div class="field slider-field"><div class="field-heading">${label('speed', 'speed')}<output id="speed-value"></output></div><input id="speed" type="range" min="1" max="40" step="1" data-i18n-title="speedHelp"></div>
          <div class="field trail-field"><label class="switch-row" for="trail"><span>${translated('trail')}</span><input id="trail" type="checkbox" data-i18n-title="trailHelp"></label><div class="field-heading">${label('trailLength', 'trail-days')}<output id="trail-value"></output></div><input id="trail-days" type="range" min="30" max="720" step="10" data-i18n-title="trailLengthHelp"></div>
        </section>
        <section class="current-card"><p class="section-kicker">${translated('argumentsKicker')}</p><dl><div><dt>${translated('meanLongitude')}</dt><dd id="mean-longitude"></dd></div><div><dt>${translated('meanAnomaly')}</dt><dd id="mean-anomaly"></dd></div><div><dt>${translated('centreCorrection')}</dt><dd id="center-correction"></dd></div></dl></section>
      </aside>
    </div>
    <details class="info-card" id="sources"><summary><span><span class="section-kicker">${translated('sourceKicker')}</span><strong>${translated('infoTitle')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
      <div class="info-content"><p class="info-lead">${translated('infoIntro')}</p><div class="info-columns"><div><h3>${translated('parameterTitle')}</h3><dl class="parameters">${parameterKeys.map(([name, key]) => `<div><dt>${translated(key)}</dt><dd><span class="sexagesimal">${name === 'apogee_motion' ? translated('apogeeOriginal') : modelRecord.parameters[name].sexagesimal}</span>${name === 'apogee_motion' ? '' : `<span class="parameter-unit" data-parameter-unit="${name}"></span>`}</dd></div>`).join('')}</dl></div><div><h3>${translated('sourceTitle')}</h3><p>${translated('deferentInfo')}</p><p>${translated('equantInfo')}</p><p>${translated('epicycleInfo')}</p><p>${translated('sourceText')}</p><p class="scientific-note">${translated('geometryNote')}</p><p class="scientific-note">${translated('validationNote')}</p><div class="meta-row"><strong>${translated('epoch')}</strong><span>${modelRecord.epoch.astronomical_julian_date}</span></div><div class="meta-row"><strong>${translated('frame')}</strong><span>${translated('frameValue')}</span></div></div></div></div>
    </details>
    </div>
    <div id="compare-view" hidden>
      <section class="comparison-intro" id="compare-model">
        <p class="eyebrow">${translated('eyebrow')}</p><h1>${translated('comparisonTitle')}</h1>
        <p class="subtitle">${translated('comparisonSubtitle')}</p><p class="intro-copy">${translated('comparisonIntro')}</p>
      </section>
      <div id="compare-selectors" class="model-selectors">
        <label for="model-a" data-i18n="modelALabel"></label><select id="model-a">${modelOptions()}</select>
        <label for="model-b" data-i18n="modelBLabel"></label><select id="model-b">${modelOptions()}</select>
      </div>
      <section class="control-card comparison-controls" id="compare-controls">
        <div class="section-heading"><div><p class="section-kicker">${translated('timeKicker')}</p><h2>${translated('comparisonTime')}</h2></div></div>
        <div class="comparison-date-row"><div class="field"><label for="compare-date" data-i18n="frauenburgDate"></label>
          <div class="input-row"><input id="compare-date" type="text" inputmode="text" spellcheck="false" autocomplete="off" placeholder="1512-01-01T06:00"><button id="compare-set-date" type="button">${translated('setComparisonDate')}</button><button id="today" type="button" data-i18n="today"></button></div>
          <p class="field-help">${translated('frauenburgHint')}</p><p id="compare-error" class="error" role="alert" hidden></p>
          <button id="use-exploratory" type="button" class="example-button" data-i18n="useExploratory" hidden></button></div>
          <div class="comparison-time-notes"><p>${translated('comparisonDomain')}</p><p>${translated('meridianNote')}</p></div></div>
        <div class="policy-row"><label for="apsis-policy" data-i18n="apsisPolicyLabel"></label><select id="apsis-policy">
          <option value="sn-local-uniform-1473-1523" data-i18n="sourceLimitedPolicy"></option>
          <option value="sn-uniform-exploratory" data-i18n="exploratoryPolicy"></option></select>
          <p id="exploratory-warning" class="scientific-note" data-i18n="exploratoryWarning" hidden></p></div>
        <div class="compare-control-grid"><div class="compare-transport"><div class="example-pair"><button type="button" id="example-1512" class="example-button">↗ ${translated('comparisonExample1512')}</button><button type="button" id="example-1473" class="example-button">↗ ${translated('comparisonExample1473')}</button></div>
          <p class="field-help">${translated('example1473Note')}</p>
          <div class="transport"><button id="compare-back" type="button" data-i18n-title="back">−10<span class="transport-unit" data-i18n="dayAbbrev"></span></button><button id="compare-play" type="button" class="play-button" data-i18n-title="playHelp"></button><button id="compare-forward" type="button" data-i18n-title="forward">+10<span class="transport-unit" data-i18n="dayAbbrev"></span></button></div></div>
          <div class="compare-sliders"><div class="field slider-field"><div class="field-heading">${label('speed', 'compare-speed')}<output id="compare-speed-value"></output></div><input id="compare-speed" type="range" min="1" max="40" step="1" data-i18n-title="speedHelp"></div>
          <label class="switch-row" for="compare-trail"><span>${translated('trail')}</span><input id="compare-trail" type="checkbox" data-i18n-title="trailHelp"></label></div></div>
      </section>
      <div class="mobile-playback"><button id="mobile-back" type="button" data-i18n-title="back">−10</button><button id="mobile-play" type="button" class="play-button" data-i18n-title="playHelp"></button><button id="mobile-forward" type="button" data-i18n-title="forward">+10</button><span id="mobile-date"></span></div>
      <div class="mobile-panel-tabs"><button type="button" data-mobile-panel="a" data-i18n="modelALabel"></button><button type="button" data-mobile-panel="b" data-i18n="modelBLabel"></button></div>
      <div class="mobile-longitudes"><span id="mobile-a-longitude"></span><span id="mobile-b-longitude"></span></div>
      <div class="comparison-panels">
        ${modelPanel('a')}${modelPanel('b')}
      </div>
      <section class="plot-card"><div class="section-heading"><div><p class="section-kicker">${translated('longitude')}</p><h2>${translated('plotTitle')}</h2></div></div>
        <label class="alignment-switch" for="frame-alignment"><input id="frame-alignment" type="checkbox"><span>${translated('nominalAlignment')}</span></label>
        <p class="field-help">${translated('alignmentNote')}</p>
        <p class="comparison-residual"><span data-i18n="residualLabel"></span>: <output id="compare-residual"></output></p>
        <div class="plot-toolbar"><label for="plot-window" data-i18n="plotWindow"></label><select id="plot-window">
          <option value="30" data-i18n="plot30"></option><option value="90" data-i18n="plot90"></option>
          <option value="180" data-i18n="plot180"></option><option value="365" data-i18n="plot365" selected></option>
          <option value="730" data-i18n="plot730"></option><option value="3650" data-i18n="plotDecade"></option>
          <option value="18250" data-i18n="plotFiftyYears"></option><option value="custom" data-i18n="plotCustom"></option></select>
          <button id="plot-pan-left" type="button" data-i18n="plotPanLeft"></button><button id="plot-zoom-in" type="button" data-i18n="plotZoomIn"></button>
          <button id="plot-zoom-out" type="button" data-i18n="plotZoomOut"></button><button id="plot-pan-right" type="button" data-i18n="plotPanRight"></button>
          <label for="plot-mode" data-i18n="plotDisplay"></label><select id="plot-mode"><option value="unwrapped" data-i18n="plotUnwrapped"></option><option value="wrapped" data-i18n="plotWrapped"></option></select></div>
        <div class="plot-custom"><label for="plot-start" data-i18n="plotStart"></label><input id="plot-start" type="text"><label for="plot-end" data-i18n="plotEnd"></label><input id="plot-end" type="text"><button id="plot-set-range" type="button" data-i18n="plotApply"></button></div>
        <p id="plot-error" class="error" role="alert" hidden></p><p id="plot-marker-status" class="field-help"></p>
        <div class="plot-legend"><span class="plot-legend-ptolemy" id="plot-legend-a"></span><span class="plot-legend-copernicus" id="plot-legend-b"></span></div>
        <div id="comparison-plot" class="plot-frame"></div><p class="diagram-hint">${translated('plotHint')}</p>
      </section>
      <details class="info-card" id="compare-sources"><summary><span><span class="section-kicker">DE REVOLUTIONIBUS</span><strong>${translated('copernicusSources')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
        <div class="info-content"><p class="info-lead">${translated('copernicusSourceIntro')}</p><p>${translated('copernicusSourceLine')}</p><p id="copernicus-limit" class="scientific-note">${translated('copernicusLimit')}</p><p class="scientific-note">${translated('copernicusFrameLimit')}</p>
          <div class="info-columns"><div><h3>${translated('earthParameters')}</h3><dl class="parameters">${sourceParameters(earthRecord.parameters, earthParameterKeys)}</dl></div>
          <div><h3>${translated('marsParameters')}</h3><dl class="parameters">${sourceParameters(marsRecord.parameters, marsParameterKeys)}
          <div><dt>nB · ${translated('marsApogee')}</dt><dd><span class="sexagesimal">${marsRecord.optional_reconstructions['sn-local-uniform-1473-1523'].annual_motion.sexagesimal}</span><span class="parameter-unit"> ${translated('unitYearly')}</span></dd></div></dl></div></div></div>
      </details>
      <details class="info-card" id="compare-ptolemy-sources"><summary><span><span class="section-kicker">ALMAGEST</span><strong>${translated('infoTitle')}</strong></span><span class="summary-plus" aria-hidden="true">+</span></summary>
        <div class="info-content"><p>${translated('sourceText')}</p><p class="scientific-note">${translated('validationNote')}</p>
          <dl class="parameters">${parameterKeys.map(([name, key]) => `<div><dt>${translated(key)}</dt><dd class="sexagesimal">${modelRecord.parameters[name].sexagesimal}</dd></div>`).join('')}</dl></div>
      </details>
    </div>
  </main><footer>${translated('appName')} <span>·</span> <span id="footer-model" data-i18n="footer"></span></footer>`;

function element<T extends Element = HTMLElement>(selector: string): T {
  const found = root!.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

let savedLanguage: string | null = null;
try { savedLanguage = localStorage.getItem('epicycle-language'); } catch { /* Storage can be disabled. */ }
let state: AppState = initialState(savedLanguage);
let lastFrame = 0;
let plotCache: SelectedPlotSamples | null = null;
let plotCacheKey = '';
let pendingDate: number | null = null;
let pendingSelection: Action | null = null;
let dateError: MessageKey | null = null;
let plotError: MessageKey | null = null;

const historicalView = (): boolean => state.mode === 'compare' || state.singleModel === 'copernicus';
const visibleModels = (): [ModelId, ModelId] => state.mode === 'compare'
  ? [state.modelA, state.modelB] : [state.singleModel, state.singleModel];

function showDateFeedback(): void {
  const error = element<HTMLParagraphElement>('#compare-error');
  error.hidden = dateError === null;
  if (dateError) error.textContent = message(state.language, dateError);
  element<HTMLButtonElement>('#use-exploratory').hidden = pendingDate === null ||
    dateError !== 'needsExploratory';
}

function clearDateFeedback(): void {
  pendingDate = null;
  pendingSelection = null;
  dateError = null;
  showDateFeedback();
}

function updateMode(): void {
  element('#single-view').hidden = historicalView();
  element('#compare-view').hidden = !historicalView();
  element('#single-selector').hidden = state.mode !== 'single';
  element('#compare-selectors').hidden = state.mode !== 'compare';
  element('.plot-card').hidden = state.mode !== 'compare';
  element<HTMLElement>('.comparison-panels').classList.toggle('one-panel', state.mode === 'single');
  element<HTMLElement>('.mobile-panel-tabs').hidden = state.mode === 'single';
  element<HTMLElement>('.mobile-longitudes').hidden = state.mode === 'single';
  root!.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
  const links = root!.querySelectorAll<HTMLAnchorElement>('.site-nav a');
  const historicalSource = usesCopernicus(selectedModels(state)) ? '#compare-sources' : '#compare-ptolemy-sources';
  const targets = historicalView() ? ['#compare-model', '#compare-controls', historicalSource] : ['#model', '#controls', '#sources'];
  links.forEach((link, index) => { link.href = targets[index]; });
}

function dispatch(action: Action): void {
  const previous = state;
  state = reduce(state, action);
  if (state === previous) {
    if (action.type === 'apsisPolicy' || action.type === 'mode' || action.type === 'singleModel' ||
        action.type === 'modelA' || action.type === 'modelB') {
      pendingDate = action.type === 'apsisPolicy' ? null : state.compareUt1;
      pendingSelection = action.type === 'apsisPolicy' ? null : action;
      dateError = action.type === 'apsisPolicy' ? 'sourcePolicyRequiresInRange' : 'needsExploratory';
      showDateFeedback();
      updateControls();
    }
    return;
  }
  if (action.type === 'setDay' || action.type === 'step' || action.type === 'example') {
    element<HTMLParagraphElement>('#day-error').hidden = true;
  }
  if (action.type === 'compareDate' || action.type === 'compareExample' ||
      action.type === 'step' || action.type === 'mode' || action.type === 'apsisPolicy' ||
      action.type === 'singleModel' || action.type === 'modelA' || action.type === 'modelB' ||
      action.type === 'tick' || action.type === 'togglePlay') clearDateFeedback();
  if (action.type === 'togglePlay' && state.playing && historicalView()) {
    element<HTMLInputElement>('#compare-date').value = formatFrauenburgInput(state.compareUt1);
  }
  if (action.type === 'apsisPolicy' || action.type === 'singleModel' ||
      action.type === 'modelA' || action.type === 'modelB') {
    plotError = null;
    element('#plot-error').hidden = true;
  }
  if (state.mode !== previous.mode || state.singleModel !== previous.singleModel ||
      state.modelA !== previous.modelA || state.modelB !== previous.modelB) updateMode();
  if (state.language !== previous.language || state.mode !== previous.mode ||
      state.singleModel !== previous.singleModel) applyLanguage(state.language);
  if (state.language !== previous.language || state.mode !== previous.mode ||
      state.singleModel !== previous.singleModel || state.modelA !== previous.modelA ||
      state.modelB !== previous.modelB || state.copernicusPolicy !== previous.copernicusPolicy ||
      state.mobilePanel !== previous.mobilePanel) updateComparisonStatic();
  if (action.type !== 'tick' || state.playing !== previous.playing) updateControls();
  if (state.day !== previous.day || state.showTrail !== previous.showTrail ||
      state.trailDays !== previous.trailDays || state.language !== previous.language ||
      state.compareUt1 !== previous.compareUt1 || state.mode !== previous.mode ||
      state.frameAligned !== previous.frameAligned || state.plotStartUt1 !== previous.plotStartUt1 ||
      state.plotEndUt1 !== previous.plotEndUt1 || state.plotMode !== previous.plotMode ||
      state.singleModel !== previous.singleModel || state.modelA !== previous.modelA ||
      state.modelB !== previous.modelB || state.copernicusPolicy !== previous.copernicusPolicy ||
      state.mobilePanel !== previous.mobilePanel) {
    updateTimeAndGeometry();
  }
}

function formatAngle(angle: number): string {
  return `${angle.toFixed(3)}°`;
}

function formatCivilTime(fraction: number): string {
  const minutes = Math.floor((fraction * 1440 + 1e-6) % 1440);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function applyLanguage(language: Language): void {
  document.documentElement.lang = language;
  const titleKey: MessageKey = state.mode === 'compare' ? 'comparisonTitle'
    : state.singleModel === 'copernicus' ? 'singleCopernicusTitle' : 'modelTitle';
  document.title = `${message(language, titleKey)} · ${message(language, 'appName')}`;
  root!.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => {
    node.textContent = message(language, node.dataset.i18n as MessageKey);
  });
  if (state.mode === 'single' && state.singleModel === 'copernicus') {
    element('#compare-model h1').textContent = message(language, 'singleCopernicusTitle');
    element('#compare-model .subtitle').textContent = message(language, 'singleCopernicusSubtitle');
    element('#compare-model .intro-copy').textContent = message(language, 'singleCopernicusIntro');
  }
  element('#footer-model').textContent = message(language, state.mode === 'compare' ? 'compareFooter'
    : state.singleModel === 'copernicus' ? 'copernicusPanel' : 'footer');
  root!.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(node => {
    node.title = message(language, node.dataset.i18nTitle as MessageKey);
  });
  root!.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach(node => {
    node.ariaLabel = message(language, node.dataset.i18nAria as MessageKey);
  });
  root!.querySelectorAll<HTMLElement>('[data-language]').forEach(node => {
    const selected = node.dataset.language === language;
    node.setAttribute('aria-pressed', String(selected));
  });
  element<HTMLButtonElement>('#back').ariaLabel = message(language, 'back');
  element<HTMLButtonElement>('#forward').ariaLabel = message(language, 'forward');
  element<HTMLButtonElement>('#compare-back').ariaLabel = message(language, 'back');
  element<HTMLButtonElement>('#compare-forward').ariaLabel = message(language, 'forward');
  element<HTMLElement>('.site-nav').ariaLabel = message(language, 'navModel');
  element<HTMLElement>('.language-toggle').ariaLabel = message(language, 'language');
  element<HTMLElement>('.legend').ariaLabel = message(language, 'diagramTitle');
  root!.querySelectorAll<HTMLElement>('[data-parameter-unit]').forEach(node => {
    const name = node.dataset.parameterUnit as keyof typeof modelRecord.parameters;
    const unit = modelRecord.parameters[name].unit;
    const key: MessageKey = unit === 'deferent units' ? 'unitDeferent' : unit === 'degree' ? 'unitDegree' : 'unitDaily';
    node.textContent = ` ${message(language, key)}`;
  });
  showDateFeedback();
  if (plotError) element('#plot-error').textContent = message(language, plotError);
}

function plotSvg(samples: SelectedPlotSamples): string {
  const low = samples.minLongitude;
  const high = samples.maxLongitude;
  const padding = samples.mode === 'wrapped' ? 0 : Math.max(5, (high - low) * 0.12);
  const min = low - padding;
  const max = high + padding;
  const x = (index: number): number => 70 + index * 690 / samples.count;
  const y = (longitude: number): number => 350 - (longitude - min) * 300 / (max - min);
  const path = (values: readonly number[]): string => {
    // A wrapped 359°→0° jump is a discontinuity, not a 359° sweep.
    let result = '';
    values.forEach((value, index) => {
      const newSegment = index === 0 || (samples.mode === 'wrapped' &&
        Math.abs(value - values[index - 1]) > 180);
      result += `${newSegment ? 'M' : 'L'}${x(index).toFixed(1)},${y(value).toFixed(1)} `;
    });
    return result;
  };
  const horizontal = Array.from({ length: 5 }, (_, index) => {
    const value = min + (max - min) * (4 - index) / 4;
    const yy = 50 + index * 75;
    return `<line class="plot-grid" x1="70" x2="760" y1="${yy}" y2="${yy}"/><text class="plot-label" x="60" y="${yy + 4}" text-anchor="end">${value.toFixed(0)}°</text>`;
  }).join('');
  const dateLabel = (ut1: number): string => formatFrauenburgInput(ut1).split('T')[0];
  const axis = samples.mode === 'wrapped' ? 'plotYWrapped' : 'plotYUnwrapped';
  return `<svg viewBox="0 0 800 430" role="img" aria-label="${message(state.language, 'plotTitle')}">
    ${horizontal}<line class="plot-axis" x1="70" x2="760" y1="350" y2="350"/>
    <path class="plot-ptolemy" d="${path(samples.a)}"/><path class="plot-copernicus" d="${path(samples.b)}"/>
    <line id="plot-marker" class="plot-marker" y1="50" y2="350"/>
    <text id="plot-marker-label" class="plot-label" y="39"></text>
    <text class="plot-label" x="70" y="376" text-anchor="start">${dateLabel(samples.startUt1)}</text>
    <text class="plot-label" x="760" y="376" text-anchor="end">${dateLabel(samples.endUt1)}</text>
    <text class="plot-axis-title" x="415" y="415" text-anchor="middle">${message(state.language, 'plotX')}</text>
    <text class="plot-axis-title" x="18" y="200" text-anchor="middle" transform="rotate(-90 18 200)">${message(state.language, axis)}</text>
  </svg>`;
}

function updatePlot(): void {
  if (state.mode !== 'compare') return;
  const container = element('#comparison-plot');
  if (!dateAllowed(state.plotStartUt1, selectedModels(state), state.copernicusPolicy) ||
      !dateAllowed(state.plotEndUt1, selectedModels(state), state.copernicusPolicy)) {
    container.textContent = message(state.language, 'plotOutsidePolicy');
    plotCache = null;
    return;
  }
  if (!state.frameAligned) {
    const inactive = message(state.language, 'plotInactive');
    if (container.textContent !== inactive) container.textContent = inactive;
    plotCache = null;
    return;
  }
  const cacheKey = selectedPlotCacheKey(state.plotStartUt1, state.plotEndUt1, state.modelA,
    state.modelB, state.copernicusPolicy, state.plotMode, state.language);
  if (!plotCache || cacheKey !== plotCacheKey) {
    plotCache = sampleSelectedPlot(state.plotStartUt1, state.plotEndUt1,
      state.modelA, state.modelB, state.copernicusPolicy, state.plotMode);
    plotCacheKey = cacheKey;
    container.innerHTML = plotSvg(plotCache);
  }
  const within = state.compareUt1 >= plotCache.startUt1 && state.compareUt1 <= plotCache.endUt1;
  const status = element('#plot-marker-status');
  const statusText = within ? '' : message(state.language, 'plotMarkerOutside');
  if (status.textContent !== statusText) status.textContent = statusText;
  const marker = element<SVGLineElement>('#plot-marker');
  const markerLabel = element<SVGTextElement>('#plot-marker-label');
  const display = within ? '' : 'none';
  if (marker.style.display !== display) marker.style.display = display;
  if (markerLabel.style.display !== display) markerLabel.style.display = display;
  if (!within) return;
  const markerX = 70 + 690 * (state.compareUt1 - plotCache.startUt1) /
    (plotCache.endUt1 - plotCache.startUt1);
  marker.setAttribute('x1', markerX.toFixed(1));
  marker.setAttribute('x2', markerX.toFixed(1));
  const currentDate = formatFrauenburgInput(state.compareUt1).split('T')[0];
  if (markerLabel.textContent !== currentDate) markerLabel.textContent = currentDate;
  markerLabel.setAttribute('x', (markerX > 640 ? markerX - 8 : markerX + 8).toFixed(1));
  markerLabel.setAttribute('text-anchor', markerX > 640 ? 'end' : 'start');
}

function updatePanelStatic(slot: 'a' | 'b', model: ModelId): void {
  element(`#panel-${slot}-name`).textContent = message(state.language, models[model].label);
  element(`#panel-${slot}-hint`).textContent = message(state.language,
    model === 'ptolemy' ? 'ptolemyPanelHint' : 'copernicusPanelHint');
  const symbols: readonly [string, MessageKey, string][] = model === 'ptolemy'
    ? [['O', 'earth', 'earth-key'], ['D', 'deferentCenter', 'deferent-key'],
      ['Q', 'equant', 'equant-key'], ['C', 'epicycleCenter', 'center-key'],
      ['P', 'mars', 'mars-key']]
    : [['S', 'trueSun', 'sun-key'], ['G', 'meanSun', 'mean-sun-key'],
      ['E', 'earth', 'earth-key'], ['P', 'mars', 'mars-key']];
  element(`#panel-${slot}-legend`).innerHTML = symbols.map(([code, key, style]) =>
    `<li><span class="legend-symbol ${style}" aria-hidden="true">${code}</span>${message(state.language, key)}</li>`).join('');
  const card = element<HTMLElement>(`[data-panel="${slot}"]`);
  const apogeeLabel = card.querySelector<HTMLElement>('.apogee-readout dt');
  if (apogeeLabel) apogeeLabel.textContent = message(state.language,
    state.copernicusPolicy === exploratoryApsisPolicy ? 'marsApogeeExploratory' : 'marsApogee');
  card.querySelectorAll<HTMLElement>('.sidereal-readout,.precession-readout,.apogee-readout')
    .forEach(row => { row.hidden = model !== 'copernicus'; });
}

function updateComparisonStatic(): void {
  const [modelA, modelB] = visibleModels();
  updatePanelStatic('a', modelA);
  updatePanelStatic('b', modelB);
  element('#plot-legend-a').textContent = message(state.language, models[modelA].label);
  element('#plot-legend-b').textContent = message(state.language, models[modelB].label);
  const hasCopernicus = usesCopernicus(selectedModels(state));
  element('#exploratory-warning').hidden = state.copernicusPolicy !== exploratoryApsisPolicy ||
    !hasCopernicus;
  element('.policy-row').hidden = !hasCopernicus;
  element('#compare-sources').hidden = !hasCopernicus;
  element('#compare-ptolemy-sources').hidden = !selectedModels(state).includes('ptolemy');
  element('#copernicus-limit').textContent = message(state.language,
    state.copernicusPolicy === exploratoryApsisPolicy ? 'copernicusExploratoryLimit' : 'copernicusLimit');
  root!.querySelectorAll<HTMLButtonElement>('[data-mobile-panel]').forEach(button =>
    button.setAttribute('aria-pressed', String(button.dataset.mobilePanel === state.mobilePanel)));
  element<HTMLElement>('.comparison-panels').dataset.activePanel = state.mobilePanel;
}

function updatePanel(slot: 'a' | 'b', evaluation: ModelEvaluation): void {
  element(`#panel-${slot}-tropical`).textContent = formatAngle(evaluation.tropical);
  element(`#mobile-${slot}-longitude`).textContent =
    `${message(state.language, slot === 'a' ? 'modelALabel' : 'modelBLabel')}: ${formatAngle(evaluation.tropical)}`;
  if (evaluation.model === 'ptolemy') {
    const trail = state.showTrail ? trailPoints(evaluation.days, state.trailDays, 48) : [];
    element(`#panel-${slot}-diagram`).innerHTML = renderDiagram(evaluation.result, trail, state.language);
  } else {
    const result = evaluation.result;
    element(`#panel-${slot}-sidereal`).textContent = formatAngle(result.geocentricSiderealLongitude);
    element(`#panel-${slot}-precession`).textContent = formatAngle(result.truePrecession);
    element(`#panel-${slot}-apogee`).textContent = formatAngle(result.marsApogee);
    const trail = state.showTrail ? copernicusTrail(evaluation.days, state.trailDays, 48,
      state.copernicusPolicy) : [];
    element(`#panel-${slot}-diagram`).innerHTML = renderCopernicusDiagram(result, state.language, trail);
  }
}

function updateComparison(): void {
  const [modelA, modelB] = visibleModels();
  const first = evaluateSelectedModel(modelA, state.compareUt1, state.copernicusPolicy);
  updatePanel('a', first);
  if (state.mode === 'compare') {
    const second = evaluateSelectedModel(modelB, state.compareUt1, state.copernicusPolicy);
    updatePanel('b', second);
    const difference = selectedDifference(first, second, state.frameAligned);
    element('#compare-residual').textContent = difference === null
      ? message(state.language, 'unavailableResidual')
      : `${difference >= 0 ? '+' : ''}${formatAngle(difference)}`;
  }
  const currentMobileDate = formatFrauenburgInput(state.compareUt1).split('T')[0];
  if (element('#mobile-date').textContent !== currentMobileDate) {
    element('#mobile-date').textContent = currentMobileDate;
  }
  const dateInput = element<HTMLInputElement>('#compare-date');
  const formattedDate = formatFrauenburgInput(state.compareUt1);
  if (document.activeElement !== dateInput && pendingDate === null && dateInput.value !== formattedDate) {
    dateInput.value = formattedDate;
  }
  updatePlot();
}

function updateDates(): void {
  const egyptian = daysToEgyptian(state.day);
  const julian = daysToJulian(state.day);
  const m = (key: MessageKey) => message(state.language, key);
  element('#egyptian-date').textContent = `${egyptian.year} ${m('year')} · ${egyptian.month} ${m('month')} · ${egyptian.day} ${m('day')}`;
  element('#julian-date').textContent = `${yearLabel(julian.year, m('bce'), m('ce'))} · ${String(julian.month).padStart(2, '0')} · ${String(julian.day).padStart(2, '0')}`;
  element('#local-clock').textContent = formatCivilTime(julian.fraction);
}

function updateReadouts(result: MarsResult): void {
  element('#longitude').textContent = formatAngle(result.longitude);
  element('#mean-longitude').textContent = formatAngle(result.meanLongitude);
  element('#mean-anomaly').textContent = formatAngle(result.meanAnomaly);
  element('#center-correction').textContent = formatAngle(result.equationOfCenter);
}

function updateTimeAndGeometry(): void {
  if (historicalView()) { updateComparison(); return; }
  updateDates();
  const result = evaluateDays(state.day);
  updateReadouts(result);
  element('#diagram').innerHTML = renderDiagram(result, state.showTrail ? trailPoints(state.day, state.trailDays) : [], state.language);
  if (document.activeElement !== element('#day-input')) element<HTMLInputElement>('#day-input').value = state.day.toFixed(2);
}

function updateControls(): void {
  updatePlayButton(element<HTMLButtonElement>('#play'), state.playing, state.language);
  updatePlayButton(element<HTMLButtonElement>('#compare-play'), state.playing, state.language);
  updatePlayButton(element<HTMLButtonElement>('#mobile-play'), state.playing, state.language);
  const playbackEnd = state.copernicusPolicy === apsisPolicy && usesCopernicus(selectedModels(state))
    ? comparisonUt1Domain.end : computationalUt1Domain.end;
  const atEnd = historicalView() && state.compareUt1 >= playbackEnd && !state.playing;
  element<HTMLButtonElement>('#compare-play').disabled = atEnd;
  element<HTMLButtonElement>('#mobile-play').disabled = atEnd;
  const speed = element<HTMLInputElement>('#speed');
  if (speed.value !== String(state.speed)) speed.value = String(state.speed);
  element('#speed-value').textContent = `${state.speed} ${message(state.language, 'daysPerSecond')}`;
  const trail = element<HTMLInputElement>('#trail');
  if (trail.checked !== state.showTrail) trail.checked = state.showTrail;
  const trailDays = element<HTMLInputElement>('#trail-days');
  if (trailDays.value !== String(state.trailDays)) trailDays.value = String(state.trailDays);
  if (trailDays.disabled === state.showTrail) trailDays.disabled = !state.showTrail;
  element('#trail-value').textContent = `${state.trailDays} ${message(state.language, 'days')}`;
  const compareSpeed = element<HTMLInputElement>('#compare-speed');
  if (compareSpeed.value !== String(state.speed)) compareSpeed.value = String(state.speed);
  element('#compare-speed-value').textContent = `${state.speed} ${message(state.language, 'daysPerSecond')}`;
  const compareTrail = element<HTMLInputElement>('#compare-trail');
  if (compareTrail.checked !== state.showTrail) compareTrail.checked = state.showTrail;
  const alignment = element<HTMLInputElement>('#frame-alignment');
  if (alignment.checked !== state.frameAligned) alignment.checked = state.frameAligned;
  for (const [selector, model] of [['#single-model', state.singleModel],
    ['#model-a', state.modelA], ['#model-b', state.modelB]] as const) {
    const select = element<HTMLSelectElement>(selector);
    if (select.value !== model) select.value = model;
  }
  const policy = element<HTMLSelectElement>('#apsis-policy');
  if (policy.value !== state.copernicusPolicy) policy.value = state.copernicusPolicy;
  element<HTMLSelectElement>('#plot-mode').value = state.plotMode;
  const start = element<HTMLInputElement>('#plot-start');
  const end = element<HTMLInputElement>('#plot-end');
  if (document.activeElement !== start) start.value = formatFrauenburgInput(state.plotStartUt1);
  if (document.activeElement !== end) end.value = formatFrauenburgInput(state.plotEndUt1);
}

element('#back').addEventListener('click', () => dispatch({ type: 'step', days: -10 }));
element('#forward').addEventListener('click', () => dispatch({ type: 'step', days: 10 }));
element('#play').addEventListener('click', () => dispatch({ type: 'togglePlay' }));
element('#example').addEventListener('click', () => dispatch({ type: 'example' }));
element('#single-today').addEventListener('click', () =>
  dispatch({ type: 'setDay', day: modelDaysAtUt1(utcMillisToAssumedUt1(Date.now())).ptolemy }));
element('#speed').addEventListener('input', event => dispatch({ type: 'speed', speed: Number((event.target as HTMLInputElement).value) }));
element('#trail').addEventListener('change', event => dispatch({ type: 'trail', show: (event.target as HTMLInputElement).checked }));
element('#trail-days').addEventListener('input', event => dispatch({ type: 'trailDays', days: Number((event.target as HTMLInputElement).value) }));
root.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.addEventListener('click', () =>
  dispatch({ type: 'mode', mode: button.dataset.mode as 'single' | 'compare' })));
element('#compare-back').addEventListener('click', () => dispatch({ type: 'step', days: -10 }));
element('#compare-forward').addEventListener('click', () => dispatch({ type: 'step', days: 10 }));
element('#compare-play').addEventListener('click', () => dispatch({ type: 'togglePlay' }));
element('#mobile-play').addEventListener('click', () => dispatch({ type: 'togglePlay' }));
element('#mobile-back').addEventListener('click', () => dispatch({ type: 'step', days: -10 }));
element('#mobile-forward').addEventListener('click', () => dispatch({ type: 'step', days: 10 }));
element('#example-1512').addEventListener('click', () => dispatch({ type: 'compareExample', which: '1512' }));
element('#example-1473').addEventListener('click', () => dispatch({ type: 'compareExample', which: '1473' }));
element('#compare-speed').addEventListener('input', event => dispatch({ type: 'speed', speed: Number((event.target as HTMLInputElement).value) }));
element('#compare-trail').addEventListener('change', event => dispatch({ type: 'trail', show: (event.target as HTMLInputElement).checked }));
element('#frame-alignment').addEventListener('change', event => dispatch({ type: 'frameAlignment', active: (event.target as HTMLInputElement).checked }));
element('#single-model').addEventListener('change', event =>
  dispatch({ type: 'singleModel', model: (event.target as HTMLSelectElement).value as ModelId }));
element('#model-a').addEventListener('change', event =>
  dispatch({ type: 'modelA', model: (event.target as HTMLSelectElement).value as ModelId }));
element('#model-b').addEventListener('change', event =>
  dispatch({ type: 'modelB', model: (event.target as HTMLSelectElement).value as ModelId }));
element('#apsis-policy').addEventListener('change', event =>
  dispatch({ type: 'apsisPolicy', policy: (event.target as HTMLSelectElement).value as AppState['copernicusPolicy'] }));
root.querySelectorAll<HTMLButtonElement>('[data-mobile-panel]').forEach(button =>
  button.addEventListener('click', () => dispatch({ type: 'mobilePanel', panel: button.dataset.mobilePanel as 'a' | 'b' })));
element('#plot-mode').addEventListener('change', event =>
  dispatch({ type: 'plotMode', mode: (event.target as HTMLSelectElement).value as AppState['plotMode'] }));
root.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(button => button.addEventListener('click', () => {
  const language = button.dataset.language as Language;
  dispatch({ type: 'language', language });
  try { localStorage.setItem('epicycle-language', language); } catch { /* Storage can be disabled. */ }
}));

function submitDay(): void {
  const input = element<HTMLInputElement>('#day-input');
  const day = Number(input.value);
  const error = element<HTMLParagraphElement>('#day-error');
  if (input.value.trim() === '' || !Number.isFinite(day) || day < 0) {
    error.textContent = message(state.language, 'invalidDay');
    error.hidden = false;
    return;
  }
  error.hidden = true;
  dispatch({ type: 'setDay', day });
  input.blur();
}
element('#set-day').addEventListener('click', submitDay);
element('#day-input').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') submitDay(); });
function submitComparisonDate(): void {
  const input = element<HTMLInputElement>('#compare-date');
  let requested: number;
  try {
    requested = parseFrauenburgInput(input.value.trim());
  } catch {
    pendingDate = null;
    dateError = 'invalidComparisonDate';
    showDateFeedback();
    return;
  }
  if (requested < computationalUt1Domain.start || requested > computationalUt1Domain.end) {
    pendingDate = null;
    dateError = 'computationalDateLimit';
    showDateFeedback();
    return;
  }
  if (!dateAllowed(requested, selectedModels(state), state.copernicusPolicy)) {
    pendingDate = requested;
    dateError = 'needsExploratory';
    showDateFeedback();
    return;
  }
  clearDateFeedback();
  dispatch({ type: 'compareDate', ut1: requested });
  input.blur();
}

element('#compare-set-date').addEventListener('click', submitComparisonDate);
element('#compare-date').addEventListener('keydown', event => {
  if ((event as KeyboardEvent).key === 'Enter') submitComparisonDate();
});
element('#compare-date').addEventListener('input', clearDateFeedback);
element('#compare-date').addEventListener('focus', () => dispatch({ type: 'pause' }));
element('#use-exploratory').addEventListener('click', () => {
  const requested = pendingDate;
  const selection = pendingSelection;
  dispatch({ type: 'apsisPolicy', policy: exploratoryApsisPolicy });
  if (selection) dispatch(selection);
  if (requested !== null) dispatch({ type: 'compareDate', ut1: requested });
});
element('#today').addEventListener('click', () => {
  // Current Gregorian/UTC civil instant → astronomical JD (UTC≈UT1) →
  // proleptic Julian Frauenburg local mean date. Historical inputs never use Date.
  const requested = utcMillisToAssumedUt1(Date.now());
  element<HTMLInputElement>('#compare-date').value = formatFrauenburgInput(requested);
  submitComparisonDate();
});

function setPlotRange(start: number, end: number): void {
  plotError = null;
  if (end <= start || end - start > 365 * 50 ||
      start < computationalUt1Domain.start || end > computationalUt1Domain.end) {
    plotError = 'invalidPlotRange';
  } else if (!dateAllowed(start, selectedModels(state), state.copernicusPolicy) ||
      !dateAllowed(end, selectedModels(state), state.copernicusPolicy)) {
    plotError = 'plotOutsidePolicy';
  }
  const error = element<HTMLParagraphElement>('#plot-error');
  error.hidden = plotError === null;
  if (plotError) { error.textContent = message(state.language, plotError); return; }
  dispatch({ type: 'plotRange', start, end });
  element<HTMLSelectElement>('#plot-window').value = 'custom';
}

element('#plot-window').addEventListener('change', event => {
  const days = Number((event.target as HTMLSelectElement).value);
  if (Number.isFinite(days) && days > 0) {
    setPlotRange(state.compareUt1 - days / 2, state.compareUt1 + days / 2);
    if (!plotError) element<HTMLSelectElement>('#plot-window').value = String(days);
  }
});
element('#plot-set-range').addEventListener('click', () => {
  try {
    setPlotRange(parseFrauenburgInput(element<HTMLInputElement>('#plot-start').value.trim()),
      parseFrauenburgInput(element<HTMLInputElement>('#plot-end').value.trim()));
  } catch {
    plotError = 'invalidPlotRange';
    const error = element<HTMLParagraphElement>('#plot-error');
    error.textContent = message(state.language, plotError);
    error.hidden = false;
  }
});
for (const [selector, scale, pan] of [
  ['#plot-pan-left', 1, -0.5], ['#plot-pan-right', 1, 0.5],
  ['#plot-zoom-in', 0.5, 0], ['#plot-zoom-out', 2, 0],
] as const) {
  element(selector).addEventListener('click', () => {
    const span = state.plotEndUt1 - state.plotStartUt1;
    const center = (state.plotStartUt1 + state.plotEndUt1) / 2 + pan * span;
    setPlotRange(center - span * scale / 2, center + span * scale / 2);
  });
}
document.addEventListener('visibilitychange', () => { lastFrame = 0; if (document.hidden) dispatch({ type: 'pause' }); });

function frame(timestamp: number): void {
  if (state.playing && lastFrame > 0) dispatch({ type: 'tick', seconds: (timestamp - lastFrame) / 1000 });
  lastFrame = timestamp;
  requestAnimationFrame(frame);
}
updateMode();
applyLanguage(state.language);
updateComparisonStatic();
updateControls();
updateTimeAndGeometry();
requestAnimationFrame(frame);
