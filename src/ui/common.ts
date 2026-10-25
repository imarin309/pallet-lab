import Phaser from 'phaser';
import type { RgbColor } from '../domain/types.ts';

/** レイアウトはこの論理サイズで組む。実際のキャンバスは RENDER_SCALE 倍 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;
// Phaser 4 にはゲーム全体の解像度設定がないため、2倍のキャンバスをカメラのズームで論理サイズに合わせる。
// こうしないと、高解像度の画面や PC で拡大表示されたときに図形も文字もぼやける
export const RENDER_SCALE = 2;

export const COLORS = {
  background: 0x1e1e24,
  panel: 0x2b2b35,
  panelBorder: 0x4a4a58,
  // 黒に近い色でも背景に溶けて面の境目が消えないよう、色見本には必ずこの枠を付ける
  swatchBorder: 0x8a8a96,
  text: '#f2f2f5',
  subText: '#b4b4c0',
  accent: 0x4f8cff,
  disabled: 0x3a3a44,
};

const FONT_FAMILY = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif';

export function textStyle(fontSize: number, color = COLORS.text): Phaser.Types.GameObjects.Text.TextStyle {
  // カメラのズーム分だけ文字の解像度も上げないとにじむ
  return { fontFamily: FONT_FAMILY, fontSize: `${fontSize}px`, color, resolution: RENDER_SCALE };
}

export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

export function toHex({ r, g, b }: RgbColor): number {
  return Phaser.Display.Color.GetColor(r, g, b);
}

export class TextButton {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly fillColor: number;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onPress: () => void,
    fillColor: number = COLORS.accent,
  ) {
    this.fillColor = fillColor;
    this.background = scene.add
      .rectangle(x, y, width, height, fillColor)
      .setStrokeStyle(2, 0xffffff, 0.25)
      .setInteractive({ useHandCursor: true });
    this.label = scene.add.text(x, y, text, textStyle(24)).setOrigin(0.5);
    this.background.on('pointerdown', () => {
      if (this.enabled) onPress();
    });
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.background.setFillStyle(enabled ? this.fillColor : COLORS.disabled);
    this.label.setAlpha(enabled ? 1 : 0.45);
    if (this.background.input) this.background.input.cursor = enabled ? 'pointer' : 'default';
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }
}
