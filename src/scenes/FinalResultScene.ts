import Phaser from 'phaser';
import { RANK_STARS, type Rank, rankForScore, summarizeRun } from '../domain/scoring.ts';
import { COURSES } from '../domain/stages.ts';
import type { Difficulty } from '../domain/types.ts';
import { CHARACTER_TEXTURE, COLORS, GAME_WIDTH, TEXT_COLORS, TextButton, setupCamera, textStyle, toHex } from '../ui/common.ts';
import { type GameSceneData, type RoundResult, newRun } from './GameScene.ts';
import { RANK_LABELS } from './ResultScene.ts';

export type FinalResultSceneData = { difficulty: Difficulty; results: readonly RoundResult[] };

// ヒントと同じく、何を足せばよいかの処方は書かない
const RANK_COMMENTS: Record<Rank, string> = {
  MASTER: 'どの色も、よく見て作れていました！',
  EXPERT: 'お題の色を、しっかり捉えられていました',
  APPRENTICE: '色の違いが、少しずつ見えてきましたね',
  RETRY: '見比べるほど、色の違いに気づけるようになります',
};

const ROW_FIRST_Y = 112;
const ROW_SPACING = 66;
const CHIP_SIZE = 40;
// 系統色名は長いものがあるので、色見本に重ならない幅まで縮める
const NAME_MAX_WIDTH = 140;

const starsOf = (rank: Rank) => '★'.repeat(RANK_STARS[rank]) + '☆'.repeat(3 - RANK_STARS[rank]);

export class FinalResultScene extends Phaser.Scene {
  private difficulty: Difficulty = 'beginner';
  private results: readonly RoundResult[] = [];
  private leaving = false;

  constructor() {
    super('FinalResultScene');
  }

  init(data: FinalResultSceneData): void {
    this.difficulty = data.difficulty;
    this.results = data.results ?? [];
    this.leaving = false;
  }

  create(): void {
    setupCamera(this);

    this.add.text(GAME_WIDTH / 2, 48, `結果発表　${COURSES[this.difficulty].label}`, textStyle(32, TEXT_COLORS.ink, 'mincho')).setOrigin(0.5);
    this.results.forEach((result, index) => {
      this.createRow(result, ROW_FIRST_Y + index * ROW_SPACING);
    });

    const { total, maxTotal, rank } = summarizeRun(this.results.map((result) => result.score));
    this.add.text(GAME_WIDTH / 2, 466, `合計 ${total} / ${maxTotal}点`, textStyle(34)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 516, starsOf(rank), textStyle(36)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 554, RANK_LABELS[rank], textStyle(22)).setOrigin(0.5);

    this.add.image(64, 632, CHARACTER_TEXTURE).setDisplaySize(96, 96);
    this.add.rectangle(290, 628, 340, 76).setRounded(14).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    this.add
      .text(290, 628, RANK_COMMENTS[rank], { ...textStyle(18), wordWrap: { width: 310, useAdvancedWrap: true }, align: 'center' })
      .setOrigin(0.5);

    new TextButton(this, 130, 730, 190, 68, 'もう一度遊ぶ', () => this.goTo('GameScene', newRun(this.difficulty)), 'secondary');
    new TextButton(this, 350, 730, 190, 68, 'タイトルへ', () => this.goTo('TitleScene'));
  }

  private createRow({ stage, target, actual, score }: RoundResult, y: number): void {
    this.add.rectangle(GAME_WIDTH / 2, y, 440, 56).setRounded(10).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    const name = this.add.text(36, y, stage.name, textStyle(18)).setOrigin(0, 0.5);
    name.setScale(Math.min(1, NAME_MAX_WIDTH / name.width));
    // 結果画面と同じく、お題と自分の色は中間グレーの台に並べて見比べる
    this.add.rectangle(232, y, 104, 48).setRounded(6).setFillStyle(COLORS.viewingStage);
    this.add.rectangle(206, y, CHIP_SIZE, CHIP_SIZE, toHex(target)).setStrokeStyle(2, COLORS.chipMat);
    this.add.rectangle(258, y, CHIP_SIZE, CHIP_SIZE, toHex(actual)).setStrokeStyle(2, COLORS.chipMat);
    this.add.text(334, y, starsOf(rankForScore(score)), textStyle(16)).setOrigin(0.5);
    this.add.text(444, y, `${score}点`, textStyle(22)).setOrigin(1, 0.5);
  }

  // ボタンの連打で遷移が二重に走らないようにする
  private goTo(key: 'GameScene' | 'TitleScene', data?: GameSceneData): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, data);
  }
}
