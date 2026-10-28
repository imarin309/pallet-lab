import type Phaser from 'phaser';
import { MAX_DROPS } from '../domain/gameRules.ts';
import type { RgbColor } from '../domain/types.ts';
import { COLORS, toHex } from './common.ts';

export type Point = { x: number; y: number };

const POINT_RADIUS = 4;
const HEAD_RADIUS = 7;
// 古い点ほど薄くし、どれが最新の1滴か迷わないようにする
const FADE_STEP = 0.15;
const MIN_ALPHA = 0.35;
const MOVE_MS = 260;

/** 1滴ごとの混色を、project で決めた位置に点と線で並べる。最新の点は1つ前の位置から動かす */
export class ColorTrail {
  private readonly scene: Phaser.Scene;
  private readonly project: (color: RgbColor) => Point;
  private readonly lines: Phaser.GameObjects.Graphics;
  private readonly points: Phaser.GameObjects.Arc[] = [];
  private positions: Point[] = [];
  // 滴が着地するたびに呼ばれ、連打では動いている途中で次が来るので、目標ではなく画面上の位置から動かす
  private displayedHead: Point | null = null;
  private moveTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, project: (color: RgbColor) => Point) {
    this.scene = scene;
    this.project = project;
    this.lines = scene.add.graphics();
    for (let i = 0; i < MAX_DROPS; i++) {
      this.points.push(scene.add.circle(0, 0, POINT_RADIUS).setVisible(false));
    }
  }

  show(colors: readonly RgbColor[]): this {
    this.moveTween?.stop();
    this.positions = colors.map(this.project);
    const last = colors.length - 1;
    this.points.forEach((point, index) => {
      const color = colors[index];
      point.setVisible(color !== undefined);
      if (!color) return;
      const isHead = index === last;
      // 白に近い色も紙の上で見えるよう、どの点にも枠を付ける
      point
        .setRadius(isHead ? HEAD_RADIUS : POINT_RADIUS)
        .setFillStyle(toHex(color))
        .setStrokeStyle(isHead ? 2 : 1, COLORS.ink, isHead ? 0.9 : 0.4)
        .setAlpha(isHead ? 1 : Math.max(MIN_ALPHA, 1 - (last - index) * FADE_STEP))
        .setPosition(this.positions[index].x, this.positions[index].y);
    });

    const from = this.displayedHead;
    const to = this.positions[last] ?? null;
    if (!from || !to) {
      this.displayedHead = to;
      this.drawLines();
      return this;
    }
    const headPoint = this.points[last];
    this.moveHead(headPoint, from);
    this.moveTween = this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: MOVE_MS,
      ease: 'Sine.easeOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 1;
        this.moveHead(headPoint, { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
      },
      onComplete: () => this.moveHead(headPoint, to),
    });
    return this;
  }

  private moveHead(headPoint: Phaser.GameObjects.Arc, position: Point): void {
    this.displayedHead = position;
    headPoint.setPosition(position.x, position.y);
    this.drawLines();
  }

  private drawLines(): void {
    this.lines.clear();
    const visible = this.points.filter((point) => point.visible);
    if (visible.length < 2) return;
    this.lines.lineStyle(1.5, COLORS.ink, 0.35);
    this.lines.beginPath();
    this.lines.moveTo(visible[0].x, visible[0].y);
    for (const point of visible.slice(1)) {
      this.lines.lineTo(point.x, point.y);
    }
    this.lines.strokePath();
  }
}
