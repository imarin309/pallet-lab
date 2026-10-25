# Palette Lab

限られた塗料を混ぜて理想の色に近づける、引き際が重要な調色パズルゲーム（v0.1 プロトタイプ）。

## 遊び方

1. タイトル画面で「スタート」を押す。
2. お題の色を見ながら、絵の具の基本12色（赤・橙・黄・黄緑・緑・水色・青・紫・茶・黄土色・白・黒）を押して1滴ずつ混ぜる。
3. 1ステージで使えるのは **8滴まで**。直前の1滴を戻せるのは **1回だけ**。
4. 1滴以上混ぜたら、いつでも「完成！」で採点できる。
5. 色の近さが 0〜100点で採点され、星ランクとヒントが表示される。
6. 「もう一度」で同じお題に再挑戦、「次のステージ」で次のお題へ。全5ステージ。

「もう1滴足せば近づくかも。でも、今の色を壊すかも」という判断を楽しむゲームです。

## 技術スタック・動作環境

| 項目 | 内容 |
| --- | --- |
| ゲームフレームワーク | Phaser 4.2.1 |
| 言語 | TypeScript 7.0.2（strict） |
| ビルド | Vite 8.3.5 |
| テスト | Vitest 5.0.5 |
| 開発環境 | Node.js 24 以上（比較スクリプトが Node の型除去機能を使うため）、pnpm 10 |
| 動作ブラウザ | WebGL が使えるモダンブラウザ（PC・スマートフォン） |

バックエンド・DB・外部画像アセットは使っていません。Cloudflare Workers の静的アセット配信で公開します（`wrangler.jsonc`）。セキュリティヘッダーは `public/_headers` に書いてあり、ビルド時に `dist/` へコピーされます。

## セットアップとコマンド

```sh
pnpm install         # 依存のインストール（pnpm-lock.yaml でバージョン固定）
pnpm dev             # 開発サーバー（http://localhost:5173）
pnpm test            # ユニットテスト
pnpm typecheck       # 型チェック（src・tests と scripts の両方）
pnpm build           # 型チェック後に本番ビルド（dist/ に出力）
pnpm preview         # ビルド結果のプレビュー
pnpm preview:worker  # 本番と同じ Workers の配信で確認（_headers のヘッダーも付く）
pnpm deploy:worker   # 手元から Cloudflare Workers へデプロイ（要 wrangler login）
```

## デプロイ

`main` に push すると、Cloudflare の Workers Builds が自動でビルドしてデプロイします。Cloudflare 側の設定は次のとおりです。

| 項目 | 値 |
| --- | --- |
| ビルドコマンド | `pnpm run build` |
| デプロイコマンド | `pnpm exec wrangler deploy` |
| 環境変数 | `NODE_VERSION=24` |

混色方式の比較スクリプト（開発用）：

```sh
node scripts/compareMixing.ts            # 比較結果をコンソールに出力
node scripts/compareMixing.ts out.html   # 色見本のHTMLも書き出す
```

## ディレクトリ構成

```text
├── index.html
├── src/
│   ├── main.ts              # Phaser の初期化・スケール設定
│   ├── scenes/
│   │   ├── TitleScene.ts    # タイトル・ルール説明・スタート
│   │   ├── GameScene.ts     # お題と現在色の比較、塗料の追加、取り消し、完成、滴の演出
│   │   └── ResultScene.ts   # 色の比較、スコア演出、ランク・ヒント・自己ベスト、再挑戦／次へ
│   ├── domain/              # Phaser に依存しない純粋なゲームロジック
│   │   ├── types.ts
│   │   ├── paintMixing.ts   # 混色
│   │   ├── scoring.ts       # 色差・得点・ランク・ヒント
│   │   ├── gameRules.ts     # 滴の追加・取り消し・完成の状態遷移
│   │   └── stages.ts        # 5ステージの定義
│   └── ui/
│       └── common.ts        # ボタン・文字スタイル・カメラ設定など Scene 共通の部品
├── tests/                   # ドメインロジックのユニットテスト
├── scripts/                 # 混色方式の比較スクリプト
└── docs/                    # 企画・仕様・実装判断の文書
```

Scene 間では、`GameScene` に `{ stageIndex }` を、`ResultScene` に `{ stageIndex, target, actual, score }` を明示的に渡しています。

## 混色・採点についての注意

- **混色は簡略化したモデルです。** 各色チャンネルの加重幾何平均で、減法混色（絵の具が光を吸収し合う混ざり方）をごく単純に真似ています。実際の顔料の測定値に基づくシミュレーションではありません。
- **採点は Lab 色空間の色差（CIE76）を使っています。** 人の見え方に近づけた簡易的な尺度です。
- お題の色は、正解レシピを同じ混色関数に通して作っています。どのお題も8滴以内で100点を取れます。
- 自己ベストはページを開いている間だけ保持され、再読み込みすると消えます。

方式の比較結果・根拠・限界は [実装判断の記録](./docs/implementation-decisions.md) にまとめています（正解レシピを含むので、プレイ前に読まないでください）。

## 関連文書

- [ゲームコンセプト](./docs/palette-lab-concept.md)
- [ゲーム仕様書](./docs/palette-lab-game-spec.md)
- [実装指示書](./docs/palette-lab-implementation-guide.md)
- [実装判断の記録](./docs/implementation-decisions.md)
