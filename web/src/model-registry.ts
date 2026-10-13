import { modelRecord } from './model.ts';
import { apsisPolicy, earthRecord, exploratoryApsisPolicy, marsRecord,
  type ApsisPolicy } from './copernicus.ts';
import { comparisonUt1Domain } from './comparison-time.ts';
import { sunRecord } from './sun-almagest.ts';
import { jupiterRecord } from './ptolemy-jupiter.ts';
import { saturnRecord } from './ptolemy-saturn.ts';
import { jupiterRecord as copernicanJupiterRecord,
  saturnRecord as copernicanSaturnRecord } from './copernicus-superior.ts';
import type { MessageKey } from './i18n.ts';

/** Body-specific historical models retain their existing Mars identifiers. */
export const models = {
  ptolemy: {
    tradition: 'ptolemy',
    id: 'ptolemy', recordId: modelRecord.model_id, schemaVersion: modelRecord.schema_version,
    body: 'Mars', observables: ['geocentric tropical longitude'],
    source: modelRecord.source_edition, label: 'ptolemyPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
  copernicus: {
    tradition: 'copernicus',
    id: 'copernicus', recordId: marsRecord.model_id, schemaVersion: marsRecord.schema_version,
    body: marsRecord.body, observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: marsRecord.source_edition, label: 'copernicusPanel' as MessageKey,
    dependencies: [earthRecord.model_id],
    datePolicies: Object.keys(marsRecord.optional_reconstructions).concat(Object.keys(marsRecord.exploratory_policies)) as ApsisPolicy[],
  },
  'ptolemy-sun': {
    tradition: 'ptolemy',
    id: 'ptolemy-sun', recordId: sunRecord.model_id, schemaVersion: sunRecord.schema_version,
    body: 'Sun', observables: ['geocentric tropical longitude'],
    source: sunRecord.source_edition, label: 'ptolemySunPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
  'copernicus-sun': {
    tradition: 'copernicus',
    id: 'copernicus-sun', recordId: earthRecord.model_id,
    schemaVersion: earthRecord.schema_version,
    body: 'Sun', observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: earthRecord.source_edition, label: 'copernicusSunModelPanel' as MessageKey,
    dependencies: [] as readonly string[], datePolicies: ['mathematical-continuation'],
  },
  'ptolemy-jupiter': {
    tradition: 'ptolemy',
    id: 'ptolemy-jupiter', recordId: jupiterRecord.model_id,
    schemaVersion: jupiterRecord.schema_version, body: 'Jupiter',
    observables: ['geocentric tropical longitude'], source: jupiterRecord.source_edition,
    label: 'ptolemyJupiterPanel' as MessageKey, dependencies: [] as readonly string[],
    datePolicies: ['mathematical-continuation'],
  },
  'ptolemy-saturn': {
    tradition: 'ptolemy',
    id: 'ptolemy-saturn', recordId: saturnRecord.model_id,
    schemaVersion: saturnRecord.schema_version, body: 'Saturn',
    observables: ['geocentric tropical longitude'], source: saturnRecord.source_edition,
    label: 'ptolemySaturnPanel' as MessageKey, dependencies: [] as readonly string[],
    datePolicies: ['mathematical-continuation'],
  },
  'copernicus-jupiter': {
    tradition: 'copernicus',
    id: 'copernicus-jupiter', recordId: copernicanJupiterRecord.model_id,
    schemaVersion: copernicanJupiterRecord.schema_version, body: 'Jupiter',
    observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: copernicanJupiterRecord.source_edition,
    label: 'copernicusJupiterPanel' as MessageKey,
    dependencies: [earthRecord.model_id], datePolicies: ['mathematical-continuation'],
  },
  'copernicus-saturn': {
    tradition: 'copernicus',
    id: 'copernicus-saturn', recordId: copernicanSaturnRecord.model_id,
    schemaVersion: copernicanSaturnRecord.schema_version, body: 'Saturn',
    observables: ['geocentric sidereal longitude', 'geocentric tropical longitude'],
    source: copernicanSaturnRecord.source_edition,
    label: 'copernicusSaturnPanel' as MessageKey,
    dependencies: [earthRecord.model_id], datePolicies: ['mathematical-continuation'],
  },
} as const;

export type ModelId = keyof typeof models;
export const modelIds = Object.keys(models) as ModelId[];
export type HistoricalBody = 'Mars' | 'Sun' | 'Jupiter' | 'Saturn';
export const historicalBodies: readonly HistoricalBody[] = ['Mars', 'Sun', 'Jupiter', 'Saturn'];
export const bodyMessageKey: Readonly<Record<HistoricalBody, MessageKey>> = {
  Mars: 'mars', Sun: 'sun', Jupiter: 'jupiter', Saturn: 'saturn',
};
export function bodyLabelKey(body: string): MessageKey {
  if (!historicalBodies.includes(body as HistoricalBody)) throw new RangeError(`Unknown body: ${body}`);
  return bodyMessageKey[body as HistoricalBody];
}

export function modelIdsForBody(body: string): ModelId[] {
  return modelIds.filter(id => models[id].body === body);
}

export function firstModelForBody(body: HistoricalBody): ModelId {
  const first: Record<HistoricalBody, ModelId> = {
    Mars: 'ptolemy', Sun: 'ptolemy-sun',
    Jupiter: 'ptolemy-jupiter', Saturn: 'ptolemy-saturn',
  };
  return first[body];
}

export function correspondingModelForBody(modelId: ModelId,
  body: HistoricalBody): ModelId {
  const tradition = models[modelId].tradition;
  return modelIds.find(id => models[id].body === body && models[id].tradition === tradition)
    ?? firstModelForBody(body);
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
  'ptolemy-jupiter': {
    ...models['ptolemy-jupiter'], sourceStatus: 'source-checked',
    validationStatus: jupiterRecord.model_status,
    observables: [{ id: 'geocentric-tropical-longitude', frame: 'ptolemaic-tropical' }],
    viewCenters: ['earth'], renderedViewCenters: ['earth'],
    policies: { 'mathematical-continuation': null },
  },
  'ptolemy-saturn': {
    ...models['ptolemy-saturn'], sourceStatus: 'source-checked',
    validationStatus: saturnRecord.model_status,
    observables: [{ id: 'geocentric-tropical-longitude', frame: 'ptolemaic-tropical' }],
    viewCenters: ['earth'], renderedViewCenters: ['earth'],
    policies: { 'mathematical-continuation': null },
  },
  'copernicus-jupiter': {
    ...models['copernicus-jupiter'], sourceStatus: 'source-checked',
    validationStatus: copernicanJupiterRecord.model_status,
    observables: [
      { id: 'geocentric-sidereal-longitude', frame: 'copernican-sidereal' },
      { id: 'geocentric-tropical-longitude', frame: 'copernican-tropical' },
    ],
    viewCenters: ['earth', 'true-sun'], renderedViewCenters: ['earth', 'true-sun'],
    policies: { 'mathematical-continuation': null },
  },
  'copernicus-saturn': {
    ...models['copernicus-saturn'], sourceStatus: 'source-checked',
    validationStatus: copernicanSaturnRecord.model_status,
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
