import type { KeyboardEvent } from 'react'
import { isRowMoveKey, nextRowIndex } from '../../components/ui/tableKeyboard'
import { fixed } from '../../lib/format'
import { compareSpecs, PIPE_SPEC_KEYS, unitMassText } from './calc'
import { PIPE_SIZES, PIPE_SPECS, type PipeSpec } from './data'

/**
 * 行を選べる表のキー操作（DataTable と同じ決まり）。Enter・スペースで選び、↑↓・Home・End で行を移る。
 * Tab で止まるのは選択中の行（なければ先頭の行）だけにして、表を1回の Tab で抜けられるようにする
 */
const onActivate = (action: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
  if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  } else if (isRowMoveKey(event.key)) {
    const rows = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLTableRowElement>('tr[tabindex]') ?? [])
    const index = rows.indexOf(event.currentTarget)
    if (index === -1) return
    event.preventDefault()
    rows[nextRowIndex(index, rows.length, event.key)].focus()
  }
}

/** 選択中の行であることを読み上げソフトに伝える（aria-selected は普通の表の行では読まれない） */
function SelectedMark({ selected }: { selected: boolean }) {
  return selected ? <span className="sr-only">（選択中）</span> : null
}

const th = 'px-2 py-2 font-semibold whitespace-nowrap'
const td = 'num px-2 py-2 text-right whitespace-nowrap'

interface SpecCompareProps {
  a: string
  spec: PipeSpec
  /** 合計の長さ [m]。あれば質量の列を出す */
  totalLength: number | null
  onSelectSpec: (spec: PipeSpec) => void
}

/** 選んだ呼び径の SGP・Sch40・Sch80 を並べる（行をタップでその規格にする） */
export function SpecCompare({ a, spec, totalLength, onSelectSpec }: SpecCompareProps) {
  const rows = compareSpecs(a)
  const tabStopSpec = rows.some((row) => row.spec === spec && row.dims) ? spec : rows.find((row) => row.dims)?.spec
  return (
    <div className="overflow-x-auto rounded-md border border-zinc-200">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{a} の SGP・Sch40・Sch80 の比較</caption>
        <thead>
          <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
            <th scope="col" className={`${th} text-left`}>
              規格
            </th>
            <th scope="col" className={`${th} text-right`}>
              厚さ
            </th>
            <th scope="col" className={`${th} text-right`}>
              内径
            </th>
            <th scope="col" className={`${th} text-right`}>
              kg/m
            </th>
            {totalLength !== null && (
              <th scope="col" className={`${th} text-right`}>
                質量 kg
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ spec: rowSpec, dims }) => {
            const selected = rowSpec === spec
            const select = () => dims && onSelectSpec(rowSpec)
            return (
              <tr
                key={rowSpec}
                onClick={dims ? select : undefined}
                onKeyDown={dims ? onActivate(select) : undefined}
                tabIndex={dims ? (rowSpec === tabStopSpec ? 0 : -1) : undefined}
                className={`border-b border-zinc-100 last:border-b-0 ${
                  selected ? 'bg-orange-50 font-semibold' : ''
                } ${
                  dims
                    ? 'cursor-pointer hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500'
                    : 'text-zinc-400'
                }`}
              >
                <th
                  scope="row"
                  className={`${th} text-left ${selected ? 'shadow-[inset_3px_0_0_var(--color-orange-600)]' : ''}`}
                >
                  {PIPE_SPECS[rowSpec].label}
                  <SelectedMark selected={selected} />
                </th>
                {dims ? (
                  <>
                    <td className={td}>{fixed(dims.t, 1)}</td>
                    <td className={td}>{fixed(dims.id, 1)}</td>
                    <td className={td}>{unitMassText(dims.massPerM)}</td>
                    {totalLength !== null && <td className={td}>{fixed(dims.massPerM * totalLength, 1)}</td>}
                  </>
                ) : (
                  <td colSpan={totalLength !== null ? 4 : 3} className="px-2 py-2 text-right text-xs">
                    この規格に {a} はありません
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface AllSpecsTableProps {
  selectedA: string
  selectedSpec: PipeSpec
  onSelectSize: (a: string) => void
}

const groupStart = 'border-l border-zinc-200'

/** 全サイズの SGP・Sch40・Sch80 の厚さ・内径・単位質量を並べる */
export function AllSpecsTable({ selectedA, selectedSpec, onSelectSize }: AllSpecsTableProps) {
  const tabStopA = PIPE_SIZES.some((size) => size.a === selectedA) ? selectedA : PIPE_SIZES[0].a
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">SGP・Sch40・Sch80 の厚さ・内径・単位質量の比較表</caption>
        <thead>
          <tr className="bg-zinc-50 text-xs text-zinc-600">
            <th scope="col" rowSpan={2} className={`${th} sticky left-0 z-10 bg-zinc-50 px-3 text-left`}>
              呼び径
            </th>
            <th scope="col" rowSpan={2} className={`${th} text-right`}>
              外径
            </th>
            {PIPE_SPEC_KEYS.map((spec) => (
              <th
                key={spec}
                scope="colgroup"
                colSpan={3}
                className={`${th} ${groupStart} text-center ${
                  spec === selectedSpec ? 'text-orange-700' : 'text-zinc-800'
                }`}
              >
                {PIPE_SPECS[spec].label}
              </th>
            ))}
          </tr>
          <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
            {PIPE_SPEC_KEYS.map((spec) => (
              <SpecSubHeaders key={spec} />
            ))}
          </tr>
        </thead>
        <tbody>
          {PIPE_SIZES.map((size) => {
            const highlighted = size.a === selectedA
            const select = () => onSelectSize(size.a)
            return (
              <tr
                key={size.a}
                onClick={select}
                onKeyDown={onActivate(select)}
                tabIndex={size.a === tabStopA ? 0 : -1}
                className={`cursor-pointer border-b border-zinc-100 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500 ${
                  highlighted ? 'bg-orange-50 font-semibold' : 'even:bg-zinc-50/60'
                }`}
              >
                <th
                  scope="row"
                  className={`sticky left-0 z-10 px-3 py-2 text-left font-semibold whitespace-nowrap ${
                    highlighted ? 'bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]' : 'bg-white'
                  }`}
                >
                  {size.a}
                  <span className="ml-1 text-xs font-normal text-zinc-500">{size.b}B</span>
                  <SelectedMark selected={highlighted} />
                </th>
                <td className={td}>{fixed(size.od, 1)}</td>
                {compareSpecs(size.a).map(({ spec, dims }) =>
                  dims ? (
                    <SpecCells key={spec} t={dims.t} id={dims.id} w={dims.massPerM} />
                  ) : (
                    <td key={spec} colSpan={3} className={`${groupStart} px-2 py-2 text-center text-zinc-400`}>
                      —
                    </td>
                  ),
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SpecSubHeaders() {
  return (
    <>
      <th scope="col" className={`${th} ${groupStart} text-right`}>
        厚さ
      </th>
      <th scope="col" className={`${th} text-right`}>
        内径
      </th>
      <th scope="col" className={`${th} text-right`}>
        kg/m
      </th>
    </>
  )
}

function SpecCells({ t, id, w }: { t: number; id: number; w: number }) {
  return (
    <>
      <td className={`${td} ${groupStart}`}>{fixed(t, 1)}</td>
      <td className={td}>{fixed(id, 1)}</td>
      <td className={td}>{unitMassText(w)}</td>
    </>
  )
}
