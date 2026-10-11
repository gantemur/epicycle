import { modelRecord } from './model.ts';
import { earthRecord, marsRecord, type ApsisPolicy } from './copernicus.ts';
import { comparisonUt1Domain } from './comparison-time.ts';
import type { MessageKey } from './i18n.ts';

/** Small catalogue of implemented, versioned Mars definitions. */
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
} as const;

export type ModelId = keyof typeof models;
export const modelIds = Object.keys(models) as ModelId[];

export function usesCopernicus(ids: readonly ModelId[]): boolean {
  return ids.includes('copernicus');
}

export function dateAllowed(ut1: number, ids: readonly ModelId[], policy: ApsisPolicy): boolean {
  if (!Number.isFinite(ut1)) return false;
  return !usesCopernicus(ids) || policy !== 'sn-local-uniform-1473-1523' ||
    (ut1 >= comparisonUt1Domain.start && ut1 <= comparisonUt1Domain.end);
}
