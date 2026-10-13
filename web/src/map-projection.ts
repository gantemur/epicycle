import type { Point } from './model.ts';

/** Presentation coordinates only; historical positions remain in original units. */
export type MapRadialProjection = 'linear' | 'asinh';
export const mapProjectionTransitionRadius = 10000;

export function projectMapRadius(radius: number, projection: MapRadialProjection): number {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Invalid map radius');
  return projection === 'linear' ? radius
    : mapProjectionTransitionRadius * Math.asinh(radius / mapProjectionTransitionRadius);
}

export function unprojectMapRadius(radius: number, projection: MapRadialProjection): number {
  if (!Number.isFinite(radius) || radius < 0) throw new RangeError('Invalid projected radius');
  return projection === 'linear' ? radius
    : mapProjectionTransitionRadius * Math.sinh(radius / mapProjectionTransitionRadius);
}

/** Apply a radial warp after subtracting the selected historical centre. */
export function projectMapPoint(point: Point, projection: MapRadialProjection): Point {
  if (projection === 'linear') return { x: point.x, y: point.y };
  const radius = Math.hypot(point.x, point.y);
  if (radius === 0) return { x: 0, y: 0 };
  const scale = projectMapRadius(radius, projection) / radius;
  return { x: point.x * scale, y: point.y * scale };
}

/** Used only to preserve the physical camera target when changing projection. */
export function unprojectMapPoint(point: Point, projection: MapRadialProjection): Point {
  if (projection === 'linear') return { x: point.x, y: point.y };
  const radius = Math.hypot(point.x, point.y);
  if (radius === 0) return { x: 0, y: 0 };
  const scale = unprojectMapRadius(radius, projection) / radius;
  return { x: point.x * scale, y: point.y * scale };
}
