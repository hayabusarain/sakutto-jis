import { Info, Layers, Link2, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { TableExport } from '../../components/ui/TableExport'
import { FLAT_DEPTH_TOL, grooveDepth } from '../../features/o-ring/calc'
import { DYNAMIC_MATERIAL_NOTE, E_NOTE, SOURCE_NOTE, type ORingSeries } from '../../features/o-ring/data'
import { fixed, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { ActionLink, ChipNav, PageHeader, TableNote } from '../content/PageHeader'
import { oRingGrooveRows, oRingGroupRanges, type ORingGroupRange, type ORingTableRow } from './tableData'
import { ORING_TABLE_PAGES, ORING_TOOL_PATH } from './tablePages'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

const SERIES_TEXT: Record<ORingSeries, { use: string; note: string; example: string }> = {
  P: {
    use: '運動用・固定用',
    note: `P はピストン・ロッドなどの運動用にも、固定用にも使えます（${DYNAMIC_MATERIAL_NOTE.replace(/。$/, '')}）。`,
    example: 'P20',
  },
  G: {
    use: '固定用',
    note: 'G は固定用です。往復運動などの運動用には使えません。',
    example: 'G50',
  },
}

export function ORingTablePage({ series }: { series: ORingSeries }) {
  const meta = ORING_TABLE_PAGES.find((page) => page.series === series)!
  const text = SERIES_TEXT[series]
  const rows = oRingGrooveRows(series)
  const groups = oRingGroupRanges(series)
  const numbers = `${rows[0].ring.no}〜${rows[rows.length - 1].ring.no}`
  const example = rows.find((row) => row.ring.no === text.example) ?? rows[0]
  // A 付きで、A の付かない同じ数字の番号もあるもの（P 系列: P10A・P22A・P48A・P50A・P150A）
  const aNumbers = rows
    .map((row) => row.ring.no)
    .filter((no) => no.endsWith('A') && rows.some((row) => row.ring.no === no.slice(0, -1)))

  const groupColumns: Column<ORingGroupRange>[] = [
    { key: 'range', header: '呼び番号', align: 'left', cell: (g) => (g.first === g.last ? g.first : `${g.first}〜${g.last}`) },
    { key: 'd2', header: '太さ d2', cell: (g) => `${fixed(g.group.d2, 1)}±${trim(g.group.d2Tol)}` },
    { key: 'depth', header: '溝の深さ', cell: (g) => trim(g.group.dDiff / 2) },
    { key: 'b0', header: '溝幅 BUなし', cell: (g) => fixed(g.group.widths[0], 1) },
    { key: 'b1', header: 'BU1個', cell: (g) => fixed(g.group.widths[1], 1) },
    { key: 'b2', header: 'BU2個', cell: (g) => fixed(g.group.widths[2], 1) },
    { key: 'tol', header: 'd・D 許容差', cell: (g) => (g.group.diaTol === null ? '—' : trim(g.group.diaTol)) },
    { key: 'r', header: 'R 最大', cell: (g) => trim(g.group.rMax) },
    { key: 'e', header: 'E 最大（K の最大−最小）', cell: (g) => trim(g.group.eMax) },
    { key: 'fh', header: '平面 深さ h', cell: (g) => fixed(g.group.flatDepth, 1) },
    { key: 'fb', header: '平面 溝幅 b', cell: (g) => fixed(g.group.flatWidth, 1) },
  ]

  const columns: Column<ORingTableRow>[] = [
    {
      key: 'no',
      header: '呼び番号',
      align: 'left',
      cell: (row) => (
        <Link to={toolHref(ORING_TOOL_PATH, { series, no: row.ring.no })} className={rowLinkClass}>
          {row.ring.no}
          <span className="sr-only">の溝を計算する</span>
        </Link>
      ),
    },
    { key: 'd1', header: '内径 d1', cell: (row) => fixed(row.ring.d1, 1) },
    { key: 'd1tol', header: '±', cell: (row) => trim(row.ring.d1Tol) },
    { key: 'd2', header: '太さ d2', cell: (row) => fixed(row.ring.group.d2, 1) },
    { key: 'd', header: '溝 d', cell: (row) => trim(row.ring.d) },
    { key: 'D', header: '溝 D', cell: (row) => trim(row.ring.D) },
    { key: 'ext', header: '平面 外圧用 溝内径', cell: (row) => trim(row.flatExternalInner) },
    { key: 'int', header: '平面 内圧用 溝外径', cell: (row) => trim(row.flatInternalOuter) },
  ]

  const exportHeaders = [
    '呼び番号',
    '内径 d1 [mm]',
    '内径の許容差 ± [mm]',
    '太さ d2 [mm]',
    '太さの許容差 ± [mm]',
    '円筒面の溝 d [mm]',
    '円筒面の溝 D [mm]',
    '溝幅 b（BUなし） [mm]',
    '溝幅 b（BU1個） [mm]',
    '溝幅 b（BU2個） [mm]',
    '平面溝 外圧用の溝内径 [mm]',
    '平面溝 内圧用の溝外径 [mm]',
    '平面溝 深さ h [mm]',
    '平面溝 溝幅 b [mm]',
  ]
  const exportRows = rows.map(({ ring, flatExternalInner, flatInternalOuter }) => [
    ring.no,
    ring.d1,
    ring.d1Tol,
    ring.group.d2,
    ring.group.d2Tol,
    ring.d,
    ring.D,
    ring.group.widths[0],
    ring.group.widths[1],
    ring.group.widths[2],
    flatExternalInner,
    flatInternalOuter,
    ring.group.flatDepth,
    ring.group.flatWidth,
  ])

  const exampleDepth = grooveDepth(example.ring)

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        standards={meta.standards}
        shareTitle={meta.h1}
        lead={
          <>
            <p>
              JIS B 2401 のOリング {series} 系列（{text.use}）{numbers} の {rows.length}{' '}
              サイズについて、Oリングの内径・太さと、ハウジング（溝）の寸法をまとめた一覧表です。円筒面（ピストン・ロッド）の溝の d・D と、平面（フランジ面など）の溝の径を載せています。
            </p>
            <p>{text.note}つぶし率・充てん率や溝の図は、ツールで確認できます。</p>
          </>
        }
      >
        <ChipNav
          label="系列を切り替え"
          className="mt-4"
          links={ORING_TABLE_PAGES.map((page) => ({
            to: page.path,
            label: `${page.series} 系列`,
            current: page.series === series,
          }))}
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        <Card title={`${series} 系列 太さごとの溝寸法`} index="01" icon={Layers} flush>
          <TableNote>
            <p>
              単位: mm。溝の深さ・溝幅・R・E は、Oリングの太さのグループごとに決まります。BU はバックアップリングの数です。
            </p>
            <p>
              d・D 許容差は、d が 0/−、D が +/0 の値。溝幅 b の許容差は +0.25/0、平面の溝の深さ h の許容差は ±{FLAT_DEPTH_TOL} です。
            </p>
          </TableNote>
          <div className="mt-2">
            <DataTable
              columns={groupColumns}
              rows={groups}
              rowKey={(g) => g.key}
              caption={`${series} 系列 太さごとの溝寸法`}
            />
          </div>
          <div className="space-y-1 p-4">
            <Citation code="JIS B 2401-2" suffix="のハウジングの形状・寸法" />
            <p className="text-xs leading-relaxed text-zinc-600">{SOURCE_NOTE}</p>
          </div>
        </Card>

        <Card title={`Oリング ${series} 系列 寸法表（${numbers}）`} index="02" icon={Table2} flush>
          <TableNote>
            <p>
              単位: mm。呼び番号をタップすると、その番号のつぶし率・充てん率をツールで計算できます。溝幅は上の表（太さごとの溝寸法）を見てください。
            </p>
          </TableNote>
          <div className="flex justify-end px-4 pt-2">
            <TableExport
              title={`Oリング ${series} 系列 寸法表と溝寸法（JIS B 2401）`}
              filename={`o-ring_${series}`}
              headers={exportHeaders}
              rows={exportRows}
              note={`典拠: JIS B 2401-1:2012 / JIS B 2401-2:2012。${SOURCE_NOTE}${SITE.name}${SITE.url ? ` ${SITE.url}${meta.path}` : ''}`}
            />
          </div>
          <div className="mt-2">
            <DataTable
              maxHeightClass="max-h-[70vh] print:max-h-none"
              columns={columns}
              rows={rows}
              rowKey={(row) => row.ring.no}
              caption={`Oリング ${series} 系列 寸法表`}
            />
          </div>
          <div className="space-y-1 p-4">
            <Citation code="JIS B 2401-1" suffix="のOリング寸法" />
            <Citation code="JIS B 2401-2" suffix="のハウジング寸法（円筒面・平面）" />
            <p className="text-xs leading-relaxed text-zinc-600">{SOURCE_NOTE}</p>
          </div>
        </Card>

        <Card title="表の見方と注意" index="03" icon={Info}>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-700 [&>li]:ml-5 [&>li]:list-disc">
            <li>
              円筒面の溝の d・D は、ピストン型では d が溝底の径・D がシリンダの内径、ロッド型では d が軸の径・D が溝底の径です。
            </li>
            <li>
              平面の溝（固定用）は、内側から圧力がかかる内圧用は溝の外径、外側から圧力がかかる外圧用（真空など）は溝の内径が規格で決まっています。
            </li>
            <li>
              内径 d1 の許容差は 1種〜3種の値です。4種C（シリコーンゴム・VMQ）は 1.5 倍、4種D（フッ素ゴム・FKM）は 1.2
              倍になります（旧 JIS B 2406:1991 の注による）。
            </li>
            {aNumbers.length > 0 && (
              <li>
                {aNumbers.join('・')} は、数字が同じ番号（{aNumbers.map((no) => no.slice(0, -1)).join('・')}
                ）より一つ太いOリングです（d は同じで D が違います）。注文・図面で取り違えないよう注意してください。
              </li>
            )}
            <li>{E_NOTE}</li>
          </ul>
          <div className="mt-4">
            <FormulaInfo>
              <p>溝 D と溝の深さは、呼び番号の数値（d）と太さのグループごとの D − d から求めています（{example.ring.no} の例）。</p>
              <Formula>
                D = d + (D − d) = {trim(example.ring.d)} + {trim(example.ring.group.dDiff)} = {trim(example.ring.D)} mm
              </Formula>
              <Formula>
                溝の深さ = (D − d) ÷ 2 = {trim(example.ring.group.dDiff)} ÷ 2 = {trim(exampleDepth)} mm
              </Formula>
              <Formula>
                内圧用の溝外径 = 外圧用の溝内径 + {trim(example.ring.group.flatOffset)} = {trim(example.flatExternalInner)} +{' '}
                {trim(example.ring.group.flatOffset)} = {trim(example.flatInternalOuter)} mm
              </Formula>
              <FormulaLegend
                items={[
                  ['d', '呼び番号の数値（円筒面の溝の d・外圧用の溝内径）'],
                  ['D − d', '太さのグループごとの値（JIS B 2401-2）'],
                ]}
              />
            </FormulaInfo>
          </div>
        </Card>

        <Card title="関連する計算" index="04" icon={Link2}>
          <div className="flex flex-wrap gap-2">
            <ActionLink to={toolHref(ORING_TOOL_PATH, { series, no: text.example })}>
              つぶし率・充てん率を計算する（{series} 系列）
            </ActionLink>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}
