import type { RgbColor } from './types.ts';

export type LabColor = { l: number; a: number; b: number };

function srgbChannelToLinear(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

// D65 白色点
const WHITE_X = 0.95047;
const WHITE_Y = 1.0;
const WHITE_Z = 1.08883;

function labF(t: number): number {
  return t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29;
}

export function rgbToLab({ r, g, b }: RgbColor): LabColor {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
  const z = 0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb;
  const fx = labF(x / WHITE_X);
  const fy = labF(y / WHITE_Y);
  const fz = labF(z / WHITE_Z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** CIE76。CIEDE2000 より粗いが、式が短くテストで値を追いやすい */
export function deltaE(target: RgbColor, actual: RgbColor): number {
  const t = rgbToLab(target);
  const u = rgbToLab(actual);
  return Math.hypot(t.l - u.l, t.a - u.a, t.b - u.b);
}

/** この色差で 0 点になる。プレイテストで調整する前提の値 */
export const ZERO_SCORE_DELTA_E = 60;

// 丸めると完全一致でない色まで 100 点になりうるので切り捨てる
export function scoreColor(target: RgbColor, actual: RgbColor): number {
  const ratio = 1 - deltaE(target, actual) / ZERO_SCORE_DELTA_E;
  return Math.max(0, Math.floor(ratio * 100));
}

export type Rank = 'MASTER' | 'EXPERT' | 'APPRENTICE' | 'RETRY';

export function rankForScore(score: number): Rank {
  if (score >= 90) return 'MASTER';
  if (score >= 75) return 'EXPERT';
  if (score >= 60) return 'APPRENTICE';
  return 'RETRY';
}

export const RANK_STARS: Record<Rank, number> = { MASTER: 3, EXPERT: 2, APPRENTICE: 1, RETRY: 0 };

export type RunSummary = { total: number; maxTotal: number; rank: Rank };

// 1ステージと同じ基準で測れるよう、総合ランクは平均点で決める。平均も scoreColor と同じく切り捨てる
export function summarizeRun(scores: readonly number[]): RunSummary {
  const total = scores.reduce((sum, score) => sum + score, 0);
  const average = scores.length === 0 ? 0 : Math.floor(total / scores.length);
  return { total, maxTotal: scores.length * 100, rank: rankForScore(average) };
}

// これより小さい色差は、並べてもほとんど見分けられない
const INDISTINGUISHABLE_DELTA_E = 3;
const SLIGHT_DIFFERENCE = 10;

/**
 * Lab で測れる「明るさ」「鮮やかさ」「色味」のうち、一番ずれている要素だけを伝える。
 * 何を足せばよいかは混色モデル次第で断言できないので、処方は出さない。
 */
export function hintFor(target: RgbColor, actual: RgbColor): string {
  const total = deltaE(target, actual);
  if (total === 0) return 'お題とまったく同じ色です！';
  if (total < INDISTINGUISHABLE_DELTA_E) return 'ほとんど見分けがつかないほど近い色です';

  const t = rgbToLab(target);
  const u = rgbToLab(actual);
  const lightness = u.l - t.l;
  const chroma = Math.hypot(u.a, u.b) - Math.hypot(t.a, t.b);
  const hue = Math.sqrt(Math.max(0, total ** 2 - lightness ** 2 - chroma ** 2));

  const degree = (value: number) => (Math.abs(value) < SLIGHT_DIFFERENCE ? '少し' : 'かなり');

  if (Math.abs(lightness) >= Math.abs(chroma) && Math.abs(lightness) >= hue) {
    return `目標より${degree(lightness)}${lightness > 0 ? '明るい' : '暗い'}色になりました`;
  }
  if (Math.abs(chroma) >= hue) {
    return `目標より${degree(chroma)}${chroma > 0 ? '鮮やかな' : 'くすんだ'}色になりました`;
  }
  return `目標より${hueShiftName(hueAngle(t), hueAngle(u))}寄りの色味になりました`;
}

function hueAngle({ a, b }: LabColor): number {
  return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
}

// Lab の色相角に置いた目印。a/b 軸の符号で判定すると、オレンジが黄色寄りになっただけで「緑み」と出てしまう
const HUE_ANCHORS: readonly { name: string; angle: number }[] = [
  { name: '赤', angle: 30 },
  { name: '黄色', angle: 90 },
  { name: '緑', angle: 140 },
  { name: '青', angle: 290 },
  { name: '紫', angle: 330 },
];
// 目印とほぼ同じ色相のお題では、その目印自体ではなく隣の目印へ動いたと伝える
const SAME_HUE_RANGE = 15;

function hueShiftName(targetHue: number, actualHue: number): string {
  const signedDiff = ((actualHue - targetHue + 540) % 360) - 180;
  const isCounterClockwise = signedDiff > 0;
  const distanceAlongShift = (anchorAngle: number) => {
    const d = isCounterClockwise ? anchorAngle - targetHue : targetHue - anchorAngle;
    return ((d % 360) + 360) % 360;
  };
  const ahead = HUE_ANCHORS.filter((anchor) => distanceAlongShift(anchor.angle) > SAME_HUE_RANGE);
  return ahead.reduce((nearest, anchor) =>
    distanceAlongShift(anchor.angle) < distanceAlongShift(nearest.angle) ? anchor : nearest,
  ).name;
}
