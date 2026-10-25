import { mixColor } from './paintMixing.ts';
import type { RgbColor, Stage } from './types.ts';

// 正解レシピはプレイヤーに見せない。並びは「近い2色の混色 → 白・黒で明暗 → 4種類のくすんだ色」。
// 12色には中間色も多いので、単色1滴でそのまま高得点にならない色を選んでいる（scoring.test.ts で確認）
export const STAGES: readonly Stage[] = [
  { id: 'stage-1', name: 'エメラルド', recipe: ['green', 'green', 'lightBlue'] },
  { id: 'stage-2', name: '若草色', recipe: ['yellowGreen', 'yellowGreen', 'yellow'] },
  { id: 'stage-3', name: 'ラベンダー', recipe: ['purple', 'white', 'white', 'white'] },
  { id: 'stage-4', name: '深緑', recipe: ['green', 'green', 'green', 'black'] },
  { id: 'stage-5', name: 'くすみローズ', recipe: ['red', 'purple', 'white', 'white', 'white', 'yellowOchre'] },
];

export function targetColorOf(stage: Stage): RgbColor {
  const color = mixColor(stage.recipe);
  if (!color) throw new Error(`${stage.id} のレシピが空です`);
  return color;
}
