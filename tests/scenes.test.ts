// @vitest-environment jsdom
// Phaser は内蔵テクスチャを data URI の画像で読み込むので、jsdom に画像の読み込みを許可する
// @vitest-environment-options {"resources":"usable"}
import Phaser from 'phaser';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GameScene } from '../src/scenes/GameScene.ts';
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
    scene: [TitleScene, GameScene, ResultScene],
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

it('タイトルから調色して結果を見て、次のステージへ進める', async () => {
  press(await waitForScene('TitleScene'), 'スタート');

  const gameScene = await waitForScene('GameScene');
  press(gameScene, '緑');
  press(gameScene, '緑');
  press(gameScene, '水色');
  press(gameScene, '完成！');

  press(await waitForScene('ResultScene'), '次のステージ');

  await vi.waitFor(() => expect(game.scene.getScene('GameScene').scene.settings.data).toEqual({ stageIndex: 1 }));
  expect(errors).toEqual([]);
});
