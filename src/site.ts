/**
 * サイト全体の設定。運営者情報など「（仮）」の項目は、公開前に実際の情報へ差し替える。
 */
export const SITE = {
  name: 'サクッとJIS',
  tagline: '機械設計・配管計算ツール',
  description:
    'ねじ下穴径、JISフランジのボルト長さ、Oリング溝、鋼管寸法、管用ねじなど、機械設計・配管の現場で使うJIS規格の計算と寸法確認をスマホでサクッと行える無料Webツールです。',
  /**
   * 本番のURL（末尾スラッシュなし）。ビルド時の環境変数 VITE_SITE_URL で指定する
   * （例: https://sakutto-jis.com）。未設定なら canonical・sitemap は出力しない。
   */
  url: (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, ''),
  startYear: 2026,
  operator: {
    name: 'サクッとJIS 運営者（仮）',
    email: 'contact@example.com（仮）',
    location: '日本',
  },
  /** プライバシーポリシー・免責事項の制定日 */
  policyDate: '2026年9月30日',
} as const

/** 誤記報告の受付先。Googleフォーム等を用意したらURLを入れる（空なら運営者情報の連絡先へ案内） */
export const REPORT_URL = ''

export const SITE_PAGES = [
  { path: '/about', label: '運営者情報' },
  { path: '/privacy', label: 'プライバシーポリシー' },
  { path: '/disclaimer', label: '免責事項' },
] as const
