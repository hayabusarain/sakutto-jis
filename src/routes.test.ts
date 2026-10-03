import { describe, expect, it } from 'vitest'
import { render, sitemapEntries } from './entry-server'
import { findPage, PAGES } from './routes'
import { normalizePath } from './router/context'
import { DATA_DISCLAIMER, SITE } from './site'
import { formatJaDate } from './pages/content/dates'
import { PIPE_EDITION_NOTE } from './features/steel-pipe/data'

/** 描画した HTML の表の行を、セルの文字の並びにする（React が入れる <!-- --> とタグを除く） */
function tableRows(html: string): string[][] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(([, row]) =>
    [...row.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map(([, cell]) =>
      cell
        .replace(/<!-- -->/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .trim(),
    ),
  )
}

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
      '/print',
      '/print/screw',
      '/print/flange-10k',
      '/print/flange',
      '/print/pipe',
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

  describe('印刷用の早見表', () => {
    const date = formatJaDate(SITE.contentUpdatedAt)

    for (const path of ['/print/screw', '/print/flange-10k', '/print/flange', '/print/pipe']) {
      it(`${path}: 印刷用の印・データ確認日・注意書き・サイト名・印刷ボタンがある`, () => {
        const { html } = render(path)
        expect(html).toContain('data-print-sheet')
        expect(html).toContain(`データ確認日 <span class="num whitespace-nowrap text-zinc-800">${date}</span>`)
        expect(html).toContain(DATA_DISCLAIMER)
        expect(html).toContain(SITE.name)
        expect(html).toContain('印刷する')
        // QR コードは表示後に描く（部品を早見表のページでだけ読み込む）ので、事前レンダリングでは枠だけ
        expect(html).not.toContain('shape-rendering="crispEdges"')
        expect(html).toContain('>QR コード</div>')
      })
    }

    it('ねじ: M12 は下穴 10.2・二面幅 18（旧JIS 19）。典拠の表番号と QR コードの行き先がある', () => {
      const { html } = render('/print/screw')
      expect(tableRows(html).find((row) => row[0] === 'M12')).toEqual([
        'M12',
        '1.75',
        '10.2',
        '18',
        '19',
        '13.5',
        '28',
        '10',
        '20×13',
      ])
      expect(tableRows(html).find((row) => row[0] === 'M22')?.slice(3, 5)).toEqual(['34', '32'])
      expect(html).toContain('表2 呼び径及びピッチの選択')
      expect(html).toContain('表3 めねじ内径の公差')
      expect(html).toContain('表JA.8 六角ボルト・上')
      expect(html).toContain('付表 ボルト穴径及びざぐり径の寸法')
      expect(html).toContain('/tap-drill')
      expect(html).toContain('/bolt-size')
    })

    it('10K フランジ: 50A の行（155・120・4-19・M16・24・16・60・80）と JIS B 2220 表15', () => {
      const { html } = render('/print/flange-10k')
      expect(tableRows(html).find((row) => row[0] === '50A')).toEqual([
        '50A',
        '155',
        '120',
        '4-19',
        'M16',
        '24',
        '16',
        '60',
        '80',
      ])
      expect(html).toContain('表15 呼び圧力10Kフランジの寸法')
      expect(html).toContain('/flange-bolt-length')
    })

    it('5K〜20K のフランジ: 4つの表と表番号。10K 50A の行は 10K の早見表と同じ', () => {
      const { html } = render('/print/flange')
      const rows50 = tableRows(html).filter((row) => row[0] === '50A')
      expect(rows50).toHaveLength(4)
      expect(rows50[1]).toEqual(['50A', '155', '120', '4-19', 'M16', '16', '60'])
      expect(html).toContain('表14・表15・表17・表18（呼び圧力5K・10K・16K・20Kフランジの寸法）')
    })

    it('SGP・管用ねじ: SGP 50A と 1/2 の行。G 下穴は計算値と書き、2026年版との照合状況を添える', () => {
      const { html } = render('/print/pipe')
      expect(tableRows(html).find((row) => row[0] === '50A')).toEqual(['50A', '2', '60.5', '3.8', '52.9', '5.31'])
      expect(tableRows(html).find((row) => row[0] === '1/2')).toEqual([
        '1/2',
        '15A',
        '14',
        '1.8143',
        '20.955',
        '18.631',
        '18.9',
      ])
      expect(html).toContain('G 下穴（計算値）')
      expect(html).toContain('表4 寸法，寸法の許容差及び単位質量')
      expect(html).toContain(PIPE_EDITION_NOTE)
      expect(html).toContain('/steel-pipe')
      expect(html).toContain('/pipe-thread')
    })

    it('一覧から4枚の早見表へリンクし、ツールのページからも案内する', () => {
      const { html } = render('/print')
      for (const path of ['/print/screw', '/print/flange-10k', '/print/flange', '/print/pipe']) {
        expect(html).toContain(`href="${path}"`)
      }
      expect(render('/tap-drill').html).toContain('href="/print/screw"')
      expect(render('/pipe-thread').html).toContain('href="/print/pipe"')
    })

    it('sitemap に早見表のページが入る', () => {
      const paths = sitemapEntries.map((entry) => entry.path)
      expect(paths).toEqual(expect.arrayContaining(['/print', '/print/screw', '/print/flange-10k', '/print/flange', '/print/pipe']))
    })
  })

  it('存在しないパスは 404', () => {
    expect(render('/screw/m13').found).toBe(false)
  })
})
