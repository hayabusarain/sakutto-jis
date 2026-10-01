import type { KeyboardEvent } from 'react'
import { fixed, trim } from '../../lib/format'
import { compareSpecs, PIPE_SPEC_KEYS } from './calc'
import { PIPE_SIZES, PIPE_SPECS, type PipeSpec } from './data'

const onActivate = (action: () => void) => (event: KeyboardEvent<HTMLTableRowElement>) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
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
                tabIndex={dims ? 0 : undefined}
                aria-selected={selected}
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
                </th>
                {dims ? (
                  <>
                    <td className={td}>{fixed(dims.t, 1)}</td>
                    <td className={td}>{fixed(dims.id, 1)}</td>
                    <td className={td}>{trim(dims.massPerM)}</td>
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
                tabIndex={0}
                aria-selected={highlighted}
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
      <td className={td}>{trim(w)}</td>
    </>
  )
}
