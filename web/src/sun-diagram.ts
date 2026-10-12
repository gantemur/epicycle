import { evaluateCopernicusSunDays, type CopernicusSunResult } from './copernicus-sun.ts';
import { message, type Language, type MessageKey } from './i18n.ts';
import type { Point } from './model.ts';
import type { ViewCenter } from './model-registry.ts';
import { evaluatePtolemySunDays, type PtolemySunResult } from './sun-almagest.ts';

const origin = 320;
const ptolemyScale = 3.2;
const copernicusScale = 0.021;
const format = (value: number): string => value.toFixed(2);
const xy = (point: Point): string => `${format(point.x)},${format(point.y)}`;
const relative = (point: Point, centre: Point): Point =>
  ({ x: point.x - centre.x, y: point.y - centre.y });
const screen = (point: Point, scale: number): Point =>
  ({ x: origin + point.x * scale, y: origin - point.y * scale });

function line(a: Point, b: Point, scale: number, className: string): string {
  const first = screen(a, scale);
  const second = screen(b, scale);
  return `<line class="${className}" x1="${format(first.x)}" y1="${format(first.y)}" x2="${format(second.x)}" y2="${format(second.y)}"/>`;
}

function circle(centre: Point, radius: number, scale: number, className: string): string {
  const point = screen(centre, scale);
  return `<circle class="${className}" cx="${format(point.x)}" cy="${format(point.y)}" r="${format(radius * scale)}"/>`;
}

function dot(point: Point, scale: number, code: string, className: string,
  dx: number, dy: number, language: Language, description: MessageKey): string {
  const position = screen(point, scale);
  const leader = Math.hypot(dx, dy) > 35
    ? `<line class="point-leader" x1="${format(position.x)}" y1="${format(position.y)}" x2="${format(position.x + dx + 7)}" y2="${format(position.y + dy - 6)}"/>`
    : '';
  return `<g class="${className}"><title>${message(language, description)}</title>${leader}` +
    `<circle class="point-halo" cx="${format(position.x)}" cy="${format(position.y)}" r="12"/>` +
    `<circle class="point-core" cx="${format(position.x)}" cy="${format(position.y)}" r="7"/>` +
    `<text class="point-label" x="${format(position.x + dx)}" y="${format(position.y + dy)}">${code}</text></g>`;
}

function background(id: string): string {
  return `<defs><radialGradient id="sun-space-glow${id}"><stop offset="0" stop-color="#183743"/>` +
    `<stop offset="1" stop-color="#091924"/></radialGradient></defs>` +
    `<circle cx="320" cy="320" r="319" fill="url(#sun-space-glow${id})"/>` +
    `<circle class="guide-ring" cx="320" cy="320" r="280"/>` +
    `<line class="axis" x1="20" y1="320" x2="620" y2="320"/>` +
    `<line class="axis" x1="320" y1="20" x2="320" y2="620"/>`;
}

function trailPath(trail: readonly Point[], scale: number): string {
  if (trail.length < 2) return '';
  return `<polyline class="solar-trail" points="${trail.map(point => xy(screen(point, scale))).join(' ')}"/>`;
}

/** Original R=60 eccentric with its mean and true geocentric directions. */
export function renderPtolemySunDiagram(result: PtolemySunResult, trail: readonly Point[],
  language: Language, instanceId = ''): string {
  const { earth: O, eccentricCenter: D, sun: P } = result;
  const meanAngle = result.meanLongitude * Math.PI / 180;
  const meanDirection = {
    x: result.eccentricRadius * Math.cos(meanAngle),
    y: result.eccentricRadius * Math.sin(meanAngle),
  };
  return `<svg class="sky-diagram" viewBox="0 0 640 640" role="img" aria-label="${message(language, 'ptolemySunDiagramAccessible')}">
    ${background(instanceId)}
    ${circle(D, result.eccentricRadius, ptolemyScale, 'deferent-circle')}
    ${line(O, D, ptolemyScale, 'apsidal-line')}
    ${line(D, P, ptolemyScale, 'epicycle-spoke')}
    ${line(O, meanDirection, ptolemyScale, 'solar-mean-ray')}
    ${trailPath(trail, ptolemyScale)}
    ${line(O, P, ptolemyScale, 'sight-line')}
    ${dot(O, ptolemyScale, 'O', 'earth-dot', -58, 55, language, 'earthDescription')}
    ${dot(D, ptolemyScale, 'D', 'deferent-dot', 37, -45, language, 'solarEccentricCentreDescription')}
    ${dot(P, ptolemyScale, 'P', 'sun-dot', 14, -15, language, 'sunPointDescription')}
  </svg>`;
}

export function ptolemySunTrail(days: number, span: number, samples = 64): Point[] {
  return Array.from({ length: samples + 1 }, (_, index) =>
    evaluatePtolemySunDays(days - span + span * index / samples).sun);
}

/** The same Copernican Earth construction translated to a selected drawing origin. */
export function renderCopernicusSunDiagram(result: CopernicusSunResult,
  viewCenter: ViewCenter, trail: readonly Point[], language: Language, instanceId = ''): string {
  const { trueSun: S, eccentricCenter: F, meanSun: G, earth: E } = result;
  const centre = viewCenter === 'true-sun' ? S : E;
  const s = relative(S, centre);
  const f = relative(F, centre);
  const g = relative(G, centre);
  const e = relative(E, centre);
  return `<svg class="sky-diagram" viewBox="0 0 640 640" role="img" aria-label="${message(language, 'copernicusSolarDiagramAccessible')}">
    ${background(instanceId)}
    ${circle(g, result.annualRadius, copernicusScale, 'deferent-circle')}
    ${line(s, f, copernicusScale, 'apsidal-line')}
    ${line(f, g, copernicusScale, 'equant-ray')}
    ${line(g, e, copernicusScale, 'copernicus-earth-spoke')}
    ${trailPath(trail, copernicusScale)}
    ${line(e, s, copernicusScale, 'sight-line')}
    ${dot(s, copernicusScale, 'S', 'sun-dot', -78, -75, language, 'trueSunDescription')}
    ${dot(f, copernicusScale, 'F', 'deferent-dot', 56, -22, language, 'eccentricCenterDescription')}
    ${dot(g, copernicusScale, 'G', 'mean-sun-dot', 57, 45, language, 'meanSunDescription')}
    ${dot(e, copernicusScale, 'E', 'earth-dot', 14, -14, language, 'earthDescription')}
  </svg>`;
}

/** Sample each date's relative vector; a changing drawing origin is not held fixed. */
export function copernicusSunTrail(days: number, span: number,
  viewCenter: ViewCenter, samples = 64): Point[] {
  return Array.from({ length: samples + 1 }, (_, index) => {
    const result = evaluateCopernicusSunDays(days - span + span * index / samples);
    return viewCenter === 'true-sun' ? relative(result.earth, result.trueSun)
      : relative(result.trueSun, result.earth);
  });
}
