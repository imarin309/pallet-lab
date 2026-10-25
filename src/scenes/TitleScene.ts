import Phaser from 'phaser';
import { PIGMENT_COLORS } from '../domain/paintMixing.ts';
import { PIGMENTS } from '../domain/types.ts';
import { COLORS, GAME_WIDTH, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import type { GameSceneData } from './GameScene.ts';

const RULES = [
  '12色の絵の具を1滴ずつ混ぜて',
  'お題の色に近づけよう。',
  '',
  '使えるのは1ステージ8滴まで。',
  '直前の1滴を戻せるのは1回だけ。',
  '',
  'もう1滴足すか、ここで完成にするか。',
];

export class TitleScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('TitleScene');
  }

  init(): void {
    this.leaving = false;
  }

  create(): void {
    setupCamera(this);

    this.add.text(GAME_WIDTH / 2, 170, 'Palette Lab', textStyle(56)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 230, '引き際が勝負の調色パズル', textStyle(20, COLORS.subText)).setOrigin(0.5);

    PIGMENTS.forEach((pigment, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      this.add
        .circle(GAME_WIDTH / 2 + (column - 2.5) * 44, 295 + row * 44, 15, toHex(PIGMENT_COLORS[pigment]))
        .setStrokeStyle(2, 0xffffff, 0.5);
    });

    this.add
      .text(GAME_WIDTH / 2, 490, RULES.join('\n'), { ...textStyle(20), align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);

    new TextButton(this, GAME_WIDTH / 2, 670, 260, 76, 'スタート', () => {
      if (this.leaving) return;
      this.leaving = true;
      const data: GameSceneData = { stageIndex: 0 };
      this.scene.start('GameScene', data);
    });
  }
}
