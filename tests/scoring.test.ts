import { describe, expect, it } from 'vitest';
import { PIGMENT_COLORS, mixColor } from '../src/domain/paintMixing.ts';
import {
  chromaOf,
  deltaE,
  hintFor,
  hueAngle,
  labToRgb,
  rankForScore,
  rgbToLab,
  scoreColor,
  summarizeRun,
} from '../src/domain/scoring.ts';
import { COURSES, targetColorOf } from '../src/domain/stages.ts';
import { DIFFICULTIES, type RgbColor } from '../src/domain/types.ts';

const ALL_STAGES = DIFFICULTIES.flatMap((difficulty) => COURSES[difficulty].stages.map((stage) => ({ difficulty, ...stage })));

const red: RgbColor = { r: 205, g: 35, b: 45 };
const blue: RgbColor = { r: 20, g: 80, b: 190 };

describe('scoreColor', () => {
  it('完全一致で100点', () => {
    expect(scoreColor(red, red)).toBe(100);
  });

  it('完全一致でなければ100点にならない', () => {
    expect(scoreColor(red, { ...red, r: red.r + 1 })).toBeLessThan(100);
  });

  it('常に 0〜100 の整数', () => {
    const colors: RgbColor[] = [red, blue, { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }, { r: 0, g: 255, b: 0 }];
    for (const a of colors) {
      for (const b of colors) {
        const score = scoreColor(a, b);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  it('色差が大きいほど点数は低いか同じ', () => {
    const steps = [0, 5, 10, 20, 40, 80, 160].map((d) => ({ r: red.r, g: red.g + Math.min(d, 220), b: red.b }));
    const pairs = steps.map((c) => ({ delta: deltaE(red, c), score: scoreColor(red, c) }));
    for (let i = 1; i < pairs.length; i++) {
      expect(pairs[i].delta).toBeGreaterThan(pairs[i - 1].delta);
      expect(pairs[i].score).toBeLessThanOrEqual(pairs[i - 1].score);
    }
  });

  it('わずかな違いは高得点、明らかに違う色は低得点', () => {
    expect(scoreColor(red, { r: 200, g: 40, b: 45 })).toBeGreaterThanOrEqual(90);
    expect(scoreColor(red, blue)).toBe(0);
  });

  it.each(ALL_STAGES)('$name はその難易度の塗料の単色1滴だけでは MASTER にならない', (stage) => {
    for (const pigment of COURSES[stage.difficulty].pigments) {
      expect(scoreColor(targetColorOf(stage), PIGMENT_COLORS[pigment])).toBeLessThan(90);
    }
  });

  it.each(ALL_STAGES)('$name は正解レシピで100点になる', (stage) => {
    const actual = mixColor([...stage.recipe].reverse());
    expect(actual).not.toBeNull();
    expect(scoreColor(targetColorOf(stage), actual!)).toBe(100);
  });
});

describe('rankForScore', () => {
  it.each([
    [100, 'MASTER'],
    [90, 'MASTER'],
    [89, 'EXPERT'],
    [75, 'EXPERT'],
    [74, 'APPRENTICE'],
    [60, 'APPRENTICE'],
    [59, 'RETRY'],
    [0, 'RETRY'],
  ])('%i点は %s', (score, rank) => {
    expect(rankForScore(score)).toBe(rank);
  });
});

describe('summarizeRun', () => {
  it('合計点と満点を出す', () => {
    expect(summarizeRun([100, 80, 60, 40, 20])).toMatchObject({ total: 300, maxTotal: 500 });
  });

  it('総合ランクは切り捨てた平均点で決める', () => {
    expect(summarizeRun([90, 90, 90, 90, 89]).rank).toBe('EXPERT');
    expect(summarizeRun([90, 90, 90, 90, 90]).rank).toBe('MASTER');
  });
});

describe('hintFor', () => {
  it('完全一致ならそう伝える', () => {
    expect(hintFor(red, red)).toBe('お題とまったく同じ色です！');
  });

  it('明るさだけが違えば明暗を伝える', () => {
    const gray: RgbColor = { r: 120, g: 120, b: 120 };
    expect(hintFor(gray, { r: 90, g: 90, b: 90 })).toMatch(/暗い/);
    expect(hintFor(gray, { r: 160, g: 160, b: 160 })).toMatch(/明るい/);
  });

  it('鮮やかさが足りなければくすんでいると伝える', () => {
    expect(hintFor(red, { r: 150, g: 70, b: 75 })).toMatch(/くすんだ/);
  });

  it('色相のずれは、近づいた側の色名で伝える', () => {
    const orange = mixColor(['red', 'yellow'])!;
    expect(hintFor(orange, mixColor(['red', 'yellow', 'yellow', 'yellow'])!)).toMatch(/黄色寄り/);
    expect(hintFor(orange, mixColor(['red', 'red', 'red', 'yellow'])!)).toMatch(/赤寄り/);
  });

  it('「〜を足す」といった処方は出さない', () => {
    const colors: RgbColor[] = [red, blue, { r: 30, g: 30, b: 30 }, { r: 240, g: 230, b: 200 }];
    for (const a of colors) {
      for (const b of colors) {
        expect(hintFor(a, b)).not.toMatch(/足/);
      }
    }
  });
});

describe('labToRgb', () => {
  it('rgbToLab の逆変換になる', () => {
    for (const color of Object.values(PIGMENT_COLORS)) {
      expect(labToRgb(rgbToLab(color))).toEqual(color);
    }
  });

  it('sRGB に収まらない色も 0〜255 の整数に収める', () => {
    const { r, g, b } = labToRgb({ l: 50, a: 0, b: -150 });
    for (const channel of [r, g, b]) {
      expect(Number.isInteger(channel)).toBe(true);
      expect(channel).toBeGreaterThanOrEqual(0);
      expect(channel).toBeLessThanOrEqual(255);
    }
  });
});

describe('hueAngle / chromaOf', () => {
  it('赤・黄・緑・青が色相環をこの順に回る', () => {
    const hues = (['red', 'yellow', 'green', 'blue'] as const).map((pigment) => hueAngle(rgbToLab(PIGMENT_COLORS[pigment])));
    for (let i = 1; i < hues.length; i++) {
      expect(hues[i]).toBeGreaterThan(hues[i - 1]);
    }
  });

  it('灰色の彩度はほぼ0', () => {
    expect(chromaOf(rgbToLab({ r: 128, g: 128, b: 128 }))).toBeLessThan(0.01);
  });
});
