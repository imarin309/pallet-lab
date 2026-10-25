import { describe, expect, it } from 'vitest';
import {
  MAX_DROPS,
  addDrop,
  canAddDrop,
  canComplete,
  canUndo,
  completeRound,
  createRound,
  remainingDrops,
  undoLastDrop,
} from '../src/domain/gameRules.ts';
import type { Pigment, RoundState } from '../src/domain/types.ts';

function addDrops(state: RoundState, pigments: Pigment[]): RoundState {
  return pigments.reduce(addDrop, state);
}

describe('gameRules', () => {
  it('0滴では完成できない', () => {
    const state = createRound();
    expect(canComplete(state)).toBe(false);
    expect(completeRound(state).completed).toBe(false);
  });

  it('1滴あれば完成できる', () => {
    const state = addDrop(createRound(), 'red');
    expect(completeRound(state).completed).toBe(true);
  });

  it('8滴を超えて追加できず、8滴でも完成はできる', () => {
    const full = addDrops(createRound(), Array<Pigment>(MAX_DROPS).fill('blue'));
    expect(full.history).toHaveLength(MAX_DROPS);
    expect(canAddDrop(full)).toBe(false);
    expect(addDrop(full, 'red')).toBe(full);
    expect(canComplete(full)).toBe(true);
  });

  it('1滴戻すと最後の1滴が消え、残り滴数が戻る', () => {
    const state = addDrops(createRound(), ['red', 'blue', 'white']);
    const undone = undoLastDrop(state);
    expect(undone.history).toEqual(['red', 'blue']);
    expect(remainingDrops(undone)).toBe(remainingDrops(state) + 1);
  });

  it('取り消しは1回だけ', () => {
    const once = undoLastDrop(addDrops(createRound(), ['red', 'blue', 'white']));
    expect(once.undoAvailable).toBe(false);
    expect(canUndo(once)).toBe(false);
    expect(undoLastDrop(once)).toBe(once);
  });

  it('0滴では取り消せず、取り消し権も減らない', () => {
    const state = createRound();
    expect(canUndo(state)).toBe(false);
    expect(undoLastDrop(state).undoAvailable).toBe(true);
  });

  it('取り消し後も再び追加できる', () => {
    const undone = undoLastDrop(addDrops(createRound(), ['red', 'blue']));
    expect(addDrop(undone, 'yellow').history).toEqual(['red', 'yellow']);
  });

  it('完成後は追加・取り消し・再完成を受け付けない', () => {
    const done = completeRound(addDrops(createRound(), ['red', 'blue']));
    expect(addDrop(done, 'white')).toBe(done);
    expect(undoLastDrop(done)).toBe(done);
    expect(canComplete(done)).toBe(false);
  });

  it('再挑戦すると履歴と取り消し権が初期化される', () => {
    // 再挑戦は新しいラウンドを作り直すことで表す
    expect(createRound()).toEqual({ history: [], undoAvailable: true, completed: false });
  });
});
