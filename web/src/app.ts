import './style.css';
import { daysToEgyptian, daysToJulian, yearLabel } from './chronology.ts';
import { renderDiagram, trailPoints } from './diagram.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { evaluateDays, modelRecord, type MarsResult } from './model.ts';
import { initialState, reduce, type Action, type AppState } from './state.ts';

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
  </main><footer>${translated('appName')} <span>·</span> ${translated('footer')}</footer>`;

function element<T extends HTMLElement>(selector: string): T {
  const found = root!.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}

let savedLanguage: string | null = null;
try { savedLanguage = localStorage.getItem('epicycle-language'); } catch { /* Storage can be disabled. */ }
let state: AppState = initialState(savedLanguage);
let lastFrame = 0;

function dispatch(action: Action): void {
  state = reduce(state, action);
  if (action.type === 'setDay' || action.type === 'step' || action.type === 'example') {
    element<HTMLParagraphElement>('#day-error').hidden = true;
  }
  render();
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
  document.title = `${message(language, 'modelTitle')} · ${message(language, 'appName')}`;
  root!.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node => {
    node.textContent = message(language, node.dataset.i18n as MessageKey);
  });
  root!.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(node => {
    node.title = message(language, node.dataset.i18nTitle as MessageKey);
  });
  root!.querySelectorAll<HTMLElement>('[data-language]').forEach(node => {
    const selected = node.dataset.language === language;
    node.setAttribute('aria-pressed', String(selected));
  });
  element<HTMLButtonElement>('#back').ariaLabel = message(language, 'back');
  element<HTMLButtonElement>('#forward').ariaLabel = message(language, 'forward');
  element<HTMLElement>('.site-nav').ariaLabel = message(language, 'navModel');
  element<HTMLElement>('.language-toggle').ariaLabel = message(language, 'language');
  element<HTMLElement>('.legend').ariaLabel = message(language, 'diagramTitle');
  root!.querySelectorAll<HTMLElement>('[data-parameter-unit]').forEach(node => {
    const name = node.dataset.parameterUnit as keyof typeof modelRecord.parameters;
    const unit = modelRecord.parameters[name].unit;
    const key: MessageKey = unit === 'deferent units' ? 'unitDeferent' : unit === 'degree' ? 'unitDegree' : 'unitDaily';
    node.textContent = ` ${message(language, key)}`;
  });
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

function render(): void {
  applyLanguage(state.language);
  updateDates();
  const result = evaluateDays(state.day);
  updateReadouts(result);
  element('#diagram').innerHTML = renderDiagram(result, state.showTrail ? trailPoints(state.day, state.trailDays) : [], state.language);
  const play = element<HTMLButtonElement>('#play');
  play.textContent = `${state.playing ? 'Ⅱ' : '▶'}  ${message(state.language, state.playing ? 'pause' : 'play')}`;
  play.setAttribute('aria-label', message(state.language, state.playing ? 'pause' : 'play'));
  element<HTMLInputElement>('#speed').value = String(state.speed);
  element('#speed-value').textContent = `${state.speed} ${message(state.language, 'daysPerSecond')}`;
  element<HTMLInputElement>('#trail').checked = state.showTrail;
  element<HTMLInputElement>('#trail-days').value = String(state.trailDays);
  element<HTMLInputElement>('#trail-days').disabled = !state.showTrail;
  element('#trail-value').textContent = `${state.trailDays} ${message(state.language, 'days')}`;
  if (document.activeElement !== element('#day-input')) element<HTMLInputElement>('#day-input').value = state.day.toFixed(2);
}

element('#back').addEventListener('click', () => dispatch({ type: 'step', days: -10 }));
element('#forward').addEventListener('click', () => dispatch({ type: 'step', days: 10 }));
element('#play').addEventListener('click', () => dispatch({ type: 'togglePlay' }));
element('#example').addEventListener('click', () => dispatch({ type: 'example' }));
element('#speed').addEventListener('input', event => dispatch({ type: 'speed', speed: Number((event.target as HTMLInputElement).value) }));
element('#trail').addEventListener('change', event => dispatch({ type: 'trail', show: (event.target as HTMLInputElement).checked }));
element('#trail-days').addEventListener('input', event => dispatch({ type: 'trailDays', days: Number((event.target as HTMLInputElement).value) }));
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
document.addEventListener('visibilitychange', () => { lastFrame = 0; if (document.hidden) dispatch({ type: 'pause' }); });

function frame(timestamp: number): void {
  if (state.playing && lastFrame > 0) dispatch({ type: 'tick', seconds: (timestamp - lastFrame) / 1000 });
  lastFrame = timestamp;
  requestAnimationFrame(frame);
}
render();
requestAnimationFrame(frame);
