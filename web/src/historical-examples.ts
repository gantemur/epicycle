import { egyptianToDays } from './chronology.ts';
import sourceCases from '../../tests/fixtures/mars-source-cases.json' with { type: 'json' };

/** The source-backed Nabonassar example used by both browser state layers. */
export const exampleDay = egyptianToDays(sourceCases.scholarly_table_case.nabonassar_date);
