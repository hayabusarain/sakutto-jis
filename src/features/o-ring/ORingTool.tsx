import { ClipboardList, Table2, Torus } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { usePersistentState } from '../../hooks/usePersistentState'
import { fixed, trim } from '../../lib/format'
import {
  fillRatio,
  findORing,
  grooveDepth,
  oRingNumbers,
  outerDiameter,
  squeeze,
  squeezeRange,
  stretch,
  type ORing,
} from './calc'
import type { ORingSeries } from './data'

interface ORingInput {
  series: ORingSeries
  no: string
  backup: 0 | 1 | 2
}

const DEFAULT_INPUT: ORingInput = { series: 'P', no: 'P20', backup: 0 }

function isORingInput(value: unknown): value is ORingInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.series === 'P' || v.series === 'G') &&
    typeof v.no === 'string' &&
    findORing(v.series, v.no) !== undefined &&
    (v.backup === 0 || v.backup === 1 || v.backup === 2)
  )
}

const SERIES_OPTIONS = [
  { value: 'P', label: 'P（運動用）' },
  { value: 'G', label: 'G（固定用）' },
] as const
const BACKUP_OPTIONS = [
  { value: '0', label: 'なし' },
  { value: '1', label: '1個' },
  { value: '2', label: '2個' },
] as const

/** 円筒面の溝の断面（ピストン型）の模式図 */
function GrooveSketch({ ring, width }: { ring: ORing; width: number }) {
  const depth = grooveDepth(ring)
  const d2 = ring.group.d2
  // 模式図なので太さを基準に拡大して描く
  const scale = 60 / d2
  const w = width * scale
  const h = depth * scale
  const r = (d2 / 2) * scale
  const left = 40
  const top = 30
  return (
    <svg viewBox="0 0 240 150" className="mx-auto block w-full max-w-80" role="img" aria-label="溝の断面の模式図">
      {/* シリンダ（相手面） */}
      <rect x="0" y="10" width="240" height={top - 10} className="fill-zinc-200" />
      <line x1="0" x2="240" y1={top} y2={top} className="stroke-zinc-900" strokeWidth="1.5" />
      {/* ピストン側と溝 */}
      <path
        d={`M0 ${top + 6} H${left} V${top + h} H${left + w} V${top + 6} H240 V140 H0 Z`}
        className="fill-zinc-100 stroke-zinc-900"
        strokeWidth="1.5"
      />
      {/* Oリング（つぶされた状態を楕円で表す） */}
      <ellipse
        cx={left + Math.min(r, w / 2) + 2}
        cy={top + h / 2}
        rx={Math.min(r * 1.08, w / 2 - 1)}
        ry={h / 2}
        className="fill-orange-500/80 stroke-orange-700"
        strokeWidth="1"
      />
      {/* 寸法 */}
      <line x1={left} x2={left + w} y1={top + h + 12} y2={top + h + 12} className="stroke-zinc-500" strokeWidth="0.8" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={left + w / 2} y={top + h + 26} textAnchor="middle" className="fill-zinc-700 text-[10px]">
        溝幅 b = {trim(width)}
      </text>
      <line x1={left + w + 14} x2={left + w + 14} y1={top} y2={top + h} className="stroke-zinc-500" strokeWidth="0.8" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={left + w + 20} y={top + h / 2 + 4} className="fill-zinc-700 text-[10px]">
        深さ {trim(depth)}
      </text>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="fill-zinc-500" />
        </marker>
      </defs>
    </svg>
  )
}

export function ORingTool() {
  const [input, setInput] = usePersistentState('o-ring', DEFAULT_INPUT, isORingInput)
  const ring = findORing(input.series, input.no) ?? findORing('P', 'P20')!
  const { group } = ring
  const depth = grooveDepth(ring)
  const width = group.widths[input.backup]
  const nominalSqueeze = squeeze(group.d2, depth)
  const range = squeezeRange(ring)
  const fill = fillRatio(ring, 0)
  const stretchValue = stretch(ring)

  const changeSeries = (series: ORingSeries) => {
    setInput({ ...input, series, no: series === 'P' ? 'P20' : 'G50' })
  }

  const copyText = [
    `【Oリング】${ring.no}（JIS B 2401）`,
    `内径 ${trim(ring.d1)}±${trim(ring.d1Tol)} × 太さ ${trim(group.d2)}±${trim(group.d2Tol)} mm`,
    `溝（円筒面）: d ${trim(ring.d)} / D ${trim(ring.D)} / 溝幅 ${trim(width)}（+0.25/0、BU${input.backup}個）/ R${trim(group.rMax)}以下`,
    `つぶし率 ${fixed(nominalSqueeze, 1)}%`,
    '典拠: JIS B 2401-1:2012 / JIS B 2401-2:2012',
    '（サクッとJIS）',
  ].join('\n')

  const columns: Column<ORing>[] = [
    { key: 'no', header: '呼び番号', cell: (row) => row.no },
    { key: 'd1', header: '内径 d1', cell: (row) => fixed(row.d1, 1) },
    { key: 'd2', header: '太さ d2', cell: (row) => fixed(row.group.d2, 1) },
    { key: 'd', header: '溝 d', cell: (row) => trim(row.d) },
    { key: 'D', header: '溝 D', cell: (row) => trim(row.D) },
    { key: 'b', header: `溝幅 b`, cell: (row) => fixed(row.group.widths[input.backup], 1) },
  ]
  const rows = oRingNumbers(input.series).map((no) => findORing(input.series, no)!)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SegmentedControl
            label="系列"
            value={input.series}
            options={SERIES_OPTIONS}
            onChange={changeSeries}
            hint={
              input.series === 'P'
                ? 'P は運動用・固定用の両方に使えます。'
                : 'G は固定用です。往復運動などの運動用には使えません。'
            }
          />
          <SelectField
            label="呼び番号"
            value={ring.no}
            options={oRingNumbers(input.series).map((no) => ({ value: no, label: no }))}
            onChange={(no) => setInput({ ...input, no })}
          />
          <SegmentedControl
            label="バックアップリング"
            value={String(input.backup)}
            options={BACKUP_OPTIONS}
            onChange={(value) => setInput({ ...input, backup: Number(value) as 0 | 1 | 2 })}
            hint="高い圧力やすきまが大きいときに、はみ出し防止で入れます。片側加圧は1個、両側加圧は2個。"
          />
          <GrooveSketch ring={ring} width={width} />
        </div>
      </Card>

      <Card title="結果" index="02" icon={Torus} aside={<CopyButton text={copyText} />}>
        <PrimaryResult label={`Oリング ${ring.no}（内径 × 太さ）`} value={`${trim(ring.d1)} × ${trim(group.d2)}`} unit="mm">
          内径 ±{trim(ring.d1Tol)}・太さ ±{trim(group.d2Tol)}（1種A・NBR の場合）
        </PrimaryResult>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 text-center">
          {[
            ['溝の d', trim(ring.d)],
            ['溝の D', trim(ring.D)],
            [`溝幅 b（BU${input.backup}個）`, trim(width)],
            ['溝の深さ', trim(depth)],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-2 py-2.5">
              <p className="text-[11px] text-zinc-500">{label}</p>
              <p className="num text-xl font-bold text-zinc-900">
                {value}
                <span className="ml-0.5 text-xs font-normal text-zinc-500">mm</span>
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-3">
          <ResultItem
            label="溝の d（ピストン型の溝底径・ロッド型の軸径）"
            value={group.diaTol === null ? trim(ring.d) : `${trim(ring.d)} 0/−${trim(group.diaTol)}`}
            unit="mm"
          />
          <ResultItem
            label="溝の D（ピストン型のシリンダ内径・ロッド型の溝底径）"
            value={group.diaTol === null ? trim(ring.D) : `${trim(ring.D)} +${trim(group.diaTol)}/0`}
            unit="mm"
          />
          <ResultItem label="溝幅 b の許容差" value="+0.25/0" unit="mm" />
          <ResultItem label="溝底の角の丸み R" value={`${trim(group.rMax)} 以下`} unit="mm" />
          <ResultItem label="偏心量 E" value={`${trim(group.eMax)} 以下`} unit="mm" />
          <ResultItem
            label="つぶし率（基準寸法）"
            value={fixed(nominalSqueeze, 1)}
            unit="%"
            note={range ? `寸法許容差を含めると ${fixed(range.min, 1)}〜${fixed(range.max, 1)}%（偏心は含まない）` : undefined}
          />
          <ResultItem label="充てん率（バックアップリングなしの溝）" value={fixed(fill, 1)} unit="%" />
          <ResultItem label="ピストン型での内径の伸び" value={fixed(stretchValue, 1)} unit="%" />
          <ResultItem label="Oリングの外径（参考）" value={trim(outerDiameter(ring))} unit="mm" />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 2401-1" suffix="のOリング寸法" />
          <Citation code="JIS B 2401-2" detail="円筒面（運動用・固定用）" suffix="のハウジング寸法" />
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>ハウジングの d は呼び番号の数値、D は太さのグループごとに決まる D − d を足した値です。</p>
            <Formula>
              溝の深さ = (D − d) ÷ 2 = ({trim(ring.D)} − {trim(ring.d)}) ÷ 2 = {trim(depth)} mm
            </Formula>
            <Formula>
              つぶし率 = (d2 − 溝の深さ) ÷ d2 × 100 = ({trim(group.d2)} − {trim(depth)}) ÷ {trim(group.d2)} × 100 ={' '}
              {fixed(nominalSqueeze, 1)}%
            </Formula>
            <Formula>
              充てん率 = (π/4 × d2²) ÷ (b × 溝の深さ) × 100 = {fixed((Math.PI / 4) * group.d2 ** 2, 2)} ÷ ({trim(group.widths[0])} × {trim(depth)}) × 100 = {fixed(fill, 1)}%
            </Formula>
            <Formula>
              伸び = (d − d1) ÷ d1 × 100 = ({trim(ring.d)} − {trim(ring.d1)}) ÷ {trim(ring.d1)} × 100 = {fixed(stretchValue, 1)}%
            </Formula>
            <FormulaLegend
              items={[
                ['d1', 'Oリングの内径'],
                ['d2', 'Oリングの太さ'],
                ['d, D', 'ハウジングの径（JIS B 2401-2）'],
                ['b', '溝幅（バックアップリングの数で変わる）'],
              ]}
            />
            <p>
              つぶし率の範囲は、太さの許容差と d・D の寸法許容差の両端を組み合わせた値です。実際には偏心やOリングの材料によっても変わります。フッ素ゴム・シリコーンゴムなどは寸法許容差が 1種A より大きくなります。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card title={`${input.series} 系列の寸法表（円筒面の溝）`} index="03" icon={Table2} className="lg:col-span-2" flush>
        <p className="px-4 pt-3 text-xs text-zinc-500">
          単位: mm。溝幅はバックアップリング {input.backup} 個の値。行をタップするとその番号を選べます。
        </p>
        <div className="mt-2 max-h-[32rem] overflow-y-auto">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.no}
            isHighlighted={(row) => row.no === ring.no}
            onRowClick={(row) => setInput({ ...input, no: row.no })}
            caption={`${input.series} 系列のOリングと溝の寸法表`}
          />
        </div>
      </Card>
    </div>
  )
}
