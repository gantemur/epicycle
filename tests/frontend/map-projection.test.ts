import assert from 'node:assert/strict';
import test from 'node:test';
import { comparisonUt1Domain, example1512Ut1, frauenburgCivilToUt1 } from '../../web/src/comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy } from '../../web/src/copernicus.ts';
import { evaluateCopernicusMap, mapBodies, mapView, sampleMapTrail, sampleMapTrails,
  type MapBody } from '../../web/src/copernicus-map.ts';
import { message } from '../../web/src/i18n.ts';
import { mapProjectionTransitionRadius, projectMapPoint, projectMapRadius,
  unprojectMapPoint, unprojectMapRadius } from '../../web/src/map-projection.ts';
import { changeMap } from '../../web/src/workspace-panel-actions.ts';
import { mapFitPositions, mapTrailCacheKey, renderMapGrid, renderMapMarkers,
  renderMapTrails } from '../../web/src/workspace-map-view.ts';
import { addDisplay, copernicanMap, emptyWorkspace, fitMap, panMap,
  resetMapCamera, restoreWorkspace, updateDisplay, zoomMap } from '../../web/src/workspace-state.ts';
import { validateDisplay, validateWorkspace } from '../../web/src/workspace-validation.ts';
import type { PlanetaryMapDisplay } from '../../web/src/workspace-types.ts';

const close = (actual: number, expected: number, tolerance = 1e-8): void =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const screen = (point: { x: number; y: number }, map: PlanetaryMapDisplay) => {
  const projected = projectMapPoint(point, map.radialProjection);
  const scale = 270 / map.camera.radiusUnits;
  return { x: 340 + (projected.x - map.camera.offsetX) * scale,
    y: 340 - (projected.y - map.camera.offsetY) * scale };
};

test('radial projection has a finite origin, exact linear identity, smooth centre and invertible radii', () => {
  assert.equal(mapProjectionTransitionRadius, 10000);
  assert.deepEqual(projectMapPoint({ x: 0, y: 0 }, 'asinh'), { x: 0, y: 0 });
  assert.deepEqual(unprojectMapPoint({ x: 0, y: 0 }, 'asinh'), { x: 0, y: 0 });
  for (const point of [{ x: -3, y: 4 }, { x: 1e-7, y: -2e-7 }, { x: 1e5, y: 6e4 }]) {
    assert.deepEqual(projectMapPoint(point, 'linear'), point);
    const projected = projectMapPoint(point, 'asinh');
    assert.ok(Number.isFinite(projected.x) && Number.isFinite(projected.y));
    const restored = unprojectMapPoint(projected, 'asinh');
    close(restored.x, point.x, 1e-9);
    close(restored.y, point.y, 1e-9);
  }
  close(projectMapRadius(1e-7, 'asinh') / 1e-7, 1, 1e-12);
  let previous = 0;
  for (const radius of [1, 100, 10000, 30000, 60000, 100000]) {
    const displayed = projectMapRadius(radius, 'asinh');
    assert.ok(displayed > previous);
    close(unprojectMapRadius(displayed, 'asinh'), radius, 1e-9);
    previous = displayed;
  }
});

test('compression preserves directions, radial ordering and rotation symmetry', () => {
  for (const point of [{ x: 4, y: 7 }, { x: -4, y: 7 },
    { x: -4, y: -7 }, { x: 4, y: -7 }]) {
    const projected = projectMapPoint(point, 'asinh');
    close(Math.atan2(projected.y, projected.x), Math.atan2(point.y, point.x));
    const angle = 0.73;
    const rotated = { x: point.x * Math.cos(angle) - point.y * Math.sin(angle),
      y: point.x * Math.sin(angle) + point.y * Math.cos(angle) };
    const projectedRotated = projectMapPoint(rotated, 'asinh');
    close(projectedRotated.x,
      projected.x * Math.cos(angle) - projected.y * Math.sin(angle));
    close(projectedRotated.y,
      projected.x * Math.sin(angle) + projected.y * Math.cos(angle));
  }
  for (const day of [example1512Ut1, frauenburgCivilToUt1(2026, 10, 13)]) {
    const snapshot = evaluateCopernicusMap(day, exploratoryApsisPolicy);
    const original = JSON.stringify(snapshot);
    for (const centre of ['earth', 'mars', 'jupiter', 'saturn'] as const) {
      const view = mapView(snapshot, centre);
      const origin = snapshot.bodies[centre].point!;
      const order = mapBodies.filter(body => body !== centre).map(body => view.bodies[body]!);
      const sorted = [...order].sort((a, b) => a.distance - b.distance);
      const projectedRadii = sorted.map(item => {
        const point = projectMapPoint(item.point, 'asinh');
        return Math.hypot(point.x, point.y);
      });
      assert.deepEqual(projectedRadii, [...projectedRadii].sort((a, b) => a - b));
      for (const item of order) {
        const relative = { x: snapshot.bodies[item.body].point!.x - origin.x,
          y: snapshot.bodies[item.body].point!.y - origin.y };
        assert.deepEqual(projectMapPoint(item.point, 'asinh'), projectMapPoint(relative, 'asinh'));
        close(Math.hypot(item.point.x, item.point.y), item.distance);
        const projected = projectMapPoint(item.point, 'asinh');
        close(Math.hypot(projected.x, projected.y), projectMapRadius(item.distance, 'asinh'));
      }
    }
    assert.equal(JSON.stringify(snapshot), original);
  }
});

test('markers and trails use projected relative positions but retain historical readouts', () => {
  const snapshot = evaluateCopernicusMap(example1512Ut1, exploratoryApsisPolicy);
  const map = { ...copernicanMap, id: 'panel-1', viewCenter: 'mars' } as PlanetaryMapDisplay;
  const view = mapView(snapshot, 'mars');
  const marker = renderMapMarkers(map, snapshot, 'en');
  const jupiter = view.bodies.jupiter!;
  const pixel = screen(jupiter.point, map);
  assert.match(marker, new RegExp(`data-body="jupiter"[^>]*aria-label="Jupiter: ${jupiter.distance.toFixed(1)}, ${jupiter.siderealAngle.toFixed(2)}°"`));
  assert.match(marker, new RegExp(`<circle cx="${pixel.x.toFixed(2)}" cy="${pixel.y.toFixed(2)}"`));
  const samples = sampleMapTrail('jupiter', 'mars', exploratoryApsisPolicy,
    example1512Ut1 - 12, example1512Ut1, 3);
  const withTrail = { ...map, bodyTrails: { ...map.bodyTrails, jupiter: true } };
  const path = renderMapTrails(withTrail, { jupiter: samples });
  const first = screen(samples[0]!.point, map);
  assert.match(path, new RegExp(`M${first.x.toFixed(2)},${first.y.toFixed(2)}`));
  assert.match(path, new RegExp(`L${pixel.x.toFixed(2)},${pixel.y.toFixed(2)}`));
  const earlier = evaluateCopernicusMap(example1512Ut1 - 12, exploratoryApsisPolicy);
  const wrongFixedCentre = {
    x: earlier.bodies.jupiter.point!.x - snapshot.bodies.mars.point!.x,
    y: earlier.bodies.jupiter.point!.y - snapshot.bodies.mars.point!.y,
  };
  assert.ok(Math.hypot(first.x - screen(wrongFixedCentre, map).x,
    first.y - screen(wrongFixedCentre, map).y) > 0.1);
});

test('source gaps and exploratory provenance remain distinct in compressed trails', () => {
  const start = comparisonUt1Domain.end - 9;
  const end = comparisonUt1Domain.end + 9;
  const map = { ...copernicanMap, id: 'panel-1', viewCenter: 'earth',
    bodyTrails: { ...copernicanMap.bodyTrails, mars: true } } as PlanetaryMapDisplay;
  const guarded = sampleMapTrails(['mars'], 'earth', apsisPolicy, start, end, 3);
  assert.ok(guarded.mars!.some(sample => sample === null));
  const guardedSvg = renderMapTrails(map, guarded);
  assert.match(guardedSvg, /data-provenance="solid"/);
  assert.doesNotMatch(guardedSvg, /data-provenance="dashed"/);
  const exploratory = sampleMapTrails(['mars'], 'earth', exploratoryApsisPolicy, start, end, 3);
  const continuedSvg = renderMapTrails(map, exploratory);
  assert.match(continuedSvg, /data-provenance="solid"/);
  assert.match(continuedSvg, /data-provenance="dashed"/);
});

test('projection selection is panel-local, validated, restored, and does not resample trails', () => {
  let state = addDisplay(addDisplay(emptyWorkspace(), copernicanMap), copernicanMap);
  const first = state.displays[0] as PlanetaryMapDisplay;
  const second = state.displays[1] as PlanetaryMapDisplay;
  assert.equal(first.radialProjection, 'asinh');
  const historicalKey = mapTrailCacheKey(first, example1512Ut1);
  const linear = changeMap(first, 'map-projection', 'linear')!;
  assert.equal(linear.radialProjection, 'linear');
  close(linear.camera.radiusUnits, 120000);
  const shifted = { ...first, camera: { ...first.camera, offsetX: 2000, offsetY: -1000 } };
  const shiftedLinear = changeMap(shifted, 'map-projection', 'linear')!;
  const physicalTarget = unprojectMapPoint({ x: 2000, y: -1000 }, 'asinh');
  close(shiftedLinear.camera.offsetX, physicalTarget.x);
  close(shiftedLinear.camera.offsetY, physicalTarget.y);
  const roundTrip = changeMap(shiftedLinear, 'map-projection', 'asinh')!;
  close(roundTrip.camera.offsetX, shifted.camera.offsetX);
  close(roundTrip.camera.offsetY, shifted.camera.offsetY);
  close(roundTrip.camera.radiusUnits, shifted.camera.radiusUnits);
  assert.equal(mapTrailCacheKey(linear, example1512Ut1), historicalKey);
  assert.equal(changeMap(first, 'map-projection', 'unrecognized'), null);
  state = updateDisplay(state, linear);
  assert.equal((state.displays[1] as PlanetaryMapDisplay).radialProjection, 'asinh');
  assert.notStrictEqual((state.displays[0] as PlanetaryMapDisplay).camera, second.camera);
  const paused = restoreWorkspace({ ...state, clock: { ...state.clock, playing: true } });
  assert.equal(paused?.clock.playing, false);
  assert.equal((paused?.displays[0] as PlanetaryMapDisplay).radialProjection, 'linear');
  assert.equal(validateDisplay({ ...first, radialProjection: 'unknown' as 'asinh' }).length > 0, true);
  assert.equal(validateWorkspace({ ...state, displays: [{ ...first, radialProjection: 'unknown' }] }).length > 0, true);
  assert.equal(restoreWorkspace({ ...state, displays: [{ ...first, radialProjection: undefined }] }), null);
  for (const language of ['en', 'mn'] as const) {
    assert.ok(message(language, 'mapRadialScale'));
    assert.ok(message(language, 'mapCompressedNotice'));
    assert.match(message(language, 'mapRingDistances'), /10,000.*100,000/);
  }
});

test('guide rings carry original physical distances through projection and pan', () => {
  const map = { ...copernicanMap, id: 'panel-1', camera: {
    ...copernicanMap.camera, offsetX: 1000, offsetY: -2000,
  } } as PlanetaryMapDisplay;
  for (const projection of ['asinh', 'linear'] as const) {
    const display = { ...map, radialProjection: projection };
    const svg = renderMapGrid(display, 'en');
    const circles = [...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.-]+)"\/>/g)];
    assert.equal(circles.length, 4);
    for (const [index, physical] of [10000, 30000, 60000, 100000].entries()) {
      const ring = circles[index];
      const expected = projectMapRadius(physical, projection) * 270 / display.camera.radiusUnits;
      close(Number(ring[3]), Number(expected.toFixed(2)), 1e-9);
      close(Number(ring[1]), Number(screen({ x: 0, y: 0 }, display).x.toFixed(2)), 1e-9);
      close(Number(ring[2]), Number(screen({ x: 0, y: 0 }, display).y.toFixed(2)), 1e-9);
    }
  }
});

test('Fit uses projected long-trail bounds; zoom, pan and reset retain their camera order', () => {
  const draft = { ...copernicanMap, trailDays: 365 * 30,
    bodyTrails: { ...copernicanMap.bodyTrails, earth: true, mars: true, saturn: true } };
  let state = addDisplay(emptyWorkspace(), draft);
  const map = state.displays[0] as PlanetaryMapDisplay;
  const points = mapFitPositions(map, example1512Ut1);
  assert.ok(points.length > 1800);
  state = fitMap(state, map.id, points);
  const fitted = state.displays[0] as PlanetaryMapDisplay;
  for (const point of points) {
    const x = (point.x - fitted.camera.offsetX) * 270 / fitted.camera.radiusUnits;
    const y = (point.y - fitted.camera.offsetY) * 270 / fitted.camera.radiusUnits;
    assert.ok(Math.abs(x) < 225 && Math.abs(y) < 225);
  }
  const radius = fitted.camera.radiusUnits;
  state = zoomMap(state, map.id, 0.5);
  close((state.displays[0] as PlanetaryMapDisplay).camera.radiusUnits, radius / 2);
  state = panMap(state, map.id, 0.25, -0.25);
  const panned = state.displays[0] as PlanetaryMapDisplay;
  close(panned.camera.offsetX, fitted.camera.offsetX + radius / 8);
  close(panned.camera.offsetY, fitted.camera.offsetY - radius / 8);
  const physicalCentre = mapView(evaluateCopernicusMap(example1512Ut1, exploratoryApsisPolicy),
    panned.viewCenter).bodies[panned.viewCenter]!.point;
  assert.deepEqual(physicalCentre, { x: 0, y: 0 });
  state = resetMapCamera(state, map.id);
  const reset = state.displays[0] as PlanetaryMapDisplay;
  close(reset.camera.radiusUnits, projectMapRadius(120000, 'asinh'));
  assert.deepEqual({ x: reset.camera.offsetX, y: reset.camera.offsetY }, { x: 0, y: 0 });
});
