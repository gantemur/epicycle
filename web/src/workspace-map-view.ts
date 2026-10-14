import { comparisonUt1Domain, computationalUt1Domain } from './comparison-time.ts';
import { clearAngularTrailCache, renderAngularDynamic, renderAngularStatic } from './angular-map-view.ts';
import { apsisPolicy, exploratoryApsisPolicy } from './copernicus.ts';
import { evaluateCopernicusMap, mapBodies, mapView, sampleMapTrails,
  type MapBody, type MapSnapshot, type MapTrailSample } from './copernicus-map.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { projectMapPoint, projectMapRadius } from './map-projection.ts';
import type { Point } from './model.ts';
import type { PlanetaryMapDisplay } from './workspace-types.ts';

const labelKeys: Readonly<Record<MapBody, MessageKey>> = {
  'true-sun': 'trueSun', earth: 'earth', mars: 'mars', jupiter: 'jupiter', saturn: 'saturn',
};
const t = (language: Language, key: MessageKey): string => message(language, key);
const durations = [90, 365, 730, 365 * 5, 365 * 30];
const durationKeys: MessageKey[] = ['map90', 'map365', 'map730', 'mapFiveYears', 'mapThirtyYears'];
const colors: Readonly<Record<MapBody, string>> = {
  'true-sun': '#f4c879', earth: '#91cfdf', mars: '#e89178',
  jupiter: '#d8b787', saturn: '#b6a6d9',
};
const escapeHtml = (value: string): string => value.replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const checked = (value: boolean): string => value ? 'checked' : '';
const setText = (panel: HTMLElement, selector: string, value: string): void => {
  const node = panel.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== value) node.textContent = value;
};

/** Six days resolves Earth's yearly curve with roughly 61 points per turn. */
export const mapTrailCadence = (days: number): number => days > 365 * 5 ? 6 : 3;
type Trails = Readonly<Partial<Record<MapBody, readonly (MapTrailSample | null)[]>>>;
type CacheEntry = { key: string; trails: Trails };
const trailCache = new Map<string, CacheEntry>();

export function mapTrailCacheKey(display: PlanetaryMapDisplay, ut1Jd: number): string {
  const step = mapTrailCadence(display.spatial.trailDays);
  const gridStart = Math.ceil((ut1Jd - display.spatial.trailDays) / step) * step;
  const gridEnd = Math.floor(ut1Jd / step) * step;
  const bodies = mapBodies.filter(body => display.spatial.visibleBodies[body] && display.spatial.bodyTrails[body]);
  return ['copernicus-1543', display.spatial.marsPolicyId, display.spatial.viewCenter,
    display.spatial.trailDays, step, gridStart, gridEnd, bodies.join(',')].join('|');
}

function cachedTrails(display: PlanetaryMapDisplay, ut1Jd: number): CacheEntry {
  const key = mapTrailCacheKey(display, ut1Jd);
  const cached = trailCache.get(display.id);
  if (cached?.key === key) return cached;
  const step = mapTrailCadence(display.spatial.trailDays);
  const start = Math.ceil((ut1Jd - display.spatial.trailDays) / step) * step;
  const end = Math.floor(ut1Jd / step) * step;
  const bodies = mapBodies.filter(body => display.spatial.visibleBodies[body] && display.spatial.bodyTrails[body]);
  const trails = bodies.length ? sampleMapTrails(bodies, display.spatial.viewCenter, display.spatial.marsPolicyId,
    start, end, step) : {};
  const result = { key, trails };
  trailCache.set(display.id, result);
  return result;
}

export function clearMapTrailCache(id: string): void {
  trailCache.delete(id);
  clearAngularTrailCache(id);
}

function screen(point: Point, display: PlanetaryMapDisplay): Point {
  const projected = projectMapPoint(point, display.spatial.radialProjection);
  const pixelsPerUnit = 270 / display.spatial.camera.radiusUnits;
  return { x: 340 + (projected.x - display.spatial.camera.offsetX) * pixelsPerUnit,
    y: 340 - (projected.y - display.spatial.camera.offsetY) * pixelsPerUnit };
}
const coordinate = (value: number): string => value.toFixed(2);

/** Lines split at missing samples and at the exploratory provenance boundary. */
export function renderMapTrails(display: PlanetaryMapDisplay, trails: Trails): string {
  const paths: string[] = [];
  for (const body of mapBodies) {
    if (!display.spatial.visibleBodies[body] || !display.spatial.bodyTrails[body] || body === display.spatial.viewCenter) continue;
    const samples = trails[body] ?? [];
    let points: Point[] = [];
    let exploratory = false;
    const flush = (): void => {
      if (points.length > 1) {
        const coordinates = points.map((point, index) => {
          const p = screen(point, display);
          return `${index ? 'L' : 'M'}${coordinate(p.x)},${coordinate(p.y)}`;
        }).join(' ');
        paths.push(`<path class="map-trail" data-body="${body}" data-provenance="${exploratory ? 'dashed' : 'solid'}" d="${coordinates}" stroke="${colors[body]}"/>`);
      }
      points = [];
    };
    for (const sample of samples) {
      if (!sample) { flush(); continue; }
      const nextExploratory = sample.provenance === 'exploratory-continuation';
      if (points.length && exploratory !== nextExploratory) {
        const sharedBoundary = points.at(-1)!;
        flush();
        points.push(sharedBoundary);
      }
      exploratory = nextExploratory;
      points.push(sample.point);
    }
    flush();
  }
  return paths.join('');
}

function renderTrailEndpoints(display: PlanetaryMapDisplay, trails: Trails,
  current: MapSnapshot): string {
  const view = mapView(current, display.spatial.viewCenter);
  if (!view.available) return '';
  const lines: string[] = [];
  const line = (body: MapBody, from: Point, to: Point, provenance: MapTrailSample['provenance']): void => {
    const a = screen(from, display);
    const b = screen(to, display);
    const style = provenance === 'exploratory-continuation' ? 'dashed' : 'solid';
    lines.push(`<path class="map-trail" data-body="${body}" data-provenance="${style}" d="M${coordinate(a.x)},${coordinate(a.y)} L${coordinate(b.x)},${coordinate(b.y)}" stroke="${colors[body]}"/>`);
  };
  const bridge = (body: MapBody, from: MapTrailSample | null,
    to: MapTrailSample | null, fromTime: number, toTime: number): void => {
    if (fromTime >= toTime) return;
    const boundary = [comparisonUt1Domain.start, comparisonUt1Domain.end]
      .find(candidate => candidate > fromTime && candidate < toTime);
    const boundaryRelative = boundary === undefined || (body !== 'mars' && display.spatial.viewCenter !== 'mars')
      ? undefined : mapView(evaluateCopernicusMap(boundary, display.spatial.marsPolicyId),
        display.spatial.viewCenter).bodies[body];
    if (boundaryRelative) {
      if (from) line(body, from.point, boundaryRelative.point, from.provenance);
      if (to) line(body, boundaryRelative.point, to.point, to.provenance);
    } else if (from && to) line(body, from.point, to.point, to.provenance);
  };
  const exactStart = current.ut1Jd - display.spatial.trailDays;
  const startView = exactStart >= computationalUt1Domain.start
    ? mapView(evaluateCopernicusMap(exactStart, display.spatial.marsPolicyId), display.spatial.viewCenter) : null;
  const cadence = mapTrailCadence(display.spatial.trailDays);
  const gridStart = Math.ceil(exactStart / cadence) * cadence;
  const gridEnd = Math.floor(current.ut1Jd / cadence) * cadence;
  for (const body of mapBodies) {
    if (!display.spatial.visibleBodies[body] || !display.spatial.bodyTrails[body] || body === display.spatial.viewCenter) continue;
    const samples = trails[body];
    const first = samples?.[0] ?? null;
    const last = samples?.at(-1) ?? null;
    const actualStart = startView?.bodies[body];
    const actualEnd = view.bodies[body];
    bridge(body, actualStart ? { ut1Jd: exactStart, point: actualStart.point,
      provenance: actualStart.provenance } : null, first, exactStart, gridStart);
    bridge(body, last, actualEnd ? { ut1Jd: current.ut1Jd, point: actualEnd.point,
      provenance: actualEnd.provenance } : null, gridEnd, current.ut1Jd);
  }
  return lines.join('');
}

export function renderMapGrid(display: PlanetaryMapDisplay, language: Language): string {
  if (!display.spatial.showGrid) return '';
  const origin = screen({ x: 0, y: 0 }, display);
  const rings = [10000, 30000, 60000, 100000].map(physicalRadius => {
    const pixels = projectMapRadius(physicalRadius, display.spatial.radialProjection) *
      270 / display.spatial.camera.radiusUnits;
    return `<circle cx="${coordinate(origin.x)}" cy="${coordinate(origin.y)}" r="${coordinate(pixels)}"/>`;
  }).join('');
  return `<g class="map-grid"><path d="M0 ${coordinate(origin.y)}H680 M${coordinate(origin.x)} 0V680"/>${rings}</g>
    <text class="map-scale" x="18" y="665">${escapeHtml(t(language, 'mapScale'))} · R=10000</text>`;
}

export function renderMapMarkers(display: PlanetaryMapDisplay,
  snapshot: MapSnapshot, language: Language): string {
  const view = mapView(snapshot, display.spatial.viewCenter);
  if (!view.available) return '';
  const markers: string[] = [];
  const labelled: Point[] = [];
  for (const body of mapBodies) {
    if (!display.spatial.visibleBodies[body] && body !== display.spatial.viewCenter) continue;
    const relative = view.bodies[body];
    if (!relative) continue;
    const p = screen(relative.point, display);
    const name = t(language, labelKeys[body]);
    const center = body === display.spatial.viewCenter;
    markers.push(`<g class="map-body ${center ? 'map-centre' : ''}" data-body="${body}" role="img" aria-label="${escapeHtml(name)}: ${center ? escapeHtml(t(language, 'mapZero')) : relative.distance.toFixed(1) + ', ' + relative.siderealAngle.toFixed(2) + '°'}">
      <circle cx="${coordinate(p.x)}" cy="${coordinate(p.y)}" r="${center ? 9 : 7}" fill="${colors[body]}"/>
      ${center ? `<circle class="map-centre-ring" cx="${coordinate(p.x)}" cy="${coordinate(p.y)}" r="15"/>` : ''}
      <title>${escapeHtml(name)}</title></g>`);
    // Compact labels yield to the legend when inner points are too close.
    const centrePixel = screen({ x: 0, y: 0 }, display);
    const farEnoughFromCentre = center || Math.hypot(p.x - centrePixel.x, p.y - centrePixel.y) > 55;
    if (display.spatial.showLabels && farEnoughFromCentre &&
        labelled.every(previous => Math.hypot(previous.x - p.x, previous.y - p.y) > 55)) {
      markers.push(`<text class="map-body-label" x="${coordinate(p.x + 12)}" y="${coordinate(p.y - 12)}" fill="${colors[body]}">${escapeHtml(name)}</text>`);
      labelled.push(p);
    }
  }
  return markers.join('');
}

export function mapFitPositions(display: PlanetaryMapDisplay, ut1Jd: number): readonly Point[] {
  if (display.representation !== 'spatial') return [];
  const snapshot = evaluateCopernicusMap(ut1Jd, display.spatial.marsPolicyId);
  const view = mapView(snapshot, display.spatial.viewCenter);
  if (!view.available) return [];
  const points = mapBodies.filter(body => display.spatial.visibleBodies[body] || body === display.spatial.viewCenter)
    .flatMap(body => view.bodies[body] ? [view.bodies[body]!.point] : []);
  const trails = cachedTrails(display, ut1Jd).trails;
  for (const body of mapBodies) for (const sample of trails[body] ?? []) {
    if (sample) points.push(sample.point);
  }
  const exactStart = ut1Jd - display.spatial.trailDays;
  if (exactStart >= computationalUt1Domain.start) {
    const startView = mapView(evaluateCopernicusMap(exactStart, display.spatial.marsPolicyId), display.spatial.viewCenter);
    for (const body of mapBodies) {
      if (display.spatial.visibleBodies[body] && display.spatial.bodyTrails[body] && startView.bodies[body]) {
        points.push(startView.bodies[body]!.point);
      }
    }
  }
  return points.map(point => projectMapPoint(point, display.spatial.radialProjection));
}

export function renderMapStatic(panel: HTMLElement, display: PlanetaryMapDisplay, language: Language): void {
  const trailGroup = panel.querySelector<HTMLElement>('[data-map-trails]')!;
  trailGroup.innerHTML = '';
  delete trailGroup.dataset.cacheKey;
  panel.querySelector<HTMLElement>('[data-map-endpoints]')!.innerHTML = '';
  if (display.representation === 'angular') {
    renderAngularStatic(panel, display, language);
    return;
  }
  setText(panel, '[data-panel-title]', `${t(language, 'mapTitle')} · ${t(language, 'mapCentre')}: ${t(language, labelKeys[display.spatial.viewCenter])}`);
  panel.querySelector('svg')!.setAttribute('aria-label', t(language, 'mapTitle'));
  setText(panel, '[data-map-readout-heading]',
    `${t(language, 'mapDistance')} · ${t(language, 'mapAngle')} (°)`);
  const settings = panel.querySelector<HTMLDetailsElement>('[data-panel-settings]')!;
  const open = settings.open;
  settings.innerHTML = `<summary>${t(language, 'panelSettings')}</summary><div class="panel-settings-grid">
    <label>${t(language, 'mapRepresentation')}<select data-setting="map-representation">
      <option value="spatial" selected>${t(language, 'mapSpatial')}</option>
      <option value="angular">${t(language, 'mapAngular')}</option></select></label>
    <label>${t(language, 'mapCentre')}<select data-setting="map-centre">${mapBodies.map(body =>
      `<option value="${body}" ${body === display.spatial.viewCenter ? 'selected' : ''}>${t(language, labelKeys[body])}</option>`).join('')}</select></label>
    <label>${t(language, 'mapRadialScale')}<select data-setting="map-projection">
      <option value="linear" ${display.spatial.radialProjection === 'linear' ? 'selected' : ''}>${t(language, 'mapLinear')}</option>
      <option value="asinh" ${display.spatial.radialProjection === 'asinh' ? 'selected' : ''}>${t(language, 'mapCompressed')}</option></select></label>
    <label>${t(language, 'apsisPolicyLabel')}<select data-setting="map-policy">
      <option value="${apsisPolicy}" ${display.spatial.marsPolicyId === apsisPolicy ? 'selected' : ''}>${t(language, 'mapSourceLimited')}</option>
      <option value="${exploratoryApsisPolicy}" ${display.spatial.marsPolicyId === exploratoryApsisPolicy ? 'selected' : ''}>${t(language, 'mapExploratory')}</option></select></label>
    <label>${t(language, 'mapTrailDuration')}<select data-setting="map-duration">${durations.map((days, index) =>
      `<option value="${days}" ${display.spatial.trailDays === days ? 'selected' : ''}>${t(language, durationKeys[index])}</option>`).join('')}</select></label>
    ${mapBodies.map(body => `<div class="map-body-settings"><strong>${t(language, labelKeys[body])}</strong>
      <label class="panel-check"><input type="checkbox" data-map-visible="${body}" ${checked(display.spatial.visibleBodies[body])}> ${t(language, 'mapVisible')}</label>
      <label class="panel-check"><input type="checkbox" data-map-trail="${body}" ${checked(display.spatial.bodyTrails[body])}> ${t(language, 'mapTrailBody')}</label></div>`).join('')}
    <label class="panel-check"><input type="checkbox" data-setting="map-grid" ${checked(display.spatial.showGrid)}> ${t(language, 'mapGrid')}</label>
    <label class="panel-check"><input type="checkbox" data-setting="map-labels" ${checked(display.spatial.showLabels)}> ${t(language, 'mapLabels')}</label>
  </div>`;
  settings.open = open;
  setText(panel, '[data-map-policy-note]', t(language,
    display.spatial.marsPolicyId === apsisPolicy ? 'mapSourceLimited' : 'mapExploratory'));
  setText(panel, '[data-map-projection-note]', t(language,
    display.spatial.radialProjection === 'asinh' ? 'mapCompressedNotice' : 'mapLinearNotice'));
  const ringNote = panel.querySelector<HTMLElement>('[data-map-ring-note]')!;
  ringNote.hidden = !display.spatial.showGrid;
  setText(panel, '[data-map-ring-note]', t(language, 'mapRingDistances'));
  setText(panel, '[data-map-science]', t(language, 'mapScientificNote'));
  const controls = panel.querySelector<HTMLElement>('[data-map-controls]')!;
  const actions: [string, MessageKey][] = [
    ['map-fit', 'mapFit'], ['map-zoom-in', 'mapZoomIn'], ['map-zoom-out', 'mapZoomOut'],
    ['map-pan-left', 'mapPanLeft'], ['map-pan-right', 'mapPanRight'],
    ['map-pan-up', 'mapPanUp'], ['map-pan-down', 'mapPanDown'], ['map-reset', 'mapReset'],
  ];
  controls.innerHTML = actions.map(([action, key]) =>
    `<button type="button" data-action="${action}">${t(language, key)}</button>`).join('');
  panel.querySelector<HTMLElement>('[data-map-grid]')!.innerHTML = renderMapGrid(display, language);
}

export function renderMapDynamic(panel: HTMLElement, display: PlanetaryMapDisplay,
  ut1Jd: number, language: Language): void {
  if (display.representation === 'angular') {
    renderAngularDynamic(panel, display, ut1Jd, language);
    return;
  }
  const snapshot = evaluateCopernicusMap(ut1Jd, display.spatial.marsPolicyId);
  const view = mapView(snapshot, display.spatial.viewCenter);
  const unavailable = panel.querySelector<HTMLElement>('[data-map-unavailable]')!;
  unavailable.hidden = view.available;
  if (!view.available) unavailable.textContent = t(language, 'mapUnavailableCenter');
  const entry = cachedTrails(display, ut1Jd);
  const trailGroup = panel.querySelector<HTMLElement>('[data-map-trails]')!;
  // Only the small endpoint group changes every frame. Long cached SVG paths
  // are rebuilt when their historical grid window or scientific choices change.
  const drawingKey = [entry.key, display.spatial.camera.offsetX, display.spatial.camera.offsetY,
    display.spatial.camera.radiusUnits, display.spatial.radialProjection].join('|');
  if (trailGroup.dataset.cacheKey !== drawingKey) {
    trailGroup.innerHTML = renderMapTrails(display, entry.trails);
    trailGroup.dataset.cacheKey = drawingKey;
  }
  const endpoints = panel.querySelector<HTMLElement>('[data-map-endpoints]')!;
  const endpointHtml = renderTrailEndpoints(display, entry.trails, snapshot);
  if (endpoints.innerHTML !== endpointHtml) endpoints.innerHTML = endpointHtml;
  const markers = panel.querySelector<HTMLElement>('[data-map-markers]')!;
  const markerHtml = renderMapMarkers(display, snapshot, language);
  if (markers.innerHTML !== markerHtml) markers.innerHTML = markerHtml;
  const readouts = panel.querySelector<HTMLElement>('[data-map-readouts]')!;
  const rows = mapBodies.filter(body => display.spatial.visibleBodies[body] || body === display.spatial.viewCenter).map(body => {
    const relative = view.bodies[body];
    const name = t(language, labelKeys[body]);
    const value = relative ? body === display.spatial.viewCenter ? t(language, 'mapZero')
      : `${relative.distance.toFixed(1)} · ${relative.siderealAngle.toFixed(3)}°`
      : t(language, body === 'mars' ? 'mapUnavailableBody' : 'mapUnavailable');
    return `<div><dt><span class="map-key" style="--map-color:${colors[body]}"></span>${name}</dt><dd>${value}</dd></div>`;
  }).join('');
  if (readouts.innerHTML !== rows) readouts.innerHTML = rows;
  setText(panel, '[data-map-continuation]', t(language, 'mapContinuationNote'));
}
