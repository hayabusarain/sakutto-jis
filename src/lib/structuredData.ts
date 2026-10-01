/**
 * 検索エンジン向けの構造化データ（JSON-LD、schema.org）。
 * 事前レンダリング（scripts/prerender.mjs）で各ページの <head> に書き出す。
 * URL は絶対URLが必要なので、公開URL（SITE.url）が決まっていないときは何も出さない。
 */

/** パンくずの1段 */
export interface Crumb {
  label: string
  /** サイト内のパス（例: /flange-bolt-length） */
  path: string
}

/** home: トップ / tool: 計算ツール / page: 寸法表・まとめ・規約などの文章のページ */
export type PageKind = 'home' | 'tool' | 'page'

export interface StructuredPage {
  path: string
  kind: PageKind
  /** ページの名前（見出しに相当） */
  name: string
  description: string
  /** ホームからこのページまで（ホームを含む） */
  breadcrumb: readonly Crumb[]
  /** 最終更新日（YYYY-MM-DD） */
  updatedAt: string
  /** 典拠の規格（例: 「JIS B 2220:2012 鋼製管フランジ」） */
  citations?: readonly string[]
}

export interface StructuredSite {
  name: string
  tagline: string
  description: string
  /** 公開URL（末尾スラッシュなし）。空なら構造化データを出さない */
  url: string
  /** 運営者（公開前の仮の値のときは null） */
  publisher: { type: 'Person' | 'Organization'; name: string; sameAs: readonly string[] } | null
}

type JsonLd = Record<string, unknown>

/** サイト内のパスを絶対URLにする（トップは末尾スラッシュ付き） */
export function absoluteUrl(siteUrl: string, path: string): string {
  return siteUrl + (path === '/' ? '/' : path)
}

export function breadcrumbList(siteUrl: string, crumbs: readonly Crumb[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      item: absoluteUrl(siteUrl, crumb.path),
    })),
  }
}

/**
 * ページの構造化データ（@graph にまとめた1つのオブジェクト）。公開URLが無いときは null。
 * - トップ: WebSite（サイト名・運営者）
 * - ツール: WebApplication（無料の計算ツール）＋ BreadcrumbList
 * - そのほか: WebPage ＋ BreadcrumbList
 */
export function structuredData(page: StructuredPage, site: StructuredSite): JsonLd | null {
  if (!site.url) return null
  const url = absoluteUrl(site.url, page.path)
  const websiteId = `${site.url}/#website`
  const publisherId = `${site.url}/#publisher`
  const graph: JsonLd[] = []

  if (page.kind === 'home') {
    graph.push({
      '@type': 'WebSite',
      '@id': websiteId,
      name: site.name,
      alternateName: `${site.name} ${site.tagline}`,
      url,
      description: site.description,
      inLanguage: 'ja',
      ...(site.publisher ? { publisher: { '@id': publisherId } } : {}),
    })
    if (site.publisher) {
      graph.push({
        '@type': site.publisher.type,
        '@id': publisherId,
        name: site.publisher.name,
        url: absoluteUrl(site.url, '/about'),
        ...(site.publisher.sameAs.length > 0 ? { sameAs: [...site.publisher.sameAs] } : {}),
      })
    }
    return { '@context': 'https://schema.org', '@graph': graph }
  }

  const common = {
    name: page.name,
    description: page.description,
    url,
    inLanguage: 'ja',
    dateModified: page.updatedAt,
    isPartOf: { '@id': websiteId },
    ...(page.citations && page.citations.length > 0 ? { citation: [...page.citations] } : {}),
  }

  graph.push(
    page.kind === 'tool'
      ? {
          '@type': 'WebApplication',
          ...common,
          applicationCategory: 'UtilitiesApplication',
          operatingSystem: 'Any',
          browserRequirements: 'JavaScript が使えるブラウザ',
          isAccessibleForFree: true,
          offers: { '@type': 'Offer', price: 0, priceCurrency: 'JPY' },
        }
      : { '@type': 'WebPage', ...common },
  )
  if (page.breadcrumb.length > 1) graph.push(breadcrumbList(site.url, page.breadcrumb))

  return { '@context': 'https://schema.org', '@graph': graph }
}

/**
 * <script type="application/ld+json"> の中身にする文字列。
 * </script> などで HTML が壊れないよう、< > & を \u 形式にする（JSON としては同じ値）。
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
