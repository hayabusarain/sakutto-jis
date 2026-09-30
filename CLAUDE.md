# サクッとJIS 開発メモ

機械設計・配管の現場向けに、JIS規格の寸法確認と計算をスマホで行う静的サイト。利用者は日本の現場作業者と機械設計者。

## コマンド

```bash
npm run dev      # 開発サーバー http://localhost:5173
npm test         # Vitest（計算・データの整合性）
npx tsc -b       # 型チェック
npm run lint     # oxlint
npm run build    # 型チェック → ビルド → 全ページを静的HTMLに書き出し（scripts/prerender.mjs）
```

コミット前に `npx tsc -b && npm run lint && npm test && npm run build` がすべて通ること。

## 構成

- `src/tools/registry.ts` … ツールの登録（パス・名前・SEOタイトル・説明・カテゴリ・参照規格・画面・解説）。ここに足すとナビ・トップ・フッター・ページ生成に反映される
- `src/features/<ツール>/` … `data.ts`（規格の寸法）・`calc.ts`（純粋関数）・`*.test.ts`・`*Tool.tsx`（画面）・`Guide.tsx`（解説・よくある質問）
- `src/components/ui/` … 共通部品
  - `Card`（`index`="01" の番号付き見出し、`aside` にボタン、`id` を付けられる）
  - `SelectField`（`stepper` で前後ボタン、`quickPicks` でよく使う値のボタン）、`NumberField`（`error`・`warning`・`fix`）、`SegmentedControl`
  - `PrimaryResult`（暗いパネルの主結果）、`ResultItem`
  - `DataTable`（`onRowClick`・`isHighlighted`・`maxHeightClass`）、`TableExport`（表を Excel 用にコピー・CSV 保存）
  - `CopyButton`（結果の文章＋URL をコピー）、`ShareButton`
  - `FormulaInfo`・`Formula`・`FormulaLegend`（「計算ロジック」の開閉欄）
  - `StickyResult`（スマホで結果カードが画面外のとき、画面下に答えを出すバー。`targetId` に結果カードの id）
- `src/components/` … `Citation`（数値の近くに典拠のJISを表示）、`SourceNote`、`RelatedLinks`（条件付きで関連ツールへ）、`Guide`（`GuideSection`・`Faq`）
- `src/hooks/useToolState.ts` … ツールの入力。localStorage に保存し、URL のクエリと同期する（既定値と違う項目だけ）。`normalize` で URL の一部指定を整える
- `src/lib/query.ts` の `toolHref(path, params)` … 条件付きリンク。キー名は各ツールの `DEFAULT_INPUT` と同じ
- `src/standards.ts` … 表示する規格の番号・年版・名称
- ルーターは自作（`src/router`）。サイト内リンクは `Link` を使う

## 守ること

- **数値の正確さが最優先**。規格の値をでっち上げない。データは既存の `data.ts` か、定義どおりの式（例: 1 in = 25.4 mm、1 kgf = 9.80665 N）から計算する。確認できない値は載せないか、画面と `docs/data-verification.md` に「未確認」と明記する
- 値を画面に出すときは、近くに `Citation` で典拠を示し、計算は `FormulaInfo` で式と今の値を入れた計算例を見せる
- 計算は `calc.ts` の純粋関数にしてテストを書く（境界・丸め・既知の値）。浮動小数の丸めに注意（μm 整数で計算する、比較に 1e-9 の余裕を持たせるなど）
- 画面の文章は日本語で、現場の人に伝わる言葉にする。断定しすぎない（メーカー推奨値が別にあるものは「目安」）
- スマホ幅 320px で横スクロールを出さない。タップできる部品は高さ 40px 以上
- 事前レンダリングと食い違わないよう、描画中に `window`・`localStorage` を読まない（effect や `useSyncExternalStore` で）
- 既存のデザイン（グレー×白、アクセントはオレンジ、数値は `num` クラスの等幅）に合わせる
