import { computationalUt1Domain } from './comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy } from './copernicus.ts';
import { mapBodies } from './copernicus-map.ts';
import { modelCapabilities, type CapabilityRegistry, type ModelCapability } from './model-registry.ts';
import { initialPlotTraceLimit, maxPlotWindowDays, maxWorkspacePanels, workspaceSchemaVersion,
  type DisplayConfig, type PlotTrace, type TimeSeriesDisplay, type WorkspaceState } from './workspace-types.ts';

export type IssueCode = 'invalid-schema' | 'invalid-clock' | 'invalid-display' | 'duplicate-id' |
  'invalid-panel-id' | 'invalid-counter' | 'renderer-unavailable' |
  'panel-limit' | 'trace-limit' | 'unknown-model' | 'unsupported-body' |
  'unsupported-observable' | 'unsupported-center' | 'unsupported-policy' |
  'invalid-settings' | 'invalid-window' | 'invalid-disagreement' | 'incompatible-frame' |
  'outside-computational-domain' | 'outside-policy-domain';
export type ValidationIssue = Readonly<{ code: IssueCode; displayId?: string; traceId?: string }>;
export type Availability = Readonly<{ status: 'available' | 'partial' | 'unavailable'; issues: readonly ValidationIssue[] }>;
export type TraceCoverage = Readonly<{
  status: 'full' | 'partial' | 'none';
  availableRange?: Readonly<{ start: number; end: number }>;
  issues: readonly ValidationIssue[];
}>;

function issue(code: IssueCode, displayId?: string, traceId?: string): ValidationIssue {
  return { code, displayId, traceId };
}

function modelFor(body: string, modelId: string, registry: CapabilityRegistry,
  displayId: string, traceId?: string): { model?: ModelCapability; issues: ValidationIssue[] } {
  const model = registry[modelId];
  if (!model) return { issues: [issue('unknown-model', displayId, traceId)] };
  return { model, issues: model.body === body ? [] : [issue('unsupported-body', displayId, traceId)] };
}

function policyIssue(model: ModelCapability, policyId: string, displayId: string, traceId?: string): ValidationIssue[] {
  return Object.hasOwn(model.policies, policyId) ? [] : [issue('unsupported-policy', displayId, traceId)];
}

function traceIssues(trace: PlotTrace, displayId: string, registry: CapabilityRegistry): ValidationIssue[] {
  const result = modelFor(trace.body, trace.modelId, registry, displayId, trace.id);
  if (!result.model) return result.issues;
  const issues = [...result.issues, ...policyIssue(result.model, trace.policyId, displayId, trace.id)];
  if (!result.model.observables.some(observable => observable.id === trace.observableId)) {
    issues.push(issue('unsupported-observable', displayId, trace.id));
  }
  return issues;
}

/** Frame metadata stays with the model; native overlays must label every trace. */
export function nativeFrameForTrace(trace: PlotTrace,
  registry: CapabilityRegistry = modelCapabilities): string | null {
  return registry[trace.modelId]?.observables.find(item => item.id === trace.observableId)?.frame ?? null;
}

function disagreementIssues(plot: TimeSeriesDisplay, registry: CapabilityRegistry): ValidationIssue[] {
  const analysis = plot.analysis;
  if (analysis.kind !== 'model-disagreement') return [];
  const first = plot.traces.find(trace => trace.id === analysis.firstTraceId);
  const second = plot.traces.find(trace => trace.id === analysis.secondTraceId);
  if (!first || !second || first.id === second.id || first.body !== second.body ||
      first.observableId !== second.observableId || first.modelId === second.modelId) {
    return [issue('invalid-disagreement', plot.id)];
  }
  const firstFrame = nativeFrameForTrace(first, registry);
  const secondFrame = nativeFrameForTrace(second, registry);
  if (!firstFrame || !secondFrame) return [];
  if (firstFrame === secondFrame) return [];
  if (plot.frameAlignment === 'nominal-historical-tropical' &&
      first.observableId === 'geocentric-tropical-longitude') return [];
  return [issue('incompatible-frame', plot.id)];
}

/** Static support checks; historical date availability is assessed separately. */
export function validateDisplay(display: DisplayConfig,
  registry: CapabilityRegistry = modelCapabilities): ValidationIssue[] {
  if (display.kind === 'planetary-map') {
    const validBodies = new Set<string>(mapBodies);
    const issueForMap = (): ValidationIssue[] => [issue('invalid-settings', display.id)];
    if (display.systemId !== 'copernicus-1543' || !validBodies.has(display.viewCenter) ||
        (display.radialProjection !== 'linear' && display.radialProjection !== 'asinh') ||
        (display.marsPolicyId !== apsisPolicy && display.marsPolicyId !== exploratoryApsisPolicy) ||
        !Number.isFinite(display.trailDays) || display.trailDays < 1 || display.trailDays > 365 * 30 ||
        !Number.isFinite(display.camera.radiusUnits) || display.camera.radiusUnits < 500 ||
        display.camera.radiusUnits > 1_000_000 ||
        !Number.isFinite(display.camera.offsetX) || Math.abs(display.camera.offsetX) > 1_000_000 ||
        !Number.isFinite(display.camera.offsetY) || Math.abs(display.camera.offsetY) > 1_000_000 ||
        typeof display.showLabels !== 'boolean' || typeof display.showGrid !== 'boolean' ||
        mapBodies.some(body => typeof display.visibleBodies[body] !== 'boolean' ||
          typeof display.bodyTrails[body] !== 'boolean')) return issueForMap();
    return [];
  }
  if (display.kind === 'geometry') {
    const result = modelFor(display.body, display.modelId, registry, display.id);
    if (!result.model) return result.issues;
    const issues = [...result.issues, ...policyIssue(result.model, display.policyId, display.id)];
    if (!result.model.viewCenters.includes(display.viewCenter)) issues.push(issue('unsupported-center', display.id));
    if (!Number.isFinite(display.trail.days) || display.trail.days <= 0) issues.push(issue('invalid-settings', display.id));
    return issues;
  }
  const issues = display.traces.flatMap(trace => traceIssues(trace, display.id, registry));
  if (display.traces.length === 0) issues.push(issue('invalid-settings', display.id));
  if (display.traces.length > initialPlotTraceLimit) issues.push(issue('trace-limit', display.id));
  if (new Set(display.traces.map(trace => trace.id)).size !== display.traces.length) {
    issues.push(issue('duplicate-id', display.id));
  }
  const window = display.window;
  if (!Number.isFinite(window.startUt1) || !Number.isFinite(window.endUt1) ||
      window.startUt1 >= window.endUt1 || window.endUt1 - window.startUt1 > maxPlotWindowDays) {
    issues.push(issue('invalid-window', display.id));
  }
  if (display.frameAlignment === 'nominal-historical-tropical' &&
      display.traces.some(trace => trace.observableId !== 'geocentric-tropical-longitude')) {
    issues.push(issue('incompatible-frame', display.id));
  }
  issues.push(...disagreementIssues(display, registry));
  return issues;
}

function dateIssues(model: ModelCapability, policyId: string, ut1Jd: number,
  displayId: string, traceId?: string): ValidationIssue[] {
  if (!Number.isFinite(ut1Jd) || ut1Jd < computationalUt1Domain.start ||
      ut1Jd > computationalUt1Domain.end) return [issue('outside-computational-domain', displayId, traceId)];
  const domain = model.policies[policyId];
  if (domain && (ut1Jd < domain.start || ut1Jd > domain.end)) {
    return [issue('outside-policy-domain', displayId, traceId)];
  }
  return [];
}

/** Current-time marker/readout availability; plot-window coverage is separate. */
export function displayAvailabilityAt(display: DisplayConfig, ut1Jd: number,
  registry: CapabilityRegistry = modelCapabilities): Availability {
  const issues = validateDisplay(display, registry);
  if (issues.length) return { status: 'unavailable', issues };
  if (display.kind === 'planetary-map') {
    if (!Number.isFinite(ut1Jd) || ut1Jd < computationalUt1Domain.start ||
        ut1Jd > computationalUt1Domain.end) issues.push(issue('outside-computational-domain', display.id));
    const marsDomain = registry.copernicus.policies[apsisPolicy];
    if (display.viewCenter === 'mars' && display.marsPolicyId === apsisPolicy) {
      if (marsDomain && (ut1Jd < marsDomain.start || ut1Jd > marsDomain.end)) {
        issues.push(issue('outside-policy-domain', display.id));
      }
    }
    return { status: issues.length ? 'unavailable'
      : display.marsPolicyId === apsisPolicy && marsDomain &&
        (ut1Jd < marsDomain.start || ut1Jd > marsDomain.end) ? 'partial' : 'available', issues };
  }
  if (display.kind === 'geometry') {
    const model = registry[display.modelId];
    if (model) {
      if (!model.renderedViewCenters.includes(display.viewCenter)) {
        issues.push(issue('renderer-unavailable', display.id));
      }
      issues.push(...dateIssues(model, display.policyId, ut1Jd, display.id));
    }
    return { status: issues.length ? 'unavailable' : 'available', issues };
  } else {
    let availableTraces = 0;
    for (const trace of display.traces) {
      const model = registry[trace.modelId];
      if (!model) continue;
      const traceDateIssues = dateIssues(model, trace.policyId, ut1Jd, display.id, trace.id);
      issues.push(...traceDateIssues);
      if (traceDateIssues.length === 0) availableTraces += 1;
    }
    return { status: issues.length === 0 ? 'available'
      : availableTraces > 0 ? 'partial' : 'unavailable', issues };
  }
}

/** A partial plot window must be drawn with a gap outside the available range. */
export function traceCoverage(plot: TimeSeriesDisplay, trace: PlotTrace,
  registry: CapabilityRegistry = modelCapabilities): TraceCoverage {
  const issues = traceIssues(trace, plot.id, registry);
  if (!Number.isFinite(plot.window.startUt1) || !Number.isFinite(plot.window.endUt1) ||
      plot.window.startUt1 >= plot.window.endUt1) {
    return { status: 'none', issues: [issue('invalid-window', plot.id, trace.id)] };
  }
  const model = registry[trace.modelId];
  if (issues.length || !model || !Object.hasOwn(model.policies, trace.policyId)) {
    return { status: 'none', issues };
  }
  const policyRange = model.policies[trace.policyId];
  const start = Math.max(plot.window.startUt1, computationalUt1Domain.start, policyRange?.start ?? -Infinity);
  const end = Math.min(plot.window.endUt1, computationalUt1Domain.end, policyRange?.end ?? Infinity);
  const policyClipsWindow = policyRange &&
    (plot.window.startUt1 < policyRange.start || plot.window.endUt1 > policyRange.end);
  const limitIssue = issue(policyClipsWindow ? 'outside-policy-domain' : 'outside-computational-domain',
    plot.id, trace.id);
  if (start >= end) return { status: 'none', issues: [limitIssue] };
  const status = start === plot.window.startUt1 && end === plot.window.endUt1 ? 'full' : 'partial';
  return { status, availableRange: { start, end }, issues: status === 'partial'
    ? [limitIssue] : [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Checks untrusted saved JSON before any typed display validation. */
export function validateWorkspace(value: unknown,
  registry: CapabilityRegistry = modelCapabilities): ValidationIssue[] {
  if (!isRecord(value) || value.schemaVersion !== workspaceSchemaVersion ||
      !Array.isArray(value.displays) || !Number.isSafeInteger(value.nextPanelNumber) ||
      (value.nextPanelNumber as number) < 1) return [issue('invalid-schema')];
  const issues: ValidationIssue[] = [];
  const clock = value.clock;
  if (!isRecord(clock) || !Number.isFinite(clock.ut1Jd) ||
      (clock.ut1Jd as number) < computationalUt1Domain.start ||
      (clock.ut1Jd as number) > computationalUt1Domain.end ||
      typeof clock.playing !== 'boolean' ||
      !Number.isFinite(clock.speedDaysPerSecond) || (clock.speedDaysPerSecond as number) <= 0 ||
      (clock.direction !== 1 && clock.direction !== -1)) issues.push(issue('invalid-clock'));
  if (value.displays.length > maxWorkspacePanels) issues.push(issue('panel-limit'));
  const ids = new Set<string>();
  let largestPanelNumber = 0;
  for (const raw of value.displays) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id ||
        typeof raw.collapsed !== 'boolean' ||
        (raw.kind !== 'geometry' && raw.kind !== 'time-series' && raw.kind !== 'planetary-map')) {
      issues.push(issue('invalid-display')); continue;
    }
    if (ids.has(raw.id)) issues.push(issue('duplicate-id', raw.id));
    ids.add(raw.id);
    const panelId = /^panel-([1-9]\d*)$/.exec(raw.id);
    const panelNumber = panelId ? Number(panelId[1]) : NaN;
    if (!Number.isSafeInteger(panelNumber)) issues.push(issue('invalid-panel-id', raw.id));
    else largestPanelNumber = Math.max(largestPanelNumber, panelNumber);
    if (raw.kind === 'planetary-map' && raw.systemId === 'copernicus-1543' &&
        typeof raw.viewCenter === 'string' && typeof raw.marsPolicyId === 'string' &&
        typeof raw.radialProjection === 'string' &&
        isRecord(raw.visibleBodies) && isRecord(raw.bodyTrails) &&
        typeof raw.trailDays === 'number' && isRecord(raw.camera) &&
        typeof raw.camera.offsetX === 'number' && typeof raw.camera.offsetY === 'number' &&
        typeof raw.camera.radiusUnits === 'number' && typeof raw.showLabels === 'boolean' &&
        typeof raw.showGrid === 'boolean') {
      issues.push(...validateDisplay(raw as unknown as DisplayConfig, registry));
    } else if (typeof raw.body === 'string' && typeof raw.modelId === 'string' &&
        typeof raw.policyId === 'string' && raw.kind === 'geometry' &&
        isRecord(raw.trail) && typeof raw.trail.enabled === 'boolean' &&
        typeof raw.trail.days === 'number' && typeof raw.viewCenter === 'string' &&
        typeof raw.showCircles === 'boolean' && typeof raw.showConstructionLines === 'boolean' &&
        typeof raw.showAnnotations === 'boolean') {
      issues.push(...validateDisplay(raw as unknown as DisplayConfig, registry));
    } else if (raw.kind === 'time-series' && Array.isArray(raw.traces) &&
        raw.traces.every(trace => isRecord(trace) && typeof trace.id === 'string' &&
          typeof trace.body === 'string' && typeof trace.modelId === 'string' &&
          typeof trace.observableId === 'string' && typeof trace.policyId === 'string') &&
        isRecord(raw.window) && typeof raw.window.startUt1 === 'number' &&
        typeof raw.window.endUt1 === 'number' && typeof raw.window.followsClock === 'boolean' &&
        ['wrapped', 'unwrapped'].includes(String(raw.longitudeMode)) &&
        raw.horizontalAxis === 'assumed-ut1-jd' && raw.verticalAxis === 'longitude-degrees' &&
        ['native', 'nominal-historical-tropical'].includes(String(raw.frameAlignment)) &&
        isRecord(raw.analysis) &&
        (raw.analysis.kind === 'overlay' ||
          (raw.analysis.kind === 'model-disagreement' &&
           typeof raw.analysis.firstTraceId === 'string' &&
           typeof raw.analysis.secondTraceId === 'string'))) {
      issues.push(...validateDisplay(raw as unknown as DisplayConfig, registry));
    } else issues.push(issue('invalid-display', raw.id));
  }
  if ((value.nextPanelNumber as number) <= largestPanelNumber) issues.push(issue('invalid-counter'));
  return issues;
}

export function isValidWorkspace(value: unknown,
  registry: CapabilityRegistry = modelCapabilities): value is WorkspaceState {
  return validateWorkspace(value, registry).length === 0;
}
