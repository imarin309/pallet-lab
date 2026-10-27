import Phaser from 'phaser';
import { RANK_STARS, type Rank, rankForScore, summarizeRun } from '../domain/scoring.ts';
import { PIGMENT_COLORS } from '../domain/paintMixing.ts';
import { COURSES } from '../domain/stages.ts';
import { PIGMENTS, type Difficulty, type MixHistory } from '../domain/types.ts';
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

const ROW_FIRST_Y = 113;
const ROW_SPACING = 80;
const ROW_HEIGHT = 72;
const CHIP_SIZE = 40;
// 系統色名は長いものがあるので、星に重ならない幅まで縮める
const NAME_MAX_WIDTH = 150;
const RECIPE_DOT_RADIUS = 4.5;
const RECIPE_DOT_SPACING = 11;

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
    this.add.text(GAME_WIDTH / 2, 504, `合計 ${total} / ${maxTotal}点`, textStyle(34)).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 550, `${starsOf(rank)}　${RANK_LABELS[rank]}`, textStyle(26)).setOrigin(0.5);

    this.add.image(64, 632, CHARACTER_TEXTURE).setDisplaySize(96, 96);
    this.add.rectangle(290, 628, 340, 76).setRounded(14).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    this.add
      .text(290, 628, RANK_COMMENTS[rank], { ...textStyle(18), wordWrap: { width: 310, useAdvancedWrap: true }, align: 'center' })
      .setOrigin(0.5);

    new TextButton(this, 130, 730, 190, 68, 'もう一度遊ぶ', () => this.goTo('GameScene', newRun(this.difficulty)), 'secondary');
    new TextButton(this, 350, 730, 190, 68, 'タイトルへ', () => this.goTo('TitleScene'));
  }

  private createRow({ stage, target, actual, history, score }: RoundResult, y: number): void {
    this.add.rectangle(GAME_WIDTH / 2, y, 440, ROW_HEIGHT).setRounded(10).setFillStyle(COLORS.surface).setStrokeStyle(2, COLORS.line);
    // 結果画面と同じく、お題と自分の色は中間グレーの台に並べて見比べる
    this.add.rectangle(84, y, 104, 56).setRounded(6).setFillStyle(COLORS.viewingStage);
    this.add.rectangle(58, y, CHIP_SIZE, CHIP_SIZE, toHex(target)).setStrokeStyle(2, COLORS.chipMat);
    this.add.rectangle(110, y, CHIP_SIZE, CHIP_SIZE, toHex(actual)).setStrokeStyle(2, COLORS.chipMat);

    const lineY = [y - 15, y + 15];
    const name = this.add.text(150, lineY[0], stage.name, textStyle(18)).setOrigin(0, 0.5);
    name.setScale(Math.min(1, NAME_MAX_WIDTH / name.width));
    this.add.text(362, lineY[0], starsOf(rankForScore(score)), textStyle(14)).setOrigin(1, 0.5);
    this.add.text(444, lineY[0], `${score}点`, textStyle(20)).setOrigin(1, 0.5);

    const answerEnd = this.createRecipe('答え', stage.recipe, 150, lineY[1]);
    this.createRecipe('あなた', history, answerEnd + 14, lineY[1]);
  }

  /** 色の内訳だけを見せるので、入れた順ではなく塗料の並び順にそろえる。描いた右端の x を返す */
  private createRecipe(label: string, recipe: MixHistory, x: number, y: number): number {
    const labelText = this.add.text(x, y, label, textStyle(13, TEXT_COLORS.subInk)).setOrigin(0, 0.5);
    const sorted = [...recipe].sort((a, b) => PIGMENTS.indexOf(a) - PIGMENTS.indexOf(b));
    const firstX = x + labelText.width + 6 + RECIPE_DOT_RADIUS;
    sorted.forEach((pigment, index) => {
      this.add
        .circle(firstX + index * RECIPE_DOT_SPACING, y, RECIPE_DOT_RADIUS, toHex(PIGMENT_COLORS[pigment]))
        .setStrokeStyle(1, COLORS.ink, 0.4);
    });
    return firstX + (sorted.length - 1) * RECIPE_DOT_SPACING + RECIPE_DOT_RADIUS;
  }

  // ボタンの連打で遷移が二重に走らないようにする
  private goTo(key: 'GameScene' | 'TitleScene', data?: GameSceneData): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start(key, data);
  }
}
