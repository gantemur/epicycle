import { apsisDomainLocalDays, apsisPolicy, evaluateMarsDays,
  type ApsisPolicy, type CopernicusMarsResult } from './copernicus.ts';
import { message, type Language } from './i18n.ts';
import { type Point } from './model.ts';

const origin = 320;
const scale = 0.014;
const f = (n: number): string => n.toFixed(2);
const shifted = (p: Point, earth: Point): Point => ({ x: origin + (p.x - earth.x) * scale, y: origin - (p.y - earth.y) * scale });
const xy = (p: Point): string => `${f(p.x)},${f(p.y)}`;
const circle = (p: Point, earth: Point, r: number, className: string): string => {
  const s = shifted(p, earth);
  return `<circle class="${className}" cx="${f(s.x)}" cy="${f(s.y)}" r="${f(r * scale)}"/>`;
};
const line = (a: Point, b: Point, earth: Point, className: string): string => {
  const x = shifted(a, earth), y = shifted(b, earth);
  return `<line class="${className}" x1="${f(x.x)}" y1="${f(x.y)}" x2="${f(y.x)}" y2="${f(y.y)}"/>`;
};
const dot = (p: Point, earth: Point, code: string, className: string, dx: number, dy: number, description: string): string => {
  const s = shifted(p, earth);
  const leader = Math.hypot(dx, dy) > 30 ? `<line class="point-leader" x1="${f(s.x)}" y1="${f(s.y)}" x2="${f(s.x + dx + 6)}" y2="${f(s.y + dy - 6)}"/>` : '';
  return `<g class="${className}"><title>${description}</title>${leader}<circle class="point-halo" cx="${f(s.x)}" cy="${f(s.y)}" r="11"/><circle class="point-core" cx="${f(s.x)}" cy="${f(s.y)}" r="6"/><text class="point-label" x="${f(s.x + dx)}" y="${f(s.y + dy)}">${code}</text></g>`;
};

/** Each point is translated by the evaluated Earth position; radii remain in Mars units. */
export function renderCopernicusDiagram(result: CopernicusMarsResult, language: Language,
  trail: readonly Point[] = [], instanceId = ''): string {
  const { trueSun: S, eccentricCenter: F, meanSun: G, earth: E } = result.earthGeometryInMarsUnits;
  const { eccentricCenter: M, epicycleCenter: C, mars: P } = result.marsGeometry;
  const longitude = result.geocentricSiderealLongitude * Math.PI / 180;
  const arcEnd = { x: origin + 45 * Math.cos(longitude), y: origin - 45 * Math.sin(longitude) };
  const arc = `<path class="longitude-arc" d="M ${origin + 45},${origin} A 45,45 0 ${result.geocentricSiderealLongitude > 180 ? 1 : 0} 0 ${xy(arcEnd)}"/>`;
  const trailPath = trail.length > 1 ? `<polyline class="mars-trail" points="${trail.map(p => xy(shifted(p, { x: 0, y: 0 }))).join(' ')}"/>` : '';
  return `<svg class="sky-diagram" viewBox="0 0 640 640" role="img" aria-label="${message(language, 'copernicusDiagramAccessible')}">
    <defs><radialGradient id="copernicus-space-glow${instanceId}"><stop offset="0" stop-color="#183743"/><stop offset="1" stop-color="#091924"/></radialGradient></defs>
    <circle cx="320" cy="320" r="319" fill="url(#copernicus-space-glow${instanceId})"/>
    <circle class="guide-ring" cx="320" cy="320" r="280"/>
    <line class="axis" x1="20" y1="320" x2="620" y2="320"/>
    <line class="axis" x1="320" y1="20" x2="320" y2="620"/>
    ${circle(G, E, result.earthModel.annualRadius * result.earthToMarsScale, 'deferent-circle')}
    ${circle(M, E, result.marsGeometry.principalRadius, 'copernicus-principal-circle')}
    ${circle(C, E, result.marsGeometry.smallEpicycleRadius, 'epicycle-circle')}
    ${line(S, F, E, 'apsidal-line')}${line(F, G, E, 'equant-ray')}
    ${line(G, E, E, 'copernicus-earth-spoke')}${line(M, C, E, 'apsidal-line')}${line(C, P, E, 'epicycle-spoke')}
    ${trailPath}${line(E, P, E, 'sight-line')}${arc}
    ${dot(S, E, 'S', 'sun-dot', -70, -68, message(language, 'trueSunDescription'))}
    ${dot(F, E, 'F', 'deferent-dot', 8, -52, message(language, 'eccentricCenterDescription'))}
    ${dot(G, E, 'G', 'mean-sun-dot', 20, 62, message(language, 'meanSunDescription'))}
    ${dot(M, E, 'M', 'deferent-dot', -32, -25, message(language, 'marsPrincipalCenterDescription'))}
    ${dot(C, E, 'C', 'center-dot', 12, 30, message(language, 'marsEpicycleCenterDescription'))}
    ${dot(E, E, 'E', 'earth-dot', -42, 43, message(language, 'earthDescription'))}
    ${dot(P, E, 'P', 'mars-dot', 13, -14, message(language, 'marsDescription'))}
    <text class="angle-label" x="375" y="307">λ</text>
  </svg>`;
}

/** Historical dates along the actual Earth-to-Mars vector, in Mars units. */
export function copernicusTrail(days: number, span: number, samples = 96,
  policy: ApsisPolicy = apsisPolicy): Point[] {
  const start = policy === apsisPolicy ? Math.max(apsisDomainLocalDays.start, days - span) : days - span;
  return Array.from({ length: samples + 1 }, (_, i) =>
    evaluateMarsDays(start + (days - start) * i / samples, policy).earthToMars);
}
