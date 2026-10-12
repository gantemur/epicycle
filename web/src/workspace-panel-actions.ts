import { modelCapabilities } from './model-registry.ts';
import { exploratoryApsisPolicy } from './copernicus.ts';
import { validateDisplay } from './workspace-validation.ts';
import type { DisplayConfig, GeometryDisplay, PlotTrace, TimeSeriesDisplay } from './workspace-types.ts';

const sourcePolicy = 'sn-local-uniform-1473-1523';

/** Return a complete, validated replacement. Invalid edits leave the old panel intact. */
export function changeGeometry(display: GeometryDisplay, setting: string, value: string | boolean): GeometryDisplay | null {
  let next: GeometryDisplay = display;
  if (setting === 'model' && typeof value === 'string' && modelCapabilities[value]) {
    next = { ...display, modelId: value,
      policyId: value === 'ptolemy' ? 'mathematical-continuation' : sourcePolicy,
      // A newly selected model starts with its supported Earth-centred view.
      viewCenter: 'earth' };
  } else if (setting === 'view-center') {
    if (value !== 'earth' && value !== 'true-sun') return null;
    next = { ...display, viewCenter: value };
  } else if (setting === 'policy' && typeof value === 'string') next = { ...display, policyId: value };
  else if (setting === 'trail') next = { ...display, trail: { ...display.trail, enabled: Boolean(value) } };
  else if (setting === 'trail-days' && typeof value === 'string') {
    next = { ...display, trail: { ...display.trail, days: Number(value) } };
  } else if (setting === 'circles') next = { ...display, showCircles: Boolean(value) };
  else if (setting === 'lines') next = { ...display, showConstructionLines: Boolean(value) };
  else if (setting === 'labels') next = { ...display, showAnnotations: Boolean(value) };
  return validateDisplay(next).length ? null : next;
}

export function changeTrace(display: TimeSeriesDisplay, traceId: string,
  setting: string, value: string): TimeSeriesDisplay | null {
  const old = display.traces.find(trace => trace.id === traceId);
  if (!old) return null;
  let replacement: PlotTrace = old;
  if (setting === 'model' && modelCapabilities[value]) {
    replacement = { ...old, modelId: value,
      observableId: 'geocentric-tropical-longitude',
      policyId: value === 'ptolemy' ? 'mathematical-continuation' : exploratoryApsisPolicy };
  } else if (setting === 'policy') replacement = { ...old, policyId: value };
  else if (setting === 'observable') replacement = { ...old, observableId: value };
  const next: TimeSeriesDisplay = { ...display,
    traces: display.traces.map(trace => trace.id === traceId ? replacement : trace),
    frameAlignment: replacement.observableId === 'geocentric-sidereal-longitude' ? 'native' : display.frameAlignment,
  };
  if (validateDisplay(next).length === 0) return next;
  // A changed observable or model can invalidate a disagreement pair; keep
  // the valid trace edit as an overlay rather than retaining a false residual.
  const overlay = { ...next, analysis: { kind: 'overlay' as const } };
  return validateDisplay(overlay).length ? null : overlay;
}

export function addTrace(display: TimeSeriesDisplay): TimeSeriesDisplay | null {
  if (display.traces.length >= 4) return null;
  let number = 1;
  const ids = new Set(display.traces.map(trace => trace.id));
  while (ids.has(`trace-${number}`)) number += 1;
  const trace: PlotTrace = { id: `trace-${number}`, body: 'Mars', modelId: 'ptolemy',
    observableId: 'geocentric-tropical-longitude', policyId: 'mathematical-continuation' };
  return { ...display, traces: [...display.traces, trace] };
}

export function removeTrace(display: TimeSeriesDisplay, traceId: string): TimeSeriesDisplay | null {
  if (display.traces.length <= 1 || !display.traces.some(trace => trace.id === traceId)) return null;
  return { ...display, traces: display.traces.filter(trace => trace.id !== traceId),
    analysis: { kind: 'overlay' } };
}

export function changePlot(display: TimeSeriesDisplay, setting: string, value: string | boolean): TimeSeriesDisplay | null {
  let next: TimeSeriesDisplay = display;
  if (setting === 'follow-time') next = { ...display, window: { ...display.window, followsClock: Boolean(value) } };
  else if (setting === 'longitude-mode' && (value === 'wrapped' || value === 'unwrapped')) {
    next = { ...display, longitudeMode: value };
  } else if (setting === 'frame-alignment' && (value === 'native' || value === 'nominal-historical-tropical')) {
    next = { ...display, frameAlignment: value };
  } else if (setting === 'analysis') {
    next = { ...display, analysis: value === 'model-disagreement' && display.traces.length >= 2
      ? { kind: 'model-disagreement', firstTraceId: display.traces[0].id,
        secondTraceId: display.traces[1].id } : { kind: 'overlay' } };
  } else if ((setting === 'first-trace' || setting === 'second-trace') &&
      display.analysis.kind === 'model-disagreement' && typeof value === 'string') {
    const { firstTraceId, secondTraceId } = display.analysis;
    const swap = setting === 'first-trace' ? value === secondTraceId : value === firstTraceId;
    next = { ...display, analysis: swap
      ? { kind: 'model-disagreement', firstTraceId: secondTraceId, secondTraceId: firstTraceId }
      : { ...display.analysis,
        [setting === 'first-trace' ? 'firstTraceId' : 'secondTraceId']: value } };
  }
  return validateDisplay(next).length ? null : next;
}

export function validReplacement(display: DisplayConfig): boolean {
  return validateDisplay(display).length === 0;
}
