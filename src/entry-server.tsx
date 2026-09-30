import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { findPage, NOT_FOUND_PAGE, PAGES } from './routes'
import { SITE } from './site'

/** 事前レンダリングするパス。404ページは別途 /404 として書き出す */
export const paths = PAGES.map((page) => page.path)

export { SITE }

export function render(path: string) {
  const page = findPage(path)
  const html = renderToString(
    <StrictMode>
      <App initialPath={path} />
    </StrictMode>,
  )
  return {
    html,
    title: page?.title ?? NOT_FOUND_PAGE.title,
    description: page?.description ?? NOT_FOUND_PAGE.description,
    found: page !== undefined,
  }
}
