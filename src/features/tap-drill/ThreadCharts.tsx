import { Ruler, Table2 } from 'lucide-react'
import { memo } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { TableExport } from '../../components/ui/TableExport'
import { fixed, trim } from '../../lib/format'
import { standardLabel } from '../../standards'
import {
  drillChart,
  formatHole,
  formatSignificant,
  pitchesOf,
  smallSizeGradeNote,
  threadBasics,
  threadName,
  type ChartRow,
  type ThreadBasics,
} from './calc'
import { METRIC_SIZES, type ToleranceGrade } from './data'
import { ExportAside, ExportBar } from './ExportPlacement'

interface ChartProps {
  grade: ToleranceGrade
  /** 選択中のねじ（表で強調する） */
  selectedD: number
  selectedP: number
  /** 行をタップしたとき */
  onSelect: (d: number, p: number) => void
}

const CHOICE_TEXT = { 1: '', 2: '第2選択', 3: '第3選択' } as const

/** 備考: 第2・第3選択、用途の限られるピッチ、M1.4 以下で 6H 以上の等級 */
function remarks(row: { d: number; grade: ToleranceGrade; choice: 1 | 2 | 3; note?: string }): string {
  const small = smallSizeGradeNote(row.d, row.grade) ? 'M1.4 以下は 5H・4H を推奨' : ''
  return [CHOICE_TEXT[row.choice], row.note, small].filter(Boolean).join('・')
}

const DRILL_NOTE = [
  `典拠: ${standardLabel('JIS B 0205-2')} 表2（呼び径とピッチ）`,
  `${standardLabel('JIS B 0205-4')}（D1 = D − 1.082532P）`,
  `${standardLabel('JIS B 0209-1')} 表3（めねじ内径の公差 T_D1）`,
  `${standardLabel('JIS B 1004')} 表1（ひっかかり率の式）`,
  `${standardLabel('ISO 2306')}（並目の推奨ドリル径）。切削タップ用の目安（サクッとJIS）`,
].join('／')

const BASICS_NOTE = [
  `典拠: ${standardLabel('JIS B 0205-4')}（D2 = D − 0.649519P、D1 = D − 1.082532P。表1 と一致）`,
  `${standardLabel('JIS B 1082')} 3.1（d3 = d1 − H/6、As = π/4 × ((d2 + d3)/2)²、有効数字3桁。表1 にあるねじは表の値と一致）（サクッとJIS）`,
].join('／')

const isSelected = (d: number, p: number) => (row: { d: number; p: number }) => row.d === d && row.p === p

/** 指定の等級が規定されていないピッチがあるときの注記 */
function fallbackNote(rows: readonly ChartRow[], grade: ToleranceGrade): string {
  const other = rows.find((row) => row.grade !== grade)
  return other
    ? `（${other.grade}H）などは、${grade}H の公差が規定されていないピッチのため、規定のある等級で求めた値です。`
    : ''
}

function limitsText(row: ChartRow, grade: ToleranceGrade): string {
  const range = `${fixed(row.limits.min, 3)}〜${fixed(row.limits.max, 3)}`
  return row.grade === grade ? range : `${range}（${row.grade}H）`
}

function drillExportRows(rows: readonly ChartRow[]) {
  return rows.map((row) => [
    threadName(row.d, row.p),
    trim(row.p),
    formatHole(row.hole),
    fixed(row.limits.min, 3),
    fixed(row.limits.max, 3),
    `${row.grade}H`,
    fixed(row.engagement, 1),
    remarks(row),
  ])
}

const DRILL_HEADERS = [
  'ねじ',
  'ピッチ [mm]',
  '下穴径 [mm]',
  'めねじ内径 D1 最小 [mm]',
  'めねじ内径 D1 最大 [mm]',
  '公差域クラス',
  'ひっかかり率 [%]',
  '備考',
]

function drillColumns(grade: ToleranceGrade, withPitch: boolean): Column<ChartRow>[] {
  return [
    { key: 'name', header: 'ねじ', align: 'left', cell: (row) => threadName(row.d, row.p) },
    ...(withPitch
      ? [{ key: 'p', header: 'ピッチ', cell: (row: ChartRow) => trim(row.p) }]
      : []),
    {
      key: 'hole',
      header: '下穴径',
      cell: (row) => <span className="font-bold text-zinc-900">{formatHole(row.hole)}</span>,
    },
    { key: 'limits', header: `D1 の範囲（${grade}H）`, cell: (row) => limitsText(row, grade) },
    { key: 'engagement', header: 'ひっかかり率', cell: (row) => `${fixed(row.engagement, 1)}%` },
    {
      key: 'remarks',
      header: '備考',
      align: 'left',
      cell: (row) => <span className="text-xs text-zinc-500">{remarks(row)}</span>,
    },
  ]
}

/** 表を高さ制限付きで出す（印刷では全行を出す） */
const SCROLL_CLASS = 'max-h-[30rem] print:max-h-none'

/** 早見表の典拠（表の下に置く） */
function DrillChartCitations({ coarse }: { coarse: boolean }) {
  return (
    <div className="space-y-1 px-4 py-3">
      <Citation code="JIS B 0205-2" detail="表2 呼び径及びピッチの選択" />
      <Citation code="JIS B 0209-1" detail="表3 めねじ内径の公差" suffix="から D1 の範囲を計算" />
      <Citation code="JIS B 1004" detail="表1 下穴径の系列" suffix="のひっかかり率の式" />
      {coarse && <Citation code="ISO 2306" suffix="の推奨ドリル径（範囲に入るとき）" />}
    </div>
  )
}

/** 並目ねじの下穴径の早見表（M1〜M68）。事前レンダリングされ、検索にも答える */
export const CoarseChartCard = memo(function CoarseChartCard({ grade, selectedD, selectedP, onSelect }: ChartProps) {
  const rows = drillChart('coarse', grade)
  const exportButtons = (
    <TableExport
      title={`ねじ下穴径 早見表（メートル並目ねじ・${grade}H）`}
      filename={`tap-drill-coarse-${grade}H`}
      headers={DRILL_HEADERS}
      rows={drillExportRows(rows)}
      note={DRILL_NOTE}
    />
  )
  return (
    <Card
      id="coarse-chart"
      title={`ねじ下穴径 早見表（並目・${grade}H）`}
      icon={Table2}
      className="lg:col-span-2"
      flush
      aside={<ExportAside>{exportButtons}</ExportAside>}
    >
      <ExportBar>{exportButtons}</ExportBar>
      <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-500">
        M{trim(rows[0].d)}〜M{trim(rows[rows.length - 1].d)} の並目ねじ {rows.length} サイズ（単位 mm）。下穴径は切削タップ用の推奨値で、
        {grade}H のめねじ内径 D1 の範囲に入ります。行をタップすると、そのねじを選べます。
        {fallbackNote(rows, grade)}
      </p>
      <div className="mt-2">
        <DataTable
          columns={drillColumns(grade, true)}
          rows={rows}
          rowKey={(row) => `M${row.d}x${row.p}`}
          isHighlighted={isSelected(selectedD, selectedP)}
          onRowClick={(row) => onSelect(row.d, row.p)}
          caption={`メートル並目ねじの下穴径の早見表（${grade}H）`}
          maxHeightClass={SCROLL_CLASS}
        />
      </div>
      <DrillChartCitations coarse />
    </Card>
  )
})

/** 細目ねじの下穴径の早見表 */
export const FineChartCard = memo(function FineChartCard({ grade, selectedD, selectedP, onSelect }: ChartProps) {
  const rows = drillChart('fine', grade)
  const exportButtons = (
    <TableExport
      title={`ねじ下穴径 早見表（メートル細目ねじ・${grade}H）`}
      filename={`tap-drill-fine-${grade}H`}
      headers={DRILL_HEADERS}
      rows={drillExportRows(rows)}
      note={DRILL_NOTE}
    />
  )
  return (
    <Card
      id="fine-chart"
      title={`細目ねじの下穴径（${grade}H）`}
      icon={Table2}
      className="lg:col-span-2"
      flush
      aside={<ExportAside>{exportButtons}</ExportAside>}
    >
      <ExportBar>{exportButtons}</ExportBar>
      <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-500">
        細目ねじ {rows.length} 種類（単位 mm）。下穴径は、{grade}H の範囲に入る径のうち「呼び径 −
        ピッチ」に最も近いもの（ピッチ 1mm 未満は 0.05mm 刻み、1mm 以上は 0.1mm 刻み）。行をタップすると、そのねじを選べます。
        {fallbackNote(rows, grade)}
      </p>
      <div className="mt-2">
        <DataTable
          columns={drillColumns(grade, false)}
          rows={rows}
          rowKey={(row) => `M${row.d}x${row.p}`}
          isHighlighted={isSelected(selectedD, selectedP)}
          onRowClick={(row) => onSelect(row.d, row.p)}
          caption={`メートル細目ねじの下穴径の早見表（${grade}H）`}
          maxHeightClass={SCROLL_CLASS}
        />
      </div>
      <DrillChartCitations coarse={false} />
    </Card>
  )
})

interface BasicsRow extends ThreadBasics {
  p: number
}

const BASICS_ROWS: readonly BasicsRow[] = METRIC_SIZES.flatMap((size) =>
  pitchesOf(size).map((p) => ({ ...threadBasics(size.d, p), p })),
)

const BASICS_EXPORT_ROWS = BASICS_ROWS.map((row) => [
  threadName(row.d, row.p),
  trim(row.p),
  fixed(row.d2, 3),
  fixed(row.d1, 3),
  fixed(row.d3, 3),
  formatSignificant(row.stressArea),
])

const BASICS_COLUMNS: Column<BasicsRow>[] = [
  { key: 'name', header: 'ねじ', align: 'left', cell: (row) => threadName(row.d, row.p) },
  { key: 'p', header: 'P', cell: (row) => trim(row.p) },
  { key: 'd2', header: 'D2・d2', cell: (row) => fixed(row.d2, 3) },
  { key: 'd1', header: 'D1・d1', cell: (row) => fixed(row.d1, 3) },
  { key: 'd3', header: 'd3', cell: (row) => fixed(row.d3, 3) },
  {
    key: 'as',
    header: 'As [mm²]',
    cell: (row) => <span className="font-bold text-zinc-900">{formatSignificant(row.stressArea)}</span>,
  },
]

/** 基準寸法と有効断面積の一覧（並目・細目の全171種類） */
export const BasicsChartCard = memo(function BasicsChartCard({ selectedD, selectedP, onSelect }: Omit<ChartProps, 'grade'>) {
  const exportButtons = (
    <TableExport
      title="メートルねじの基準寸法と有効断面積（並目・細目）"
      filename="metric-thread-basic-dimensions"
      headers={['ねじ', 'ピッチ P [mm]', '有効径 D2・d2 [mm]', '内径 D1・d1 [mm]', 'd3 [mm]', '有効断面積 As [mm²]']}
      rows={BASICS_EXPORT_ROWS}
      note={BASICS_NOTE}
    />
  )
  return (
    <Card
      id="basic-dimensions"
      title="ねじの基準寸法・有効断面積 As 一覧"
      icon={Ruler}
      className="lg:col-span-2"
      flush
      aside={<ExportAside>{exportButtons}</ExportAside>}
    >
      <ExportBar>{exportButtons}</ExportBar>
      <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-500">
        M1〜M68 の並目・細目 {BASICS_ROWS.length} 種類（単位 mm）。呼び径 D = d。D2・D1 は JIS B 0205-4
        の式、d3 と有効断面積 As は JIS B 1082 の式で計算した値です（As は有効数字3桁）。
      </p>
      <div className="mt-2">
        <DataTable
          columns={BASICS_COLUMNS}
          rows={BASICS_ROWS}
          rowKey={(row) => `M${row.d}x${row.p}`}
          isHighlighted={isSelected(selectedD, selectedP)}
          onRowClick={(row) => onSelect(row.d, row.p)}
          caption="メートルねじの基準寸法と有効断面積の一覧"
          maxHeightClass={SCROLL_CLASS}
        />
      </div>
      <div className="space-y-1 px-4 py-3">
        <Citation code="JIS B 0205-4" detail="5. 基準寸法の式" suffix="で D2・D1 を計算（表1 基準寸法と一致）" />
        <Citation code="JIS B 1082" detail="3.1 式(1)" suffix="で d3・As を計算（表1 一般用メートルねじの有効断面積にあるねじは表の値と一致）" />
      </div>
    </Card>
  )
})
