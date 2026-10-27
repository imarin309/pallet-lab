// @vitest-environment jsdom
// Phaser は内蔵テクスチャを data URI の画像で読み込むので、jsdom に画像の読み込みを許可する
// @vitest-environment-options {"resources":"usable"}
import Phaser from 'phaser';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formatRecipe } from '../src/domain/recipe.ts';
import { FinalResultScene } from '../src/scenes/FinalResultScene.ts';
import { GameScene, type GameSceneData, type RoundResult } from '../src/scenes/GameScene.ts';
import { ResultScene } from '../src/scenes/ResultScene.ts';
import { TitleScene } from '../src/scenes/TitleScene.ts';
import { CHARACTER_TEXTURE } from '../src/ui/common.ts';

// Phaser の更新で、型は通るのに実行時に壊れる退行を拾うためのテスト。描画結果までは見ない

let game: Phaser.Game;
let errors: unknown[];
const recordError = (event: ErrorEvent) => errors.push(event.error);

beforeEach(() => {
  errors = [];
  vi.spyOn(console, 'error').mockImplementation((...args) => errors.push(args));
  window.addEventListener('error', recordError);
  // jsdom には public/ を配信するサーバーがなく、画像の読み込みは何も言わずに失敗する。
  // 手元でたまたま動いているサーバーに結果を左右されないよう、通信せずに空のテクスチャで代える
  vi.spyOn(TitleScene.prototype, 'preload').mockImplementation(function (this: TitleScene) {
    this.textures.addCanvas(CHARACTER_TEXTURE, document.createElement('canvas'));
  });
  game = new Phaser.Game({
    type: Phaser.HEADLESS,
    banner: false,
    autoFocus: false,
    audio: { noAudio: true },
    scene: [TitleScene, GameScene, ResultScene, FinalResultScene],
  });
});

afterEach(() => {
  game.destroy(true);
  window.removeEventListener('error', recordError);
  vi.restoreAllMocks();
});

async function waitForScene(key: string): Promise<Phaser.Scene> {
  await vi.waitFor(() => expect(game.scene.getScenes(true).map((scene) => scene.scene.key)).toEqual([key]));
  return game.scene.getScene(key);
}

// ボタンの実装に依存しないよう、ラベルの文字から一番近い押せる図形を押す
function press(scene: Phaser.Scene, label: string): void {
  const objects = scene.children.list;
  const text = objects.find((object) => object instanceof Phaser.GameObjects.Text && object.text === label);
  if (!(text instanceof Phaser.GameObjects.Text)) throw new Error(`「${label}」が見つかりません`);
  const distance = (object: Phaser.GameObjects.GameObject) =>
    object instanceof Phaser.GameObjects.Shape ? Phaser.Math.Distance.Between(object.x, object.y, text.x, text.y) : Infinity;
  const target = objects
    .filter((object) => object.input?.enabled)
    .reduce((nearest, object) => (distance(object) < distance(nearest) ? object : nearest));
  target.emit('pointerdown');
}

it('タイトルで難易度を選んで調色し、結果を見て次のステージへ進める', async () => {
  press(await waitForScene('TitleScene'), '中級');

  const gameScene = await waitForScene('GameScene');
  press(gameScene, '緑');
  press(gameScene, '橙');
  press(gameScene, '水色');
  press(gameScene, '完成！');

  press(await waitForScene('ResultScene'), '次のステージ');

  await vi.waitFor(() =>
    expect(game.scene.getScene('GameScene').scene.settings.data).toMatchObject({ difficulty: 'intermediate', stageIndex: 1 }),
  );
  expect(errors).toEqual([]);
});

it('答えを見ると、その問題には再挑戦できなくなる', async () => {
  press(await waitForScene('TitleScene'), '初級');
  const gameScene = await waitForScene('GameScene');
  press(gameScene, '緑');
  press(gameScene, '完成！');

  const resultScene = await waitForScene('ResultScene');
  const { result } = resultScene.scene.settings.data as { result: RoundResult };
  press(resultScene, '答えを見る');
  const texts = resultScene.children.list.filter((object) => object instanceof Phaser.GameObjects.Text);
  expect(texts.some((text) => text.text.startsWith(`答え：${formatRecipe(result.stage.recipe)}`))).toBe(true);

  press(resultScene, 'もう一度');
  await new Promise((resolve) => setTimeout(resolve, 100));
  expect(game.scene.getScenes(true).map((scene) => scene.scene.key)).toEqual(['ResultScene']);
  expect(errors).toEqual([]);
});

it('5ステージを終えると結果発表へ進み、再挑戦した結果は最後のものだけが残る', async () => {
  press(await waitForScene('TitleScene'), '初級');

  const playOneDrop = async (label: string) => {
    const gameScene = await waitForScene('GameScene');
    press(gameScene, label);
    press(gameScene, '完成！');
    return waitForScene('ResultScene');
  };

  press(await playOneDrop('黒'), 'もう一度');
  press(await playOneDrop('緑'), '次のステージ');
  for (let stage = 2; stage <= 4; stage++) press(await playOneDrop('緑'), '次のステージ');
  press(await playOneDrop('緑'), '結果発表へ');

  const finalScene = await waitForScene('FinalResultScene');
  const { results } = finalScene.scene.settings.data as { results: RoundResult[] };
  const { stages } = game.scene.getScene('GameScene').scene.settings.data as GameSceneData;
  expect(results.map((result) => result.stage)).toEqual(stages);
  expect(results[0].history).toEqual(['green']);

  press(finalScene, 'もう一度遊ぶ');
  await vi.waitFor(() =>
    expect(game.scene.getScene('GameScene').scene.settings.data).toMatchObject({
      difficulty: 'beginner',
      stageIndex: 0,
      results: [],
    }),
  );
  expect(errors).toEqual([]);
});
