import { apsisDomainLocalDays, apsisPolicy, evaluateMarsDays,
  type ApsisPolicy, type CopernicusMarsResult } from './copernicus.ts';
import { message, type Language } from './i18n.ts';
import { type ViewCenter } from './model-registry.ts';
import { type Point } from './model.ts';

const origin = 320;
const scale = 0.014;
const f = (n: number): string => n.toFixed(2);
/** A drawing centre only translates the evaluated construction: X_view = X − centre. */
export function relativePosition(point: Point, centre: Point): Point {
  return { x: point.x - centre.x, y: point.y - centre.y };
}

export function copernicusViewOrigin(result: CopernicusMarsResult, viewCenter: ViewCenter): Point {
  return viewCenter === 'true-sun'
    ? result.earthGeometryInMarsUnits.trueSun : result.earthGeometryInMarsUnits.earth;
}

const shifted = (point: Point, centre: Point): Point => {
  const relative = relativePosition(point, centre);
  return { x: origin + relative.x * scale, y: origin - relative.y * scale };
};
const xy = (p: Point): string => `${f(p.x)},${f(p.y)}`;
const circle = (p: Point, centre: Point, r: number, className: string): string => {
  const s = shifted(p, centre);
  return `<circle class="${className}" cx="${f(s.x)}" cy="${f(s.y)}" r="${f(r * scale)}"/>`;
};
const line = (a: Point, b: Point, centre: Point, className: string): string => {
  const x = shifted(a, centre), y = shifted(b, centre);
  return `<line class="${className}" x1="${f(x.x)}" y1="${f(x.y)}" x2="${f(y.x)}" y2="${f(y.y)}"/>`;
};
const dot = (p: Point, centre: Point, code: string, className: string, dx: number, dy: number, description: string): string => {
  const s = shifted(p, centre);
  const leader = Math.hypot(dx, dy) > 30 ? `<line class="point-leader" x1="${f(s.x)}" y1="${f(s.y)}" x2="${f(s.x + dx + 6)}" y2="${f(s.y + dy - 6)}"/>` : '';
  return `<g class="${className}"><title>${description}</title>${leader}<circle class="point-halo" cx="${f(s.x)}" cy="${f(s.y)}" r="11"/><circle class="point-core" cx="${f(s.x)}" cy="${f(s.y)}" r="6"/><text class="point-label" x="${f(s.x + dx)}" y="${f(s.y + dy)}">${code}</text></g>`;
};

/** One SVG construction for either translated origin; radii stay in Mars units. */
export function renderCopernicusDiagram(result: CopernicusMarsResult, language: Language,
  trail: readonly Point[] = [], instanceId = '', viewCenter: ViewCenter = 'earth'): string {
  const { trueSun: S, eccentricCenter: F, meanSun: G, earth: E } = result.earthGeometryInMarsUnits;
  const { eccentricCenter: M, epicycleCenter: C, mars: P } = result.marsGeometry;
  const centre = copernicusViewOrigin(result, viewCenter);
  const earthOnPage = shifted(E, centre);
  const longitude = result.geocentricSiderealLongitude * Math.PI / 180;
  // The blue sight line and its longitude angle are geocentric even when S is
  // the drawing origin. Their vertex remains the evaluated Earth point E.
  const arcEnd = { x: earthOnPage.x + 45 * Math.cos(longitude),
    y: earthOnPage.y - 45 * Math.sin(longitude) };
  const arc = `<path class="longitude-arc" d="M ${f(earthOnPage.x + 45)},${f(earthOnPage.y)} A 45,45 0 ${result.geocentricSiderealLongitude > 180 ? 1 : 0} 0 ${xy(arcEnd)}"/>`;
  const trailPath = trail.length > 1 ? `<polyline class="mars-trail" points="${trail.map(p => xy(shifted(p, { x: 0, y: 0 }))).join(' ')}"/>` : '';
  const sunRays = viewCenter === 'true-sun'
    ? `${line(S, E, centre, 'sun-earth-ray')}${line(S, P, centre, 'sun-mars-ray')}` : '';
  // At fixed scale S, F, G, and M can lie close together. Leader lines keep
  // their labels separate in the Sun-centred picture without moving points.
  const sunLabels = viewCenter === 'true-sun';
  const accessible = viewCenter === 'true-sun'
    ? 'copernicusSunDiagramAccessible' : 'copernicusDiagramAccessible';
  return `<svg class="sky-diagram" viewBox="0 0 640 640" role="img" aria-label="${message(language, accessible)}">
    <defs><radialGradient id="copernicus-space-glow${instanceId}"><stop offset="0" stop-color="#183743"/><stop offset="1" stop-color="#091924"/></radialGradient></defs>
    <circle cx="320" cy="320" r="319" fill="url(#copernicus-space-glow${instanceId})"/>
    <circle class="guide-ring" cx="320" cy="320" r="280"/>
    <line class="axis" x1="20" y1="320" x2="620" y2="320"/>
    <line class="axis" x1="320" y1="20" x2="320" y2="620"/>
    ${sunRays}
    ${circle(G, centre, result.earthModel.annualRadius * result.earthToMarsScale, 'deferent-circle')}
    ${circle(M, centre, result.marsGeometry.principalRadius, 'copernicus-principal-circle')}
    ${circle(C, centre, result.marsGeometry.smallEpicycleRadius, 'epicycle-circle')}
    ${line(S, F, centre, 'apsidal-line')}${line(F, G, centre, 'equant-ray')}
    ${line(G, E, centre, 'copernicus-earth-spoke')}${line(M, C, centre, 'apsidal-line')}${line(C, P, centre, 'epicycle-spoke')}
    ${trailPath}${line(E, P, centre, 'sight-line')}${arc}
    ${dot(S, centre, 'S', 'sun-dot', sunLabels ? -84 : -70, sunLabels ? -85 : -68, message(language, 'trueSunDescription'))}
    ${dot(F, centre, 'F', 'deferent-dot', sunLabels ? 80 : 8, sunLabels ? 5 : -52, message(language, 'eccentricCenterDescription'))}
    ${dot(G, centre, 'G', 'mean-sun-dot', sunLabels ? 40 : 20, sunLabels ? 75 : 62, message(language, 'meanSunDescription'))}
    ${dot(M, centre, 'M', 'deferent-dot', sunLabels ? -65 : -32, sunLabels ? 15 : -25, message(language, 'marsPrincipalCenterDescription'))}
    ${dot(C, centre, 'C', 'center-dot', 12, 30, message(language, 'marsEpicycleCenterDescription'))}
    ${dot(E, centre, 'E', 'earth-dot', sunLabels ? 47 : -42, sunLabels ? 35 : 43, message(language, 'earthDescription'))}
    ${dot(P, centre, 'P', 'mars-dot', 13, -14, message(language, 'marsDescription'))}
    <text class="angle-label" x="${f(earthOnPage.x + 55)}" y="${f(earthOnPage.y - 13)}">λ</text>
  </svg>`;
}

/** Sample P(t)−E(t) or P(t)−S(t) at every historical instant, in Mars units. */
export function copernicusTrail(days: number, span: number, samples = 96,
  policy: ApsisPolicy = apsisPolicy, viewCenter: ViewCenter = 'earth'): Point[] {
  const start = policy === apsisPolicy ? Math.max(apsisDomainLocalDays.start, days - span) : days - span;
  return Array.from({ length: samples + 1 }, (_, i) => {
    const result = evaluateMarsDays(start + (days - start) * i / samples, policy);
    return relativePosition(result.marsGeometry.mars, copernicusViewOrigin(result, viewCenter));
  });
}
