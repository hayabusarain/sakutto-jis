import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { serializeJsonLd, structuredData, type StructuredSite } from './lib/structuredData'
import { findPage, NOT_FOUND_PAGE, PAGES } from './routes'
import { isPlaceholder, SITE } from './site'
import { standardLabel, STANDARDS } from './standards'

/** 事前レンダリングするパス。404ページは別途 /404 として書き出す */
export const paths = PAGES.map((page) => page.path)

/** sitemap.xml 用（パスと最終更新日） */
export const sitemapEntries = PAGES.map((page) => ({ path: page.path, lastmod: page.updatedAt }))

export { SITE }

/** 公開前に差し替えるべき「（仮）」のままの設定（公開URLを設定したビルドで警告する） */
export const placeholderSettings = [
  ['運営者名（src/site.ts の operator.name）', SITE.operator.name],
  ['連絡先（src/site.ts の operator.email）', SITE.operator.email],
  ['運営者の経歴（src/site.ts の operator.profile）', SITE.operator.profile],
]
  .filter(([, value]) => isPlaceholder(value))
  .map(([label]) => label)

const structuredSite: StructuredSite = {
  name: SITE.name,
  tagline: SITE.tagline,
  description: SITE.description,
  url: SITE.url,
  publisher: isPlaceholder(SITE.operator.name)
    ? null
    : { type: SITE.operator.type, name: SITE.operator.name, sameAs: SITE.operator.sameAs },
}

export function render(path: string) {
  const page = findPage(path)
  const html = renderToString(
    <StrictMode>
      <App initialPath={path} />
    </StrictMode>,
  )
  const jsonLd = page
    ? structuredData(
        {
          path: page.path,
          kind: page.kind,
          name: page.name,
          description: page.description,
          breadcrumb: page.breadcrumb,
          updatedAt: page.updatedAt,
          citations: page.standards.map((code) => `${standardLabel(code)} ${STANDARDS[code].title}`),
        },
        structuredSite,
      )
    : null
  return {
    html,
    title: page?.title ?? NOT_FOUND_PAGE.title,
    description: page?.description ?? NOT_FOUND_PAGE.description,
    found: page !== undefined,
    /** トップは website、そのほかは article（og:type） */
    ogType: page?.kind === 'home' ? 'website' : 'article',
    /** 広告のスクリプトを読み込むページか */
    ads: page?.ads ?? false,
    /** <script type="application/ld+json"> の中身（公開URLが未設定なら null） */
    jsonLd: jsonLd ? serializeJsonLd(jsonLd) : null,
  }
}
