# サクッとJIS

機械設計・配管の現場で使うJIS規格の計算と寸法確認を、スマホからすぐに行える無料Webツールです。

| カテゴリ | ツール | URL | 主な参照規格 |
| --- | --- | --- | --- |
| 配管 | JISフランジ＆ボルト長さ（DXF出力つき） | `/flange-bolt-length` | JIS B 2220, B 1180, B 1181, B 1256 |
| 配管 | 鋼管の寸法・重量（SGP・Sch40・Sch80） | `/steel-pipe` | JIS G 3452, G 3454 |
| 配管 | 管用ねじ（R・Rc・Rp・G）寸法と下穴径 | `/pipe-thread` | JIS B 0203, B 0202 |
| ねじ・締結 | ねじ下穴径（メートル並目・細目） | `/tap-drill` | JIS B 0205, B 0209, B 1004, ISO 2306 |
| ねじ・締結 | ボルト・ナットの二面幅と座ぐり寸法 | `/bolt-size` | JIS B 1180, B 1181, B 1176, B 1001 |
| シール | Oリング・Oリング溝寸法 | `/o-ring` | JIS B 2401-1, B 2401-2 |

どのツールにも、次の4つを付けています。

- 数値の近くに、根拠にしたJISの番号と年版を表示
- 「計算ロジック」を開くと、式と、いま選んでいる値を入れた計算例を表示
- 「結果をコピー」で、LINEやメモに貼りやすい文章をコピー
- 前回の入力を端末に保存（サーバーには送信しない）

## 技術スタック

| 用途 | 採用技術 | 理由 |
| --- | --- | --- |
| ビルド | Vite 8 | 速い。静的ファイルとして出力でき、サーバー不要 |
| UI | React 19 + TypeScript | 寸法表・計算式を型で守れる |
| スタイル | Tailwind CSS v4 | スマホ対応が書きやすい。グレー×白の工業系デザイン |
| アイコン・フォント | lucide-react / JetBrains Mono（自前配信） | 軽い。外部フォント配信を使わない |
| ページ生成 | 自作の事前レンダリング（`scripts/prerender.mjs`） | ページごとに静的HTML・タイトル・説明文を出力し、検索エンジンやAdSenseの審査に強くする |
| テスト | Vitest | 計算ロジックとデータの整合性を自動で確認 |
| 公開 | Cloudflare Workers（静的アセット） | 無料で商用利用（広告）可・転送量無制限 |

## 開発

Node.js 22 以上が必要です（`.node-version` で 22 を指定）。

```bash
npm install
npm run dev      # 開発サーバー → http://localhost:5173
npm test         # テスト（計算ロジック・データの整合性）
npm run lint     # コードチェック
npm run build    # 本番ビルド（dist/ に全ページの HTML を書き出す）
npm run preview  # ビルド結果の確認
```

## 公開（Cloudflare）

ゲーム攻略サイトと同じ Cloudflare アカウントに、Workers（静的アセット）として追加します。

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create application** → **Import a repository** でこのリポジトリを選ぶ
2. 設定
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`（初期値のまま）
   - Worker 名: `sakutto-jis`（`wrangler.jsonc` の `name` と同じにする）
3. 環境変数（Build variables）に、公開するURLを設定する
   - `VITE_SITE_URL` = `https://（取得したドメイン）`
   - 未設定の場合、canonical と `sitemap.xml` は出力されません（誤ったURLを検索エンジンに伝えないため）

`wrangler.jsonc` で、`/tap-drill` → `tap-drill.html`、存在しないURL → `404.html`（ステータス404）になります。main 以外のブランチに push すると、プレビュー用のURLが自動で作られます。

AdSense で収益化する場合は、独自ドメインを取って Cloudflare に追加しておくのがおすすめです。

## 公開前に差し替える設定

| 場所 | 内容 |
| --- | --- |
| `src/site.ts` の `operator` | 運営者名・連絡先（現在は仮の値） |
| `src/site.ts` の `REPORT_URL` | 誤記報告フォーム（Googleフォーム等）のURL。空なら運営者情報の連絡先へ案内 |
| 環境変数 `VITE_SITE_URL` | 公開URL（canonical・sitemap に使用） |

## データの確認状況

規格の数値の出どころと確認状況は [docs/data-verification.md](docs/data-verification.md) にまとめています。公開前に、そこに挙げた項目を規格原文（[JISC の JIS 検索](https://www.jisc.go.jp/)）で確認してください。

## ディレクトリ構成

```
src/
├── App.tsx                  レイアウト（ヘッダー・ツールナビ・本文・フッター）
├── routes.ts                ページ一覧（パス・タイトル・説明文）
├── entry-server.tsx         事前レンダリング用の入口
├── site.ts                  サイト名・運営者情報などの設定
├── standards.ts             典拠として表示する規格（番号・年版・名称）
├── tools/registry.ts        ツールの登録（名前・説明・カテゴリ・参照規格・画面）
├── features/<ツール>/
│   ├── data.ts              規格の寸法データ
│   ├── calc.ts              計算（純粋関数）
│   ├── *.test.ts            テスト
│   └── *Tool.tsx            画面
├── components/              共通部品（カード・入力欄・表・典拠表示・計算ロジック表示など）
├── pages/                   トップ・運営者情報・プライバシーポリシー・免責事項・404
├── router/                  最小限のルーター
├── hooks/usePersistentState.ts  入力の保存
└── lib/                     数値の書式・DXF出力・ダウンロード
scripts/prerender.mjs        ビルド後に全ページのHTML・sitemap・robots.txtを書き出す
```

### ツールを追加するには

1. `src/features/<ツール名>/` に `data.ts`・`calc.ts`・テスト・画面を作る
2. `src/tools/registry.ts` の `TOOLS` に追加する（ナビ・トップページ・フッター・ページ生成に自動で反映）
3. 使う規格が `src/standards.ts` に無ければ追加する

## 今後の構想

- CADデータ: フランジの 3D（STEP）、Oリング溝の断面図（DXF）
- Oリングの平面溝（固定用・フランジ面）の寸法
- オフライン対応（PWA）: 電波の弱い現場でも使えるように
- 条件を URL に入れて共有できるようにする
