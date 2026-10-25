// 混色2案の比較用。`node scripts/compareMixing.ts <出力HTMLのパス>` で色見本ページも書き出す
import { writeFileSync } from 'node:fs';
import { countPigments, mixByGeometricMean, mixByRgbAverage, type MixModel } from '../src/domain/paintMixing.ts';
import { deltaE, scoreColor } from '../src/domain/scoring.ts';
import { PIGMENTS, type MixHistory, type RgbColor } from '../src/domain/types.ts';

const models: Record<string, MixModel> = { rgbAverage: mixByRgbAverage, geometricMean: mixByGeometricMean };

const cases: { label: string; history: MixHistory }[] = [
  { label: '青＋黄', history: ['blue', 'yellow'] },
  { label: '青1＋黄2', history: ['blue', 'yellow', 'yellow'] },
  { label: '赤＋黄', history: ['red', 'yellow'] },
  { label: '赤＋青', history: ['red', 'blue'] },
  { label: '赤', history: ['red'] },
  { label: '赤＋白', history: ['red', 'white'] },
  { label: '赤＋白3', history: ['red', 'white', 'white', 'white'] },
  { label: '赤4＋黒1', history: ['red', 'red', 'red', 'red', 'black'] },
  { label: '青3＋黒1', history: ['blue', 'blue', 'blue', 'black'] },
  { label: '赤＋青＋黄', history: ['red', 'blue', 'yellow'] },
  { label: '黄3＋赤1＋青1＋白2', history: ['yellow', 'yellow', 'yellow', 'red', 'blue', 'white', 'white'] },
  { label: '紫＋白3', history: ['purple', 'white', 'white', 'white'] },
  { label: '茶＋白3', history: ['brown', 'white', 'white', 'white'] },
  { label: '緑2＋水色1', history: ['green', 'green', 'lightBlue'] },
  { label: '橙＋青', history: ['orange', 'blue'] },
];

const hex = ({ r, g, b }: RgbColor) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

for (const [name, model] of Object.entries(models)) {
  console.log(`\n== ${name}`);
  for (const { label, history } of cases) {
    const color = model(countPigments(history));
    console.log(`${label.padEnd(16, '　')} ${hex(color)} (${color.r},${color.g},${color.b})`);
  }
  const forward = model(countPigments(['red', 'white', 'blue', 'white']));
  const reversed = model(countPigments(['white', 'blue', 'white', 'red']));
  console.log(`順番違いで一致: ${hex(forward) === hex(reversed)}`);
}

// 「1滴だけ違う」ときに何点になるかを見て、ZERO_SCORE_DELTA_E の妥当性を確かめる
console.log('\n== 1滴違いのスコア（geometricMean）');
for (const { label, history } of cases.filter((c) => c.history.length >= 3)) {
  const target = mixByGeometricMean(countPigments(history));
  const scores: string[] = [];
  for (const extra of PIGMENTS) {
    const actual = mixByGeometricMean(countPigments([...history, extra]));
    scores.push(`+${extra}:${scoreColor(target, actual)}(ΔE${deltaE(target, actual).toFixed(1)})`);
  }
  console.log(`${label.padEnd(16, '　')} ${scores.join(' ')}`);
}

const outPath = process.argv[2];
if (outPath) {
  const rows = cases
    .map(({ label, history }) => {
      const cells = Object.values(models)
        .map((model) => `<td><div style="width:120px;height:60px;background:${hex(model(countPigments(history)))}"></div></td>`)
        .join('');
      return `<tr><th>${label}</th>${cells}</tr>`;
    })
    .join('\n');
  writeFileSync(
    outPath,
    `<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;background:#ddd"><table><tr><th></th>${Object.keys(models)
      .map((n) => `<th>${n}</th>`)
      .join('')}</tr>${rows}</table>`,
  );
}

// RGB距離は人の見え方とずれるので、同じ RGB 距離でも ΔE が大きく違う組を並べる
console.log('\n== RGB距離 と ΔE(CIE76)');
const pairs: [string, RgbColor, RgbColor][] = [
  ['暗い青どうし', { r: 20, g: 30, b: 80 }, { r: 20, g: 30, b: 120 }],
  ['明るい黄どうし', { r: 240, g: 220, b: 40 }, { r: 240, g: 220, b: 80 }],
  ['暗い灰どうし', { r: 30, g: 30, b: 30 }, { r: 70, g: 70, b: 70 }],
  ['明るい灰どうし', { r: 200, g: 200, b: 200 }, { r: 240, g: 240, b: 240 }],
  ['赤と青', { r: 205, g: 35, b: 45 }, { r: 20, g: 80, b: 190 }],
];
for (const [label, a, b] of pairs) {
  const rgbDistance = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
  console.log(`${label.padEnd(10, '　')} RGB距離 ${rgbDistance.toFixed(1)}  ΔE ${deltaE(a, b).toFixed(1)}  score ${scoreColor(a, b)}`);
}
