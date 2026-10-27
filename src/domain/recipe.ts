import { countPigments } from './paintMixing.ts';
import { PIGMENTS, type MixHistory, type Pigment } from './types.ts';

export const PIGMENT_LABELS: Record<Pigment, string> = {
  red: '赤',
  orange: '橙',
  yellow: '黄',
  yellowGreen: '黄緑',
  green: '緑',
  lightBlue: '水色',
  blue: '青',
  purple: '紫',
  brown: '茶',
  yellowOchre: '黄土色',
  white: '白',
  black: '黒',
};

/** 入れた順ではなく塗料ボタンの並び順で書く。色は内訳だけで決まるので、順番を見せると意味があるように誤解させる */
export function formatRecipe(history: MixHistory): string {
  const counts = countPigments(history);
  return PIGMENTS.filter((pigment) => counts[pigment] > 0)
    .map((pigment) => `${PIGMENT_LABELS[pigment]}×${counts[pigment]}`)
    .join('・');
}

/** 色は滴の比率だけで決まるので、赤2・黄2 と 赤1・黄1 は同じ混ぜ方として扱う */
export function isSameRatio(a: MixHistory, b: MixHistory): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const countsA = countPigments(a);
  const countsB = countPigments(b);
  return PIGMENTS.every((pigment) => countsA[pigment] * b.length === countsB[pigment] * a.length);
}
