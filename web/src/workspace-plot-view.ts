import { formatFrauenburgInput } from './comparison-time.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { historicalBodies, modelCapabilities, modelIdsForBody, models,
  type ModelId } from './model-registry.ts';
import { modelDisagreementAt, sampleWorkspacePlot, styledPlotSegments,
  traceLongitudeAt, workspacePlotCacheKey, type PlotPoint, type WorkspacePlotSamples } from './workspace-plot.ts';
import { nativeFrameForTrace, traceCoverage, validateDisplay } from './workspace-validation.ts';
import { initialPlotTraceLimit, type PlotTrace, type TimeSeriesDisplay } from './workspace-types.ts';

type PlotCache = { key: string; language: Language; samples: WorkspacePlotSamples };
const caches = new WeakMap<HTMLElement, PlotCache>();
const colors = ['#75d8eb', '#f2b980', '#b6d992', '#d5a4e5'];
const plotLeft = 110;
const plotRight = 770;
const plotWidth = plotRight - plotLeft;
const t = (language: Language, key: MessageKey): string => message(language, key);

function frameLabel(trace: PlotTrace, language: Language): string {
  const frame = nativeFrameForTrace(trace);
  const key: MessageKey = frame === 'ptolemaic-tropical' ? 'ptolemaicFrame'
    : frame === 'copernican-sidereal' ? 'copernicanSiderealFrame' : 'copernicanTropicalFrame';
  return t(language, key);
}

function traceLabel(trace: PlotTrace, language: Language): string {
  const model = models[trace.modelId as ModelId];
  return `${t(language, trace.body === 'Sun' ? 'sun' : 'mars')} · ${t(language, model.label)} · ${t(language,
    trace.observableId === 'geocentric-sidereal-longitude' ? 'siderealObservable' : 'tropicalObservable')}`;
}

function tracePolicyLabel(trace: PlotTrace, language: Language): string {
  if (trace.modelId !== 'copernicus') return '';
  const key: MessageKey = trace.policyId === 'sn-uniform-exploratory'
    ? 'exploratoryPolicy' : 'sourceLimitedPolicy';
  return ` · ${t(language, key)}`;
}

function traceSettings(trace: PlotTrace, index: number, language: Language): string {
  const modelOptions = modelIdsForBody(trace.body).map(id => `<option value="${id}" ${id === trace.modelId ? 'selected' : ''}>${t(language, models[id].label)}</option>`).join('');
  const observables = modelCapabilities[trace.modelId].observables.map(item => {
    const key = item.id === 'geocentric-sidereal-longitude' ? 'siderealObservable' : 'tropicalObservable';
    return `<option value="${item.id}" ${item.id === trace.observableId ? 'selected' : ''}>${t(language, key)}</option>`;
  }).join('');
  const policies = trace.modelId === 'copernicus'
    ? `<label>${t(language, 'policySetting')}<select data-trace-setting="policy" data-trace-id="${trace.id}">
       ${Object.keys(modelCapabilities.copernicus.policies).map(id => `<option value="${id}" ${id === trace.policyId ? 'selected' : ''}>${t(language, id === 'sn-uniform-exploratory' ? 'exploratoryPolicy' : 'sourceLimitedPolicy')}</option>`).join('')}</select></label>` : '';
  return `<fieldset class="trace-settings"><legend>${t(language, 'trace')} ${index + 1}</legend>
    <label>${t(language, 'bodySetting')}<select data-trace-setting="body" data-trace-id="${trace.id}">${historicalBodies.map(body => `<option value="${body}" ${trace.body === body ? 'selected' : ''}>${t(language, body === 'Sun' ? 'sun' : 'mars')}</option>`).join('')}</select></label>
    <label>${t(language, 'modelSetting')}<select data-trace-setting="model" data-trace-id="${trace.id}">${modelOptions}</select></label>
    <label>${t(language, 'observable')}<select data-trace-setting="observable" data-trace-id="${trace.id}">${observables}</select></label>
    ${policies}<button type="button" data-action="remove-trace" data-trace-id="${trace.id}">${t(language, 'removeTrace')}</button>
    <p class="field-help">${frameLabel(trace, language)}</p>
  </fieldset>`;
}

function tracePairOptions(display: TimeSeriesDisplay, selected: string, language: Language): string {
  return display.traces.map((trace, index) => `<option value="${trace.id}" ${trace.id === selected ? 'selected' : ''}>${t(language, 'trace')} ${index + 1} · ${t(language, trace.body === 'Sun' ? 'sun' : 'mars')} · ${t(language, models[trace.modelId as ModelId].label)}</option>`).join('');
}

function disagreementLabel(first: PlotTrace, second: PlotTrace, language: Language): string {
  return `Δλ = ${t(language, models[second.modelId as ModelId].label)} − ${t(language,
    models[first.modelId as ModelId].label)} (°)`;
}

/** Keep exact segment ends while omitting movements too small to display. Dense SVG paths hide dashes in Safari. */
function drawablePoints(points: readonly PlotPoint[], x: (index: number) => number,
  y: (value: number) => number): PlotPoint[] {
  if (points.length <= 2) return [...points];
  const drawn = [points[0]];
  let lastX = x(points[0].index);
  let lastY = y(points[0].value);
  for (const point of points.slice(1, -1)) {
    const nextX = x(point.index);
    const nextY = y(point.value);
    if (Math.hypot(nextX - lastX, nextY - lastY) < 0.5) continue;
    drawn.push(point);
    lastX = nextX;
    lastY = nextY;
  }
  drawn.push(points[points.length - 1]);
  return drawn;
}

/** The panel shell and plot frame stay mounted across clock ticks. */
export function renderPlotStatic(panel: HTMLElement, display: TimeSeriesDisplay, language: Language): void {
  const title = panel.querySelector<HTMLElement>('[data-panel-title]');
  if (title) {
    const modelNames = [...new Set(display.traces.map(trace => trace.modelId))]
      .map(id => `${t(language, models[id as ModelId].body === 'Sun' ? 'sun' : 'mars')} · ${t(language, models[id as ModelId].label)}`).join(' / ');
    title.textContent = `${t(language, display.analysis.kind === 'model-disagreement'
      ? 'disagreementPlotTitle' : 'plotPanel')} · ${modelNames}`;
  }
  const settings = panel.querySelector<HTMLElement>('[data-panel-settings]');
  if (!settings) return;
  const wasOpen = settings instanceof HTMLDetailsElement ? settings.open : false;
  settings.innerHTML = `<summary>${t(language, 'panelSettings')}</summary>
    <div class="panel-settings-grid">
      <label>${t(language, 'plotWindow')}<select data-setting="window-preset">
        <option value="custom">${t(language, 'plotCustom')}</option>
        <option value="30">${t(language, 'plot30')}</option><option value="90">${t(language, 'plot90')}</option>
        <option value="180">${t(language, 'plot180')}</option><option value="365">${t(language, 'plot365')}</option>
        <option value="730">${t(language, 'plot730')}</option><option value="3650">${t(language, 'plotDecade')}</option>
        <option value="18250">${t(language, 'plotFiftyYears')}</option></select></label>
      <label>${t(language, 'plotStart')}<input data-setting="window-start" type="text" value="${formatFrauenburgInput(display.window.startUt1)}"></label>
      <label>${t(language, 'plotEnd')}<input data-setting="window-end" type="text" value="${formatFrauenburgInput(display.window.endUt1)}"></label>
      <button type="button" data-action="apply-window">${t(language, 'plotApply')}</button>
      <p class="error plot-window-error" data-window-error role="alert" hidden></p>
      <p class="field-help plot-boundary-help">${t(language, 'plotBoundaryHint')}</p>
      <div class="plot-pan-buttons"><button type="button" data-action="pan-left">${t(language, 'plotPanLeft')}</button>
        <button type="button" data-action="zoom-in">${t(language, 'plotZoomIn')}</button>
        <button type="button" data-action="zoom-out">${t(language, 'plotZoomOut')}</button>
        <button type="button" data-action="pan-right">${t(language, 'plotPanRight')}</button></div>
      <label class="panel-check"><input type="checkbox" data-setting="follow-time" ${display.window.followsClock ? 'checked' : ''}> ${t(language, 'followTime')}</label>
      ${display.analysis.kind === 'overlay' ? `<label>${t(language, 'plotDisplay')}<select data-setting="longitude-mode"><option value="unwrapped" ${display.longitudeMode === 'unwrapped' ? 'selected' : ''}>${t(language, 'plotUnwrapped')}</option><option value="wrapped" ${display.longitudeMode === 'wrapped' ? 'selected' : ''}>${t(language, 'plotWrapped')}</option></select></label>` : ''}
      <label>${t(language, 'frameChoice')}<select data-setting="frame-alignment"><option value="native" ${display.frameAlignment === 'native' ? 'selected' : ''}>${t(language, 'nativeFrames')}</option>
        <option value="nominal-historical-tropical" ${display.frameAlignment === 'nominal-historical-tropical' ? 'selected' : ''}>${t(language, 'nominalFrames')}</option></select></label>
      <label>${t(language, 'analysisChoice')}<select data-setting="analysis"><option value="overlay" ${display.analysis.kind === 'overlay' ? 'selected' : ''}>${t(language, 'overlayAnalysis')}</option>
        <option value="model-disagreement" ${display.analysis.kind === 'model-disagreement' ? 'selected' : ''}>${t(language, 'disagreementAnalysis')}</option></select></label>
      ${display.analysis.kind === 'model-disagreement' ? `<label>${t(language, 'firstTrace')}<select data-setting="first-trace">${tracePairOptions(display, display.analysis.firstTraceId, language)}</select></label>
        <label>${t(language, 'secondTrace')}<select data-setting="second-trace">${tracePairOptions(display, display.analysis.secondTraceId, language)}</select></label>` : ''}
      <div class="trace-list">${display.traces.map((trace, index) => traceSettings(trace, index, language)).join('')}</div>
      <button type="button" data-action="add-trace" ${display.traces.length >= initialPlotTraceLimit ? 'disabled' : ''}>${t(language, 'addTrace')}</button>
    </div>`;
  if (settings instanceof HTMLDetailsElement) settings.open = wasOpen;
  const legend = panel.querySelector<HTMLElement>('[data-plot-legend]');
  if (legend) {
    const analysis = display.analysis;
    if (analysis.kind === 'model-disagreement') {
      const first = display.traces.find(trace => trace.id === analysis.firstTraceId);
      const second = display.traces.find(trace => trace.id === analysis.secondTraceId);
      legend.innerHTML = first && second ? `<span style="--trace-color:${colors[0]}">${t(language,
        'disagreementPlotTitle')} · ${disagreementLabel(first, second, language)} · ${t(language,
        'plotWindow')}: ${formatFrauenburgInput(display.window.startUt1)} – ${formatFrauenburgInput(display.window.endUt1)}</span>` : '';
    } else legend.innerHTML = display.traces.map((trace, index) => `<span style="--trace-color:${colors[index]}">${traceLabel(trace, language)} · ${frameLabel(trace, language)}${tracePolicyLabel(trace, language)}</span>`).join('');
  }
  const provenanceNote = panel.querySelector<HTMLElement>('[data-provenance-note]');
  if (provenanceNote) {
    const analysis = display.analysis;
    const sourceTraces = analysis.kind === 'model-disagreement'
      ? display.traces.filter(trace => trace.id === analysis.firstTraceId ||
        trace.id === analysis.secondTraceId) : display.traces;
    const policies = new Set(sourceTraces.filter(trace => trace.modelId === 'copernicus')
      .map(trace => trace.policyId));
    const notes = [policies.has('sn-uniform-exploratory') ? t(language, 'exploratoryCurveNote') : '',
      policies.has('sn-local-uniform-1473-1523') ? t(language, 'sourceLimitedCurveNote') : '']
      .filter(Boolean);
    provenanceNote.textContent = notes.join(' ');
    provenanceNote.hidden = notes.length === 0;
  }
  const frameNote = panel.querySelector<HTMLElement>('[data-frame-note]');
  if (frameNote) frameNote.textContent = t(language,
    display.frameAlignment === 'native' ? 'nativeFrameWarning' : 'alignmentNote');
  const current = panel.querySelector<HTMLElement>('[data-current-traces]');
  if (current) {
    current.hidden = display.analysis.kind === 'model-disagreement';
    current.innerHTML = current.hidden ? '' : display.traces.map((trace, index) =>
      `<div><dt style="color:${colors[index]}">${traceLabel(trace, language)}</dt><dd data-current-trace="${trace.id}"></dd></div>`).join('');
  }
}

/** The disagreement gets its own symmetric degree scale; longitude turns never set its limits. */
export function plotSvg(samples: WorkspacePlotSamples, language: Language): string {
  const difference = samples.disagreement;
  const low = samples.minLongitude;
  const high = samples.maxLongitude;
  const padding = samples.mode === 'wrapped' ? 0 : Math.max(5, (high - low) * 0.12);
  let largestDifference = 0;
  if (difference) for (const value of difference.values) {
    if (value !== null) largestDifference = Math.max(largestDifference, Math.abs(value));
  }
  const desired = Math.max(0.1, largestDifference * 1.1);
  const magnitude = 10 ** Math.floor(Math.log10(desired));
  const limit = [1, 2, 5, 10].map(unit => unit * magnitude).find(value => value >= desired)!;
  const min = difference ? -limit : low - padding;
  const max = difference ? limit : high + padding || min + 1;
  const x = (index: number): number => plotLeft +
    (samples.times[index] - samples.startUt1) * plotWidth / (samples.endUt1 - samples.startUt1);
  const y = (value: number): number => 350 - (value - min) * 300 / (max - min);
  const paths = (difference
    ? [{ curve: 'disagreement', color: colors[0], segments: styledPlotSegments(
      { trace: difference.first, values: difference.values }, samples.times, 'wrapped',
      [difference.first, difference.second]) }]
    : samples.traces.map((trace, index) => ({ curve: 'longitude', color: colors[index],
      segments: styledPlotSegments(trace, samples.times, samples.mode) })))
    .map(series => series.segments.map(segment => `<path class="workspace-trace" data-curve="${series.curve}" data-provenance="${segment.style}" stroke="${series.color}"${segment.style === 'dashed' ? ' stroke-dasharray="24 20"' : ''} d="${drawablePoints(segment.points, x, y).map((point, index) =>
      `${index === 0 ? 'M' : 'L'}${x(point.index).toFixed(1)},${y(point.value).toFixed(1)}`).join(' ')}"/>`).join('')).join('');
  const horizontal = Array.from({ length: 5 }, (_, index) => {
    const value = min + (max - min) * (4 - index) / 4;
    const yy = 50 + index * 75;
    const decimals = difference ? (limit < 1 ? 2 : limit < 10 ? 1 : 0) : 0;
    return `<line class="plot-grid" x1="${plotLeft}" x2="${plotRight}" y1="${yy}" y2="${yy}"/><text class="plot-label" x="100" y="${yy + 4}" text-anchor="end">${value.toFixed(decimals)}°</text>`;
  }).join('');
  const date = (ut1: number): string => formatFrauenburgInput(ut1).split('T')[0];
  return `<svg viewBox="0 0 800 430" role="img" aria-label="${t(language,
    difference ? 'disagreementPlotTitle' : 'plotTitle')}">
    ${horizontal}${difference ? `<line class="plot-zero" x1="${plotLeft}" x2="${plotRight}" y1="${y(0)}" y2="${y(0)}"/>` : ''}<line class="plot-axis" x1="${plotLeft}" x2="${plotRight}" y1="350" y2="350"/>
    ${paths}<line data-plot-marker class="plot-marker" y1="50" y2="350"/>
    <text data-plot-marker-label class="plot-label" y="39"></text>
    <text class="plot-label" x="${plotLeft}" y="376" text-anchor="start">${date(samples.startUt1)}</text>
    <text class="plot-label" x="${plotRight}" y="376" text-anchor="end">${date(samples.endUt1)}</text>
    <text class="plot-axis-title" x="415" y="415" text-anchor="middle">${t(language, 'plotX')}</text>
    <text class="plot-axis-title" x="26" y="200" text-anchor="middle" transform="rotate(-90 26 200)">${t(language,
      difference ? 'disagreementYShort' : 'plotYShort')}</text>
  </svg>`;
}

function setText(panel: HTMLElement, selector: string, value: string): void {
  const node = panel.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== value) node.textContent = value;
}

export function renderPlotDynamic(panel: HTMLElement, display: TimeSeriesDisplay,
  ut1Jd: number, language: Language): void {
  const frame = panel.querySelector<HTMLElement>('[data-plot-frame]');
  if (!frame) return;
  const issues = validateDisplay(display);
  if (issues.length) {
    const key: MessageKey = issues.some(issue => issue.code === 'incompatible-frame')
      ? 'disagreementFrameIncompatible' : issues.some(issue => issue.code === 'invalid-disagreement')
        ? 'disagreementPairIncompatible' : 'invalidDisplay';
    if (frame.textContent !== t(language, key)) frame.textContent = t(language, key);
    caches.delete(panel);
    return;
  }
  const key = workspacePlotCacheKey(display);
  let cache = caches.get(panel);
  if (!cache || cache.key !== key) {
    cache = { key, language, samples: sampleWorkspacePlot(display, cache?.samples) };
    caches.set(panel, cache);
    frame.innerHTML = plotSvg(cache.samples, language);
  } else if (cache.language !== language) {
    cache.language = language;
    frame.innerHTML = plotSvg(cache.samples, language);
  }
  const samples = cache.samples;
  const rawX = plotLeft + plotWidth * (ut1Jd - samples.startUt1) / (samples.endUt1 - samples.startUt1);
  const markerX = Math.max(plotLeft, Math.min(plotRight, rawX));
  const marker = frame.querySelector<SVGLineElement>('[data-plot-marker]');
  const markerLabel = frame.querySelector<SVGTextElement>('[data-plot-marker-label]');
  if (marker) {
    const position = markerX.toFixed(1);
    if (marker.getAttribute('x1') !== position) marker.setAttribute('x1', position);
    if (marker.getAttribute('x2') !== position) marker.setAttribute('x2', position);
  }
  if (markerLabel) {
    const labelX = (markerX > 640 ? markerX - 8 : markerX + 8).toFixed(1);
    const anchor = markerX > 640 ? 'end' : 'start';
    if (markerLabel.getAttribute('x') !== labelX) markerLabel.setAttribute('x', labelX);
    if (markerLabel.getAttribute('text-anchor') !== anchor) markerLabel.setAttribute('text-anchor', anchor);
    const date = formatFrauenburgInput(ut1Jd).split('T')[0];
    if (markerLabel.textContent !== date) markerLabel.textContent = date;
  }
  const outside = ut1Jd < samples.startUt1 || ut1Jd > samples.endUt1;
  const gaps = (samples.disagreement ? [samples.disagreement.first, samples.disagreement.second] : display.traces)
    .some(trace => traceCoverage(display, trace).status !== 'full');
  const noDifference = samples.disagreement?.values.every(value => value === null) ?? false;
  const status = [samples.disagreement ? t(language, 'disagreementZeroNote') : '',
    outside ? t(language, 'markerAtEdge') : '', gaps ? t(language,
      samples.disagreement ? 'disagreementGap' : 'plotGap') : '',
    noDifference ? t(language, 'disagreementNoData') : '']
    .filter(Boolean).join(' ');
  setText(panel, '[data-plot-status]', status);
  for (const trace of samples.disagreement ? [] : display.traces) {
    const value = traceLongitudeAt(trace, ut1Jd);
    setText(panel, `[data-current-trace="${trace.id}"]`, value === null
      ? t(language, 'currentUnavailable') : `${value.toFixed(3)}°`);
  }
  const disagreement = panel.querySelector<HTMLElement>('[data-disagreement]');
  if (disagreement) {
    disagreement.hidden = display.analysis.kind !== 'model-disagreement';
    if (!disagreement.hidden) {
      const value = modelDisagreementAt(display, ut1Jd);
      disagreement.textContent = value === null ? t(language, 'disagreementDateUnavailable')
        : `${disagreementLabel(samples.disagreement!.first, samples.disagreement!.second,
          language)}: ${value >= 0 ? '+' : ''}${value.toFixed(3)}°`;
    }
  }
}
