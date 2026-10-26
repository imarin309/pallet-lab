# Palette Lab

Phaser 4 + TypeScript + Vite の調色パズル。仕様は `docs/` を参照（`implementation-decisions.md` は正解レシピを含む）。

## コマンド

- `pnpm test` / `pnpm lint` / `pnpm typecheck` / `pnpm build`（型チェック込み） / `pnpm dev`
- 変更後は test・lint・build を通す（CI は test・lint を実行し、build は Cloudflare のデプロイで走る）

## 構成の決まり

- `src/domain/` は Phaser に依存させない（純粋関数。Vitest でブラウザなしにテストする）
- Scene は入力を受けて domain の関数で状態を更新し、描画と演出だけを行う
- 状態は押した瞬間に確定させ、Tween は表示を追いつかせるだけにする（採点の色と表示をずらさない）
- お題の色は正解レシピを `mixColor` に通して作る。RGB を手書きしない

## 間違えやすい点

- Phaser は v4。v3 の記事や API は使えないことがある。`node_modules/phaser/skills/` を先に読む
- 座標は 480×800 の論理座標で書く（canvas は2倍で、カメラのズームで合わせている）。テキストは `textStyle()` を使う
- Scene は使い回されるので、状態は `init()` で必ず初期化する
- import には `.ts` 拡張子を付け、TS のパラメータプロパティは使わない（Node の型除去で `scripts/` を実行するため）
- ヒントに「〜を足す」のような処方を書かない（テストで検査している）
- `tests/scenes.test.ts` はボタンをラベルの文字で探して押す。ラベルを変えたらテストも直す
- `public/_headers` の CSP を変えたら、ヘッダー付きで `dist/` を配信して動作を確認する

## 判断の記録

- 仕様と違う判断や、仮で決めたことは `docs/implementation-decisions.md` に追記する
