# サクッとJIS

機械設計・配管の現場で使うJIS規格の計算と寸法確認を、スマホからすぐに行える無料Webツールです。

| カテゴリ | ツール | URL | 主な参照規格 |
| --- | --- | --- | --- |
| 配管 | JISフランジ＆ボルト長さ（DXF出力つき） | `/flange-bolt-length` | JIS B 2220, B 1180, B 1181, B 1256 |
| 配管 | 鋼管の寸法・重量（SGP・Sch40・Sch80） | `/steel-pipe` | JIS G 3452, G 3454 |
| 配管 | 管用ねじ（R・Rc・Rp・G）寸法と下穴径 | `/pipe-thread` | JIS B 0203, B 0202 |
| ねじ・締結 | ねじ下穴径（メートル並目・細目） | `/tap-drill` | JIS B 0205, B 0209, B 1004, ISO 2306 |
| ねじ・締結 | ボルト・ナットの二面幅と座ぐり寸法 | `/bolt-size` | JIS B 1180, B 1181, B 1176, B 1001 |
| ねじ・締結 | ねじの判別（実測の径・ピッチから） | `/thread-identify` | JIS B 0205, B 0209, B 0203, B 0202 |
| シール | Oリング・Oリング溝寸法（DXF出力つき） | `/o-ring` | JIS B 2401-1, B 2401-2（数値は旧 JIS B 2406:1991 の表） |
| 設計・換算 | 普通公差 | `/general-tolerance` | JIS B 0405 |
| 設計・換算 | 単位換算（圧力・トルク・力・長さ・温度） | `/unit-convert` | 定義値（g = 9.80665 など） |

ツールのほかに、次のページがあります。

| ページ | URL | 内容 |
| --- | --- | --- |
| 横断検索 | トップと、ヘッダーの検索ボタン（`/` か Ctrl/⌘+K） | `M12`・`50A`・`10K 50A`・`P20`・`Rc1/2`・`二面幅17` などと入れると、関係する寸法をまとめて表示 |
| 寸法表 | `/flange-bolt-length/10k`・`/steel-pipe/sgp`・`/o-ring/p` など（9ページ） | 計算せずに一覧で見たいとき用。表はツールのデータから自動で作る |
| ねじ寸法まとめ | `/screw`・`/screw/m3`〜`/screw/m36` | 下穴・二面幅・六角レンチ・ボルト穴・座ぐり・ナット高さ・使うフランジを1ページに |
| 編集方針 | `/editorial-policy` | データの作り方・確認方法・確度・未確認の項目・訂正の方針 |

どのツールにも、次のものを付けています。

- 数値の近くに、根拠にしたJISの番号と年版を表示
- 「計算ロジック」を開くと、式と、いま選んでいる値を入れた計算例を表示
- 「結果をコピー」で、LINEやメモに貼りやすい文章をコピー
- 前回の入力を端末に保存（計算はブラウザの中で行う）。条件は URL にも入るので、そのまま共有・ブックマークできる
- 数値の入力欄は全角数字とカンマに対応。カンマの読み方は全ツール共通で、`1,200` は3桁区切り、`0,125`・`12,5` は小数点（`src/lib/format.ts`）。普通公差・単位換算・Oリングでは、カンマを含む入力をどう読んだかを入力欄の下に表示（`commaNote`）
- オフライン対応（PWA）：一度開けば電波の届かない現場でも使える。ホーム画面に追加も可能
- 文字サイズの切り替え（ヘッダー右上）

## 技術スタック

| 用途 | 採用技術 | 理由 |
| --- | --- | --- |
| ビルド | Vite 8 | 速い。静的ファイルとして出力でき、サーバー不要 |
| UI | React 19 + TypeScript | 寸法表・計算式を型で守れる |
| スタイル | Tailwind CSS v4 | スマホ対応が書きやすい。グレー×白の工業系デザイン |
| アイコン・フォント | lucide-react / JetBrains Mono（自前配信） | 軽い。外部フォント配信を使わない |
| ページ生成 | 自作の事前レンダリング（`scripts/prerender.mjs`） | ページごとに静的HTML・タイトル・説明文を出力し、検索エンジンやAdSenseの審査に強くする |
| オフライン | Workbox（Service Worker を事前レンダリング後に生成） | 全ページ・アセットを端末にキャッシュ |
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
   - 未設定の場合、canonical・`sitemap.xml`・og:image・構造化データ（JSON-LD）は出力されません（誤ったURLを検索エンジンに伝えないため）
   - 設定してビルドしたとき、運営者情報が「（仮）」のままだと警告が出ます（ビルドは止まりません）

`wrangler.jsonc` で、`/tap-drill` → `tap-drill.html`、存在しないURL → `404.html`（ステータス404）になります。main 以外のブランチに push すると、プレビュー用のURLが自動で作られます。

AdSense で収益化する場合は、独自ドメインを取って Cloudflare に追加しておくのがおすすめです。

### Google AdSense・Search Console

| 環境変数 | 内容 |
| --- | --- |
| `VITE_ADSENSE_CLIENT` | AdSense のサイト運営者ID（`ca-pub-…`。`pub-…` でも可）。設定すると、審査用の meta タグ、広告のスクリプト（ツール・寸法表などのページだけ。運営者情報・プライバシーポリシー・免責事項・編集方針・404 には出さない）、`dist/ads.txt` を出力する。形式が違う値は警告を出して無視する |
| `VITE_GSC_VERIFICATION` | Search Console の所有権確認コード（`google-site-verification` の meta タグの content の値） |

- 広告枠の部品 `src/components/ui/AdSlot.tsx` を用意しています（環境変数と枠のIDが無いと何も表示しない）。まだどのページにも置いていません
- 自動広告を使う場合は、上部に固定される「アンカー広告」をオフにしてください（上部に固定しているツールの切り替えバーと重なるため）
- EEA・英国向けの同意メッセージは、AdSense の「プライバシーとメッセージ」で設定します

## 公開前に差し替える設定

| 場所 | 内容 |
| --- | --- |
| `src/site.ts` の `operator` | 運営者名・連絡先（現在は仮の値）。`profile`（経歴・資格・実務年数。運営者情報と編集方針に表示）、`sameAs`（他のサイト・SNS）、`contactUrl`（問い合わせフォーム）、`type`（個人なら Person、会社なら Organization） |
| `src/site.ts` の `REPORT_URL` | 誤記報告フォーム（Googleフォーム等）のURL。空なら運営者情報の連絡先へ案内 |
| `src/site.ts` の `contentUpdatedAt`・`PAGE_UPDATED_AT`・`SITE_CHANGELOG` | データを直したら更新する（sitemap の lastmod・構造化データ・編集方針のページの更新履歴に使う） |
| 環境変数 `VITE_SITE_URL` | 公開URL（canonical・sitemap・og:image・構造化データに使用） |
| 環境変数 `VITE_ADSENSE_CLIENT`・`VITE_GSC_VERIFICATION` | 上の「Google AdSense・Search Console」を参照 |

編集方針のページ（`/editorial-policy`）には「調査とコードの作成に AI（Claude）を使った」旨を書いています。運営者として問題ないか確認してください。

### 共有時のプレビュー画像

`public/og-image.png`（1200×630）は `scripts/og-image.svg` から `node scripts/og-image.mjs [フォントのCSS]` で書き出したものです。図を直したときだけ手元で実行してコミットします（ビルドでは実行しません）。

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
├── pages/                   トップ・運営者情報・編集方針・プライバシーポリシー・免責事項・404
│   ├── tables/              寸法表のページ（フランジ・鋼管・Oリング）
│   └── screws/              ねじ寸法まとめのページ（/screw/m12 など）
├── components/search/       横断検索の結果表示（解析は lib/quickSearch.ts）
├── router/                  最小限のルーター
├── hooks/                   入力の保存（usePersistentState）と URL との同期（useToolState）
└── lib/                     数値の書式・DXF出力・ダウンロード・横断検索・構造化データ
scripts/prerender.mjs        ビルド後に全ページのHTML・sitemap・robots.txt・ads.txt・Service Worker を書き出す
scripts/og-image.mjs         共有時のプレビュー画像を書き出す（手元で実行）
public/                      ファビコン・アプリアイコン・manifest.webmanifest
```

### ツールを追加するには

1. `src/features/<ツール名>/` に `data.ts`・`calc.ts`・テスト・画面を作る
2. `src/tools/registry.ts` の `TOOLS` に追加する（ナビ・トップページ・フッター・ページ生成に自動で反映）
3. 使う規格が `src/standards.ts` に無ければ追加する

## 今後の構想

- CADデータ: フランジの 3D（STEP）
- はめあい（JIS B 0401）の公差
- 規格原文での確認が済んだ値から、※ 印を外していく（`docs/data-verification.md`）
