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
import { PIGMENT_LABELS } from '../domain/recipe.ts';
import { scoreColor } from '../domain/scoring.ts';
import { COURSES, STAGES_PER_RUN, pickStages, targetColorOf } from '../domain/stages.ts';
import type { Difficulty, MixHistory, Pigment, RgbColor, RoundState, Stage } from '../domain/types.ts';
import { COLORS, GAME_WIDTH, TEXT_COLORS, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import { DropDots } from '../ui/dropDots.ts';
import { ColorDisc } from '../ui/colorDisc.ts';
import { LightnessBar } from '../ui/lightnessBar.ts';

/** 1回の通しプレイ。出題する5問は始めるときに決め、再挑戦しても変えない */
export type GameSceneData = {
  difficulty: Difficulty;
  stages: readonly Stage[];
  stageIndex: number;
  results: readonly RoundResult[];
};

export type RoundResult = {
  stage: Stage;
  target: RgbColor;
  actual: RgbColor;
  history: MixHistory;
  score: number;
};

export type ResultSceneData = { run: GameSceneData; result: RoundResult };

export function newRun(difficulty: Difficulty): GameSceneData {
  return { difficulty, stages: pickStages(COURSES[difficulty].stages, STAGES_PER_RUN), stageIndex: 0, results: [] };
}

const SWATCH_SIZE = 160;
const SWATCH_Y = 190;
const CURRENT_SWATCH_X = 350;
const METER_Y = 378;
const METER_RADIUS = 70;
const PIGMENT_ROWS_Y = [500, 588];
const SINGLE_ROW_Y = 545;
const PIGMENTS_PER_ROW = 6;
const PIGMENT_SPACING = 76;
// 6色ずつ2段に並べても、スマホで指先（約44px）が収まる大きさを保つ
const PIGMENT_RADIUS = 28;
const COLOR_TRANSITION_MS = 260;
const DROP_FALL_MS = 220;

type PigmentButton = { pigment: Pigment; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text };

export class GameScene extends Phaser.Scene {
  private run!: GameSceneData;
  private stage!: Stage;
  private round: RoundState = createRound();
  private target: RgbColor = { r: 0, g: 0, b: 0 };
  private leaving = false;

  private displayedColor: RgbColor | null = null;
  private colorTween?: Phaser.Tweens.Tween;

  private currentSwatch!: Phaser.GameObjects.Rectangle;
  private unmixedLabel!: Phaser.GameObjects.Text;
  private colorDisc!: ColorDisc;
  private lightnessBar!: LightnessBar;
  private dropDots!: DropDots;
  private dropsText!: Phaser.GameObjects.Text;
  private undoButton!: TextButton;
  private completeButton!: TextButton;
  private pigmentButtons: PigmentButton[] = [];

  constructor() {
    super('GameScene');
  }

  // シーンは再挑戦のたびに同じインスタンスで再開されるので、状態はここで必ず初期化する
  init(data: GameSceneData): void {
    this.run = data;
    this.stage = data.stages[data.stageIndex];
    this.round = createRound();
    this.target = targetColorOf(this.stage);
    this.leaving = false;
    this.displayedColor = null;
    this.colorTween = undefined;
    this.pigmentButtons = [];
  }

  create(): void {
    setupCamera(this);
    const { difficulty, stages, stageIndex } = this.run;

    this.add.text(24, 16, COURSES[difficulty].label, textStyle(16, TEXT_COLORS.subInk));
    this.add
      .text(GAME_WIDTH - 24, 16, `STAGE ${stageIndex + 1} / ${stages.length}`, textStyle(16, TEXT_COLORS.subInk))
      .setOrigin(1, 0);
    this.add.text(GAME_WIDTH / 2, 50, `お題：${this.stage.name}`, textStyle(26, TEXT_COLORS.ink, 'mincho')).setOrigin(0.5);

    this.createSwatches();
    this.createMeters();
    this.createPigmentButtons();

    this.dropDots = new DropDots(this, 655);
    this.dropsText = this.add.text(GAME_WIDTH / 2, 684, '', textStyle(17)).setOrigin(0.5);

    this.undoButton = new TextButton(this, 130, 745, 190, 60, '1滴戻す', () => this.handleUndo(), 'secondary');
    this.completeButton = new TextButton(this, 350, 745, 190, 60, '完成！', () => this.handleComplete());

    this.showColorImmediately(null);
    this.refreshControls();
  }

  private createSwatches(): void {
    const leftX = 130;
    const rightX = CURRENT_SWATCH_X;
    // 比べやすいよう、2つの色は同じ台・同じ大きさ・同じふちで並べる
    this.add.rectangle(GAME_WIDTH / 2, SWATCH_Y, 440, SWATCH_SIZE + 30).setRounded(12).setFillStyle(COLORS.viewingStage);
    this.add.text(leftX, 82, 'お題の色', textStyle(16, TEXT_COLORS.subInk)).setOrigin(0.5);
    this.add.text(rightX, 82, '現在の色', textStyle(16, TEXT_COLORS.subInk)).setOrigin(0.5);
    this.add.rectangle(leftX, SWATCH_Y, SWATCH_SIZE, SWATCH_SIZE, toHex(this.target)).setStrokeStyle(3, COLORS.chipMat);
    this.currentSwatch = this.add
      .rectangle(rightX, SWATCH_Y, SWATCH_SIZE, SWATCH_SIZE, COLORS.line)
      .setStrokeStyle(3, COLORS.chipMat);
    this.unmixedLabel = this.add.text(rightX, SWATCH_Y, '未調色', textStyle(22, TEXT_COLORS.subInk)).setOrigin(0.5);
  }

  private createMeters(): void {
    const discX = 230;
    const barX = 390;
    this.add.text(24, METER_Y - METER_RADIUS, '色相と彩度', textStyle(16));
    this.add.text(24, METER_Y - METER_RADIUS + 26, '外ほど鮮やか\n中心ほどくすむ', {
      ...textStyle(13, TEXT_COLORS.subInk),
      lineSpacing: 4,
    });
    this.colorDisc = new ColorDisc(this, discX, METER_Y);
    this.add.text(barX, METER_Y - METER_RADIUS, '明度', textStyle(16)).setOrigin(0.5, 0);
    const barTop = METER_Y - METER_RADIUS + 36;
    this.lightnessBar = new LightnessBar(this, barX, barTop, METER_Y + METER_RADIUS - barTop);
  }

  private createPigmentButtons(): void {
    const pigments = COURSES[this.run.difficulty].pigments;
    const rowsY = pigments.length > PIGMENTS_PER_ROW ? PIGMENT_ROWS_Y : [SINGLE_ROW_Y];
    pigments.forEach((pigment, index) => {
      const row = Math.floor(index / PIGMENTS_PER_ROW);
      const countInRow = Math.min(PIGMENTS_PER_ROW, pigments.length - row * PIGMENTS_PER_ROW);
      const firstX = GAME_WIDTH / 2 - (PIGMENT_SPACING * (countInRow - 1)) / 2;
      const x = firstX + (index % PIGMENTS_PER_ROW) * PIGMENT_SPACING;
      const y = rowsY[row];
      const circle = this.add
        .circle(x, y, PIGMENT_RADIUS, toHex(PIGMENT_COLORS[pigment]))
        .setStrokeStyle(2, COLORS.ink, 0.3)
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
      stage: this.stage,
      target: this.target,
      actual,
      history: this.round.history,
      score: scoreColor(this.target, actual),
    };
    this.tweens.killAll();
    this.showColorImmediately(actual);
    const data: ResultSceneData = { run: this.run, result };
    this.time.delayedCall(250, () => this.scene.start('ResultScene', data));
  }

  private playDropAnimation(pigment: Pigment): void {
    const button = this.pigmentButtons.find((b) => b.pigment === pigment);
    if (!button) return;
    // 連打で前の縮小が残ったまま次の Tween を始めると、途中の大きさを起点に戻ってしまい縮んだままになる
    this.tweens.killTweensOf(button.circle);
    button.circle.setScale(1);
    this.tweens.add({ targets: button.circle, scale: 0.88, duration: 70, yoyo: true });

    const landingX = CURRENT_SWATCH_X + Phaser.Math.Between(-50, 50);
    const drop = this.add
      .circle(landingX, SWATCH_Y - SWATCH_SIZE / 2 - 4, 11, toHex(PIGMENT_COLORS[pigment]))
      .setStrokeStyle(1.5, COLORS.ink, 0.3);
    this.tweens.add({
      targets: drop,
      y: SWATCH_Y + Phaser.Math.Between(-30, 30),
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
    const colorsByDrop = this.round.history
      .map((_, index) => mixColor(this.round.history.slice(0, index + 1)))
      .filter((color) => color !== null);
    this.colorDisc.show(colorsByDrop);
    this.lightnessBar.show(colorsByDrop);
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
    this.currentSwatch.setFillStyle(COLORS.line);
    this.unmixedLabel.setVisible(true);
  }

  private paintCurrentColor(color: RgbColor): void {
    this.displayedColor = color;
    this.currentSwatch.setFillStyle(toHex(color));
    this.unmixedLabel.setVisible(false);
  }

  private refreshControls(): void {
    const used = this.round.history.length;
    this.dropDots.show(this.round.history);
    const limit = used === MAX_DROPS ? '（上限）' : '';
    const undo = this.round.undoAvailable ? 'あと1回' : '使用済み';
    this.dropsText.setText(`使用 ${used} / ${MAX_DROPS}滴${limit}　取り消し：${undo}`);

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
