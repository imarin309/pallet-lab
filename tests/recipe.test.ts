import { describe, expect, it } from 'vitest';
import { formatRecipe, isSameRatio } from '../src/domain/recipe.ts';

describe('formatRecipe', () => {
  it('入れた順ではなく塗料の並び順で、滴数を添えて書く', () => {
    expect(formatRecipe(['white', 'red', 'white', 'yellow'])).toBe('赤×1・黄×1・白×2');
  });
});

describe('isSameRatio', () => {
  it('滴数が違っても、比率が同じなら同じ混ぜ方とみなす', () => {
    expect(isSameRatio(['red', 'yellow'], ['yellow', 'red', 'red', 'yellow'])).toBe(true);
  });

  it('比率が違えば別の混ぜ方とみなす', () => {
    expect(isSameRatio(['red', 'yellow'], ['red', 'red', 'yellow'])).toBe(false);
    expect(isSameRatio(['red', 'yellow'], ['red', 'blue'])).toBe(false);
  });

  it('0滴はどの混ぜ方とも同じにならない', () => {
    expect(isSameRatio([], [])).toBe(false);
  });
});
