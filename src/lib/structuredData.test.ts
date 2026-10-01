import { describe, expect, it } from 'vitest'
import { PAGES } from '../routes'
import {
  absoluteUrl,
  breadcrumbList,
  serializeJsonLd,
  structuredData,
  type StructuredPage,
  type StructuredSite,
} from './structuredData'

const site: StructuredSite = {
  name: 'サクッとJIS',
  tagline: '機械設計・配管計算ツール',
  description: '説明',
  url: 'https://example.test',
  publisher: { type: 'Person', name: '山田太郎', sameAs: ['https://x.example/yamada'] },
}

const toolPage: StructuredPage = {
  path: '/tap-drill',
  kind: 'tool',
  name: 'ねじ下穴径',
  description: '下穴径を求めます',
  breadcrumb: [
    { label: 'ホーム', path: '/' },
    { label: 'ねじ下穴径', path: '/tap-drill' },
  ],
  updatedAt: '2026-09-30',
  citations: ['JIS B 1004:2009 ねじ下穴径'],
}

type Graph = { '@context': string; '@graph': Record<string, unknown>[] }

const graphOf = (data: Record<string, unknown> | null) => (data as Graph)['@graph']
const byType = (data: Record<string, unknown> | null, type: string) =>
  graphOf(data).find((item) => item['@type'] === type)

describe('absoluteUrl', () => {
  it('トップは末尾スラッシュ付き、そのほかはパスをつなげる', () => {
    expect(absoluteUrl('https://example.test', '/')).toBe('https://example.test/')
    expect(absoluteUrl('https://example.test', '/screw/m12')).toBe('https://example.test/screw/m12')
  })
})

describe('structuredData', () => {
  it('公開URLが無いときは出さない', () => {
    expect(structuredData(toolPage, { ...site, url: '' })).toBeNull()
  })

  it('トップは WebSite と運営者', () => {
    const data = structuredData({ ...toolPage, path: '/', kind: 'home', breadcrumb: [{ label: 'ホーム', path: '/' }] }, site)
    expect(data?.['@context']).toBe('https://schema.org')
    const website = byType(data, 'WebSite')
    expect(website).toMatchObject({ name: 'サクッとJIS', url: 'https://example.test/', inLanguage: 'ja' })
    expect(website?.publisher).toEqual({ '@id': 'https://example.test/#publisher' })
    expect(byType(data, 'Person')).toMatchObject({
      '@id': 'https://example.test/#publisher',
      name: '山田太郎',
      sameAs: ['https://x.example/yamada'],
    })
    expect(byType(data, 'BreadcrumbList')).toBeUndefined()
  })

  it('運営者が仮のとき（publisher: null）は運営者を出さない', () => {
    const data = structuredData({ ...toolPage, path: '/', kind: 'home' }, { ...site, publisher: null })
    expect(byType(data, 'WebSite')?.publisher).toBeUndefined()
    expect(graphOf(data)).toHaveLength(1)
  })

  it('ツールは無料の WebApplication とパンくず', () => {
    const data = structuredData(toolPage, site)
    expect(byType(data, 'WebApplication')).toMatchObject({
      name: 'ねじ下穴径',
      url: 'https://example.test/tap-drill',
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'JPY' },
      dateModified: '2026-09-30',
      citation: ['JIS B 1004:2009 ねじ下穴径'],
      isPartOf: { '@id': 'https://example.test/#website' },
    })
    expect(byType(data, 'BreadcrumbList')).toEqual(breadcrumbList(site.url, toolPage.breadcrumb))
  })

  it('寸法表などは WebPage', () => {
    const data = structuredData({ ...toolPage, kind: 'page', citations: [] }, site)
    expect(byType(data, 'WebPage')).toBeDefined()
    expect(byType(data, 'WebPage')?.citation).toBeUndefined()
    expect(byType(data, 'WebApplication')).toBeUndefined()
  })
})

describe('serializeJsonLd', () => {
  it('</script> で HTML が壊れないよう < > & をエスケープし、JSON としては同じ値に戻る', () => {
    const data = { name: '</script><script>alert(1)</script> & co' }
    const text = serializeJsonLd(data)
    expect(text).not.toMatch(/[<>&]/)
    expect(JSON.parse(text)).toEqual(data)
  })
})

describe('全ページの構造化データ', () => {
  for (const page of PAGES) {
    it(`${page.path}: JSON として読めて、パンくずの順番が 1 から連続し、最後がそのページ`, () => {
      const data = structuredData(
        {
          path: page.path,
          kind: page.kind,
          name: page.name,
          description: page.description,
          breadcrumb: page.breadcrumb,
          updatedAt: page.updatedAt,
        },
        site,
      )
      const parsed = JSON.parse(serializeJsonLd(data!)) as Graph
      expect(parsed['@graph'].length).toBeGreaterThan(0)
      expect(page.breadcrumb[0].path).toBe('/')
      expect(page.breadcrumb[page.breadcrumb.length - 1].path).toBe(page.path)
      const list = parsed['@graph'].find((item) => item['@type'] === 'BreadcrumbList')
      if (page.path === '/') {
        expect(list).toBeUndefined()
        return
      }
      const items = (list as { itemListElement: { position: number; item: string }[] }).itemListElement
      expect(items.map((item) => item.position)).toEqual(items.map((_, index) => index + 1))
      expect(items[items.length - 1].item).toBe(absoluteUrl(site.url, page.path))
      expect(page.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  }
})
