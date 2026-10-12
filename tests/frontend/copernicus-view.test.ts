import assert from 'node:assert/strict';
import test from 'node:test';
import { copernicusTrail, copernicusViewOrigin, relativePosition,
  renderCopernicusDiagram } from '../../web/src/copernicus-diagram.ts';
import { apsisDomainLocalDays, apsisPolicy, evaluateMarsDays,
  exploratoryApsisPolicy, type ApsisPolicy } from '../../web/src/copernicus.ts';
import { example1512Ut1, frauenburgCivilToUt1, modelDaysAtUt1 } from '../../web/src/comparison-time.ts';
import { message, messages } from '../../web/src/i18n.ts';
import { angularDifference, wrap, type Point } from '../../web/src/model.ts';
import { modelCapabilities } from '../../web/src/model-registry.ts';
import { changeGeometry } from '../../web/src/workspace-panel-actions.ts';
import { geometryPanelTitle } from '../../web/src/workspace-geometry-view.ts';
import { addDisplay, applyWorkspacePreset, emptyWorkspace, setClockPlaying,
  updateDisplay } from '../../web/src/workspace-state.ts';
import { displayAvailabilityAt, validateDisplay } from '../../web/src/workspace-validation.ts';
import type { GeometryDisplay, TimeSeriesDisplay } from '../../web/src/workspace-types.ts';

function nearly(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} differs from ${expected}`);
}

function pointNearly(actual: Point, expected: Point, tolerance = 1e-9): void {
  nearly(actual.x, expected.x, tolerance);
  nearly(actual.y, expected.y, tolerance);
}

function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

const cases: readonly [number, ApsisPolicy][] = [
  [apsisDomainLocalDays.start, apsisPolicy],
  [modelDaysAtUt1(example1512Ut1).copernicus, apsisPolicy],
  [apsisDomainLocalDays.end, apsisPolicy],
  [modelDaysAtUt1(frauenburgCivilToUt1(2026, 10, 11)).copernicus, exploratoryApsisPolicy],
];

test('view translation preserves the historical geocentric vector and longitudes', () => {
  for (const [days, policy] of cases) {
    const result = evaluateMarsDays(days, policy);
    const { trueSun, earth } = result.earthGeometryInMarsUnits;
    const mars = result.marsGeometry.mars;
    const fromSun = subtract(relativePosition(mars, trueSun), relativePosition(earth, trueSun));
    const fromEarth = relativePosition(mars, earth);
    pointNearly(fromSun, fromEarth);
    pointNearly(fromEarth, result.earthToMars);
    const sidereal = wrap(Math.atan2(fromSun.y, fromSun.x) * 180 / Math.PI);
    nearly(angularDifference(sidereal, result.geocentricSiderealLongitude), 0);
    nearly(wrap(sidereal + result.truePrecession), result.geocentricTropicalLongitude);
    pointNearly(relativePosition(earth, copernicusViewOrigin(result, 'earth')), { x: 0, y: 0 });
    pointNearly(relativePosition(trueSun, copernicusViewOrigin(result, 'true-sun')), { x: 0, y: 0 });
  }
});

test('all Copernican circles and point separations keep their Mars-unit radii', () => {
  for (const [days, policy] of cases) {
    const result = evaluateMarsDays(days, policy);
    const { trueSun: sun, eccentricCenter: f, meanSun: g, earth } = result.earthGeometryInMarsUnits;
    const { eccentricCenter: m, epicycleCenter: c, mars } = result.marsGeometry;
    nearly(distance(g, earth), 6580);
    nearly(distance(m, c), 10000);
    nearly(distance(c, mars), 500);
    nearly(distance(sun, f), 369 * result.earthToMarsScale);
    nearly(distance(f, g), 48 * result.earthToMarsScale);
    nearly(distance(g, m), 1460);
    for (const centre of [sun, earth]) {
      const points = [sun, f, g, earth, m, c, mars].map(point => relativePosition(point, centre));
      nearly(distance(points[2], points[3]), 6580);
      nearly(distance(points[4], points[5]), 10000);
      nearly(distance(points[5], points[6]), 500);
      nearly(distance(points[0], points[1]), 369 * result.earthToMarsScale);
    }
  }
});

test('each Mars trail samples its own moving origin and ends at the current point', () => {
  const days = modelDaysAtUt1(example1512Ut1).copernicus;
  for (const centre of ['earth', 'true-sun'] as const) {
    const trail = copernicusTrail(days, 180, 12, apsisPolicy, centre);
    assert.equal(trail.length, 13);
    for (let index = 0; index < trail.length; index++) {
      const instant = days - 180 + 180 * index / 12;
      const result = evaluateMarsDays(instant);
      pointNearly(trail[index], relativePosition(result.marsGeometry.mars,
        copernicusViewOrigin(result, centre)));
    }
    const current = evaluateMarsDays(days);
    pointNearly(trail.at(-1)!, relativePosition(current.marsGeometry.mars,
      copernicusViewOrigin(current, centre)));
  }
  const early = apsisDomainLocalDays.start + 5;
  const clipped = copernicusTrail(early, 90, 10, apsisPolicy, 'true-sun');
  const atStart = evaluateMarsDays(apsisDomainLocalDays.start);
  pointNearly(clipped[0], relativePosition(atStart.marsGeometry.mars,
    atStart.earthGeometryInMarsUnits.trueSun));
  const future = cases[3][0];
  const continued = copernicusTrail(future, 180, 12, exploratoryApsisPolicy, 'true-sun');
  const atFuture = evaluateMarsDays(future, exploratoryApsisPolicy);
  pointNearly(continued.at(-1)!, relativePosition(atFuture.marsGeometry.mars,
    atFuture.earthGeometryInMarsUnits.trueSun));
  assert.ok(continued.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});

function lineStart(svg: string, className: string): Point {
  const match = svg.match(new RegExp(`<line class="${className}" x1="([\\d.-]+)" y1="([\\d.-]+)"`));
  assert.ok(match, `missing ${className}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

function pointOnSvg(svg: string, className: string): Point {
  const match = svg.match(new RegExp(`<g class="${className}">[\\s\\S]*?<circle class="point-halo" cx="([\\d.-]+)" cy="([\\d.-]+)"`));
  assert.ok(match, `missing ${className}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

test('one SVG renderer moves only the origin; sight line and longitude arc stay at Earth', () => {
  const result = evaluateMarsDays(cases[1][0]);
  const earthSvg = renderCopernicusDiagram(result, 'en', [], '-panel-1', 'earth');
  const sunSvg = renderCopernicusDiagram(result, 'en', [], '-panel-2', 'true-sun');
  pointNearly(pointOnSvg(earthSvg, 'earth-dot'), { x: 320, y: 320 }, .01);
  pointNearly(pointOnSvg(sunSvg, 'sun-dot'), { x: 320, y: 320 }, .01);
  for (const svg of [earthSvg, sunSvg]) {
    const earth = pointOnSvg(svg, 'earth-dot');
    pointNearly(lineStart(svg, 'sight-line'), earth, .01);
    const arc = svg.match(/<path class="longitude-arc" d="M ([\d.-]+),([\d.-]+) A /);
    assert.ok(arc);
    pointNearly({ x: Number(arc[1]), y: Number(arc[2]) },
      { x: earth.x + 45, y: earth.y }, .02);
    assert.match(svg, /<circle class="deferent-circle"[^>]*r="92\.12"/);
    assert.match(svg, /<circle class="copernicus-principal-circle"[^>]*r="140\.00"/);
    assert.match(svg, /<circle class="epicycle-circle"[^>]*r="7\.00"/);
    assert.match(svg, /<text class="angle-label"/);
  }
  assert.match(sunSvg, /sun-earth-ray/);
  assert.match(sunSvg, /sun-mars-ray/);
  assert.match(sunSvg, /True-Sun-centred Copernicus/);
  assert.doesNotMatch(earthSvg, /sun-earth-ray/);
  assert.match(earthSvg, /copernicus-space-glow-panel-1/);
  assert.match(sunSvg, /copernicus-space-glow-panel-2/);
});

test('circles, points, trails and labels stay within the fixed SVG viewport', () => {
  for (const [days, policy] of cases) for (const centre of ['earth', 'true-sun'] as const) {
    const result = evaluateMarsDays(days, policy);
    const trail = copernicusTrail(days, 180, 24, policy, centre);
    const svg = renderCopernicusDiagram(result, 'en', trail, '-test', centre);
    for (const element of svg.matchAll(/<(circle|text|line)\b[^>]*>/g)) {
      const tag = element[0];
      const attributes = Object.fromEntries(Array.from(tag.matchAll(/\b(cx|cy|r|x|y|x1|y1|x2|y2)="([\d.-]+)"/g),
        match => [match[1], Number(match[2])]));
      for (const value of Object.values(attributes)) {
        assert.ok(value >= 0 && value <= 640, `${centre}: ${tag} leaves the viewport`);
      }
      if (element[1] === 'circle') {
        assert.ok(attributes.cx - attributes.r >= 0 && attributes.cx + attributes.r <= 640);
        assert.ok(attributes.cy - attributes.r >= 0 && attributes.cy + attributes.r <= 640);
      }
    }
    const path = svg.match(/<polyline class="mars-trail" points="([^"]+)"/);
    assert.ok(path);
    for (const pair of path[1].split(' ')) {
      const [x, y] = pair.split(',').map(Number);
      assert.ok(x >= 0 && x <= 640 && y >= 0 && y <= 640);
    }
  }
});

test('independent Copernican panels change centre without changing clock, plot, or policy', () => {
  let state = setClockPlaying(applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison'), true);
  const plot = state.displays[0] as TimeSeriesDisplay;
  const first = state.displays[2] as GeometryDisplay;
  const { id: ignored, ...draft } = first;
  void ignored;
  state = addDisplay(state, draft);
  const second = state.displays[3] as GeometryDisplay;
  state = updateDisplay(state, changeGeometry(second, 'view-center', 'true-sun')!);
  assert.equal((state.displays[2] as GeometryDisplay).viewCenter, 'earth');
  assert.equal((state.displays[3] as GeometryDisplay).viewCenter, 'true-sun');
  assert.equal(state.clock.ut1Jd, example1512Ut1);
  assert.equal(state.clock.playing, true);
  assert.equal(state.displays[0], plot);
  assert.equal((state.displays[3] as GeometryDisplay).policyId, apsisPolicy);
  assert.equal(displayAvailabilityAt(state.displays[3], example1512Ut1).status, 'available');
  const ptolemy = changeGeometry(state.displays[3] as GeometryDisplay, 'model', 'ptolemy')!;
  assert.equal(ptolemy.viewCenter, 'earth');
  assert.equal(ptolemy.policyId, 'mathematical-continuation');
  const switched = updateDisplay(state, ptolemy);
  assert.equal(switched.clock, state.clock);
  assert.equal(switched.displays[0], plot);
  assert.equal(switched.displays[2], state.displays[2]);
  const back = changeGeometry(ptolemy, 'model', 'copernicus')!;
  assert.equal(back.viewCenter, 'earth');
  assert.equal(back.policyId, apsisPolicy);
  assert.equal(changeGeometry(ptolemy, 'view-center', 'true-sun'), null);
  assert.equal(changeGeometry(first, 'view-center', 'unsupported'), null);
  assert.ok(validateDisplay({ ...ptolemy, viewCenter: 'true-sun' }).some(issue =>
    issue.code === 'unsupported-center'));
  assert.deepEqual(modelCapabilities.copernicus.renderedViewCenters, ['earth', 'true-sun']);
  assert.deepEqual(modelCapabilities.ptolemy.renderedViewCenters, ['earth']);
});

test('centre labels, explanations, and accessible descriptions exist in both languages', () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.mn).sort());
  const copernicus = applyWorkspacePreset(emptyWorkspace(), 'detailed-comparison').displays[2] as GeometryDisplay;
  const sun = { ...copernicus, viewCenter: 'true-sun' as const };
  for (const language of ['en', 'mn'] as const) {
    assert.notEqual(geometryPanelTitle(copernicus, language), geometryPanelTitle(sun, language));
    assert.match(geometryPanelTitle(sun, language), new RegExp(message(language, 'trueSunCentred')));
    assert.ok(message(language, 'copernicusSunPanelHint').includes('G'));
    assert.ok(message(language, 'copernicusSunPanelHint').includes('E→P'));
    assert.ok(message(language, 'copernicusSunDiagramAccessible').length > 40);
    assert.ok(message(language, 'geometryExploratoryNote').includes('1473–1523'));
  }
});
