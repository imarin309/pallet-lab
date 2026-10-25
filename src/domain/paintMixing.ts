import { PIGMENTS, type MixHistory, type Pigment, type PigmentCounts, type RgbColor } from './types.ts';

export const PIGMENT_COLORS: Record<Pigment, RgbColor> = {
  red: { r: 205, g: 35, b: 45 },
  orange: { r: 240, g: 120, b: 30 },
  yellow: { r: 245, g: 210, b: 25 },
  yellowGreen: { r: 150, g: 195, b: 50 },
  green: { r: 20, g: 135, b: 70 },
  lightBlue: { r: 80, g: 170, b: 225 },
  blue: { r: 20, g: 80, b: 190 },
  purple: { r: 110, g: 50, b: 140 },
  brown: { r: 120, g: 70, b: 40 },
  yellowOchre: { r: 195, g: 150, b: 60 },
  white: { r: 250, g: 250, b: 248 },
  black: { r: 28, g: 28, b: 32 },
};

export type MixModel = (counts: PigmentCounts) => RgbColor;

export function countPigments(history: MixHistory): PigmentCounts {
  const counts = Object.fromEntries(PIGMENTS.map((pigment) => [pigment, 0])) as PigmentCounts;
  for (const pigment of history) {
    counts[pigment] += 1;
  }
  return counts;
}

type Channel = keyof RgbColor;
const CHANNELS: readonly Channel[] = ['r', 'g', 'b'];

function totalDrops(counts: PigmentCounts): number {
  return PIGMENTS.reduce((sum, pigment) => sum + counts[pigment], 0);
}

// 表示と採点で同じ値を使うため、整数に丸めてから返す
function toRgb(channelValue: (channel: Channel) => number): RgbColor {
  const [r, g, b] = CHANNELS.map((channel) => Math.round(Math.min(255, Math.max(0, channelValue(channel)))));
  return { r, g, b };
}

/** 比較用。光の混色に近く、青＋黄が灰色になるため v0.1 では採用しない */
export const mixByRgbAverage: MixModel = (counts) => {
  const total = totalDrops(counts);
  return toRgb((channel) =>
    PIGMENTS.reduce((sum, pigment) => sum + PIGMENT_COLORS[pigment][channel] * counts[pigment], 0) / total,
  );
};

// 0 を含むと幾何平均が常に 0 になり、1滴で色が潰れてしまう
const MIN_CHANNEL = 4;

/**
 * 各チャンネルを「その波長の光をどれだけ反射するか」とみなし、滴数で重み付けした幾何平均を取る。
 * 塗料が光を吸収し合う減法混色をごく単純に真似たもので、実際の顔料の測定値に基づくものではない。
 */
export const mixByGeometricMean: MixModel = (counts) => {
  const total = totalDrops(counts);
  return toRgb((channel) => {
    const logSum = PIGMENTS.reduce(
      (sum, pigment) => sum + Math.log(Math.max(MIN_CHANNEL, PIGMENT_COLORS[pigment][channel])) * counts[pigment],
      0,
    );
    return Math.exp(logSum / total);
  });
};

const activeModel: MixModel = mixByGeometricMean;

/** 0滴（未調色）のときは色が存在しないので null を返す */
export function mixColor(history: MixHistory): RgbColor | null {
  if (history.length === 0) {
    return null;
  }
  return activeModel(countPigments(history));
}
