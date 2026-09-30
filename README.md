# サクッとJIS

機械設計・配管の現場作業者向けに、JIS規格にもとづく計算をスマホですぐに行えるWebツールです。

- JISフランジ＆ボルト長（JIS B 2220 / B 1180 / B 1181）
- ねじ下穴径（JIS B 0205 / B 1004）

> 現在は画面の骨組みだけで、入力欄と計算結果はダミーです。

## 技術スタック

| 用途 | 採用技術 | 採用理由 |
| --- | --- | --- |
| ビルド | Vite 8 | 起動・ビルドが速い。静的ファイルとして出力でき、サーバー不要で無料ホスティングに載せられる |
| UI | React 19 + TypeScript | 寸法表・計算式を型で守れる。部品化しやすい |
| スタイル | Tailwind CSS v4 | 設定ファイル不要。スマホ対応（レスポンシブ）が書きやすい |
| アイコン | lucide-react | 使うアイコンだけが取り込まれ、軽い |
| テスト | Vitest | 計算ロジックの正しさを自動で確認する（計算ツールの信頼性の要） |
| リント | oxlint | Vite 公式テンプレート標準の高速リンター |

## 使い方

Node.js 20.19 以上（22 推奨）が必要です。

```bash
npm install      # 依存パッケージのインストール
npm run dev      # 開発サーバー起動 → http://localhost:5173
npm run build    # 本番用ビルド（dist/ に出力）
npm run preview  # ビルド結果の確認
npm test         # テスト実行
npm run lint     # コードチェック
```

ツールごとにURLが分かれているので、ブックマークや共有ができます。

- `/#flange-bolt` … JISフランジ＆ボルト長
- `/#tap-drill` … ねじ下穴径

## ディレクトリ構成

```
src/
├── App.tsx                 画面全体（ヘッダー・タブ・ツール表示・フッター）
├── tools/
│   ├── ids.ts              ツールID一覧・URLハッシュの解釈
│   └── registry.ts         ツールの名前・説明・参照JIS・画面の登録
├── features/               ツールごとの画面（今後、計算ロジックもここに置く）
│   ├── flange-bolt/
│   └── tap-drill/
├── components/
│   ├── layout/             ヘッダー・フッター
│   ├── ui/                 カード・入力欄・結果表示などの共通部品
│   ├── ToolTabs.tsx        ツール切替タブ
│   └── CadDownloadCard.tsx CADダウンロード枠（準備中）
└── hooks/
    └── useActiveTool.ts    表示中のツールとURLハッシュの同期
```

### ツールを追加するには

1. `src/tools/ids.ts` の `TOOL_IDS` にIDを追加
2. `src/features/<ツール名>/` に画面を作成
3. `src/tools/registry.ts` に登録（登録漏れは型エラーで気づける）

## 今後の構想

- 計算ロジックの実装：JIS寸法表を `features/<ツール>/data.ts`、計算を純粋関数で書き、Vitest でテスト
- CADデータのダウンロード
  - DXF（2D）：計算結果の寸法からブラウザ上で生成（サーバー不要）
  - STEP（3D）：あらかじめ用意したファイルを配信するか、ブラウザで動く CAD カーネル（WebAssembly）で生成
- 検索流入（SEO）強化：ツールが増えたらツールごとの独立ページ化（事前レンダリング）を検討
