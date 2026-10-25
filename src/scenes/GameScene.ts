import Phaser from 'phaser';
import {
  MAX_DROPS,
  addDrop,
  canAddDrop,
  canComplete,
  canUndo,
  completeRound,
  createRound,
  undoLastDrop,
} from '../domain/gameRules.ts';
import { PIGMENT_COLORS, mixColor } from '../domain/paintMixing.ts';
import { scoreColor } from '../domain/scoring.ts';
import { STAGES, targetColorOf } from '../domain/stages.ts';
import { PIGMENTS, type Pigment, type RgbColor, type RoundState } from '../domain/types.ts';
import { COLORS, GAME_WIDTH, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';

export type GameSceneData = { stageIndex: number };

export type RoundResult = {
  stageIndex: number;
  target: RgbColor;
  actual: RgbColor;
  score: number;
};

const PIGMENT_LABELS: Record<Pigment, string> = {
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

const SWATCH_SIZE = 180;
const SWATCH_Y = 215;
const DISH_Y = 395;
const PIGMENT_ROWS_Y = [475, 565];
const PIGMENTS_PER_ROW = 6;
const PIGMENT_SPACING = 76;
// 12色を2段に並べても、スマホで指先（約44px）が収まる大きさを保つ
const PIGMENT_RADIUS = 28;
const COLOR_TRANSITION_MS = 260;
const DROP_FALL_MS = 220;

type PigmentButton = { pigment: Pigment; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text };

export class GameScene extends Phaser.Scene {
  private stageIndex = 0;
  private round: RoundState = createRound();
  private target: RgbColor = { r: 0, g: 0, b: 0 };
  private leaving = false;

  private displayedColor: RgbColor | null = null;
  private colorTween?: Phaser.Tweens.Tween;

  private currentSwatch!: Phaser.GameObjects.Rectangle;
  private unmixedLabel!: Phaser.GameObjects.Text;
  private dish!: Phaser.GameObjects.Ellipse;
  private dropsText!: Phaser.GameObjects.Text;
  private undoText!: Phaser.GameObjects.Text;
  private undoButton!: TextButton;
  private completeButton!: TextButton;
  private pigmentButtons: PigmentButton[] = [];

  constructor() {
    super('GameScene');
  }

  // シーンは再挑戦のたびに同じインスタンスで再開されるので、状態はここで必ず初期化する
  init(data: GameSceneData): void {
    this.stageIndex = data.stageIndex ?? 0;
    this.round = createRound();
    this.target = targetColorOf(STAGES[this.stageIndex]);
    this.leaving = false;
    this.displayedColor = null;
    this.colorTween = undefined;
    this.pigmentButtons = [];
  }

  create(): void {
    setupCamera(this);
    const stage = STAGES[this.stageIndex];

    this.add.text(24, 24, 'Palette Lab', textStyle(20, COLORS.subText));
    this.add
      .text(GAME_WIDTH - 24, 24, `STAGE ${this.stageIndex + 1} / ${STAGES.length}`, textStyle(20, COLORS.subText))
      .setOrigin(1, 0);
    this.add.text(GAME_WIDTH / 2, 78, `お題：${stage.name}`, textStyle(26)).setOrigin(0.5);

    this.createSwatches();
    this.dish = this.add.ellipse(GAME_WIDTH / 2, DISH_Y, 300, 64, COLORS.panel).setStrokeStyle(3, COLORS.panelBorder);
    this.createPigmentButtons();

    this.dropsText = this.add.text(GAME_WIDTH / 2, 652, '', textStyle(24)).setOrigin(0.5);
    this.undoText = this.add.text(GAME_WIDTH / 2, 684, '', textStyle(16, COLORS.subText)).setOrigin(0.5);

    this.undoButton = new TextButton(this, 130, 745, 190, 64, '1滴戻す', () => this.handleUndo(), 0x5a5a6a);
    this.completeButton = new TextButton(this, 350, 745, 190, 64, '完成！', () => this.handleComplete());

    this.showColorImmediately(null);
    this.refreshControls();
  }

  private createSwatches(): void {
    const leftX = 130;
    const rightX = 350;
    // 比べやすいよう、2つの色は同じ背景・同じ大きさで並べる
    this.add.rectangle(GAME_WIDTH / 2, SWATCH_Y + 10, 440, 250, COLORS.panel);
    this.add.text(leftX, 112, 'お題の色', textStyle(18, COLORS.subText)).setOrigin(0.5);
    this.add.text(rightX, 112, '現在の色', textStyle(18, COLORS.subText)).setOrigin(0.5);
    this.add.rectangle(leftX, SWATCH_Y + 20, SWATCH_SIZE, SWATCH_SIZE, toHex(this.target)).setStrokeStyle(2, COLORS.swatchBorder);
    this.currentSwatch = this.add
      .rectangle(rightX, SWATCH_Y + 20, SWATCH_SIZE, SWATCH_SIZE, COLORS.panelBorder)
      .setStrokeStyle(2, COLORS.swatchBorder);
    this.unmixedLabel = this.add.text(rightX, SWATCH_Y + 20, '未調色', textStyle(22, COLORS.subText)).setOrigin(0.5);
  }

  private createPigmentButtons(): void {
    const firstX = GAME_WIDTH / 2 - (PIGMENT_SPACING * (PIGMENTS_PER_ROW - 1)) / 2;
    PIGMENTS.forEach((pigment, index) => {
      const x = firstX + (index % PIGMENTS_PER_ROW) * PIGMENT_SPACING;
      const y = PIGMENT_ROWS_Y[Math.floor(index / PIGMENTS_PER_ROW)];
      const circle = this.add
        .circle(x, y, PIGMENT_RADIUS, toHex(PIGMENT_COLORS[pigment]))
        .setStrokeStyle(3, 0xffffff, 0.6)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y + PIGMENT_RADIUS + 14, PIGMENT_LABELS[pigment], textStyle(16)).setOrigin(0.5);
      circle.on('pointerdown', () => this.handleAddDrop(pigment));
      this.pigmentButtons.push({ pigment, circle, label });
    });
  }

  private handleAddDrop(pigment: Pigment): void {
    if (this.leaving || !canAddDrop(this.round)) return;
    this.round = addDrop(this.round, pigment);
    this.refreshControls();
    this.playDropAnimation(pigment);
  }

  private handleUndo(): void {
    if (this.leaving || !canUndo(this.round)) return;
    this.round = undoLastDrop(this.round);
    this.refreshControls();
    this.transitionToCurrentColor();
  }

  private handleComplete(): void {
    if (this.leaving || !canComplete(this.round)) return;
    this.leaving = true;
    this.round = completeRound(this.round);
    this.refreshControls();

    // 演出の途中でも、採点は確定した状態から計算する
    const actual = mixColor(this.round.history);
    if (!actual) return;
    const result: RoundResult = {
      stageIndex: this.stageIndex,
      target: this.target,
      actual,
      score: scoreColor(this.target, actual),
    };
    this.tweens.killAll();
    this.showColorImmediately(actual);
    this.time.delayedCall(250, () => this.scene.start('ResultScene', result));
  }

  private playDropAnimation(pigment: Pigment): void {
    const button = this.pigmentButtons.find((b) => b.pigment === pigment);
    if (!button) return;
    // 連打で前の縮小が残ったまま次の Tween を始めると、途中の大きさを起点に戻ってしまい縮んだままになる
    this.tweens.killTweensOf(button.circle);
    button.circle.setScale(1);
    this.tweens.add({ targets: button.circle, scale: 0.88, duration: 70, yoyo: true });

    const landingX = GAME_WIDTH / 2 + Phaser.Math.Between(-60, 60);
    const drop = this.add
      .circle(landingX, DISH_Y - 70, 11, toHex(PIGMENT_COLORS[pigment]))
      .setStrokeStyle(2, 0xffffff, 0.5);
    this.tweens.add({
      targets: drop,
      y: DISH_Y + Phaser.Math.Between(-10, 10),
      duration: DROP_FALL_MS,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.tweens.add({ targets: drop, scaleX: 2.2, scaleY: 0.6, alpha: 0, duration: 180, onComplete: () => drop.destroy() });
        this.transitionToCurrentColor();
      },
    });
  }

  // 連打で複数の滴が落ちていても、常に最新の状態の色へ向かって補間する。表示が採点の色とずれないようにするため
  private transitionToCurrentColor(): void {
    if (this.leaving) return;
    const next = mixColor(this.round.history);
    this.colorTween?.stop();
    if (!next || !this.displayedColor) {
      this.showColorImmediately(next);
      return;
    }
    const from = this.displayedColor;
    this.colorTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: COLOR_TRANSITION_MS,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        this.paintCurrentColor({
          r: Math.round(from.r + (next.r - from.r) * t),
          g: Math.round(from.g + (next.g - from.g) * t),
          b: Math.round(from.b + (next.b - from.b) * t),
        });
      },
      onComplete: () => this.paintCurrentColor(next),
    });
  }

  private showColorImmediately(color: RgbColor | null): void {
    if (color) {
      this.paintCurrentColor(color);
      return;
    }
    this.displayedColor = null;
    this.currentSwatch.setFillStyle(COLORS.panelBorder);
    this.dish.setFillStyle(COLORS.panel);
    this.unmixedLabel.setVisible(true);
  }

  private paintCurrentColor(color: RgbColor): void {
    this.displayedColor = color;
    this.currentSwatch.setFillStyle(toHex(color));
    this.dish.setFillStyle(toHex(color));
    this.unmixedLabel.setVisible(false);
  }

  private refreshControls(): void {
    const used = this.round.history.length;
    this.dropsText.setText(`使用 ${used} / ${MAX_DROPS}滴${used === MAX_DROPS ? '（上限）' : ''}`);
    this.undoText.setText(this.round.undoAvailable ? '取り消し：あと1回' : '取り消し：使用済み');

    const addable = canAddDrop(this.round);
    for (const { circle, label } of this.pigmentButtons) {
      circle.setAlpha(addable ? 1 : 0.3);
      label.setAlpha(addable ? 1 : 0.4);
      if (circle.input) circle.input.cursor = addable ? 'pointer' : 'default';
    }
    this.undoButton.setEnabled(canUndo(this.round));
    this.completeButton.setEnabled(canComplete(this.round));
  }
}
