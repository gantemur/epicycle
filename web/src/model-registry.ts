import { modelRecord } from './model.ts';
import { apsisPolicy, earthRecord, exploratoryApsisPolicy, marsRecord,
  type ApsisPolicy } from './copernicus.ts';
import { comparisonUt1Domain } from './comparison-time.ts';
import { sunRecord } from './sun-almagest.ts';
import type { MessageKey } from './i18n.ts';

/** Body-specific historical models retain their existing Mars identifiers. */
export const models = {
  ptolemy: {
    id: 'ptolemy', recordId: modelRecord.model_id, schemaVersion: modelRecord.schema_version,
    body: 'Mars', observables: ['geocentric tropical longitude'],
    source: modelRecord.source_edition, label: 'ptolemyPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
  copernicus: {
    id: 'copernicus', recordId: marsRecord.model_id, schemaVersion: marsRecord.schema_version,
    body: marsRecord.body, observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: marsRecord.source_edition, label: 'copernicusPanel' as MessageKey,
    dependencies: [earthRecord.model_id],
    datePolicies: Object.keys(marsRecord.optional_reconstructions).concat(Object.keys(marsRecord.exploratory_policies)) as ApsisPolicy[],
  },
  'ptolemy-sun': {
    id: 'ptolemy-sun', recordId: sunRecord.model_id, schemaVersion: sunRecord.schema_version,
    body: 'Sun', observables: ['geocentric tropical longitude'],
    source: sunRecord.source_edition, label: 'ptolemySunPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
  'copernicus-sun': {
    id: 'copernicus-sun', recordId: earthRecord.model_id,
    schemaVersion: earthRecord.schema_version,
    body: 'Sun', observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: earthRecord.source_edition, label: 'copernicusSunModelPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
} as const;

export type ModelId = keyof typeof models;
export const modelIds = Object.keys(models) as ModelId[];
export type HistoricalBody = 'Mars' | 'Sun';
export const historicalBodies: readonly HistoricalBody[] = ['Mars', 'Sun'];

export function modelIdsForBody(body: string): ModelId[] {
  return modelIds.filter(id => models[id].body === body);
}

export function firstModelForBody(body: HistoricalBody): ModelId {
  return body === 'Sun' ? 'ptolemy-sun' : 'ptolemy';
}

export function correspondingModelForBody(modelId: ModelId,
  body: HistoricalBody): ModelId {
  if (body === 'Sun') return modelId.startsWith('copernicus') ? 'copernicus-sun' : 'ptolemy-sun';
  return modelId.startsWith('copernicus') ? 'copernicus' : 'ptolemy';
}

export function defaultPolicyForModel(modelId: ModelId,
  setting: 'geometry' | 'plot'): string {
  if (modelId !== 'copernicus') return 'mathematical-continuation';
  return setting === 'geometry' ? apsisPolicy : exploratoryApsisPolicy;
}

/** Capabilities describe the implemented mathematics, not an available renderer. */
export type ObservableId = 'geocentric-tropical-longitude' | 'geocentric-sidereal-longitude';
export type ViewCenter = 'earth' | 'true-sun';
export type Ut1Range = Readonly<{ start: number; end: number }>;
export type ModelCapability = Readonly<{
  id: string;
  recordId: string;
  schemaVersion: number;
  body: string;
  source: string;
  sourceStatus: string;
  validationStatus: string;
  dependencies: readonly string[];
  observables: readonly Readonly<{ id: string; frame: string }>[];
  /** Current geometry renderers; mathematical viewCenters may be wider. */
  renderedViewCenters: readonly ViewCenter[];
  viewCenters: readonly ViewCenter[];
  policies: Readonly<Record<string, Ut1Range | null>>;
  /** An exploratory policy may name the reference interval used for curve styling. */
  exploratoryReferenceRanges?: Readonly<Record<string, Ut1Range>>;
}>;
export type CapabilityRegistry = Readonly<Record<string, ModelCapability>>;

/** Policy null means no source date guard within the separate numerical domain. */
export const modelCapabilities: CapabilityRegistry = {
  ptolemy: {
    ...models.ptolemy, sourceStatus: 'source-checked',
    validationStatus: modelRecord.model_status,
    observables: [{ id: 'geocentric-tropical-longitude', frame: 'ptolemaic-tropical' }],
    viewCenters: ['earth'], renderedViewCenters: ['earth'],
    policies: { [models.ptolemy.datePolicies[0]]: null },
  },
  copernicus: {
    ...models.copernicus, sourceStatus: 'source-checked',
    validationStatus: marsRecord.model_status,
    observables: [
      { id: 'geocentric-sidereal-longitude', frame: 'copernican-sidereal' },
      { id: 'geocentric-tropical-longitude', frame: 'copernican-tropical' },
    ],
    viewCenters: ['earth', 'true-sun'], renderedViewCenters: ['earth', 'true-sun'],
    policies: {
      [apsisPolicy]: comparisonUt1Domain,
      [exploratoryApsisPolicy]: null,
    },
    exploratoryReferenceRanges: { [exploratoryApsisPolicy]: comparisonUt1Domain },
  },
  'ptolemy-sun': {
    ...models['ptolemy-sun'], sourceStatus: 'source-checked',
    validationStatus: sunRecord.model_status,
    observables: [{ id: 'geocentric-tropical-longitude', frame: 'ptolemaic-tropical' }],
    viewCenters: ['earth'], renderedViewCenters: ['earth'],
    policies: { 'mathematical-continuation': null },
  },
  'copernicus-sun': {
    ...models['copernicus-sun'], sourceStatus: 'source-checked',
    validationStatus: earthRecord.model_status,
    observables: [
      { id: 'geocentric-sidereal-longitude', frame: 'copernican-sidereal' },
      { id: 'geocentric-tropical-longitude', frame: 'copernican-tropical' },
    ],
    viewCenters: ['earth', 'true-sun'], renderedViewCenters: ['earth', 'true-sun'],
    policies: { 'mathematical-continuation': null },
  },
};

export function usesCopernicus(ids: readonly ModelId[]): boolean {
  return ids.includes('copernicus');
}

export function dateAllowed(ut1: number, ids: readonly ModelId[], policy: ApsisPolicy): boolean {
  if (!Number.isFinite(ut1)) return false;
  return !usesCopernicus(ids) || policy !== 'sn-local-uniform-1473-1523' ||
    (ut1 >= comparisonUt1Domain.start && ut1 <= comparisonUt1Domain.end);
}
