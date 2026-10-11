import { isLanguage, type Language } from './i18n.ts';
import { exampleDay } from './historical-examples.ts';
import { comparisonUt1Domain, computationalUt1Domain, example1473Ut1, example1512Ut1 } from './comparison-time.ts';
import { apsisPolicy, exploratoryApsisPolicy, type ApsisPolicy } from './copernicus.ts';
import { dateAllowed, usesCopernicus, type ModelId } from './model-registry.ts';

export { exampleDay } from './historical-examples.ts';
export { computationalUt1Domain } from './comparison-time.ts';

export type AppState = Readonly<{
  day: number; compareUt1: number; playing: boolean; speed: number;
  showTrail: boolean; trailDays: number; language: Language;
  mode: 'single' | 'compare'; singleModel: ModelId; modelA: ModelId; modelB: ModelId;
  mobilePanel: 'a' | 'b'; copernicusPolicy: ApsisPolicy; frameAligned: boolean;
  plotStartUt1: number; plotEndUt1: number; plotMode: 'wrapped' | 'unwrapped';
}>;

export type Action =
  | { type: 'setDay'; day: number } | { type: 'step'; days: number }
  | { type: 'example' } | { type: 'togglePlay' } | { type: 'pause' }
  | { type: 'tick'; seconds: number } | { type: 'speed'; speed: number }
  | { type: 'trail'; show: boolean } | { type: 'trailDays'; days: number }
  | { type: 'language'; language: Language } | { type: 'mode'; mode: 'single' | 'compare' }
  | { type: 'singleModel' | 'modelA' | 'modelB'; model: ModelId }
  | { type: 'mobilePanel'; panel: 'a' | 'b' }
  | { type: 'apsisPolicy'; policy: ApsisPolicy }
  | { type: 'compareDate'; ut1: number } | { type: 'compareExample'; which: '1512' | '1473' }
  | { type: 'frameAlignment'; active: boolean }
  | { type: 'plotRange'; start: number; end: number }
  | { type: 'plotMode'; mode: 'wrapped' | 'unwrapped' };

export function selectedModels(state: AppState): ModelId[] {
  return state.mode === 'compare' ? [state.modelA, state.modelB] : [state.singleModel];
}

/** Numerical interaction limit, not a historical accuracy interval. */
function computationallyAllowed(ut1: number): boolean {
  return Number.isFinite(ut1) && ut1 >= computationalUt1Domain.start && ut1 <= computationalUt1Domain.end;
}

function activeLimits(state: AppState): { start: number; end: number } {
  return state.copernicusPolicy === apsisPolicy && usesCopernicus(selectedModels(state))
    ? comparisonUt1Domain : computationalUt1Domain;
}

export function initialState(savedLanguage: string | null = null): AppState {
  return {
    day: exampleDay, compareUt1: example1512Ut1, playing: false, speed: 12,
    showTrail: true, trailDays: 180, language: isLanguage(savedLanguage) ? savedLanguage : 'en',
    mode: 'single', singleModel: 'ptolemy', modelA: 'ptolemy', modelB: 'copernicus',
    mobilePanel: 'a', copernicusPolicy: apsisPolicy, frameAligned: true,
    plotStartUt1: example1512Ut1 - 182.5, plotEndUt1: example1512Ut1 + 182.5,
    plotMode: 'unwrapped',
  };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setDay':
      return Number.isFinite(action.day) && action.day >= 0 ? { ...state, day: action.day } : state;
    case 'step': {
      if (!Number.isFinite(action.days)) return state;
      if (state.mode === 'single' && state.singleModel === 'ptolemy') {
        return { ...state, day: Math.max(0, state.day + action.days) };
      }
      const limits = activeLimits(state);
      const next = Math.max(limits.start, Math.min(limits.end, state.compareUt1 + action.days));
      return { ...state, compareUt1: next, playing: false };
    }
    case 'example': return { ...state, day: exampleDay, playing: false };
    case 'togglePlay':
      if (!state.playing && !(state.mode === 'single' && state.singleModel === 'ptolemy') &&
          state.compareUt1 >= activeLimits(state).end) return state;
      return { ...state, playing: !state.playing };
    case 'pause': return { ...state, playing: false };
    case 'tick': {
      if (!state.playing || !Number.isFinite(action.seconds) || action.seconds <= 0) return state;
      const increment = Math.min(action.seconds, 0.1) * state.speed;
      if (state.mode === 'single' && state.singleModel === 'ptolemy') {
        return { ...state, day: state.day + increment };
      }
      const limit = activeLimits(state).end;
      const next = Math.min(limit, state.compareUt1 + increment);
      return { ...state, compareUt1: next, playing: next < limit };
    }
    case 'speed': return Number.isFinite(action.speed)
      ? { ...state, speed: Math.min(40, Math.max(1, action.speed)) } : state;
    case 'trail': return { ...state, showTrail: action.show };
    case 'trailDays': return Number.isFinite(action.days)
      ? { ...state, trailDays: Math.min(720, Math.max(30, action.days)) } : state;
    case 'language': return { ...state, language: action.language };
    case 'mode': {
      const candidate = { ...state, mode: action.mode, playing: false };
      return dateAllowed(candidate.compareUt1, selectedModels(candidate), candidate.copernicusPolicy)
        ? candidate : state;
    }
    case 'singleModel':
    case 'modelA':
    case 'modelB': {
      const candidate = { ...state, [action.type]: action.model, playing: false };
      return dateAllowed(candidate.compareUt1, selectedModels(candidate), candidate.copernicusPolicy)
        ? candidate : state;
    }
    case 'mobilePanel': return { ...state, mobilePanel: action.panel };
    case 'apsisPolicy':
      if (action.policy !== apsisPolicy && action.policy !== exploratoryApsisPolicy) return state;
      return dateAllowed(state.compareUt1, selectedModels(state), action.policy)
        ? { ...state, copernicusPolicy: action.policy, playing: false } : state;
    case 'compareDate':
      return computationallyAllowed(action.ut1) && dateAllowed(action.ut1, selectedModels(state), state.copernicusPolicy)
        ? { ...state, compareUt1: action.ut1, playing: false } : state;
    case 'compareExample': {
      const ut1 = action.which === '1512' ? example1512Ut1 : example1473Ut1;
      return dateAllowed(ut1, selectedModels(state), state.copernicusPolicy)
        ? { ...state, compareUt1: ut1, playing: false } : state;
    }
    case 'frameAlignment': return { ...state, frameAligned: action.active };
    case 'plotRange':
      return computationallyAllowed(action.start) && computationallyAllowed(action.end) &&
        action.end > action.start && action.end - action.start <= 365 * 50 &&
        dateAllowed(action.start, selectedModels(state), state.copernicusPolicy) &&
        dateAllowed(action.end, selectedModels(state), state.copernicusPolicy)
        ? { ...state, plotStartUt1: action.start, plotEndUt1: action.end } : state;
    case 'plotMode': return { ...state, plotMode: action.mode };
  }
}
