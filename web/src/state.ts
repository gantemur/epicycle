import { egyptianToDays } from './chronology.ts';
import { isLanguage, type Language } from './i18n.ts';
import sourceCases from '../../tests/fixtures/mars-source-cases.json' with { type: 'json' };

export const exampleDay = egyptianToDays(sourceCases.scholarly_table_case.nabonassar_date);

export type AppState = Readonly<{
  day: number;
  playing: boolean;
  speed: number;
  showTrail: boolean;
  trailDays: number;
  language: Language;
}>;

export type Action =
  | { type: 'setDay'; day: number }
  | { type: 'step'; days: number }
  | { type: 'example' }
  | { type: 'togglePlay' }
  | { type: 'pause' }
  | { type: 'tick'; seconds: number }
  | { type: 'speed'; speed: number }
  | { type: 'trail'; show: boolean }
  | { type: 'trailDays'; days: number }
  | { type: 'language'; language: Language };

export function initialState(savedLanguage: string | null = null): AppState {
  return { day: exampleDay, playing: false, speed: 12, showTrail: true, trailDays: 180,
    language: isLanguage(savedLanguage) ? savedLanguage : 'en' };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setDay':
      if (!Number.isFinite(action.day) || action.day < 0) return state;
      return { ...state, day: action.day };
    case 'step':
      if (!Number.isFinite(action.days)) return state;
      return { ...state, day: Math.max(0, state.day + action.days) };
    case 'example': return { ...state, day: exampleDay, playing: false };
    case 'togglePlay': return { ...state, playing: !state.playing };
    case 'pause': return { ...state, playing: false };
    case 'tick':
      if (!state.playing || !Number.isFinite(action.seconds) || action.seconds <= 0) return state;
      return { ...state, day: state.day + Math.min(action.seconds, 0.1) * state.speed };
    case 'speed':
      if (!Number.isFinite(action.speed)) return state;
      return { ...state, speed: Math.min(40, Math.max(1, action.speed)) };
    case 'trail': return { ...state, showTrail: action.show };
    case 'trailDays':
      if (!Number.isFinite(action.days)) return state;
      return { ...state, trailDays: Math.min(720, Math.max(30, action.days)) };
    case 'language': return { ...state, language: action.language };
  }
}
