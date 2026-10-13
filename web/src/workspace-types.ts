import type { ViewCenter } from './model-registry.ts';
import type { ApsisPolicy } from './copernicus.ts';
import type { MapBody } from './copernicus-map.ts';
import type { MapRadialProjection } from './map-projection.ts';

export const workspaceSchemaVersion = 1;
export const maxWorkspacePanels = 4;
export const initialPlotTraceLimit = 4;
export const maxPlotWindowDays = 365.25 * 100;

/** An assumed UT1 Julian Day is the sole evolving time coordinate. */
export type WorkspaceClock = Readonly<{
  ut1Jd: number;
  playing: boolean;
  speedDaysPerSecond: number;
  direction: 1 | -1;
}>;

export type DisplayBase = Readonly<{ id: string; collapsed: boolean }>;
export type GeometryDisplay = DisplayBase & Readonly<{
  kind: 'geometry'; body: string; modelId: string; policyId: string;
  viewCenter: ViewCenter;
  trail: Readonly<{ enabled: boolean; days: number }>;
  showCircles: boolean; showConstructionLines: boolean; showAnnotations: boolean;
}>;

export type PlotTrace = Readonly<{
  id: string; body: string; modelId: string; observableId: string; policyId: string;
}>;
export type PlotWindow = Readonly<{
  startUt1: number; endUt1: number;
  followsClock: boolean;
}>;
export type PlotAnalysis =
  | Readonly<{ kind: 'overlay' }>
  | Readonly<{ kind: 'model-disagreement'; firstTraceId: string; secondTraceId: string }>;
export type TimeSeriesDisplay = DisplayBase & Readonly<{
  kind: 'time-series'; traces: readonly PlotTrace[]; window: PlotWindow;
  longitudeMode: 'wrapped' | 'unwrapped';
  horizontalAxis: 'assumed-ut1-jd'; verticalAxis: 'longitude-degrees';
  frameAlignment: 'native' | 'nominal-historical-tropical';
  analysis: PlotAnalysis;
}>;

export type PlanetaryMapDisplay = DisplayBase & Readonly<{
  kind: 'planetary-map'; systemId: 'copernicus-1543';
  viewCenter: MapBody; marsPolicyId: ApsisPolicy;
  radialProjection: MapRadialProjection;
  visibleBodies: Readonly<Record<MapBody, boolean>>;
  bodyTrails: Readonly<Record<MapBody, boolean>>;
  trailDays: number;
  camera: Readonly<{ offsetX: number; offsetY: number; radiusUnits: number }>;
  showLabels: boolean; showGrid: boolean;
}>;

export type DisplayConfig = GeometryDisplay | TimeSeriesDisplay | PlanetaryMapDisplay;
export type WorkspaceState = Readonly<{
  schemaVersion: typeof workspaceSchemaVersion;
  clock: WorkspaceClock;
  displays: readonly DisplayConfig[];
  nextPanelNumber: number;
}>;
