import { correspondingModelForBody, defaultPolicyForModel, firstModelForBody, historicalBodies,
  modelCapabilities, type HistoricalBody, type ModelId } from './model-registry.ts';
import { validateDisplay } from './workspace-validation.ts';
import { mapBodies } from './copernicus-map.ts';
import { angularBodies, angularModelFor, defaultAngularTrack, maxAngularTracks } from './angular-map.ts';
import { projectMapPoint, projectMapRadius, unprojectMapPoint, unprojectMapRadius } from './map-projection.ts';
import type { DisplayConfig, GeometryDisplay, PlanetaryMapDisplay, PlotTrace, TimeSeriesDisplay } from './workspace-types.ts';

export function changeMap(display: PlanetaryMapDisplay, setting: string,
  value: string | boolean): PlanetaryMapDisplay | null {
  let next: PlanetaryMapDisplay = display;
  if (setting === 'map-representation' && (value === 'spatial' || value === 'angular')) {
    next = { ...display, representation: value };
  } else if (setting === 'angular-system' && value === 'custom') {
    next = { ...display, angular: { ...display.angular, systemSelection: 'custom' } };
  } else if (setting === 'angular-system' &&
      (value === 'ptolemy' || value === 'copernicus')) {
    const tracks = angularBodies.map((body, index) => defaultAngularTrack(body, value,
      display.angular.tracks.find(track => track.body === body)?.id ?? `track-${index + 1}`));
    next = { ...display, angular: { ...display.angular, systemSelection: value,
      frameAlignment: 'native', tracks } };
  } else if (setting === 'angular-frame' &&
      (value === 'native' || value === 'nominal-historical-tropical')) {
    next = { ...display, angular: { ...display.angular, frameAlignment: value } };
  } else if (setting === 'angular-duration' && typeof value === 'string') {
    next = { ...display, angular: { ...display.angular, trailDays: Number(value) } };
  } else if (setting === 'angular-grid' || setting === 'angular-labels') {
    next = { ...display, angular: { ...display.angular,
      [setting === 'angular-grid' ? 'showGrid' : 'showLabels']: Boolean(value) } };
  } else if (setting.startsWith('angular:')) {
    const [, id, field] = setting.split(':');
    const track = display.angular.tracks.find(item => item.id === id);
    if (!track) return null;
    let replacement = track;
    if (field === 'visible') replacement = { ...track, visible: Boolean(value) };
    else if (field === 'trail') replacement = { ...track, trail: Boolean(value) };
    else if (field === 'model' && typeof value === 'string' &&
        (value === angularModelFor(track.body, 'ptolemy') ||
          value === angularModelFor(track.body, 'copernicus'))) {
      replacement = { ...track, modelId: value as string,
        policyId: value === 'copernicus' ? 'sn-local-uniform-1473-1523'
          : 'mathematical-continuation' };
    } else if (field === 'policy' && typeof value === 'string') {
      replacement = { ...track, policyId: value };
    } else return null;
    next = { ...display, angular: { ...display.angular, systemSelection: 'custom',
      tracks: display.angular.tracks.map(item => item.id === id ? replacement : item) } };
  } else if (setting.startsWith('angular-add:')) {
    const body = setting.slice('angular-add:'.length) as typeof angularBodies[number];
    if (!angularBodies.includes(body) || display.angular.tracks.length >= maxAngularTracks ||
        display.angular.tracks.filter(track => track.body === body).length >= 2) return null;
    const existing = new Set(display.angular.tracks.map(track => track.id));
    let number = 1;
    while (existing.has(`track-${number}`)) number += 1;
    const tradition = display.angular.tracks.find(track => track.body === body)?.modelId
      .startsWith('ptolemy') ? 'copernicus' : 'ptolemy';
    const added = defaultAngularTrack(body, tradition, `track-${number}`);
    next = { ...display, angular: { ...display.angular, systemSelection: 'custom',
      tracks: [...display.angular.tracks, added] } };
  } else if (setting.startsWith('angular-remove:')) {
    const id = setting.slice('angular-remove:'.length);
    if (display.angular.tracks.length <= 1 || !display.angular.tracks.some(track => track.id === id)) return null;
    next = { ...display, angular: { ...display.angular, systemSelection: 'custom',
      tracks: display.angular.tracks.filter(track => track.id !== id) } };
  } else if (setting === 'map-centre' && typeof value === 'string' && mapBodies.includes(value as typeof mapBodies[number])) {
    next = { ...display, spatial: { ...display.spatial, viewCenter: value as typeof mapBodies[number] } };
  } else if (setting === 'map-policy' && typeof value === 'string') {
    next = { ...display, spatial: { ...display.spatial,
      marsPolicyId: value as PlanetaryMapDisplay['spatial']['marsPolicyId'] } };
  } else if (setting === 'map-projection' && (value === 'linear' || value === 'asinh')) {
    // Camera offsets and radius are in display coordinates. Preserve their
    // corresponding historical targets when the display projection changes.
    const physicalTarget = unprojectMapPoint({ x: display.spatial.camera.offsetX,
      y: display.spatial.camera.offsetY }, display.spatial.radialProjection);
    const target = projectMapPoint(physicalTarget, value);
    next = { ...display, spatial: { ...display.spatial, radialProjection: value, camera: {
      offsetX: target.x, offsetY: target.y,
      radiusUnits: projectMapRadius(unprojectMapRadius(display.spatial.camera.radiusUnits,
        display.spatial.radialProjection), value),
    } } };
  } else if (setting === 'map-duration' && typeof value === 'string') {
    next = { ...display, spatial: { ...display.spatial, trailDays: Number(value) } };
  } else if (setting === 'map-grid') next = { ...display, spatial: { ...display.spatial, showGrid: Boolean(value) } };
  else if (setting === 'map-labels') next = { ...display, spatial: { ...display.spatial, showLabels: Boolean(value) } };
  else if (setting.startsWith('visible:')) {
    const body = setting.slice(8) as typeof mapBodies[number];
    if (!mapBodies.includes(body)) return null;
    next = { ...display, spatial: { ...display.spatial,
      visibleBodies: { ...display.spatial.visibleBodies, [body]: Boolean(value) } } };
  } else if (setting.startsWith('trail:')) {
    const body = setting.slice(6) as typeof mapBodies[number];
    if (!mapBodies.includes(body)) return null;
    next = { ...display, spatial: { ...display.spatial,
      bodyTrails: { ...display.spatial.bodyTrails, [body]: Boolean(value) } } };
  } else return null;
  return validateDisplay(next).length ? null : next;
}

/** Return a complete, validated replacement. Invalid edits leave the old panel intact. */
export function changeGeometry(display: GeometryDisplay, setting: string, value: string | boolean): GeometryDisplay | null {
  let next: GeometryDisplay = display;
  if (setting === 'body' && historicalBodies.includes(value as HistoricalBody)) {
    const body = value as HistoricalBody;
    const modelId = correspondingModelForBody(display.modelId as ModelId, body);
    const viewCenter = modelCapabilities[modelId].renderedViewCenters.includes(display.viewCenter)
      ? display.viewCenter : 'earth';
    next = { ...display, body, modelId,
      policyId: defaultPolicyForModel(modelId, 'geometry'), viewCenter };
  } else if (setting === 'model' && typeof value === 'string' && modelCapabilities[value]) {
    const modelId = value as ModelId;
    next = { ...display, body: modelCapabilities[modelId].body, modelId,
      policyId: defaultPolicyForModel(modelId, 'geometry'), viewCenter: 'earth' };
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
  if (setting === 'body' && historicalBodies.includes(value as HistoricalBody)) {
    const body = value as HistoricalBody;
    const modelId = correspondingModelForBody(old.modelId as ModelId, body);
    replacement = { ...old, body, modelId,
      observableId: 'geocentric-tropical-longitude',
      policyId: defaultPolicyForModel(modelId, 'plot') };
  } else if (setting === 'model' && modelCapabilities[value]) {
    const modelId = value as ModelId;
    replacement = { ...old, body: modelCapabilities[modelId].body, modelId,
      observableId: 'geocentric-tropical-longitude',
      policyId: defaultPolicyForModel(modelId, 'plot') };
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
  const firstBody = display.traces[0]?.body as HistoricalBody | undefined;
  const body: HistoricalBody = firstBody && display.traces.every(trace => trace.body === firstBody)
    ? firstBody : 'Mars';
  const modelId = firstModelForBody(body);
  const trace: PlotTrace = { id: `trace-${number}`, body, modelId,
    observableId: 'geocentric-tropical-longitude',
    policyId: defaultPolicyForModel(modelId, 'plot') };
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
