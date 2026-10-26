import { describe, expect, it } from 'vitest';
import { mixColor } from '../src/domain/paintMixing.ts';
import { deltaE, rgbToLab } from '../src/domain/scoring.ts';
import { MAX_DROPS } from '../src/domain/gameRules.ts';
import { COURSES, pickStages, targetColorOf } from '../src/domain/stages.ts';
import { DIFFICULTIES, PIGMENTS, type MixHistory, type RgbColor } from '../src/domain/types.ts';

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

const ALL_STAGES = DIFFICULTIES.flatMap((difficulty) => COURSES[difficulty].stages.map((stage) => ({ difficulty, ...stage })));

describe('COURSES', () => {
  it.each(DIFFICULTIES)('%s は50問ある', (difficulty) => {
    expect(COURSES[difficulty].stages).toHaveLength(50);
  });

  it('ID とお題名は、難易度をまたいでも重複しない', () => {
    expect(new Set(ALL_STAGES.map((s) => s.id)).size).toBe(ALL_STAGES.length);
    expect(new Set(ALL_STAGES.map((s) => s.name)).size).toBe(ALL_STAGES.length);
  });

  it('塗料は PIGMENTS と同じ順に並ぶ', () => {
    for (const difficulty of DIFFICULTIES) {
      const { pigments } = COURSES[difficulty];
      expect(pigments).toEqual(PIGMENTS.filter((pigment) => pigments.includes(pigment)));
    }
  });

  it.each(ALL_STAGES)('$name のレシピは1〜8滴で、その難易度の塗料だけを使い、目標色は同じ混色関数から得られる', (stage) => {
    expect(stage.recipe.length).toBeGreaterThan(0);
    expect(stage.recipe.length).toBeLessThanOrEqual(MAX_DROPS);
    for (const pigment of stage.recipe) expect(COURSES[stage.difficulty].pigments).toContain(pigment);
    expect(targetColorOf(stage)).toEqual(mixColor(stage.recipe));
  });

  // 色が近すぎると、名前が違うだけの同じお題になってしまう
  it.each(DIFFICULTIES)('%s のお題どうしは、見て分かるほど色が違う', (difficulty) => {
    const targets = COURSES[difficulty].stages.map(targetColorOf);
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        expect(deltaE(targets[i], targets[j])).toBeGreaterThanOrEqual(8);
      }
    }
  });
});

describe('pickStages', () => {
  const stages = COURSES.beginner.stages;

  it('指定した数だけ、重複なしで選ぶ', () => {
    const picked = pickStages(stages, 5);
    expect(picked).toHaveLength(5);
    expect(new Set(picked).size).toBe(5);
    for (const stage of picked) expect(stages).toContain(stage);
  });

  it('乱数を固定すれば、同じ問題が選ばれる', () => {
    expect(pickStages(stages, 3, () => 0)).toEqual(stages.slice(0, 3));
  });

  it('候補より多くは選ばない', () => {
    expect(pickStages(stages.slice(0, 2), 5)).toHaveLength(2);
  });
});
