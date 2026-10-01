import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AllSpecsTable, SpecCompare } from './CompareTables'

/** 事前レンダリングと同じ方法で HTML にし、tbody の行ごとの tabindex と中身を取り出す（テスト環境には DOM が無い） */
function bodyRows(element: ReactElement) {
  const html = renderToStaticMarkup(element)
  const body = /<tbody[^>]*>(.*)<\/tbody>/s.exec(html)?.[1] ?? ''
  return [...body.matchAll(/<tr([^>]*)>(.*?)<\/tr>/g)].map((m) => ({
    tabIndex: /tabindex="(-?\d+)"/.exec(m[1])?.[1] ?? null,
    text: m[2].replace(/<[^>]+>/g, ''),
  }))
}

const tabStops = (rows: ReturnType<typeof bodyRows>) =>
  rows.filter((row) => row.tabIndex === '0').map((row) => row.text.slice(0, 5))

describe('SpecCompare（呼び径ごとの3規格比較）', () => {
  it('Tab で止まるのは選択中の規格の1行だけ', () => {
    const rows = bodyRows(<SpecCompare a="50A" spec="sch40" totalLength={null} onSelectSpec={() => {}} />)
    expect(rows.map((row) => row.tabIndex)).toEqual(['-1', '0', '-1'])
  })

  it('選択中の規格にその呼び径がなければ、ある規格の先頭で止まり、無い行にはフォーカスを当てない', () => {
    // 175A は SGP のみ
    const rows = bodyRows(<SpecCompare a="175A" spec="sch40" totalLength={10} onSelectSpec={() => {}} />)
    expect(rows.map((row) => row.tabIndex)).toEqual(['0', null, null])
  })

  it('キーボードの枠は行（tr）ではなくセルに描く', () => {
    const html = renderToStaticMarkup(<SpecCompare a="50A" spec="sgp" totalLength={10} onSelectSpec={() => {}} />)
    expect(html).not.toContain('focus-visible:outline-orange')
    expect(html).toContain('[tr:focus-visible&gt;&amp;]:shadow-')
  })
})

describe('AllSpecsTable（3規格を並べる表）', () => {
  it('Tab で止まるのは選択中の呼び径の1行だけ', () => {
    const rows = bodyRows(<AllSpecsTable selectedA="50A" selectedSpec="sgp" onSelectSize={() => {}} />)
    expect(rows.filter((row) => row.tabIndex === '0')).toHaveLength(1)
    expect(tabStops(rows)).toEqual(['50A2B'])
    expect(rows.every((row) => row.tabIndex !== null)).toBe(true)
  })

  it('表にない呼び径なら先頭の行で止まる', () => {
    const rows = bodyRows(<AllSpecsTable selectedA="999A" selectedSpec="sgp" onSelectSize={() => {}} />)
    expect(tabStops(rows)).toEqual(['6A1/8'])
  })

  it('固定表示の1列目に隠れないよう、キーボードの枠は行（tr）ではなく各セルに描く', () => {
    const html = renderToStaticMarkup(<AllSpecsTable selectedA="50A" selectedSpec="sgp" onSelectSize={() => {}} />)
    expect(html).not.toContain('focus-visible:outline-orange')
    // 1列目（固定表示）は左の線、最後の列は右の線
    expect(html).toMatch(/<th scope="row" class="sticky left-0[^"]*\[tr:focus-visible&gt;&amp;\]:shadow-\[inset_3px_0_0/)
    expect(html).toContain('[tr:focus-visible&gt;&amp;]:shadow-[inset_-2px_0_0')
  })
})
