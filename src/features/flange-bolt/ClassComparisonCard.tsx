import type { ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { TableExport } from '../../components/ui/TableExport'
import { standardLabel } from '../../standards'
import {
  compareClasses,
  isUnverified,
  sameBoltPattern,
  type BoltConditions,
  type ClassComparison,
  type FlangeField,
} from './calc'
import { ALL_FLANGE_TABLES_LABEL, FLANGE_SIZE_TABLE_NO, UNVERIFIED_LEGEND, type FlangeRow, type PressureClass } from './data'
import { conditionsText, markedText } from './labels'
import { ExportInAside, ExportInBody } from './ExportSlot'
import { Marked, UnverifiedLegend } from './Unverified'

interface ClassComparisonCardProps {
  index: string
  pressure: PressureClass
  size: string
  /** ボルト長さの条件。入力エラーで計算できないときは null */
  conditions: BoltConditions | null
  onSelect: (pressure: PressureClass) => void
  className?: string
}

/** 違う値に色を付けたセル */
function Diff({ differs, children }: { differs: boolean; children: ReactNode }) {
  return differs ? (
    <span className="rounded-sm bg-orange-100 px-1 font-semibold text-orange-900">{children}</span>
  ) : (
    <>{children}</>
  )
}

/** 同じ呼び径の 5K・10K・16K・20K を並べる（違う値に色）。ボルト長さは今の条件で計算 */
export function ClassComparisonCard({ index, pressure, size, conditions, onSelect, className }: ClassComparisonCardProps) {
  const rows = compareClasses(size, conditions)
  const selected = rows.find((r) => r.pressure === pressure)?.row
  const missing = rows.filter((r) => !r.row).map((r) => r.pressure)
  const samePattern = rows.filter(
    (r) => r.pressure !== pressure && r.row && selected && sameBoltPattern(r.row, selected),
  )

  const differs = (row: FlangeRow, field: keyof FlangeRow) => selected !== undefined && row[field] !== selected[field]
  const unverified = (r: ClassComparison, field: FlangeField) => isUnverified(r.pressure, size, field)
  const anyUnverified = rows.some((r) => r.row && unverified(r, 't'))

  const value = (r: ClassComparison, field: FlangeField, content: (row: FlangeRow) => ReactNode) =>
    r.row ? (
      <Diff differs={differs(r.row, field)}>
        <Marked value={content(r.row)} unverified={unverified(r, field)} />
      </Diff>
    ) : (
      <span className="text-zinc-400">—</span>
    )

  const lengthOf = (r: ClassComparison) => r.bolt?.length ?? null
  const selectedLength = lengthOf(rows.find((r) => r.pressure === pressure)!)

  const columns: { key: string; header: string; cell: (r: ClassComparison) => ReactNode }[] = [
    { key: 'pressure', header: '圧力', cell: (r) => r.pressure },
    { key: 'D', header: '外径', cell: (r) => value(r, 'D', (row) => row.D) },
    { key: 'C', header: 'PCD', cell: (r) => value(r, 'C', (row) => row.C) },
    {
      key: 'holes',
      header: '穴',
      cell: (r) =>
        r.row ? (
          <Diff differs={differs(r.row, 'n') || differs(r.row, 'h')}>
            <Marked value={`${r.row.n}-φ${r.row.h}`} unverified={unverified(r, 'D')} />
          </Diff>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    { key: 't', header: '厚さ', cell: (r) => value(r, 't', (row) => row.t) },
    {
      // ボルトの呼び × 今の条件の長さ（例: M16×60）。呼びか長さが違えば色を付ける
      key: 'bolt',
      header: 'ボルト',
      cell: (r) => {
        if (!r.row) return <span className="text-zinc-400">—</span>
        const length = lengthOf(r)
        return (
          <Diff differs={differs(r.row, 'bolt') || (selectedLength !== null && length !== selectedLength)}>
            <Marked value={`M${r.row.bolt}×${length ?? '—'}`} unverified={unverified(r, 't')} />
          </Diff>
        )
      },
    },
  ]

  const exportRows = rows.map((r) => {
    if (!r.row) return [r.pressure, '—', '—', '—', '—', '—', '—', '—']
    const row = r.row
    const rowMark = unverified(r, 'D')
    return [
      r.pressure,
      markedText(row.D, rowMark),
      markedText(row.C, rowMark),
      markedText(row.n, rowMark),
      markedText(row.h, rowMark),
      markedText(`M${row.bolt}`, rowMark),
      markedText(row.t, unverified(r, 't')),
      lengthOf(r) === null ? '' : markedText(lengthOf(r)!, unverified(r, 't')),
    ]
  })

  const conditionNote = conditions ? conditionsText(conditions) : '入力エラーのため計算していません'

  const exportButtons = (
    <TableExport
      title={`JIS フランジ ${size} の圧力クラス比較`}
      filename={`flange_${size}_classes`}
      headers={['圧力', '外径 D [mm]', 'PCD C [mm]', '穴数', '穴径 h [mm]', 'ボルト', '厚さ t [mm]', 'ボルト長さ [mm]']}
      rows={exportRows}
      note={`典拠: ${standardLabel('JIS B 2220')} ${ALL_FLANGE_TABLES_LABEL}。ボルト長さは計算値（${conditionNote}）。${
        anyUnverified ? UNVERIFIED_LEGEND : ''
      }`}
    />
  )

  return (
    <Card
      title={`${size} の圧力クラス比較`}
      index={index}
      className={className}
      flush
      aside={<ExportInAside>{exportButtons}</ExportInAside>}
    >
      <ExportInBody>{exportButtons}</ExportInBody>
      <div className="space-y-1 px-4 pt-3 text-xs leading-relaxed text-zinc-600">
        <p>
          <span className="rounded-sm bg-orange-100 px-1 font-semibold text-orange-900">色付き</span> は {pressure}{' '}
          と違う値。行をタップするとそのクラスを選べます。単位 mm。
        </p>
        {selected && (
          <p>
            {pressure} とボルト穴（PCD・穴数・穴径）が同じ:{' '}
            <span className="font-semibold text-zinc-900">
              {samePattern.length > 0 ? samePattern.map((r) => r.pressure).join('・') : 'なし'}
            </span>
            {samePattern.length > 0 && '（外径・厚さは下の表で確認）'}
          </p>
        )}
      </div>
      <div className="mt-2">
        {/* 4行だけの表なので、スマホ幅でも全列が見えるよう余白を詰めた専用の表にする */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm sm:w-auto sm:min-w-[36rem]">
            <caption className="sr-only">{`JIS フランジ ${size} の圧力クラス比較`}</caption>
            <thead>
              <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
                {columns.map((column, i) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={`py-2 font-semibold whitespace-nowrap ${
                      i === 0 ? 'pr-1.5 pl-4 text-left' : i === columns.length - 1 ? 'pr-4 pl-1.5 text-right sm:pl-4' : 'px-1.5 text-right sm:px-4'
                    }`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const active = r.pressure === pressure
                return (
                  <tr
                    key={r.pressure}
                    onClick={r.row ? () => onSelect(r.pressure) : undefined}
                    className={`border-b border-zinc-100 ${active ? 'bg-orange-50' : ''} ${
                      r.row && !active ? 'cursor-pointer hover:bg-zinc-100' : ''
                    }`}
                  >
                    <th
                      scope="row"
                      className={`py-0.5 pr-1.5 pl-4 text-left ${active ? 'shadow-[inset_3px_0_0_var(--color-orange-600)]' : ''}`}
                    >
                      {r.row ? (
                        <button
                          type="button"
                          aria-pressed={active}
                          aria-label={`${r.pressure} を選ぶ`}
                          onClick={(event) => {
                            event.stopPropagation()
                            onSelect(r.pressure)
                          }}
                          className="num min-h-10 font-bold text-zinc-900 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-orange-500"
                        >
                          {r.pressure}
                        </button>
                      ) : (
                        <span className="num font-bold text-zinc-400">{r.pressure}</span>
                      )}
                    </th>
                    {columns.slice(1).map((column, i) => (
                      <td
                        key={column.key}
                        className={`num py-2 text-right whitespace-nowrap ${
                          i === columns.length - 2 ? 'pr-4 pl-1.5 sm:pl-4' : 'px-1.5 sm:px-4'
                        } ${active ? 'font-semibold' : ''}`}
                      >
                        {column.cell(r)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-1 px-4 pt-2 pb-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          {conditions ? `ボルトの長さは今の条件（${conditionNote}）で計算。` : 'ボルトの長さは、入力エラーのため計算していません。'}
          {missing.length > 0 && ` ${missing.join('・')} に ${size} はありません（JIS B 2220 ${FLANGE_SIZE_TABLE_NO}）。`}
        </p>
        {anyUnverified && <UnverifiedLegend>（未確認の厚さから計算したボルト長さにも付けています）</UnverifiedLegend>}
        <Citation code="JIS B 2220" detail={ALL_FLANGE_TABLES_LABEL} />
      </div>
    </Card>
  )
}
