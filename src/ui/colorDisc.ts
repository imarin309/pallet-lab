import Phaser from 'phaser';
import { HUE_ANCHORS, chromaOf, hueAngle, labToRgb, rgbToLab } from '../domain/scoring.ts';
import type { RgbColor } from '../domain/types.ts';
import { ColorTrail, type Point } from './colorTrail.ts';
import { COLORS, TEXT_COLORS, textStyle, toHex } from './common.ts';

const RADIUS = 70;
const RIM_WIDTH = 8;
const RIM_SEGMENTS = 72;
// ふちは明度と彩度を揃えて色相だけを変える。色見本の近くに置くので、彩度を控えめにして同時対比を抑える
const RIM_LIGHTNESS = 65;
const RIM_CHROMA = 40;
// 塗料の彩度は高いもので80前後。ふちをそこに合わせ、混ぜた色がどれも円盤の内側に収まるようにする
const FULL_CHROMA = 80;
const GUIDE_CHROMA = 40;
const ANCHOR_LABEL_OFFSET = 16;

/**
 * Lab の a・b 平面をそのまま円盤にする。角度が色相、中心からの距離が彩度。
 * ヒントの「〜寄り」と向きが揃うよう、HSV ではなく Lab を使い、b 軸（黄）を上に向ける。
 */
export class ColorDisc {
  private readonly trail: ColorTrail;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const toPoint = (hue: number, radius: number): Point => {
      const radians = Phaser.Math.DegToRad(hue);
      return { x: x + radius * Math.cos(radians), y: y - radius * Math.sin(radians) };
    };

    const graphics = scene.add.graphics();
    graphics.fillStyle(COLORS.surface).fillCircle(x, y, RADIUS);
    graphics.lineStyle(1, COLORS.line).strokeCircle(x, y, (RADIUS * GUIDE_CHROMA) / FULL_CHROMA);
    graphics.fillStyle(COLORS.line).fillCircle(x, y, 2);
    const step = 360 / RIM_SEGMENTS;
    for (let i = 0; i < RIM_SEGMENTS; i++) {
      const hue = i * step;
      const middle = Phaser.Math.DegToRad(hue + step / 2);
      const color = labToRgb({ l: RIM_LIGHTNESS, a: RIM_CHROMA * Math.cos(middle), b: RIM_CHROMA * Math.sin(middle) });
      graphics.lineStyle(RIM_WIDTH, toHex(color));
      graphics.beginPath();
      // 隣の区切りとわずかに重ねて、継ぎ目に隙間が見えないようにする
      graphics.arc(x, y, RADIUS, -Phaser.Math.DegToRad(hue + step + 0.5), -Phaser.Math.DegToRad(hue), false);
      graphics.strokePath();
    }

    for (const anchor of HUE_ANCHORS) {
      const { x: labelX, y: labelY } = toPoint(anchor.angle, RADIUS + ANCHOR_LABEL_OFFSET);
      scene.add.text(labelX, labelY, anchor.name.slice(0, 1), textStyle(14, TEXT_COLORS.subInk)).setOrigin(0.5);
    }

    this.trail = new ColorTrail(scene, (color) => {
      const lab = rgbToLab(color);
      return toPoint(hueAngle(lab), (RADIUS * Math.min(chromaOf(lab), FULL_CHROMA)) / FULL_CHROMA);
    });
  }

  show(colors: readonly RgbColor[]): this {
    this.trail.show(colors);
    return this;
  }
}
