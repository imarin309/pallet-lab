import Phaser from 'phaser';
import { RANK_STARS, hintFor, rankForScore, type Rank } from '../domain/scoring.ts';
import { STAGES } from '../domain/stages.ts';
import { CHARACTER_TEXTURE, COLORS, GAME_WIDTH, TEXT_COLORS, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import { DropDots } from '../ui/dropDots.ts';
import type { GameSceneData, ResultSceneData, RoundResult } from './GameScene.ts';
import type { FinalResultSceneData } from './FinalResultScene.ts';

export const RANK_LABELS: Record<Rank, string> = {
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
  private results: readonly RoundResult[] = [];
  private leaving = false;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultSceneData): void {
    this.result = data.result;
    this.results = data.results;
    this.leaving = false;
  }

  create(): void {
    setupCamera(this);
    const { stageIndex, target, actual, history, score } = this.result;
    const stage = STAGES[stageIndex];
    const isLastStage = stageIndex === STAGES.length - 1;

    const previousBest = this.registry.get(bestScoreKey(stage.id)) as number | undefined;
    const isNewBest = previousBest === undefined || score > previousBest;
    if (isNewBest) this.registry.set(bestScoreKey(stage.id), score);

    this.add
      .text(GAME_WIDTH / 2, 36, `STAGE ${stageIndex + 1} / ${STAGES.length}`, textStyle(20, TEXT_COLORS.subInk))
      .setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 70, stage.name, textStyle(28, TEXT_COLORS.ink, 'mincho')).setOrigin(0.5);

    this.add.text(130, 106, 'お題の色', textStyle(18, TEXT_COLORS.subInk)).setOrigin(0.5);
    this.add.text(350, 106, 'あなたの色', textStyle(18, TEXT_COLORS.subInk)).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 220, 440, 200).setRounded(12).setFillStyle(COLORS.viewingStage);
    this.add.rectangle(130, 220, SWATCH_SIZE, SWATCH_SIZE, toHex(target)).setStrokeStyle(3, COLORS.chipMat);
    this.add.rectangle(350, 220, SWATCH_SIZE, SWATCH_SIZE, toHex(actual)).setStrokeStyle(3, COLORS.chipMat);
    new DropDots(this, 344).show(history);

    const scoreText = this.add.text(GAME_WIDTH / 2, 408, '0', textStyle(80)).setOrigin(0.5);
    const unitText = this.add.text(0, 431, '点', textStyle(26, TEXT_COLORS.subInk)).setOrigin(0, 0.5);
    const showScore = (value: number) => {
      scoreText.setText(String(value));
      unitText.setX(scoreText.x + scoreText.width / 2 + 8);
    };
    showScore(0);

    const rank = rankForScore(score);
    const stars = RANK_STARS[rank];
    const revealed = [
      this.add.text(GAME_WIDTH / 2, 478, '★'.repeat(stars) + '☆'.repeat(3 - stars), textStyle(40)).setOrigin(0.5),
      this.add.text(GAME_WIDTH / 2, 518, RANK_LABELS[rank], textStyle(22)).setOrigin(0.5),
      // ヒントはキャラクターの吹き出しとして見せる（DESIGN.md「隣で一緒に色を見ている講師」）
      this.add.image(64, 596, CHARACTER_TEXTURE).setDisplaySize(96, 96),
      this.add.rectangle(290, 592, 340, 76).setRounded(14).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line),
      this.add
        .text(290, 592, hintFor(target, actual), {
          ...textStyle(18),
          wordWrap: { width: 310, useAdvancedWrap: true },
          align: 'center',
        })
        .setOrigin(0.5),
      this.add
        .text(
          GAME_WIDTH / 2,
          654,
          isNewBest ? `自己ベスト ${score}点（更新！）` : `自己ベスト ${previousBest}点`,
          textStyle(18, TEXT_COLORS.subInk),
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

    // 再挑戦では今回の結果を積まないので、次へ進んだときの結果で上書きされる
    const retryData: GameSceneData = { stageIndex, results: this.results };
    const settled = [...this.results, this.result];
    new TextButton(this, 130, 720, 190, 68, 'もう一度', () => this.goTo('GameScene', retryData), 'secondary');
    if (isLastStage) {
      const finalData: FinalResultSceneData = { results: settled };
      new TextButton(this, 350, 720, 190, 68, '結果発表へ', () => this.goTo('FinalResultScene', finalData));
    } else {
      const nextData: GameSceneData = { stageIndex: stageIndex + 1, results: settled };
      new TextButton(this, 350, 720, 190, 68, '次のステージ', () => this.goTo('GameScene', nextData));
    }
  }

  // ボタンの連打で遷移が二重に走らないようにする
  private goTo(key: 'GameScene' | 'FinalResultScene', data: GameSceneData | FinalResultSceneData): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, data);
  }
}
