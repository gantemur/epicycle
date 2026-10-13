import { message, type Language } from './i18n.ts';
import { evaluateDays, type Point } from './model.ts';
import type { SuperiorGeometryResult } from './superior-geometry.ts';
import { evaluatePtolemyJupiterDays } from './ptolemy-jupiter.ts';
import { evaluatePtolemySaturnDays } from './ptolemy-saturn.ts';

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

type LabelAnchor = 'start' | 'middle' | 'end';

function dot(point: Point, code: string, className: string, dx: number, dy: number,
  description: string, anchor: LabelAnchor = 'start', radialLeader = false): string {
  const p = screenPoint(point);
  const tip = radialLeader
    ? { x: p.x + 0.78 * dx, y: p.y + 0.78 * (dy - 6) }
    : { x: p.x + dx + 6, y: p.y + dy - 6 };
  const leader = Math.hypot(dx, dy) > 33 ? `<line class="point-leader" x1="${f(p.x)}" y1="${f(p.y)}" x2="${f(tip.x)}" y2="${f(tip.y)}"/>` : '';
  const anchorAttribute = anchor === 'start' ? '' : ` text-anchor="${anchor}"`;
  return `<g class="${className}"><title>${description}</title>${leader}<circle class="point-halo" cx="${f(p.x)}" cy="${f(p.y)}" r="14"/><circle class="point-core" cx="${f(p.x)}" cy="${f(p.y)}" r="8"/><text class="point-label" x="${f(p.x + dx)}" y="${f(p.y + dy)}"${anchorAttribute}>${code}</text></g>`;
}

/** Put each outer-planet label away from the other epicycle dot at every phase. */
function epicycleLabel(point: Point, other: Point): { dx: number; dy: number; anchor: LabelAnchor } {
  const position = screenPoint(point);
  const opposite = screenPoint(other);
  const separation = Math.hypot(position.x - opposite.x, position.y - opposite.y);
  const horizontal = (position.x - opposite.x) / separation;
  const vertical = (position.y - opposite.y) / separation;
  return { dx: 44 * horizontal, dy: 44 * vertical + 6,
    anchor: horizontal > 0.3 ? 'start' : horizontal < -0.3 ? 'end' : 'middle' };
}

export function trailPoints(day: number, span: number, samples = 160): Point[] {
  // Retain the original epoch clamp for nonnegative dates. Before the epoch,
  // follow the requested interval of mathematically continued mean motions.
  const beginning = day < 0 ? day - span : Math.max(0, day - span);
  return Array.from({ length: samples + 1 }, (_, index) =>
    evaluateDays(beginning + (day - beginning) * index / samples).planet);
}

export function outerTrailPoints(body: 'Jupiter' | 'Saturn', day: number,
  span: number, samples = 160): Point[] {
  // The computational clock permits dates before Nabonassar; a trail must
  // follow the requested historical interval rather than jump to epoch zero.
  const beginning = day - span;
  const evaluate = body === 'Jupiter' ? evaluatePtolemyJupiterDays : evaluatePtolemySaturnDays;
  return Array.from({ length: samples + 1 }, (_, index) =>
    evaluate(beginning + (day - beginning) * index / samples).planet);
}

export function renderDiagram(result: SuperiorGeometryResult, trail: readonly Point[], language: Language,
  instanceId = '', body: 'Mars' | 'Jupiter' | 'Saturn' = 'Mars'): string {
  const { earth: O, deferentCenter: D, equant: Q, epicycleCenter: C, planet: P } = result;
  const trailPath = trail.length > 1 ? `<polyline class="mars-trail" points="${trail.map(p => xy(screenPoint(p))).join(' ')}"/>` : '';
  const angle = result.longitude * Math.PI / 180;
  const arcEnd = { x: origin + 47 * Math.cos(angle), y: origin - 47 * Math.sin(angle) };
  const arc = `<path class="longitude-arc" d="M ${origin + 47},${origin} A 47,47 0 ${result.longitude > 180 ? 1 : 0} 0 ${xy(arcEnd)}"/>`;
  const accessible = body === 'Mars' ? 'diagramAccessible'
    : body === 'Jupiter' ? 'jupiterDiagramAccessible' : 'saturnDiagramAccessible';
  const description = body === 'Mars' ? 'marsDescription'
    : body === 'Jupiter' ? 'jupiterDescription' : 'saturnDescription';
  const centerLabel = body === 'Mars' ? null : epicycleLabel(C, P);
  const planetLabel = body === 'Mars' ? null : epicycleLabel(P, C);
  return `<svg class="sky-diagram" viewBox="0 0 ${size} ${size}" role="img" aria-label="${message(language, accessible)}">
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
    ${centerLabel
      ? dot(C, 'C', 'center-dot', centerLabel.dx, centerLabel.dy,
        message(language, 'epicycleDescription'), centerLabel.anchor, true)
      : dot(C, 'C', 'center-dot', 13, 28, message(language, 'epicycleDescription'))}
    ${dot(O, 'O', 'earth-dot', -45, 58, message(language, 'earthDescription'))}
    ${planetLabel
      ? dot(P, 'P', 'mars-dot', planetLabel.dx, planetLabel.dy,
        message(language, description), planetLabel.anchor, true)
      : dot(P, 'P', 'mars-dot', 14, -14, message(language, description))}
    <text class="angle-label" x="${origin + 56}" y="${origin - 13}">λ</text>
  </svg>`;
}
