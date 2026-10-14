import { angularBodies, angularDrawingRadius, angularGridWindow, angularLongitudeAt,
  angularModelDifferenceAt,
  angularModelFor, angularPoint, angularRingFractions, angularTrailCacheKey,
  angularTrailWithEndpoints, sampleAngularTrail, type AngularLongitude } from './angular-map.ts';
import { apsisPolicy, exploratoryApsisPolicy } from './copernicus.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import { models } from './model-registry.ts';
import type { AngularBody, AngularTrack, PlanetaryMapDisplay } from './workspace-types.ts';

const t = (language: Language, key: MessageKey): string => message(language, key);
const bodyKeys: Readonly<Record<AngularBody, MessageKey>> = {
  Sun: 'sun', Mars: 'mars', Jupiter: 'jupiter', Saturn: 'saturn',
};
const colors: Readonly<Record<AngularBody, string>> = {
  Sun: '#f4c879', Mars: '#e89178', Jupiter: '#d8b787', Saturn: '#b6a6d9',
};
const durationOptions: ReadonlyArray<readonly [number, MessageKey]> = [
  [90, 'map90'], [365, 'map365'], [730, 'map730'], [365 * 5, 'mapFiveYears'],
  [365 * 30, 'mapThirtyYears'],
];
const escapeHtml = (value: string): string => value.replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const coordinate = (number: number): string => number.toFixed(2);
const checked = (value: boolean): string => value ? 'checked' : '';
function setText(panel: HTMLElement, selector: string, value: string): void {
  const node = panel.querySelector<HTMLElement>(selector);
  if (node && node.textContent !== value) node.textContent = value;
}
function modelName(track: AngularTrack, language: Language): string {
  const model = models[track.modelId as keyof typeof models];
  return model ? t(language, model.label) : track.modelId;
}

type TrailEntry = { key: string; samples: readonly (AngularLongitude | null)[] };
const trailCache = new Map<string, TrailEntry>();
export function clearAngularTrailCache(panelId: string): void {
  for (const key of trailCache.keys()) if (key.startsWith(`${panelId}/`)) trailCache.delete(key);
}
function cachedTrail(display: PlanetaryMapDisplay, track: AngularTrack, ut1Jd: number):
  readonly (AngularLongitude | null)[] {
  const key = angularTrailCacheKey(track, ut1Jd, display.angular.trailDays,
    display.angular.frameAlignment);
  const slot = `${display.id}/${track.id}`;
  const old = trailCache.get(slot);
  if (old?.key === key) return old.samples;
  const window = angularGridWindow(ut1Jd, display.angular.trailDays);
  const samples = sampleAngularTrail(track, window.start, window.end, window.step);
  trailCache.set(slot, { key, samples });
  return samples;
}

const svgPoint = (body: AngularBody, longitude: number): string => {
  const point = angularPoint(body, longitude);
  return `${coordinate(340 + point.x)},${coordinate(340 - point.y)}`;
};

/** Chords follow neighboring angular samples; nulls never bridge an unavailable interval. */
export function renderAngularTrail(track: AngularTrack,
  samples: readonly (AngularLongitude | null)[]): string {
  const paths: string[] = [];
  let points: AngularLongitude[] = [];
  let style: 'solid' | 'dashed' = 'solid';
  const flush = (): void => {
    if (points.length > 1) {
      const path = points.map((sample, index) =>
        `${index ? 'L' : 'M'}${svgPoint(track.body, sample.longitude)}`).join(' ');
      paths.push(`<path class="map-trail angular-trail" data-track-id="${track.id}" data-provenance="${style}" d="${path}" stroke="${colors[track.body]}"/>`);
    }
    points = [];
  };
  for (const sample of samples) {
    if (!sample) { flush(); continue; }
    if (points.length) {
      const nextStyle = sample.provenance === 'exploratory-continuation' ||
        points.at(-1)!.provenance === 'exploratory-continuation' ? 'dashed' : 'solid';
      if (points.length > 1 && nextStyle !== style) {
        const boundary = points.at(-1)!;
        flush();
        points.push(boundary);
      }
      style = nextStyle;
    }
    points.push(sample);
  }
  flush();
  return paths.join('');
}

export function renderAngularRings(display: PlanetaryMapDisplay, language: Language): string {
  const labelOffsets: Readonly<Record<AngularBody, number>> = {
    Sun: -36, Mars: -12, Jupiter: 14, Saturn: 40,
  };
  const rings = angularBodies.map(body => {
    const radius = angularDrawingRadius * angularRingFractions[body];
    const label = display.angular.showLabels
      ? `<text class="angular-ring-label" x="${coordinate(340 + radius + 5)}" y="${340 + labelOffsets[body]}" fill="${colors[body]}">${escapeHtml(t(language, bodyKeys[body]))}</text>` : '';
    return `<circle class="angular-ring" data-ring="${body}" cx="340" cy="340" r="${coordinate(radius)}"/>${label}`;
  }).join('');
  const axes = display.angular.showGrid
    ? '<path class="angular-axes" d="M30 340H650 M340 30V650"/>' : '';
  return `<g class="angular-rings">${axes}${rings}<circle class="angular-earth" cx="340" cy="340" r="8" fill="#91cfdf"/><title>${escapeHtml(t(language, 'earth'))}</title></g>`;
}

export function renderAngularMarkers(display: PlanetaryMapDisplay, ut1Jd: number,
  language: Language): string {
  const groups: string[] = [];
  for (const body of angularBodies) {
    const tracks = display.angular.tracks.filter(track => track.body === body && track.visible);
    for (const [index, track] of tracks.entries()) {
      const value = angularLongitudeAt(track, ut1Jd);
      if (!value) continue;
      const point = angularPoint(body, value.longitude);
      const x = coordinate(340 + point.x);
      const y = coordinate(340 - point.y);
      const label = `${t(language, bodyKeys[body])} · ${modelName(track, language)} · ${value.longitude.toFixed(3)}°`;
      const open = index > 0;
      groups.push(`<g class="angular-marker ${open ? 'angular-outline' : 'angular-filled'}" data-track-id="${track.id}" role="img" aria-label="${escapeHtml(label)}"><circle cx="${x}" cy="${y}" r="${open ? 10 : 7}" fill="${open ? '#10232d' : colors[body]}" stroke="${colors[body]}" stroke-width="${open ? 3 : 2}"/><title>${escapeHtml(label)}</title></g>`);
    }
  }
  return groups.join('');
}

export function renderAngularStatic(panel: HTMLElement, display: PlanetaryMapDisplay,
  language: Language): void {
  setText(panel, '[data-panel-title]', t(language, 'angularMapTitle'));
  panel.querySelector('svg')!.setAttribute('aria-label', t(language, 'angularMapTitle'));
  setText(panel, '[data-map-readout-heading]', t(language, 'angularLongitudeHeading'));
  const settings = panel.querySelector<HTMLDetailsElement>('[data-panel-settings]')!;
  const open = settings.open;
  const representation = `<label>${t(language, 'mapRepresentation')}<select data-setting="map-representation">
    <option value="spatial">${t(language, 'mapSpatial')}</option>
    <option value="angular" selected>${t(language, 'mapAngular')}</option></select></label>`;
  settings.innerHTML = `<summary>${t(language, 'panelSettings')}</summary><div class="panel-settings-grid">
    ${representation}
    <label>${t(language, 'angularSystem')}<select data-setting="angular-system">
      <option value="ptolemy" ${display.angular.systemSelection === 'ptolemy' ? 'selected' : ''}>${t(language, 'ptolemyPanel')}</option>
      <option value="copernicus" ${display.angular.systemSelection === 'copernicus' ? 'selected' : ''}>${t(language, 'copernicusPanel')}</option>
      <option value="custom" ${display.angular.systemSelection === 'custom' ? 'selected' : ''}>${t(language, 'angularCustom')}</option></select></label>
    <label>${t(language, 'angularFrame')}<select data-setting="angular-frame">
      <option value="native" ${display.angular.frameAlignment === 'native' ? 'selected' : ''}>${t(language, 'angularNative')}</option>
      <option value="nominal-historical-tropical" ${display.angular.frameAlignment !== 'native' ? 'selected' : ''}>${t(language, 'angularNominal')}</option></select></label>
    <label>${t(language, 'mapTrailDuration')}<select data-setting="angular-duration">${durationOptions.map(([days, key]) =>
      `<option value="${days}" ${display.angular.trailDays === days ? 'selected' : ''}>${t(language, key)}</option>`).join('')}</select></label>
    ${display.angular.tracks.map(track => `<div class="angular-track-settings" data-track-settings="${track.id}">
      <strong>${t(language, bodyKeys[track.body])} · ${track.id}</strong>
      <label>${t(language, 'singleModelLabel')}<select data-setting="angular:${track.id}:model">${(['ptolemy', 'copernicus'] as const).map(system => {
        const id = angularModelFor(track.body, system);
        return `<option value="${id}" ${track.modelId === id ? 'selected' : ''}>${t(language, models[id as keyof typeof models].label)}</option>`;
      }).join('')}</select></label>
      <label class="panel-check"><input type="checkbox" data-setting="angular:${track.id}:visible" ${checked(track.visible)}> ${t(language, 'mapVisible')}</label>
      <label class="panel-check"><input type="checkbox" data-setting="angular:${track.id}:trail" ${checked(track.trail)}> ${t(language, 'mapTrailBody')}</label>
      ${track.modelId === 'copernicus' ? `<label>${t(language, 'apsisPolicyLabel')}<select data-setting="angular:${track.id}:policy">
        <option value="${apsisPolicy}" ${track.policyId === apsisPolicy ? 'selected' : ''}>${t(language, 'mapSourceLimited')}</option>
        <option value="${exploratoryApsisPolicy}" ${track.policyId === exploratoryApsisPolicy ? 'selected' : ''}>${t(language, 'mapExploratory')}</option></select></label>` : ''}
      <button type="button" data-action="angular-remove:${track.id}">${t(language, 'removeTrace')}</button></div>`).join('')}
    ${angularBodies.map(body => `<button type="button" data-action="angular-add:${body}" ${display.angular.tracks.filter(track => track.body === body).length >= 2 ? 'disabled' : ''}>${t(language, 'angularAddTrack')} · ${t(language, bodyKeys[body])}</button>`).join('')}
    <label class="panel-check"><input type="checkbox" data-setting="angular-grid" ${checked(display.angular.showGrid)}> ${t(language, 'mapGrid')}</label>
    <label class="panel-check"><input type="checkbox" data-setting="angular-labels" ${checked(display.angular.showLabels)}> ${t(language, 'mapLabels')}</label>
  </div>`;
  settings.open = open;
  panel.querySelector<HTMLElement>('[data-map-controls]')!.innerHTML = '';
  panel.querySelector<HTMLElement>('[data-map-grid]')!.innerHTML = renderAngularRings(display, language);
  setText(panel, '[data-map-policy-note]', t(language, 'angularMapNotice'));
  setText(panel, '[data-map-projection-note]', display.angular.frameAlignment === 'native'
    ? t(language, 'angularNativeNotice') : t(language, 'angularNominalNotice'));
  setText(panel, '[data-map-science]', t(language, 'angularMapScience'));
  setText(panel, '[data-map-ring-note]', t(language, 'angularRingSource'));
  panel.querySelector<HTMLElement>('[data-map-ring-note]')!.hidden = false;
  setText(panel, '[data-map-continuation]', t(language, 'angularTrailNotice'));
}

export function renderAngularDynamic(panel: HTMLElement, display: PlanetaryMapDisplay,
  ut1Jd: number, language: Language): void {
  const trails = panel.querySelector<HTMLElement>('[data-map-trails]')!;
  const endpoints = panel.querySelector<HTMLElement>('[data-map-endpoints]')!;
  const endpointPaths: string[] = [];
  const keys: string[] = [];
  const activeTracks = display.angular.tracks.filter(item => item.visible && item.trail);
  for (const track of activeTracks) {
    const key = angularTrailCacheKey(track, ut1Jd, display.angular.trailDays,
      display.angular.frameAlignment);
    keys.push(`${track.id}:${key}`);
    const samples = cachedTrail(display, track, ut1Jd);
    const full = angularTrailWithEndpoints(track, samples, ut1Jd, display.angular.trailDays);
    const first = samples.find(item => item !== null);
    const last = [...samples].reverse().find(item => item !== null);
    if (first) endpointPaths.push(renderAngularTrail(track, [full[0], first]));
    if (last) endpointPaths.push(renderAngularTrail(track, [last, full.at(-1)!]));
  }
  const key = keys.join('|');
  if (trails.dataset.cacheKey !== key) {
    trails.innerHTML = activeTracks.map(track =>
      renderAngularTrail(track, cachedTrail(display, track, ut1Jd))).join('');
    trails.dataset.cacheKey = key;
  }
  const endpointHtml = endpointPaths.join('');
  if (endpoints.innerHTML !== endpointHtml) endpoints.innerHTML = endpointHtml;
  const markerHtml = renderAngularMarkers(display, ut1Jd, language);
  const markers = panel.querySelector<HTMLElement>('[data-map-markers]')!;
  if (markers.innerHTML !== markerHtml) markers.innerHTML = markerHtml;
  const readouts = panel.querySelector<HTMLElement>('[data-map-readouts]')!;
  const rows = display.angular.tracks.filter(track => track.visible).map(track => {
    const value = angularLongitudeAt(track, ut1Jd);
    const name = `${t(language, bodyKeys[track.body])} · ${modelName(track, language)}`;
    const status = !value ? t(language, 'angularUnavailable')
      : `${value.longitude.toFixed(3)}°${value.provenance === 'exploratory-continuation'
        ? ` · ${t(language, 'mapExploratory')}` : ''}`;
    return `<div><dt><span class="map-key" style="--map-color:${colors[track.body]}"></span>${escapeHtml(name)} ${escapeHtml(track.id)}</dt><dd>${escapeHtml(status)}</dd></div>`;
  });
  for (const body of angularBodies) {
    const pair = display.angular.tracks.filter(track => track.visible && track.body === body);
    if (pair.length !== 2) continue;
    const difference = angularModelDifferenceAt(pair[0], pair[1],
      display.angular.frameAlignment, ut1Jd);
    rows.push(`<div><dt>${escapeHtml(t(language, bodyKeys[body]))} · ${escapeHtml(t(language, 'angularDifference'))}</dt><dd>${difference === null
      ? escapeHtml(t(language, 'angularUnavailable')) : `${difference >= 0 ? '+' : ''}${difference.toFixed(3)}°`}</dd></div>`);
  }
  const rowHtml = rows.join('');
  if (readouts.innerHTML !== rowHtml) readouts.innerHTML = rowHtml;
  const unavailable = panel.querySelector<HTMLElement>('[data-map-unavailable]')!;
  unavailable.hidden = true;
}
