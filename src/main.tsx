import '@fontsource-variable/jetbrains-mono/wght.css'
import './index.css'
import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App initialPath={window.location.pathname} />
  </StrictMode>
)

// 本番は事前レンダリング済みのHTMLに処理を結びつけ、開発時は空の状態から描画する
if (container.firstElementChild) {
  hydrateRoot(container, app)
} else {
  createRoot(container).render(app)
}

// 印刷するときは「計算ロジック」などの開閉式の欄をすべて開いておく
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('details').forEach((details) => {
    details.open = true
  })
})

// オフラインでも使えるよう、本番だけ Service Worker を登録する（生成は scripts/prerender.mjs）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // 登録できなくても、オンラインでは普通に使える
    })
  })
}
