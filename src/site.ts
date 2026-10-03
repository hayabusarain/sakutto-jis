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
   * （例: https://sakutto-jis.com）。未設定なら canonical・sitemap・og:image・構造化データは出力しない。
   */
  url: (import.meta.env.VITE_SITE_URL ?? '').replace(/\/+$/, ''),
  startYear: 2026,
  operator: {
    name: 'サクッとJIS 運営者（仮）',
    email: 'contact@example.com（仮）',
    location: '日本',
    /** 構造化データでの運営者の種類（個人なら Person、会社・団体なら Organization） */
    type: 'Person' as 'Person' | 'Organization',
    /**
     * 運営者（作成者）の経歴・資格・実務年数など。運営者情報と編集方針のページに表示する。
     * 例: 「機械設計（産業機械）の実務15年。機械設計技術者2級。」空文字なら表示しない。
     */
    profile: '経歴・資格・実務年数などを記入してください（仮）' as string,
    /** 運営者の他のサイト・SNS のURL（構造化データの sameAs にも使う）。無ければ空のまま */
    sameAs: [] as readonly string[],
    /** お問い合わせフォームのURL。空ならメールアドレスだけを案内する */
    contactUrl: '' as string,
  },
  /** プライバシーポリシー・免責事項の制定日 */
  policyDate: '2026年9月30日',
  /**
   * 掲載データを最後に見直した日（YYYY-MM-DD）。sitemap.xml の lastmod と構造化データの dateModified に使う。
   * 数値や説明を直したら更新する（ページごとに変えるときは PAGE_UPDATED_AT に書く）。
   */
  contentUpdatedAt: '2026-10-03',
  /**
   * Google AdSense のサイト運営者ID（環境変数 VITE_ADSENSE_CLIENT、例: ca-pub-1234567890123456）。
   * 設定すると、審査用の meta・広告のスクリプト・ads.txt を出力し、AdSlot が広告枠を表示する。
   */
  adsenseClient: normalizeAdsenseClient(import.meta.env.VITE_ADSENSE_CLIENT),
  /** Google Search Console の所有権確認コード（環境変数 VITE_GSC_VERIFICATION。meta タグの content の値） */
  gscVerification: String(import.meta.env.VITE_GSC_VERIFICATION ?? '').trim(),
} as const

/** ページごとの最終更新日（YYYY-MM-DD）。書いていないページは SITE.contentUpdatedAt */
export const PAGE_UPDATED_AT: Readonly<Record<string, string>> = {
  '/privacy': '2026-10-01',
}

/** 掲載データの見直しの記録（新しい順）。編集方針のページに表示する */
export const SITE_CHANGELOG: readonly { date: string; text: string }[] = [
  {
    date: '2026-10-03',
    text: '各ツールの JIS の数値を、規格票の原文とすべて照合しました。一致を確かめたフランジ（JIS B 2220）・ボルト穴径とざぐり径（JIS B 1001）・旧JIS の M3 の二面幅の「※」と、Oリング（JIS B 2401-1・-2）・普通公差（JIS B 0405）の「未照合」の注記を外しました。規格にあるのに載せていなかった 16K・20K の 90A のフランジと、Rc 2½〜6 の有効ねじ部の長さを追加し、数値の近くの典拠に表番号（例: JIS B 2220 表15）を表示しました。JIS B 1176 の年版を 2015（2014年版＋追補1）に改め、鋼管（JIS G 3452・G 3454）には 2026年版が発行されたこと（値は 2019年版と照合）を注記しました。',
  },
  {
    date: '2026-10-01',
    text: '規格原文で未確認の値の「※」を、クイック検索・寸法表・ねじのまとめページにもそろえて付けました。Oリングの E（溝の振れ）の説明、バックアップリングの目安の表、数値の出どころ（旧 JIS B 2406:1991）の注記、普通公差の確認状況の注記を加え、数値入力のカンマ（1,200 など）の読み方を全ツールでそろえました。',
  },
  { date: '2026-09-30', text: '編集方針・データの確認方法のページを公開しました。' },
]

/** 誤記報告の受付先。Googleフォーム等を用意したらURLを入れる（空なら運営者情報の連絡先へ案内） */
export const REPORT_URL = ''

export const SITE_PAGES = [
  { path: '/about', label: '運営者情報' },
  { path: '/editorial-policy', label: '編集方針・データの確認方法' },
  { path: '/privacy', label: 'プライバシーポリシー' },
  { path: '/disclaimer', label: '免責事項' },
] as const

/** 「（仮）」や example.com のままの、公開前に差し替えるべき値か */
export function isPlaceholder(text: string): boolean {
  return /（仮）|\(仮\)|example\.(com|jp|org)/.test(text)
}

/**
 * AdSense のサイト運営者IDを「ca-pub-数字」の形にそろえる。「pub-数字」でもよい。
 * 形式が違う・未設定なら空文字（広告関係のタグを出さない）。
 */
export function normalizeAdsenseClient(value: unknown): string {
  const text = String(value ?? '').trim()
  const match = /^(?:ca-)?pub-(\d{10,20})$/.exec(text)
  return match ? `ca-pub-${match[1]}` : ''
}
