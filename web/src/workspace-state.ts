import { computationalUt1Domain, example1473Ut1, example1512Ut1,
  ptolemyDayToAssumedUt1, utcMillisToAssumedUt1 } from './comparison-time.ts';
import { exploratoryApsisPolicy } from './copernicus.ts';
import { modelCapabilities, type CapabilityRegistry } from './model-registry.ts';
import { exampleDay } from './historical-examples.ts';
import { isValidWorkspace, validateDisplay } from './workspace-validation.ts';
import { maxWorkspacePanels, workspaceSchemaVersion,
  type DisplayConfig, type GeometryDisplay, type PlotTrace, type TimeSeriesDisplay,
  type WorkspaceClock, type WorkspaceState } from './workspace-types.ts';

export type DisplayDraft = Omit<GeometryDisplay, 'id'> | Omit<TimeSeriesDisplay, 'id'>;
export type WorkspacePreset = 'explore-one' | 'compare-longitudes' | 'desktop-explore' | 'detailed-comparison';

export const initialClock: WorkspaceClock = {
  ut1Jd: example1512Ut1, playing: false, speedDaysPerSecond: 12, direction: 1,
};

export function emptyWorkspace(clock: WorkspaceClock = initialClock): WorkspaceState {
  return { schemaVersion: workspaceSchemaVersion, clock: { ...clock }, displays: [], nextPanelNumber: 1 };
}

/** Copy only the nested configuration structures in the two implemented kinds. */
function copyDisplay(display: DisplayConfig): DisplayConfig {
  if (display.kind === 'geometry') return { ...display, trail: {
    enabled: display.trail.enabled, days: display.trail.days,
  } };
  const analysis = display.analysis.kind === 'overlay'
    ? { kind: 'overlay' as const }
    : { kind: 'model-disagreement' as const,
      firstTraceId: display.analysis.firstTraceId, secondTraceId: display.analysis.secondTraceId };
  return {
    ...display,
    traces: display.traces.map(trace => ({ id: trace.id, body: trace.body,
      modelId: trace.modelId, observableId: trace.observableId, policyId: trace.policyId })),
    window: { startUt1: display.window.startUt1, endUt1: display.window.endUt1,
      followsClock: display.window.followsClock },
    analysis,
  };
}

/** Reject invalid saved data and always restore paused; storage itself belongs to Phase 4B. */
export function restoreWorkspace(value: unknown,
  registry: CapabilityRegistry = modelCapabilities): WorkspaceState | null {
  if (!isValidWorkspace(value, registry)) return null;
  return {
    ...value,
    clock: { ...value.clock, playing: false },
    displays: value.displays.map(copyDisplay),
  };
}

function withinNumericalDomain(ut1Jd: number): boolean {
  return Number.isFinite(ut1Jd) && ut1Jd >= computationalUt1Domain.start &&
    ut1Jd <= computationalUt1Domain.end;
}

/** This transition reads no panel policy. An unavailable panel cannot freeze time. */
export function setClockInstant(state: WorkspaceState, ut1Jd: number): WorkspaceState {
  return withinNumericalDomain(ut1Jd) ? { ...state, clock: { ...state.clock, ut1Jd } } : state;
}

export function stepClock(state: WorkspaceState, days: number): WorkspaceState {
  if (!Number.isFinite(days)) return state;
  const ut1Jd = Math.max(computationalUt1Domain.start,
    Math.min(computationalUt1Domain.end, state.clock.ut1Jd + days));
  return { ...state, clock: { ...state.clock, ut1Jd, playing: false } };
}

function jumpClock(state: WorkspaceState, ut1Jd: number): WorkspaceState {
  const moved = setClockInstant(state, ut1Jd);
  return moved === state ? state : setClockPlaying(moved, false);
}

/** UTC is treated as assumed UT1 only at this explicit Today boundary. */
export function jumpToToday(state: WorkspaceState, utcMilliseconds: number): WorkspaceState {
  return jumpClock(state, utcMillisToAssumedUt1(utcMilliseconds));
}

export function jumpToExample(state: WorkspaceState,
  example: 'nabonassar' | '1473' | '1512'): WorkspaceState {
  const ut1Jd = example === 'nabonassar' ? ptolemyDayToAssumedUt1(exampleDay)
    : example === '1473' ? example1473Ut1 : example1512Ut1;
  return jumpClock(state, ut1Jd);
}

export function setClockPlaying(state: WorkspaceState, playing: boolean): WorkspaceState {
  return { ...state, clock: { ...state.clock, playing } };
}

export function setClockSpeed(state: WorkspaceState, speedDaysPerSecond: number): WorkspaceState {
  return Number.isFinite(speedDaysPerSecond) && speedDaysPerSecond > 0
    ? { ...state, clock: { ...state.clock, speedDaysPerSecond } } : state;
}

export function setClockDirection(state: WorkspaceState, direction: 1 | -1): WorkspaceState {
  return { ...state, clock: { ...state.clock, direction } };
}

/** Called by one eventual animation loop; seconds are capped to avoid hidden-tab jumps. */
export function tickClock(state: WorkspaceState, seconds: number): WorkspaceState {
  if (!state.clock.playing || !Number.isFinite(seconds) || seconds <= 0) return state;
  const increment = Math.min(seconds, 0.1) * state.clock.speedDaysPerSecond * state.clock.direction;
  const ut1Jd = Math.max(computationalUt1Domain.start,
    Math.min(computationalUt1Domain.end, state.clock.ut1Jd + increment));
  const atEnd = state.clock.direction === 1
    ? ut1Jd === computationalUt1Domain.end : ut1Jd === computationalUt1Domain.start;
  return { ...state, clock: { ...state.clock, ut1Jd, playing: !atEnd } };
}

function nextPanelId(state: WorkspaceState): { id: string; next: number } {
  const used = new Set(state.displays.map(display => display.id));
  let number = state.nextPanelNumber;
  while (used.has(`panel-${number}`)) number += 1;
  return { id: `panel-${number}`, next: number + 1 };
}

export function addDisplay(state: WorkspaceState, draft: DisplayDraft,
  registry: CapabilityRegistry = modelCapabilities): WorkspaceState {
  if (state.displays.length >= maxWorkspacePanels) return state;
  const { id, next } = nextPanelId(state);
  const display = copyDisplay({ ...draft, id } as DisplayConfig);
  if (validateDisplay(display, registry).length) return state;
  return { ...state, displays: [...state.displays, display], nextPanelNumber: next };
}

export function removeDisplay(state: WorkspaceState, id: string): WorkspaceState {
  return state.displays.some(display => display.id === id)
    ? { ...state, displays: state.displays.filter(display => display.id !== id) } : state;
}

export function setDisplayCollapsed(state: WorkspaceState, id: string, collapsed: boolean): WorkspaceState {
  return { ...state, displays: state.displays.map(display =>
    display.id === id ? { ...display, collapsed } : display) };
}

export function moveDisplay(state: WorkspaceState, id: string, direction: 'up' | 'down'): WorkspaceState {
  const from = state.displays.findIndex(display => display.id === id);
  const to = from + (direction === 'up' ? -1 : 1);
  if (from < 0 || to < 0 || to >= state.displays.length) return state;
  const displays = [...state.displays];
  [displays[from], displays[to]] = [displays[to], displays[from]];
  return { ...state, displays };
}

/** A replacement keeps the panel identity and kind; it never rewrites another panel. */
export function updateDisplay(state: WorkspaceState, replacement: DisplayConfig,
  registry: CapabilityRegistry = modelCapabilities): WorkspaceState {
  const old = state.displays.find(display => display.id === replacement.id);
  if (!old || old.kind !== replacement.kind || validateDisplay(replacement, registry).length) return state;
  return { ...state, displays: state.displays.map(display =>
    display.id === replacement.id ? copyDisplay(replacement) : display) };
}

/** Plot pan and zoom change the authoritative endpoints, never the shared clock. */
export function panPlotWindow(state: WorkspaceState, id: string, days: number): WorkspaceState {
  const plot = state.displays.find(display => display.id === id);
  if (plot?.kind !== 'time-series' || !Number.isFinite(days)) return state;
  return updateDisplay(state, { ...plot, window: {
    ...plot.window, startUt1: plot.window.startUt1 + days,
    endUt1: plot.window.endUt1 + days,
  } });
}

/** Factor below one zooms in around an explicit anchor (the midpoint by default). */
export function zoomPlotWindow(state: WorkspaceState, id: string, factor: number,
  anchorUt1?: number): WorkspaceState {
  const plot = state.displays.find(display => display.id === id);
  if (plot?.kind !== 'time-series' || !Number.isFinite(factor) || factor <= 0) return state;
  const anchor = anchorUt1 ?? (plot.window.startUt1 + plot.window.endUt1) / 2;
  if (!Number.isFinite(anchor)) return state;
  return updateDisplay(state, { ...plot, window: {
    ...plot.window,
    startUt1: anchor + (plot.window.startUt1 - anchor) * factor,
    endUt1: anchor + (plot.window.endUt1 - anchor) * factor,
  } });
}

/** Follow only after the marker leaves the central 60% of a plot window.
 *  This preserves the span and avoids resampling curves on every animation frame.
 */
export function followWorkspaceClock(state: WorkspaceState): WorkspaceState {
  let next = state;
  for (const display of state.displays) {
    if (display.kind !== 'time-series' || !display.window.followsClock) continue;
    const span = display.window.endUt1 - display.window.startUt1;
    const lower = display.window.startUt1 + 0.2 * span;
    const upper = display.window.endUt1 - 0.2 * span;
    if (state.clock.ut1Jd >= lower && state.clock.ut1Jd <= upper) continue;
    next = updateDisplay(next, { ...display, window: {
      ...display.window,
      startUt1: state.clock.ut1Jd - span / 2,
      endUt1: state.clock.ut1Jd + span / 2,
    } });
  }
  return next;
}

const ptolemyGeometry: DisplayDraft = {
  kind: 'geometry', collapsed: false, body: 'Mars', modelId: 'ptolemy',
  policyId: 'mathematical-continuation', viewCenter: 'earth',
  trail: { enabled: true, days: 180 }, showCircles: true,
  showConstructionLines: true, showAnnotations: true,
};
const copernicusGeometry: DisplayDraft = {
  ...ptolemyGeometry, modelId: 'copernicus', policyId: 'sn-local-uniform-1473-1523',
  trail: { enabled: true, days: 180 },
};
const comparisonTraces: readonly PlotTrace[] = [
  { id: 'trace-1', body: 'Mars', modelId: 'ptolemy',
    observableId: 'geocentric-tropical-longitude', policyId: 'mathematical-continuation' },
  { id: 'trace-2', body: 'Mars', modelId: 'copernicus',
    observableId: 'geocentric-tropical-longitude', policyId: exploratoryApsisPolicy },
];
const longitudePlot: DisplayDraft = {
  kind: 'time-series', collapsed: false, traces: comparisonTraces,
  window: { startUt1: example1512Ut1 - 182.5, endUt1: example1512Ut1 + 182.5,
    followsClock: false },
  longitudeMode: 'unwrapped', horizontalAxis: 'assumed-ut1-jd',
  verticalAxis: 'longitude-degrees', frameAlignment: 'nominal-historical-tropical',
  analysis: { kind: 'overlay' },
};

export const workspacePresets: Readonly<Record<WorkspacePreset, readonly DisplayDraft[]>> = {
  'explore-one': [ptolemyGeometry],
  'compare-longitudes': [longitudePlot],
  'desktop-explore': [longitudePlot, ptolemyGeometry],
  'detailed-comparison': [longitudePlot, ptolemyGeometry, copernicusGeometry],
};

/** Applying a layout is deliberate; a viewport change never calls this function. */
export function applyWorkspacePreset(state: WorkspaceState, preset: WorkspacePreset): WorkspaceState {
  let next = { ...state, displays: [] as readonly DisplayConfig[] };
  for (const draft of workspacePresets[preset]) next = addDisplay(next, draft);
  return next;
}

export function suggestedPresetForViewport(widthCssPx: number): WorkspacePreset {
  return widthCssPx < 600 ? 'compare-longitudes' : 'desktop-explore';
}

export function suggestedWorkspace(widthCssPx: number): WorkspaceState {
  return applyWorkspacePreset(emptyWorkspace(), suggestedPresetForViewport(widthCssPx));
}
