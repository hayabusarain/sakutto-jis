/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 本番のURL（例: https://sakutto-jis.com）。canonical・sitemap に使う */
  readonly VITE_SITE_URL?: string
  /** Google AdSense のサイト運営者ID（例: ca-pub-1234567890123456） */
  readonly VITE_ADSENSE_CLIENT?: string
  /** Google Search Console の所有権確認コード（meta タグの content の値） */
  readonly VITE_GSC_VERIFICATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
