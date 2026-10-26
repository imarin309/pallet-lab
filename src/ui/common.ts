import Phaser from 'phaser';
import type { RgbColor } from '../domain/types.ts';

/** レイアウトはこの論理サイズで組む。実際のキャンバスは RENDER_SCALE 倍 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 800;
// Phaser 4 にはゲーム全体の解像度設定がないため、2倍のキャンバスをカメラのズームで論理サイズに合わせる。
// こうしないと、高解像度の画面や PC で拡大表示されたときに図形も文字もぼやける
export const RENDER_SCALE = 2;

export const CHARACTER_TEXTURE = 'paintAnpan';

// UI は無彩色だけで組む。周りに色があると、隣り合う色の見え方が変わってしまう（同時対比）ため。
// 画面で色を持つのは絵の具とお題だけにする（DESIGN.md 2章）
export const COLORS = {
  paper: 0xf2f2f0,
  surface: 0xffffff,
  line: 0xd4d4d1,
  // 美術や色校正で色を見比べるときの中間グレー（マンセル N6 前後）。黒に近い色も白に近い色も境目が見える
  viewingStage: 0x8f8f8f,
  chipMat: 0xffffff,
  ink: 0x1f1f1f,
  disabledFill: 0xe0e0dd,
};

export const TEXT_COLORS = {
  ink: '#1f1f1f',
  subInk: '#5c5c5c',
  onInk: '#ffffff',
  disabled: '#9a9a9a',
};

const TYPEFACES = {
  gothic: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif',
  mincho: '"Hiragino Mincho ProN", "Noto Serif JP", "Yu Mincho", serif',
};
type Typeface = keyof typeof TYPEFACES;

export function textStyle(
  fontSize: number,
  color = TEXT_COLORS.ink,
  typeface: Typeface = 'gothic',
): Phaser.Types.GameObjects.Text.TextStyle {
  // カメラのズーム分だけ文字の解像度も上げないとにじむ
  return { fontFamily: TYPEFACES[typeface], fontSize: `${fontSize}px`, color, resolution: RENDER_SCALE };
}

export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

export function toHex({ r, g, b }: RgbColor): number {
  return Phaser.Display.Color.GetColor(r, g, b);
}

type ButtonVariant = 'primary' | 'secondary';

const BUTTON_LOOKS: Record<ButtonVariant, { fill: number; stroke: number; text: string }> = {
  primary: { fill: COLORS.ink, stroke: COLORS.ink, text: TEXT_COLORS.onInk },
  secondary: { fill: COLORS.surface, stroke: COLORS.ink, text: TEXT_COLORS.ink },
};

export class TextButton {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private readonly variant: ButtonVariant;
  private enabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onPress: () => void,
    variant: ButtonVariant = 'primary',
  ) {
    this.variant = variant;
    this.background = scene.add.rectangle(x, y, width, height).setRounded(12).setInteractive({ useHandCursor: true });
    this.label = scene.add.text(x, y, text, textStyle(24)).setOrigin(0.5);
    this.background.on('pointerdown', () => {
      if (this.enabled) onPress();
    });
    this.setEnabled(true);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    const look = BUTTON_LOOKS[this.variant];
    this.background.setFillStyle(enabled ? look.fill : COLORS.disabledFill);
    this.background.setStrokeStyle(2, enabled ? look.stroke : COLORS.line);
    this.label.setColor(enabled ? look.text : TEXT_COLORS.disabled);
    if (this.background.input) this.background.input.cursor = enabled ? 'pointer' : 'default';
    return this;
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }
}
