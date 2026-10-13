import { formatFrauenburgInput, modelDaysAtUt1, parseFrauenburgInput,
  ptolemyDayToAssumedUt1 } from './comparison-time.ts';
import { message, isLanguage, type Language, type MessageKey } from './i18n.ts';
import { updatePlayButton } from './playback-view.ts';
import { renderGeometryDynamic, renderGeometryStatic } from './workspace-geometry-view.ts';
import { changeGeometry, changeMap, changePlot, changeTrace, addTrace, removeTrace,
  validReplacement } from './workspace-panel-actions.ts';
import { clearMapTrailCache, mapFitPositions, renderMapDynamic, renderMapStatic } from './workspace-map-view.ts';
import { renderPlotDynamic, renderPlotStatic } from './workspace-plot-view.ts';
import { applyPlotWindowInputs, type PlotWindowInputIssue } from './workspace-plot-window.ts';
import { renderWorkspaceSources } from './workspace-sources.ts';
import { addDisplay, applyWorkspacePreset, followWorkspaceClock, jumpToExample,
  jumpToToday, moveDisplay, panMap, panPlotWindow, removeDisplay, resetMapCamera, setClockDirection,
  setClockInstant, setClockPlaying, setClockSpeed, setDisplayCollapsed,
  stepClock, suggestedWorkspace, tickClock, updateDisplay, workspacePresets,
  zoomMap, zoomPlotWindow, fitMap, type WorkspacePreset } from './workspace-state.ts';
import type { DisplayConfig, WorkspaceState } from './workspace-types.ts';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('Missing app root');
const t = (key: MessageKey): string => message(language, key);
const tr = (key: MessageKey): string => '<span data-i18n="' + key + '"></span>';
const plotWindowErrorKeys: Record<PlotWindowInputIssue, MessageKey> = {
  format: 'plotInputFormat', 'julian-date': 'plotInvalidJulianDate',
  order: 'plotEndBeforeStart', limit: 'plotRangeTooLong', domain: 'plotOutsideNumericalDomain',
};
let language: Language = isLanguage(localStorage.getItem('epicycle-language'))
  ? localStorage.getItem('epicycle-language') as Language : 'en';
let state: WorkspaceState = suggestedWorkspace(window.innerWidth);
const panelNodes = new Map<string, HTMLElement>();
const renderedConfigs = new Map<string, DisplayConfig>();
let lastFrame = 0;

root.innerHTML = [
  '<header class="site-header"><a class="wordmark" href="#top"><span class="orbit-mark" aria-hidden="true">◉</span>', tr('appName'), '</a>',
  '<nav class="site-nav"><a href="#displays">', tr('navModel'), '</a><a href="#controls">', tr('navControls'),
  '</a><a href="#sources">', tr('navSources'), '</a></nav>',
  '<div class="language-toggle" role="group" aria-label="Language"><button type="button" data-language="en">English</button>',
  '<span aria-hidden="true">|</span><button type="button" data-language="mn">Монгол</button></div></header>',
  '<main id="top"><section class="comparison-intro"><p class="eyebrow">', tr('eyebrow'), '</p><h1>', tr('workspaceTitle'),
  '</h1><p class="subtitle">', tr('workspaceSubtitle'), '</p><p class="intro-copy">', tr('workspaceIntro'), '</p></section>',
  '<section class="control-card workspace-controls" id="controls"><div class="section-heading"><div><p class="section-kicker">',
  tr('timeKicker'), '</p><h2>', tr('globalTime'), '</h2></div></div>',
  '<div class="workspace-transport"><button type="button" data-clock="back" aria-label="Back 10 days">−10</button>',
  '<button type="button" data-clock="play" class="play-button"></button>',
  '<button type="button" data-clock="forward" aria-label="Forward 10 days">+10</button>',
  '<strong data-clock-date></strong></div>',
  '<div class="workspace-clock-grid"><div><span class="small-label">', tr('assumedUt1'),
  '</span><output data-ut1></output></div><div><span class="small-label">', tr('ptolemyDayInput'),
  '</span><output data-ptolemy-day></output></div></div>',
  '<div class="workspace-inputs"><label>', tr('frauenburgDate'),
  '<span class="input-row"><input type="text" data-clock-input="date" inputmode="text" spellcheck="false">',
  '<button type="button" data-clock="set-date">', tr('setComparisonDate'), '</button></span></label>',
  '<label>', tr('ptolemyDayInput'),
  '<span class="input-row"><input type="number" data-clock-input="ptolemy-day" step="any">',
  '<button type="button" data-clock="set-ptolemy-day">', tr('setPtolemyDay'), '</button></span></label></div>',
  '<p class="field-help">', tr('meridianNote'), '</p><p class="field-help">', tr('todayConversion'), '</p>',
  '<p class="error" data-clock-error role="alert" hidden></p>',
  '<div class="workspace-jumps"><button type="button" data-clock="nabonassar" class="example-button">',
  tr('example'), '</button><button type="button" data-clock="1512" class="example-button">',
  tr('comparisonExample1512'), '</button><button type="button" data-clock="1473" class="example-button">',
  tr('comparisonExample1473'), '</button><button type="button" data-clock="today" class="example-button">',
  tr('today'), '</button></div>',
  '<div class="workspace-playback-settings"><label>', tr('speed'), ' <output data-speed-value></output>',
  '<input type="range" min="1" max="40" step="1" data-clock-input="speed"></label>',
  '<label>', tr('playbackDirection'), '<select data-clock-input="direction"><option value="1" data-option-i18n="forwardDirection">',
  t('forwardDirection'), '</option><option value="-1" data-option-i18n="reverseDirection">', t('reverseDirection'), '</option></select></label></div></section>',
  '<section class="workspace-bar" id="displays"><div><p class="section-kicker">', tr('workspaceKicker'), '</p><h2>',
  tr('workspaceTitle'), '</h2></div><div class="workspace-bar-actions"><details class="workspace-presets"><summary>', tr('workspacePresets'),
  '</summary><label>', tr('workspacePresets'),
  '<select data-preset><option value="explore-one" data-option-i18n="explorePreset">', t('explorePreset'),
  '</option><option value="compare-longitudes" data-option-i18n="comparePreset">', t('comparePreset'),
  '</option><option value="desktop-explore" data-option-i18n="desktopPreset">', t('desktopPreset'),
  '</option><option value="detailed-comparison" data-option-i18n="detailedPreset">', t('detailedPreset'),
  '</option><option value="solar-comparison" data-option-i18n="solarPreset">', t('solarPreset'),
  '</option><option value="outer-planets" data-option-i18n="outerPreset">', t('outerPreset'),
  '</option><option value="jupiter-comparison" data-option-i18n="jupiterComparisonPreset">', t('jupiterComparisonPreset'),
  '</option><option value="saturn-comparison" data-option-i18n="saturnComparisonPreset">', t('saturnComparisonPreset'),
  '</option><option value="copernican-map" data-option-i18n="mapPreset">', t('mapPreset'), '</option></select></label>',
  '<button type="button" data-workspace="preset">', tr('replaceLayout'), '</button></details>',
  '<label>', tr('addDisplay'), '<select data-add-kind><option value="geometry" data-option-i18n="addGeometry">',
  t('addGeometry'), '</option><option value="time-series" data-option-i18n="addPlot">', t('addPlot'),
  '</option><option value="planetary-map" data-option-i18n="addMap">', t('addMap'), '</option></select></label>',
  '<button type="button" data-workspace="add">＋ ', tr('addDisplay'), '</button></div></section>',
  '<p class="field-help" data-workspace-message role="status"></p>',
  '<p class="empty-workspace" data-empty-workspace hidden></p><div class="managed-workspace" data-panels></div>',
  '<section id="sources" class="workspace-sources"><h2>', tr('navSources'),
  '</h2><div data-sources-body></div></section></main>',
  '<footer class="site-footer"><span>', tr('compareFooter'), '</span></footer>',
].join('');

const panels = root.querySelector<HTMLElement>('[data-panels]')!;
const clockError = root.querySelector<HTMLElement>('[data-clock-error]')!;
const workspaceMessage = root.querySelector<HTMLElement>('[data-workspace-message]')!;
const dateInput = root.querySelector<HTMLInputElement>('[data-clock-input="date"]')!;
const ptolemyInput = root.querySelector<HTMLInputElement>('[data-clock-input="ptolemy-day"]')!;
const playButton = root.querySelector<HTMLButtonElement>('[data-clock="play"]')!;
// Keep the one global transport visible while a long plot or diagram is in view.
root.querySelector('main')!.insertBefore(root.querySelector('.workspace-transport')!,
  root.querySelector('#controls')!);

function setText(selector: string, text: string): void {
  const node = root!.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== text) node.textContent = text;
}

function clearError(): void { clockError.hidden = true; }
function showError(text: string): void { clockError.textContent = text; clockError.hidden = false; }

function mountPanel(display: DisplayConfig): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'diagram-card managed-panel ' + (display.kind === 'time-series' ? 'plot-panel'
    : display.kind === 'planetary-map' ? 'map-panel' : 'geometry-panel');
  panel.dataset.panelId = display.id;
  panel.innerHTML = [
    '<div class="managed-panel-header"><h3 data-panel-title></h3><div class="panel-actions">',
    '<button type="button" data-action="move-up"></button><button type="button" data-action="move-down"></button>',
    '<button type="button" data-action="collapse"></button><button type="button" data-action="remove"></button>',
    '</div></div><div data-panel-body><details data-panel-settings></details>',
    '<p data-panel-error class="error" role="alert" hidden></p>',
    display.kind === 'planetary-map'
      ? '<p class="map-policy-note" data-map-policy-note></p><p class="scientific-note" data-map-science></p>' +
        '<div class="map-controls" data-map-controls></div><p class="scientific-note" data-map-unavailable hidden></p>' +
        '<div class="map-frame"><svg viewBox="0 0 680 680" role="img" aria-label="Planetary Map">' +
        '<g data-map-grid></g><g data-map-trails></g><g data-map-endpoints></g><g data-map-markers></g></svg></div>' +
        '<p class="scientific-note" data-map-continuation></p><p class="field-help" data-map-readout-heading></p>' +
        '<dl class="comparison-readouts map-readouts" data-map-readouts></dl>'
      : display.kind === 'geometry'
      ? '<p class="diagram-hint" data-panel-hint></p><div class="diagram-frame" data-geometry-frame></div>' +
        '<p class="scientific-note" data-geometry-provenance hidden></p>' +
        '<p class="scientific-note" data-unavailable hidden></p><ul class="legend" data-panel-legend></ul>' +
        '<dl class="comparison-readouts" data-panel-readouts></dl>'
      : '<p class="plot-frame-note" data-frame-note></p><div class="workspace-plot-legend" data-plot-legend></div>' +
        '<p class="plot-frame-note" data-provenance-note hidden></p>' +
        '<div class="workspace-plot-frame" data-plot-frame></div><p class="field-help" data-plot-status></p>' +
        '<dl class="comparison-readouts" data-current-traces></dl><p data-disagreement hidden></p>',
    '</div>',
  ].join('');
  return panel;
}

function syncPanels(force = false): void {
  const ids = new Set(state.displays.map(display => display.id));
  for (const [id, panel] of panelNodes) if (!ids.has(id)) {
    panel.remove(); panelNodes.delete(id); renderedConfigs.delete(id); clearMapTrailCache(id);
  }
  state.displays.forEach((display, index) => {
    let panel = panelNodes.get(display.id);
    if (!panel) { panel = mountPanel(display); panelNodes.set(display.id, panel); }
    if (force || renderedConfigs.get(display.id) !== display) {
      if (display.kind === 'geometry') renderGeometryStatic(panel, display, language);
      else if (display.kind === 'time-series') renderPlotStatic(panel, display, language);
      else renderMapStatic(panel, display, language);
      renderedConfigs.set(display.id, display);
    }
    const body = panel.querySelector<HTMLElement>('[data-panel-body]')!;
    if (body.hidden !== display.collapsed) body.hidden = display.collapsed;
    const actionLabels: Record<string, MessageKey> = {
      'move-up': 'moveUp', 'move-down': 'moveDown',
      collapse: display.collapsed ? 'expandPanel' : 'collapsePanel', remove: 'removePanel',
    };
    for (const [action, key] of Object.entries(actionLabels)) {
      const button = panel.querySelector<HTMLButtonElement>('[data-action="' + action + '"]')!;
      if (button.textContent !== t(key)) button.textContent = t(key);
      const disabled = (action === 'move-up' && index === 0) ||
        (action === 'move-down' && index === state.displays.length - 1);
      if (button.disabled !== disabled) button.disabled = disabled;
    }
    if (panels.children[index] !== panel) panels.insertBefore(panel, panels.children[index] ?? null);
  });
  root!.querySelector<HTMLElement>('[data-empty-workspace]')!.hidden = state.displays.length !== 0;
  root!.querySelector<HTMLButtonElement>('[data-workspace="add"]')!.disabled = state.displays.length >= 4;
}

function renderClock(): void {
  updatePlayButton(playButton, state.clock.playing, language);
  setText('[data-clock-date]', formatFrauenburgInput(state.clock.ut1Jd).replace('T', ' · '));
  setText('[data-ut1]', state.clock.ut1Jd.toFixed(5));
  setText('[data-ptolemy-day]', modelDaysAtUt1(state.clock.ut1Jd).ptolemy.toFixed(3));
  const speed = root!.querySelector<HTMLInputElement>('[data-clock-input="speed"]')!;
  if (speed.value !== String(state.clock.speedDaysPerSecond)) speed.value = String(state.clock.speedDaysPerSecond);
  setText('[data-speed-value]', String(state.clock.speedDaysPerSecond) + ' ' + t('daysPerSecond'));
  const direction = root!.querySelector<HTMLSelectElement>('[data-clock-input="direction"]')!;
  if (direction.value !== String(state.clock.direction)) direction.value = String(state.clock.direction);
  const dateValue = formatFrauenburgInput(state.clock.ut1Jd);
  if (document.activeElement !== dateInput && dateInput.value !== dateValue) dateInput.value = dateValue;
  const ptolemyValue = modelDaysAtUt1(state.clock.ut1Jd).ptolemy.toFixed(3);
  if (document.activeElement !== ptolemyInput && ptolemyInput.value !== ptolemyValue) {
    ptolemyInput.value = ptolemyValue;
  }
}

function renderDynamic(): void {
  renderClock();
  for (const display of state.displays) {
    if (display.collapsed) continue;
    const panel = panelNodes.get(display.id)!;
    if (display.kind === 'geometry') renderGeometryDynamic(panel, display, state.clock.ut1Jd, language);
    else if (display.kind === 'time-series') renderPlotDynamic(panel, display, state.clock.ut1Jd, language);
    else renderMapDynamic(panel, display, state.clock.ut1Jd, language);
  }
}

function commit(next: WorkspaceState): void {
  const followed = followWorkspaceClock(next);
  if (followed === state) return;
  const displaysChanged = followed.displays !== state.displays;
  state = followed;
  if (displaysChanged) syncPanels();
  renderDynamic();
}

function refreshLanguage(): void {
  document.documentElement.lang = language;
  for (const node of root!.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = node.dataset.i18n as MessageKey;
    if (node.textContent !== t(key)) node.textContent = t(key);
  }
  for (const option of root!.querySelectorAll<HTMLOptionElement>('[data-option-i18n]')) {
    option.textContent = t(option.dataset.optionI18n as MessageKey);
  }
  for (const button of root!.querySelectorAll<HTMLButtonElement>('[data-language]')) {
    button.classList.toggle('active', button.dataset.language === language);
    button.setAttribute('aria-pressed', String(button.dataset.language === language));
  }
  root!.querySelector<HTMLButtonElement>('[data-clock="back"]')!.ariaLabel = t('back');
  root!.querySelector<HTMLButtonElement>('[data-clock="forward"]')!.ariaLabel = t('forward');
  setText('[data-empty-workspace]', t('emptyWorkspace'));
  const sources = root!.querySelector<HTMLElement>('[data-sources-body]')!;
  const open = Array.from(sources.querySelectorAll<HTMLDetailsElement>('details')).filter(item => item.open).map(item => item.id);
  sources.innerHTML = renderWorkspaceSources(language);
  for (const id of open) { const item = sources.querySelector<HTMLDetailsElement>('#' + id); if (item) item.open = true; }
  syncPanels(true);
  renderDynamic();
}

function updatePanel(replacement: DisplayConfig | null, panel: HTMLElement,
  errorKey: MessageKey = 'invalidDisplay'): void {
  const error = panel.querySelector<HTMLElement>('[data-panel-error]')!;
  if (!replacement || !validReplacement(replacement)) {
    const current = state.displays.find(display => display.id === panel.dataset.panelId);
    if (current?.kind === 'geometry') renderGeometryStatic(panel, current, language);
    else if (current?.kind === 'time-series') renderPlotStatic(panel, current, language);
    else if (current?.kind === 'planetary-map') renderMapStatic(panel, current, language);
    error.textContent = t(errorKey); error.hidden = false; return;
  }
  error.hidden = true;
  commit(updateDisplay(state, replacement));
}

function clockAction(action: string): void {
  clearError();
  if (action === 'play') commit(setClockPlaying(state, !state.clock.playing));
  else if (action === 'back') commit(stepClock(state, -10));
  else if (action === 'forward') commit(stepClock(state, 10));
  else if (action === 'today') commit(jumpToToday(state, Date.now()));
  else if (action === 'nabonassar' || action === '1512' || action === '1473') {
    commit(jumpToExample(state, action));
  } else if (action === 'set-date' || action === 'set-ptolemy-day') {
    try {
      if (action === 'set-ptolemy-day' && !ptolemyInput.value.trim()) throw new RangeError('Missing day');
      const instant = action === 'set-date' ? parseFrauenburgInput(dateInput.value)
        : ptolemyDayToAssumedUt1(Number(ptolemyInput.value));
      const next = setClockInstant(state, instant);
      if (next === state) showError(t('invalidWorkspaceDate'));
      else commit(setClockPlaying(next, false));
    } catch { showError(t('invalidWorkspaceDate')); }
  }
}

function onPanelAction(action: string, panel: HTMLElement, button: HTMLElement): void {
  const id = panel.dataset.panelId!;
  const display = state.displays.find(item => item.id === id)!;
  if (action === 'remove') commit(removeDisplay(state, id));
  else if (action === 'collapse') commit(setDisplayCollapsed(state, id, !display.collapsed));
  else if (action === 'move-up' || action === 'move-down') {
    commit(moveDisplay(state, id, action === 'move-up' ? 'up' : 'down'));
  } else if (display.kind === 'time-series') {
    if (action === 'add-trace') updatePanel(addTrace(display), panel);
    else if (action === 'remove-trace') updatePanel(removeTrace(display, button.dataset.traceId!), panel);
    else if (action === 'apply-window') {
      const startInput = panel.querySelector<HTMLInputElement>('[data-setting="window-start"]')!;
      const endInput = panel.querySelector<HTMLInputElement>('[data-setting="window-end"]')!;
      const result = applyPlotWindowInputs(display, startInput.value, endInput.value);
      if (result.ok) updatePanel(result.display, panel);
      else {
        panel.querySelector<HTMLElement>('[data-panel-error]')!.hidden = true;
        const error = panel.querySelector<HTMLElement>('[data-window-error]')!;
        error.textContent = t(plotWindowErrorKeys[result.issue]);
        error.hidden = false;
        const field = result.field === 'start' ? startInput : endInput;
        field.focus();
      }
    } else if (action === 'pan-left' || action === 'pan-right') {
      const span = display.window.endUt1 - display.window.startUt1;
      commit(panPlotWindow(state, id, span * (action === 'pan-left' ? -0.25 : 0.25)));
    } else if (action === 'zoom-in' || action === 'zoom-out') {
      commit(zoomPlotWindow(state, id, action === 'zoom-in' ? 0.5 : 2));
    }
  } else if (display.kind === 'planetary-map') {
    if (action === 'map-fit') commit(fitMap(state, id, mapFitPositions(display, state.clock.ut1Jd)));
    else if (action === 'map-reset') commit(resetMapCamera(state, id));
    else if (action === 'map-zoom-in' || action === 'map-zoom-out') {
      commit(zoomMap(state, id, action === 'map-zoom-in' ? 0.5 : 2));
    } else if (action.startsWith('map-pan-')) {
      const direction = action.slice('map-pan-'.length);
      commit(panMap(state, id, direction === 'left' ? -0.25 : direction === 'right' ? 0.25 : 0,
        direction === 'up' ? 0.25 : direction === 'down' ? -0.25 : 0));
    }
  }
}

root.addEventListener('click', event => {
  const target = event.target as Element;
  const languageButton = target.closest<HTMLButtonElement>('[data-language]');
  if (languageButton) {
    language = languageButton.dataset.language as Language;
    localStorage.setItem('epicycle-language', language);
    refreshLanguage(); return;
  }
  const clockButton = target.closest<HTMLButtonElement>('[data-clock]');
  if (clockButton) { clockAction(clockButton.dataset.clock!); return; }
  const workspaceButton = target.closest<HTMLButtonElement>('[data-workspace]');
  if (workspaceButton) {
    if (workspaceButton.dataset.workspace === 'preset') {
      const preset = root!.querySelector<HTMLSelectElement>('[data-preset]')!.value as WorkspacePreset;
      if (Object.hasOwn(workspacePresets, preset)) commit(applyWorkspacePreset(state, preset));
    } else {
      const kind = root!.querySelector<HTMLSelectElement>('[data-add-kind]')!.value;
      const preset = kind === 'geometry' ? workspacePresets['explore-one'][0]
        : kind === 'planetary-map' ? workspacePresets['copernican-map'][0]
          : workspacePresets['compare-longitudes'][0];
      const next = addDisplay(state, preset);
      if (next === state) workspaceMessage.textContent = t('panelLimit');
      else { workspaceMessage.textContent = ''; commit(next); }
    }
    return;
  }
  const button = target.closest<HTMLButtonElement>('[data-action]');
  const panel = target.closest<HTMLElement>('[data-panel-id]');
  if (button && panel) onPanelAction(button.dataset.action!, panel, button);
});

root.addEventListener('change', event => {
  const input = event.target as HTMLInputElement | HTMLSelectElement;
  if (input.dataset.clockInput === 'direction') {
    commit(setClockDirection(state, input.value === '-1' ? -1 : 1)); return;
  }
  const panel = input.closest<HTMLElement>('[data-panel-id]');
  if (!panel) return;
  const display = state.displays.find(item => item.id === panel.dataset.panelId);
  if (!display) return;
  if (display.kind === 'geometry' && input.dataset.setting) {
    updatePanel(changeGeometry(display, input.dataset.setting,
      input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value), panel);
  } else if (display.kind === 'planetary-map') {
    const setting = input.dataset.mapVisible ? 'visible:' + input.dataset.mapVisible
      : input.dataset.mapTrail ? 'trail:' + input.dataset.mapTrail : input.dataset.setting;
    if (setting) updatePanel(changeMap(display, setting,
      input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value), panel);
  } else if (display.kind === 'time-series' && input.dataset.traceSetting) {
    const errorKey: MessageKey = display.analysis.kind === 'model-disagreement'
      ? input.dataset.traceSetting === 'observable' &&
          input.value === 'geocentric-sidereal-longitude' &&
          display.frameAlignment === 'nominal-historical-tropical'
        ? 'disagreementFrameIncompatible' : 'disagreementPairIncompatible'
      : 'invalidDisplay';
    updatePanel(changeTrace(display, input.dataset.traceId!, input.dataset.traceSetting, input.value),
      panel, errorKey);
  } else if (display.kind === 'time-series' && input.dataset.setting) {
    if (input.dataset.setting === 'window-preset' && input.value !== 'custom') {
      const span = Number(input.value);
      updatePanel({ ...display, window: { ...display.window,
        startUt1: state.clock.ut1Jd - span / 2, endUt1: state.clock.ut1Jd + span / 2 } }, panel);
    } else if (!['window-start', 'window-end', 'window-preset'].includes(input.dataset.setting)) {
      const setting = input.dataset.setting;
      const differentBodies = display.traces.length >= 2 &&
        display.traces[0].body !== display.traces[1].body;
      const errorKey: MessageKey = setting === 'first-trace' || setting === 'second-trace' ||
        (setting === 'analysis' && differentBodies) ? 'disagreementPairIncompatible'
        : setting === 'frame-alignment' ||
          (setting === 'analysis' && display.frameAlignment === 'native')
          ? 'disagreementFrameIncompatible' : 'invalidDisplay';
      updatePanel(changePlot(display, setting,
        input instanceof HTMLInputElement && input.type === 'checkbox' ? input.checked : input.value),
        panel, errorKey);
    }
  }
});

root.querySelector<HTMLInputElement>('[data-clock-input="speed"]')!.addEventListener('input', event => {
  commit(setClockSpeed(state, Number((event.target as HTMLInputElement).value)));
});
root.addEventListener('keydown', event => {
  const input = event.target as HTMLInputElement;
  if (event.key !== 'Enter') return;
  if (input === dateInput) clockAction('set-date');
  else if (input === ptolemyInput) clockAction('set-ptolemy-day');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.clock.playing) commit(setClockPlaying(state, false));
  lastFrame = 0;
});

function animationFrame(timestamp: number): void {
  if (lastFrame && state.clock.playing) commit(tickClock(state, (timestamp - lastFrame) / 1000));
  lastFrame = timestamp;
  requestAnimationFrame(animationFrame);
}

refreshLanguage();
requestAnimationFrame(animationFrame);
