import Phaser from 'phaser';
import { RANK_STARS, hintFor, rankForScore, type Rank } from '../domain/scoring.ts';
import { STAGES } from '../domain/stages.ts';
import { COLORS, GAME_WIDTH, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import type { GameSceneData, RoundResult } from './GameScene.ts';

const RANK_LABELS: Record<Rank, string> = {
  MASTER: 'MASTER',
  EXPERT: 'EXPERT',
  APPRENTICE: 'APPRENTICE',
  RETRY: '再挑戦',
};

const SWATCH_SIZE = 170;
const SCORE_COUNT_MS = 900;

// 最高記録はページを再読み込みすると消えてよい（implementation-decisions.md 参照）。registry はゲームの生存期間だけ保持される
const bestScoreKey = (stageId: string) => `bestScore:${stageId}`;

export class ResultScene extends Phaser.Scene {
  private result!: RoundResult;
  private leaving = false;

  constructor() {
    super('ResultScene');
  }

  init(data: RoundResult): void {
    this.result = data;
    this.leaving = false;
  }

  create(): void {
    setupCamera(this);
    const { stageIndex, target, actual, score } = this.result;
    const stage = STAGES[stageIndex];
    const isLastStage = stageIndex === STAGES.length - 1;

    const previousBest = this.registry.get(bestScoreKey(stage.id)) as number | undefined;
    const isNewBest = previousBest === undefined || score > previousBest;
    if (isNewBest) this.registry.set(bestScoreKey(stage.id), score);

    this.add
      .text(GAME_WIDTH / 2, 40, `STAGE ${stageIndex + 1} / ${STAGES.length}`, textStyle(20, COLORS.subText))
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 76, stage.name, textStyle(28)).setOrigin(0.5);

    this.add.rectangle(GAME_WIDTH / 2, 215, 440, 240, COLORS.panel);
    this.add.text(130, 118, 'お題の色', textStyle(18, COLORS.subText)).setOrigin(0.5);
    this.add.text(350, 118, 'あなたの色', textStyle(18, COLORS.subText)).setOrigin(0.5);
    this.add.rectangle(130, 225, SWATCH_SIZE, SWATCH_SIZE, toHex(target)).setStrokeStyle(2, COLORS.swatchBorder);
    this.add.rectangle(350, 225, SWATCH_SIZE, SWATCH_SIZE, toHex(actual)).setStrokeStyle(2, COLORS.swatchBorder);

    const scoreText = this.add.text(GAME_WIDTH / 2, 395, '0', textStyle(80)).setOrigin(0.5);
    const unitText = this.add.text(0, 418, '点', textStyle(26, COLORS.subText)).setOrigin(0, 0.5);
    const showScore = (value: number) => {
      scoreText.setText(String(value));
      unitText.setX(scoreText.x + scoreText.width / 2 + 8);
    };
    showScore(0);

    const rank = rankForScore(score);
    const stars = RANK_STARS[rank];
    const revealed = [
      this.add.text(GAME_WIDTH / 2, 478, '★'.repeat(stars) + '☆'.repeat(3 - stars), textStyle(44, '#ffd45c')).setOrigin(0.5),
      this.add.text(GAME_WIDTH / 2, 522, RANK_LABELS[rank], textStyle(22)).setOrigin(0.5),
      this.add
        .text(GAME_WIDTH / 2, 574, hintFor(target, actual), {
          ...textStyle(20),
          wordWrap: { width: 420, useAdvancedWrap: true },
          align: 'center',
        })
        .setOrigin(0.5),
      this.add
        .text(
          GAME_WIDTH / 2,
          622,
          isNewBest ? `自己ベスト ${score}点（更新！）` : `自己ベスト ${previousBest}点`,
          textStyle(18, COLORS.subText),
        )
        .setOrigin(0.5),
    ];
    for (const text of revealed) text.setAlpha(0);

    this.tweens.addCounter({
      from: 0,
      to: score,
      duration: SCORE_COUNT_MS,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => showScore(Math.round(tween.getValue() ?? score)),
      onComplete: () => {
        showScore(score);
        this.tweens.add({ targets: revealed, alpha: 1, duration: 300 });
      },
    });

    new TextButton(this, 130, 720, 190, 68, 'もう一度', () => this.goTo('GameScene', { stageIndex }), 0x5a5a6a);
    if (isLastStage) {
      new TextButton(this, 350, 720, 190, 68, 'タイトルへ', () => this.goTo('TitleScene'));
    } else {
      new TextButton(this, 350, 720, 190, 68, '次のステージ', () => this.goTo('GameScene', { stageIndex: stageIndex + 1 }));
    }
  }

  // ボタンの連打で遷移が二重に走らないようにする
  private goTo(key: 'GameScene' | 'TitleScene', data?: GameSceneData): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, data);
  }
}
