/** Source-scale Copernican Jupiter/Saturn construction in two translated views. */
import { evaluateSuperiorDays, type CopernicusSuperiorResult,
  type SuperiorBody } from './copernicus-superior.ts';
import { message, type Language } from './i18n.ts';
import type { Point } from './model.ts';
import type { ViewCenter } from './model-registry.ts';

const origin = 320;
const drawingScale = 0.014;
const f = (value: number): string => value.toFixed(2);
const relative = (point: Point, centre: Point): Point => ({
  x: point.x - centre.x, y: point.y - centre.y,
});
const onPage = (point: Point, centre: Point): Point => {
  const p = relative(point, centre);
  return { x: origin + p.x * drawingScale, y: origin - p.y * drawingScale };
};
const coordinates = (point: Point): string => `${f(point.x)},${f(point.y)}`;
const circle = (point: Point, centre: Point, radius: number, className: string): string => {
  const p = onPage(point, centre);
  return `<circle class="${className}" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(radius * drawingScale)}"/>`;
};
const line = (a: Point, b: Point, centre: Point, className: string): string => {
  const first = onPage(a, centre);
  const second = onPage(b, centre);
  return `<line class="${className}" x1="${f(first.x)}" y1="${f(first.y)}" x2="${f(second.x)}" y2="${f(second.y)}"/>`;
};
const dot = (point: Point, centre: Point, code: string, className: string,
  dx: number, dy: number, description: string): string => {
  const p = onPage(point, centre);
  const leader = Math.hypot(dx, dy) > 30
    ? `<line class="point-leader" x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(p.x + dx + 6)}" y2="${f(p.y + dy - 6)}"/>` : '';
  return `<g class="${className}"><title>${description}</title>${leader}<circle class="point-halo" cx="${f(p.x)}" cy="${f(p.y)}" r="11"/><circle class="point-core" cx="${f(p.x)}" cy="${f(p.y)}" r="6"/><text class="point-label" x="${f(p.x + dx)}" y="${f(p.y + dy)}">${code}</text></g>`;
};

export function copernicusOuterViewOrigin(result: CopernicusSuperiorResult,
  viewCenter: ViewCenter): Point {
  return viewCenter === 'true-sun'
    ? result.earthGeometryInPlanetUnits.trueSun : result.earthGeometryInPlanetUnits.earth;
}

/** The trail samples P(t)-E(t) or P(t)-S(t) at each historical instant. */
export function copernicusOuterTrail(body: SuperiorBody, days: number, span: number,
  viewCenter: ViewCenter, samples = 96): Point[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const time = days - span + span * index / samples;
    const result = evaluateSuperiorDays(body, time);
    return relative(result.planetGeometry.planet, copernicusOuterViewOrigin(result, viewCenter));
  });
}

export function renderCopernicusOuterDiagram(result: CopernicusSuperiorResult,
  language: Language, trail: readonly Point[] = [], instanceId = '',
  viewCenter: ViewCenter = 'earth'): string {
  const { trueSun: S, eccentricCenter: F, meanSun: G, earth: E } = result.earthGeometryInPlanetUnits;
  const { eccentricCenter: M, epicycleCenter: C, planet: P } = result.planetGeometry;
  const centre = copernicusOuterViewOrigin(result, viewCenter);
  const earthOnPage = onPage(E, centre);
  const longitude = result.geocentricSiderealLongitude * Math.PI / 180;
  const arcEnd = { x: earthOnPage.x + 45 * Math.cos(longitude),
    y: earthOnPage.y - 45 * Math.sin(longitude) };
  const arc = `<path class="longitude-arc" d="M ${f(earthOnPage.x + 45)},${f(earthOnPage.y)} A 45,45 0 ${result.geocentricSiderealLongitude > 180 ? 1 : 0} 0 ${coordinates(arcEnd)}"/>`;
  const trailPath = trail.length > 1
    ? `<polyline class="mars-trail" points="${trail.map(point => coordinates(onPage(point, { x: 0, y: 0 }))).join(' ')}"/>` : '';
  const sunRays = viewCenter === 'true-sun'
    ? `${line(S, E, centre, 'sun-earth-ray')}${line(S, P, centre, 'sun-mars-ray')}` : '';
  const sunLabels = viewCenter === 'true-sun';
  const planetDescription = message(language, result.body === 'jupiter' ? 'jupiterDescription' : 'saturnDescription');
  const accessible = message(language, result.body === 'jupiter'
    ? 'copernicusJupiterDiagramAccessible' : 'copernicusSaturnDiagramAccessible');
  return `<svg class="sky-diagram" viewBox="0 0 640 640" role="img" aria-label="${accessible}">
    <defs><radialGradient id="copernicus-space-glow${instanceId}"><stop offset="0" stop-color="#183743"/><stop offset="1" stop-color="#091924"/></radialGradient></defs>
    <circle cx="320" cy="320" r="319" fill="url(#copernicus-space-glow${instanceId})"/>
    <circle class="guide-ring" cx="320" cy="320" r="280"/>
    <line class="axis" x1="20" y1="320" x2="620" y2="320"/>
    <line class="axis" x1="320" y1="20" x2="320" y2="620"/>
    ${sunRays}
    ${circle(G, centre, result.earthModel.annualRadius * result.earthToPlanetScale, 'deferent-circle')}
    ${circle(M, centre, result.planetGeometry.principalRadius, 'copernicus-principal-circle')}
    ${circle(C, centre, result.planetGeometry.smallEpicycleRadius, 'epicycle-circle')}
    ${line(S, F, centre, 'apsidal-line')}${line(F, G, centre, 'solar-mean-ray')}
    ${line(G, E, centre, 'copernicus-earth-spoke')}${line(M, C, centre, 'apsidal-line')}${line(C, P, centre, 'epicycle-spoke')}
    ${trailPath}${line(E, P, centre, 'sight-line')}${arc}
    ${dot(S, centre, 'S', 'sun-dot', sunLabels ? -84 : -70, sunLabels ? -85 : -68, message(language, 'trueSunDescription'))}
    ${dot(F, centre, 'F', 'deferent-dot', sunLabels ? 80 : 8, sunLabels ? 5 : -52, message(language, 'eccentricCenterDescription'))}
    ${dot(G, centre, 'G', 'mean-sun-dot', sunLabels ? 40 : 20, sunLabels ? 75 : 62, message(language, 'outerMeanSunDescription'))}
    ${dot(M, centre, 'M', 'deferent-dot', sunLabels ? -65 : -32, sunLabels ? 15 : -25, message(language, 'planetPrincipalCenterDescription'))}
    ${dot(C, centre, 'C', 'center-dot', 12, 30, message(language, 'planetEpicycleCenterDescription'))}
    ${dot(E, centre, 'E', 'earth-dot', sunLabels ? 47 : -42, sunLabels ? 35 : 43, message(language, 'earthDescription'))}
    ${dot(P, centre, 'P', 'mars-dot', 13, -14, planetDescription)}
    <text class="angle-label" x="${f(earthOnPage.x + 55)}" y="${f(earthOnPage.y - 13)}">λ</text>
  </svg>`;
}
