import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'
import { findPage } from './routes'
import { normalizePath } from './router/context'
import { trackEvent } from './lib/analytics'
import { markOfflineReady } from './lib/offlineReady'
import { markUpdateAvailable } from './router/history'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App initialPath={window.location.pathname} />
  </StrictMode>
)

// 本番は事前レンダリング済みのHTMLに処理を結びつけ、開発時は空の状態から描画する。
// ただし 404.html が別のページの URL で表示されたとき（オフラインで /tap-drill/ を開いたときなど）は、
// HTML の中身が違うので結びつけずに描き直す
const isNotFoundHtml = container.hasAttribute('data-not-found')
if (container.firstElementChild && !(isNotFoundHtml && findPage(normalizePath(window.location.pathname)))) {
  hydrateRoot(container, app)
} else {
  container.replaceChildren()
  createRoot(container).render(app)
}

// 印刷するときは「計算ロジック」などの開閉式の欄をすべて開いておく
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('details').forEach((details) => {
    details.open = true
  })
  trackEvent('print')
})

/** 開いたままのページで、新しい版が公開されていないかを確かめる間隔 */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

// オフラインでも使えるよう、本番だけ Service Worker を登録する（生成は scripts/prerender.mjs）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const serviceWorker = navigator.serviceWorker

  // 新しい版の Service Worker に切り替わったら知らせ、次の画面切り替えでページを読み直す（RouterProvider）。
  // 初めて入れたとき（それまで Service Worker が無かった）は、表示中のページと版が同じなので知らせない
  let controlled = serviceWorker.controller !== null
  serviceWorker.addEventListener('controllerchange', () => {
    if (controlled) markUpdateAvailable()
    controlled = true
  })

  window.addEventListener('load', () => {
    serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // 初めて入れたときは、全ページのキャッシュが終わった時点で「オフラインでも使える」と一度だけ知らせる
        if (!controlled) {
          serviceWorker.ready
            .then(() => markOfflineReady())
            .catch(() => {
              // 知らせられなくても、オフライン対応そのものには影響しない
            })
        }
        // スマホでタブやホーム画面のアプリを開いたままにしていても、戻ってきたときに新しい版を確かめる（1時間に1回まで）
        let lastCheck = Date.now()
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState !== 'visible' || Date.now() - lastCheck < UPDATE_CHECK_INTERVAL_MS) return
          lastCheck = Date.now()
          registration.update().catch(() => {
            // オフラインなど。次に開いたときにまた確かめる
          })
        })
      })
      .catch(() => {
        // 登録できなくても、オンラインでは普通に使える
      })
  })
}
