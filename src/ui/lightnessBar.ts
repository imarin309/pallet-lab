import type Phaser from 'phaser';
import { labToRgb, rgbToLab } from '../domain/scoring.ts';
import type { RgbColor } from '../domain/types.ts';
import { ColorTrail } from './colorTrail.ts';
import { COLORS, TEXT_COLORS, textStyle, toHex } from './common.ts';

const WIDTH = 12;
const STEPS = 20;

/** 色の円盤と同じく Lab で測る。白が上、黒が下 */
export class LightnessBar {
  private readonly trail: ColorTrail;

  constructor(scene: Phaser.Scene, x: number, top: number, height: number) {
    const graphics = scene.add.graphics();
    const stepHeight = height / STEPS;
    for (let i = 0; i < STEPS; i++) {
      const lightness = 100 - (100 * (i + 0.5)) / STEPS;
      graphics.fillStyle(toHex(labToRgb({ l: lightness, a: 0, b: 0 })));
      graphics.fillRect(x - WIDTH / 2, top + i * stepHeight, WIDTH, Math.ceil(stepHeight));
    }
    graphics.lineStyle(1, COLORS.line).strokeRect(x - WIDTH / 2, top, WIDTH, height);
    scene.add.text(x + WIDTH, top, '明', textStyle(14, TEXT_COLORS.subInk)).setOrigin(0, 0.5);
    scene.add.text(x + WIDTH, top + height, '暗', textStyle(14, TEXT_COLORS.subInk)).setOrigin(0, 0.5);

    this.trail = new ColorTrail(scene, (color) => ({ x, y: top + height * (1 - rgbToLab(color).l / 100) }));
  }

  show(colors: readonly RgbColor[]): this {
    this.trail.show(colors);
    return this;
  }
}
