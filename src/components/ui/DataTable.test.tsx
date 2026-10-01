import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataTable, type Column } from './DataTable'

interface Row {
  name: string
  d: number
}

const ROWS: readonly Row[] = [
  { name: 'M3', d: 3 },
  { name: 'M4', d: 4 },
  { name: 'M5', d: 5 },
]

const COLUMNS: readonly Column<Row>[] = [
  { key: 'name', header: '呼び', cell: (row) => row.name },
  { key: 'd', header: '外径', cell: (row) => row.d },
]

type Props = Partial<ComponentProps<typeof DataTable<Row>>>

/** 事前レンダリングと同じ方法で HTML にし、行ごとの tabindex と中身を取り出す（テスト環境には DOM が無い） */
function render(props: Props = {}) {
  const html = renderToStaticMarkup(
    <DataTable columns={COLUMNS} rows={ROWS} rowKey={(row) => row.name} caption="ねじ" {...props} />,
  )
  const rows = [...html.matchAll(/<tr([^>]*data-row-key="([^"]+)"[^>]*)>(.*?)<\/tr>/g)].map((m) => ({
    key: m[2],
    tabIndex: /tabindex="(-?\d+)"/.exec(m[1])?.[1] ?? null,
    html: m[0],
  }))
  return { html, rows }
}

const keysWith = (rows: ReturnType<typeof render>['rows'], text: string) =>
  rows.filter((row) => row.html.includes(text)).map((row) => row.key)

describe('DataTable（行を選べる表）', () => {
  it('Tab で止まるのは選択中の1行だけ（ほかの行は -1）', () => {
    const { rows } = render({ onRowClick: () => {}, isHighlighted: (row) => row.name === 'M5' })
    expect(rows.map((row) => row.tabIndex)).toEqual(['-1', '-1', '0'])
  })

  it('選択中の行がなければ先頭の行で止まる', () => {
    const { rows } = render({ onRowClick: () => {} })
    expect(rows.map((row) => row.tabIndex)).toEqual(['0', '-1', '-1'])
  })

  it('選択中の行には読み上げ用の「（選択中）」を付け、aria-selected は使わない', () => {
    const { html, rows } = render({ onRowClick: () => {}, isHighlighted: (row) => row.name === 'M4' })
    expect(html).not.toContain('aria-selected')
    expect(keysWith(rows, '（選択中）')).toEqual(['M4'])
    // 画面では読み上げ専用、印刷では見えるようにする
    expect(html).toMatch(/<span class="sr-only print:not-sr-only[^"]*">（選択中）<\/span>/)
  })

  it('強調の言葉は highlightLabel で変えられる', () => {
    const { rows } = render({
      onRowClick: () => {},
      isHighlighted: (row) => row.name === 'M4',
      highlightLabel: '推奨',
    })
    expect(keysWith(rows, '（推奨）')).toEqual(['M4'])
    expect(keysWith(rows, '（選択中）')).toEqual([])
  })
})

describe('DataTable（見るだけの表）', () => {
  it('行にはフォーカスを当てない', () => {
    const { rows } = render()
    expect(rows.map((row) => row.tabIndex)).toEqual([null, null, null])
  })

  it('強調した行には「（該当）」を付ける', () => {
    const { rows } = render({ isHighlighted: (row) => row.name === 'M3' })
    expect(keysWith(rows, '（該当）')).toEqual(['M3'])
  })

  it('印刷では高さの制限とスクロールを外す', () => {
    const { html } = render({ maxHeightClass: 'max-h-[32rem]' })
    expect(html).toContain('class="overflow-auto max-h-[32rem] print:max-h-none print:overflow-visible"')
  })
})
