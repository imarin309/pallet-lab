import type { Pigment, RoundState } from './types.ts';

export const MAX_DROPS = 8;

export function createRound(): RoundState {
  return { history: [], undoAvailable: true, completed: false };
}

export function canAddDrop(state: RoundState): boolean {
  return !state.completed && state.history.length < MAX_DROPS;
}

export function canUndo(state: RoundState): boolean {
  return !state.completed && state.undoAvailable && state.history.length > 0;
}

export function canComplete(state: RoundState): boolean {
  return !state.completed && state.history.length > 0;
}

export function remainingDrops(state: RoundState): number {
  return MAX_DROPS - state.history.length;
}

// 実行できない操作は state をそのまま返す。演出中の連打などで呼ばれても状態が壊れないようにするため
export function addDrop(state: RoundState, pigment: Pigment): RoundState {
  if (!canAddDrop(state)) return state;
  return { ...state, history: [...state.history, pigment] };
}

export function undoLastDrop(state: RoundState): RoundState {
  if (!canUndo(state)) return state;
  return { ...state, history: state.history.slice(0, -1), undoAvailable: false };
}

export function completeRound(state: RoundState): RoundState {
  if (!canComplete(state)) return state;
  return { ...state, completed: true };
}
