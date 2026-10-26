import Phaser from 'phaser';
import { PIGMENT_COLORS } from '../domain/paintMixing.ts';
import { PIGMENTS } from '../domain/types.ts';
import { CHARACTER_TEXTURE, COLORS, GAME_WIDTH, TEXT_COLORS, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import type { GameSceneData } from './GameScene.ts';

const RULES = [
  'お題と同じ色を、絵の具を混ぜて作ろう。',
  '絵の具をタップすると、1滴ずつ混ざります。',
  '使えるのは8滴まで。',
  '直前の1滴は、1回だけ戻せます。',
  'できたと思ったら「完成！」で採点します。',
];

const TERMS = ['色相　赤み・青みなど、色味の違い', '明度　色の明るさ', '彩度　色の鮮やかさ'];

export class TitleScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super('TitleScene');
  }

  init(): void {
    this.leaving = false;
  }

  // 結果画面でも使うので、最初の Scene でまとめて読み込む
  preload(): void {
    this.load.image(CHARACTER_TEXTURE, 'images/paint-anpan.png');
  }

  create(): void {
    setupCamera(this);

    this.add.image(GAME_WIDTH / 2, 100, CHARACTER_TEXTURE).setDisplaySize(150, 150);
    this.add.text(GAME_WIDTH / 2, 205, 'Palette Lab', textStyle(52, TEXT_COLORS.ink, 'mincho')).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 256, '混色で、色を見る目を育てる', textStyle(20, TEXT_COLORS.subInk)).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 335, 300, 100).setRounded(16).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    PIGMENTS.forEach((pigment, index) => {
      const column = index % 6;
      const row = Math.floor(index / 6);
      this.add
        .circle(GAME_WIDTH / 2 + (column - 2.5) * 44, 313 + row * 44, 15, toHex(PIGMENT_COLORS[pigment]))
        .setStrokeStyle(1.5, COLORS.ink, 0.3);
    });

    this.add
      .text(GAME_WIDTH / 2, 460, RULES.join('\n'), { ...textStyle(17), align: 'center', lineSpacing: 6 })
      .setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 610, 400, 124).setRounded(12).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    this.add
      .text(GAME_WIDTH / 2, 610, ['このゲームで使う言葉', ...TERMS].join('\n'), {
        ...textStyle(16, TEXT_COLORS.subInk),
        fixedWidth: 340,
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    new TextButton(this, GAME_WIDTH / 2, 732, 260, 68, 'スタート', () => {
      if (this.leaving) return;
      this.leaving = true;
      const data: GameSceneData = { stageIndex: 0, results: [] };
      this.scene.start('GameScene', data);
    });
  }
}
