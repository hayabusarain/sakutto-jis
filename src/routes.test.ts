import { describe, expect, it } from 'vitest'
import { render, sitemapEntries } from './entry-server'
import { findPage, PAGES } from './routes'
import { normalizePath } from './router/context'

describe('PAGES', () => {
  it('パス・題名は重複しない', () => {
    expect(new Set(PAGES.map((page) => page.path)).size).toBe(PAGES.length)
    expect(new Set(PAGES.map((page) => page.title)).size).toBe(PAGES.length)
  })

  it('寸法表・ねじのまとめ・編集方針のページがある', () => {
    for (const path of [
      '/flange-bolt-length/10k',
      '/steel-pipe/sch80',
      '/o-ring/g',
      '/screw',
      '/screw/m3',
      '/screw/m36',
      '/editorial-policy',
    ]) {
      expect(findPage(path)?.component, path).toBeDefined()
    }
  })

  it('末尾スラッシュ・.html 付きでも同じページになる', () => {
    expect(findPage(normalizePath('/flange-bolt-length/10k/'))?.path).toBe('/flange-bolt-length/10k')
    expect(findPage(normalizePath('/screw/m12.html'))?.path).toBe('/screw/m12')
    expect(findPage('/screw/m13')).toBeUndefined()
  })

  it('広告のスクリプトは運営者情報・規約のページでは読み込まない', () => {
    expect(findPage('/about')?.ads).toBe(false)
    expect(findPage('/privacy')?.ads).toBe(false)
    expect(findPage('/screw/m12')?.ads).toBe(true)
  })

  it('sitemap の lastmod はビルド日ではなく各ページの更新日', () => {
    expect(sitemapEntries).toHaveLength(PAGES.length)
    for (const entry of sitemapEntries) expect(entry.lastmod).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('事前レンダリング', () => {
  const newPages = PAGES.filter((page) => page.kind === 'page')

  for (const page of newPages) {
    it(`${page.path} を描画でき、見出しが1つだけある`, () => {
      const rendered = render(page.path)
      expect(rendered.found).toBe(true)
      expect(rendered.title).toBe(page.title)
      expect(rendered.html.match(/<h1[\s>]/g)).toHaveLength(1)
      expect(rendered.html).toContain(page.name)
      // 公開URLの無いテストでは構造化データを出さない
      expect(rendered.jsonLd).toBeNull()
    })
  }

  it('フランジの寸法表に全サイズの行とツールへのリンクがある', () => {
    const { html } = render('/flange-bolt-length/16k')
    expect(html).toContain('/flange-bolt-length?pressure=16K&amp;size=300A')
    expect(html).toContain('JIS 16K フランジ寸法表')
    // 16K の厚さは JIS B 2220:2012 表17 の原文と一致したので「未確認」の印は出さず、表番号を典拠に添える
    expect(html).not.toContain('規格原文で未確認')
    expect(html).toContain('表17 呼び圧力16Kフランジの寸法')
    // 90A は 16K にもある（表17）
    expect(html).toContain('/flange-bolt-length?pressure=16K&amp;size=90A')
    // ナット高さの典拠: 16K は M22 を使うので JIS B 1181 の表3（第1選択）と表4（第2選択）
    expect(html).toContain('表3・表4 六角ナット・スタイル1')
    // 表8: 16K の SOH・BL などは RF にしない
    expect(html).toContain('全面座（FF）などで、RF の欄は「—」です')
  })

  it('5K のフランジ寸法表: M22 を使わないのでナット高さは表3 だけ。SOP・SOH・BL などは FF だけ（表8）', () => {
    const { html } = render('/flange-bolt-length/5k')
    expect(html).toContain('表14 呼び圧力5Kフランジの寸法')
    expect(html).toContain('表3 六角ナット・スタイル1')
    expect(html).not.toContain('表3・表4 六角ナット・スタイル1')
    expect(html).toContain('全面座（FF）だけです')
  })

  it('ねじのまとめにツールへのリンクと前後のサイズがある', () => {
    const { html } = render('/screw/m12')
    expect(html).toContain('/tap-drill?d=12&amp;p=1.75')
    expect(html).toContain('/bolt-size?d=12')
    expect(html).toContain('href="/screw/m10"')
    expect(html).toContain('href="/screw/m14"')
  })

  it('存在しないパスは 404', () => {
    expect(render('/screw/m13').found).toBe(false)
  })
})
