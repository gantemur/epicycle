import { message, type Language } from './i18n.ts';
import { evaluateDays, type MarsResult, type Point } from './model.ts';

const size = 640;
const origin = size / 2;
const scale = 2.48;

export function screenPoint(point: Point): Point {
  return { x: origin + point.x * scale, y: origin - point.y * scale };
}

const f = (value: number): string => value.toFixed(2);
const xy = (point: Point): string => `${f(point.x)},${f(point.y)}`;

function line(a: Point, b: Point, className: string): string {
  const first = screenPoint(a);
  const last = screenPoint(b);
  return `<line class="${className}" x1="${f(first.x)}" y1="${f(first.y)}" x2="${f(last.x)}" y2="${f(last.y)}"/>`;
}

function circle(point: Point, radius: number, className: string): string {
  const p = screenPoint(point);
  return `<circle class="${className}" cx="${f(p.x)}" cy="${f(p.y)}" r="${f(radius * scale)}"/>`;
}

function dot(point: Point, code: string, className: string, dx: number, dy: number, description: string): string {
  const p = screenPoint(point);
  const leader = Math.hypot(dx, dy) > 33 ? `<line class="point-leader" x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(p.x + dx + 6)}" y2="${f(p.y + dy - 6)}"/>` : '';
  return `<g class="${className}"><title>${description}</title>${leader}<circle class="point-halo" cx="${f(p.x)}" cy="${f(p.y)}" r="14"/><circle class="point-core" cx="${f(p.x)}" cy="${f(p.y)}" r="8"/><text class="point-label" x="${f(p.x + dx)}" y="${f(p.y + dy)}">${code}</text></g>`;
}

export function trailPoints(day: number, span: number, samples = 160): Point[] {
  const beginning = Math.max(0, day - span);
  return Array.from({ length: samples + 1 }, (_, index) =>
    evaluateDays(beginning + (day - beginning) * index / samples).planet);
}

export function renderDiagram(result: MarsResult, trail: readonly Point[], language: Language,
  instanceId = ''): string {
  const { earth: O, deferentCenter: D, equant: Q, epicycleCenter: C, planet: P } = result;
  const trailPath = trail.length > 1 ? `<polyline class="mars-trail" points="${trail.map(p => xy(screenPoint(p))).join(' ')}"/>` : '';
  const angle = result.longitude * Math.PI / 180;
  const arcEnd = { x: origin + 47 * Math.cos(angle), y: origin - 47 * Math.sin(angle) };
  const arc = `<path class="longitude-arc" d="M ${origin + 47},${origin} A 47,47 0 ${result.longitude > 180 ? 1 : 0} 0 ${xy(arcEnd)}"/>`;
  return `<svg class="sky-diagram" viewBox="0 0 ${size} ${size}" role="img" aria-label="${message(language, 'diagramAccessible')}">
    <defs><radialGradient id="space-glow${instanceId}"><stop offset="0" stop-color="#183743"/><stop offset="1" stop-color="#091924"/></radialGradient></defs>
    <circle cx="320" cy="320" r="319" fill="url(#space-glow${instanceId})"/>
    <circle class="guide-ring" cx="320" cy="320" r="280"/>
    <circle class="guide-ring minor" cx="320" cy="320" r="140"/>
    <line class="axis" x1="20" y1="320" x2="620" y2="320"/>
    <line class="axis" x1="320" y1="20" x2="320" y2="620"/>
    ${circle(D, result.deferentRadius, 'deferent-circle')}
    ${circle(C, result.epicycleRadius, 'epicycle-circle')}
    ${line(O, Q, 'apsidal-line')}
    ${line(Q, C, 'equant-ray')}
    ${line(C, P, 'epicycle-spoke')}
    ${trailPath}
    ${line(O, P, 'sight-line')}
    ${arc}
    ${dot(D, 'D', 'deferent-dot', -77, 0, message(language, 'deferentDescription'))}
    ${dot(Q, 'Q', 'equant-dot', -28, -45, message(language, 'equantDescription'))}
    ${dot(C, 'C', 'center-dot', 13, 28, message(language, 'epicycleDescription'))}
    ${dot(O, 'O', 'earth-dot', -45, 58, message(language, 'earthDescription'))}
    ${dot(P, 'P', 'mars-dot', 14, -14, message(language, 'marsDescription'))}
    <text class="angle-label" x="${origin + 56}" y="${origin - 13}">λ</text>
  </svg>`;
}
