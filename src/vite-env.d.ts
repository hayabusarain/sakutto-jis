/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 本番のURL（例: https://sakutto-jis.com）。canonical・sitemap に使う */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
