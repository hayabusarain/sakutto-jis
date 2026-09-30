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
