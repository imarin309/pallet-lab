import { describe, expect, it } from 'vitest';
import { mixColor } from '../src/domain/paintMixing.ts';
import { rgbToLab } from '../src/domain/scoring.ts';
import { MAX_DROPS } from '../src/domain/gameRules.ts';
import { STAGES, targetColorOf } from '../src/domain/stages.ts';
import { PIGMENTS, type MixHistory, type RgbColor } from '../src/domain/types.ts';

function mustMix(history: MixHistory): RgbColor {
  const color = mixColor(history);
  if (!color) throw new Error('色が得られませんでした');
  return color;
}

const hue = (color: RgbColor) => {
  const { a, b } = rgbToLab(color);
  return (Math.atan2(b, a) * 180) / Math.PI;
};

describe('mixColor', () => {
  it('0滴では色を返さない', () => {
    expect(mixColor([])).toBeNull();
  });

  it('同じ入力なら同じ色になる', () => {
    const history: MixHistory = ['red', 'blue', 'white'];
    expect(mustMix(history)).toEqual(mustMix(history));
  });

  it('同じ内訳なら追加順を入れ替えても同じ色になる', () => {
    expect(mustMix(['red', 'white', 'blue', 'white', 'black'])).toEqual(
      mustMix(['black', 'white', 'white', 'blue', 'red']),
    );
  });

  it('比率が同じなら滴数が違っても同じ色になる', () => {
    expect(mustMix(['red', 'yellow'])).toEqual(mustMix(['red', 'yellow', 'red', 'yellow']));
  });

  it('出力は 0〜255 の整数になる', () => {
    const histories: MixHistory[] = [
      ...PIGMENTS.map((p) => [p]),
      ['red', 'blue', 'yellow', 'white', 'black'],
      Array<'black'>(MAX_DROPS).fill('black'),
      Array<'white'>(MAX_DROPS).fill('white'),
    ];
    for (const history of histories) {
      for (const value of Object.values(mustMix(history))) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      }
    }
  });

  it('青＋黄は緑の色相になる', () => {
    // Lab の色相角でおよそ 100〜160° が緑
    const h = hue(mustMix(['blue', 'yellow']));
    expect(h).toBeGreaterThan(100);
    expect(h).toBeLessThan(160);
  });

  it('赤＋黄は赤と黄の間の色相になる', () => {
    const h = hue(mustMix(['red', 'yellow']));
    expect(h).toBeGreaterThan(hue(mustMix(['red'])));
    expect(h).toBeLessThan(hue(mustMix(['yellow'])));
  });

  it('白を足すと明るく、黒を足すと暗くなる', () => {
    const base = rgbToLab(mustMix(['red', 'blue'])).l;
    expect(rgbToLab(mustMix(['red', 'blue', 'white'])).l).toBeGreaterThan(base);
    expect(rgbToLab(mustMix(['red', 'blue', 'black'])).l).toBeLessThan(base);
  });
});

describe('STAGES', () => {
  it('5ステージあり、ID が重複しない', () => {
    expect(STAGES).toHaveLength(5);
    expect(new Set(STAGES.map((s) => s.id)).size).toBe(5);
  });

  it.each(STAGES)('$name のレシピは1〜8滴で、目標色は同じ混色関数から得られる', (stage) => {
    expect(stage.recipe.length).toBeGreaterThan(0);
    expect(stage.recipe.length).toBeLessThanOrEqual(MAX_DROPS);
    expect(targetColorOf(stage)).toEqual(mixColor(stage.recipe));
  });
});
