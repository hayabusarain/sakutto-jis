/**
 * アクセス解析（Google アナリティクス 4）。環境変数 VITE_GA_ID（G-XXXXXXXXXX）を設定したときだけ動く。
 * 読み込みのタグは scripts/prerender.mjs が各ページの <head> に入れ、ここからはイベントを送るだけ。
 *
 * - ページの表示は自分で送る（gtag の config で send_page_view: false）。ツールは入力のたびに URL の ?以降を
 *   書き換えるので、GA4 の「拡張計測機能」の「ブラウザの履歴イベントに基づくページの変更」は管理画面でオフにする
 * - 送る URL は ? 以降を含めない（入力の条件ごとに別のページとして数えないため）
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/** G-XXXXXXXXXX の形だけを受け付ける（違えば空文字＝計測しない） */
export function normalizeGaId(value: unknown): string {
  const text = String(value ?? '').trim()
  return /^G-[A-Z0-9]{4,16}$/.test(text) ? text : ''
}

function send(...args: unknown[]) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  try {
    window.gtag(...args)
  } catch {
    // 計測の失敗で画面の動きを止めない
  }
}

/** ページの表示（初回の表示と、画面内でページを切り替えたとき） */
export function trackPageView(path: string, title: string) {
  send('event', 'page_view', {
    page_location: `${window.location.origin}${path}`,
    page_path: path,
    page_title: title,
  })
}

/** 計測するイベント（どのツールのどの機能が使われているか） */
export type AnalyticsEvent = 'copy_result' | 'copy_table' | 'download_csv' | 'download_dxf' | 'share' | 'print'

export function trackEvent(name: AnalyticsEvent, params: Record<string, string | number> = {}) {
  send('event', name, { page_path: typeof window === 'undefined' ? '' : window.location.pathname, ...params })
}
