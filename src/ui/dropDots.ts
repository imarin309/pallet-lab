import type Phaser from 'phaser';
import { MAX_DROPS } from '../domain/gameRules.ts';
import { PIGMENT_COLORS } from '../domain/paintMixing.ts';
import type { MixHistory } from '../domain/types.ts';
import { COLORS, GAME_WIDTH, toHex } from './common.ts';

const DOT_RADIUS = 8;
const DOT_SPACING = 26;

/** 使った滴を、入れた順に絵の具の色で並べる。残りは空の丸で示す */
export class DropDots {
  private readonly dots: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, y: number) {
    const firstX = GAME_WIDTH / 2 - (DOT_SPACING * (MAX_DROPS - 1)) / 2;
    for (let i = 0; i < MAX_DROPS; i++) {
      this.dots.push(scene.add.circle(firstX + i * DOT_SPACING, y, DOT_RADIUS));
    }
  }

  show(history: MixHistory): this {
    this.dots.forEach((dot, index) => {
      const pigment = history[index];
      // 白の滴も紙の上で見えるよう、塗った丸にも枠を付ける
      dot.setStrokeStyle(1.5, COLORS.ink, pigment ? 0.4 : 0.3);
      if (pigment) dot.setFillStyle(toHex(PIGMENT_COLORS[pigment]));
      else dot.setFillStyle(COLORS.surface, 0);
    });
    return this;
  }
}
