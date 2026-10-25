// 並び順がそのまま塗料ボタンの並びになる（色相順のあとに無彩色）
export const PIGMENTS = [
  'red',
  'orange',
  'yellow',
  'yellowGreen',
  'green',
  'lightBlue',
  'blue',
  'purple',
  'brown',
  'yellowOchre',
  'white',
  'black',
] as const;
export type Pigment = (typeof PIGMENTS)[number];

export type RgbColor = { r: number; g: number; b: number };

/** 追加した順に並ぶ。色の計算には内訳だけを使い、順番は取り消しのためだけに持つ */
export type MixHistory = readonly Pigment[];

export type PigmentCounts = Record<Pigment, number>;

export type Stage = {
  id: string;
  name: string;
  recipe: MixHistory;
};

export type RoundState = {
  history: MixHistory;
  undoAvailable: boolean;
  completed: boolean;
};
