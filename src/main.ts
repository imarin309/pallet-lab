import Phaser from 'phaser';
import { FinalResultScene } from './scenes/FinalResultScene.ts';
import { GameScene } from './scenes/GameScene.ts';
import { ResultScene } from './scenes/ResultScene.ts';
import { TitleScene } from './scenes/TitleScene.ts';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from './ui/common.ts';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.paper,
  scale: {
    // 縦長のスマホを基準にし、PCでは左右に余白を出して比率を保つ
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH * RENDER_SCALE,
    height: GAME_HEIGHT * RENDER_SCALE,
  },
  scene: [TitleScene, GameScene, ResultScene, FinalResultScene],
});
