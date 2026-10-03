import { Info, Link2, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { TableExport } from '../../components/ui/TableExport'
import { BOLT_SIZES } from '../../features/bolt-size/data'
import { flangeThicknessTolerance, raisedFaceHeight } from '../../features/flange-bolt/calc'
import {
  FLANGE_SEAT_COMBINATION_TABLE,
  FLANGE_SIZE_TABLE_NO,
  FLANGE_TABLE_NO,
  FLANGE_TOLERANCE_TABLE,
  flangeTableLabel,
  GASKET_SEAT_TABLE,
  type PressureClass,
} from '../../features/flange-bolt/data'
import { trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { standardLabel } from '../../standards'
import { ActionLink, ChipNav, PageHeader, TableNote, UnverifiedMark } from '../content/PageHeader'
import { screwPath } from '../screws/screwPages'
import {
  flangeTableMarks,
  flangeTableRows,
  flangeTableStatus,
  TABLE_BOLT_CONDITIONS,
  type FlangeTableRow,
} from './tableData'
import { FLANGE_TABLE_PAGES, FLANGE_TOOL_PATH, PIPE_TABLE_PAGES } from './tablePages'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

/**
 * ボルト長さのセル。未確認の厚さ t から計算した長さには、厚さと同じく ※ を付ける
 * （行全体が未確認の行は、呼び径の欄の ※ で示す）
 */
function BoltLengthCell({ length, row }: { length: number | null; row: FlangeTableRow }) {
  return (
    <>
      {length ?? '—'}
      {length !== null && flangeTableMarks(row).lengths && <UnverifiedMark />}
    </>
  )
}

export function FlangeTablePage({ pressure }: { pressure: PressureClass }) {
  const meta = FLANGE_TABLE_PAGES.find((page) => page.pressure === pressure)!
  const rows = flangeTableRows(pressure)
  const sizes = `${rows[0].size}〜${rows[rows.length - 1].size}`
  const unverifiedRows = rows.filter((row) => row.unverified.row).map((row) => row.size)
  const unverifiedT = rows.some((row) => row.unverified.t)
  const markedLengths = rows.some((row) => flangeTableMarks(row).lengths)
  const example = rows.find((row) => row.size === '50A') ?? rows[0]
  const exampleFace = raisedFaceHeight(example.size)
  const hasStatus = rows.some((row) => flangeTableStatus(row) !== '')
  const tableNo = FLANGE_TABLE_NO[pressure]
  const bolts = [...new Set(rows.map((row) => row.bolt))].sort((a, b) => a - b)
  // ナット高さの表（JIS B 1181 スタイル1。M22 は第2選択の表4、ほかは第1選択の表3）
  const nutTables = [
    ...new Set(bolts.map((bolt) => (BOLT_SIZES.find((size) => size.d === bolt)?.secondChoice ? '表4' : '表3'))),
  ]
    .sort()
    .join('・')
  const { gasket, threads } = TABLE_BOLT_CONDITIONS

  const columns: Column<FlangeTableRow>[] = [
    {
      key: 'size',
      header: '呼び径',
      align: 'left',
      cell: (r) => (
        <>
          <Link to={toolHref(FLANGE_TOOL_PATH, { pressure, size: r.size })} className={rowLinkClass}>
            {r.size}
            <span className="sr-only">（{pressure}）のボルト長さを計算する</span>
          </Link>
          {flangeTableMarks(r).size && <UnverifiedMark />}
        </>
      ),
    },
    { key: 'D', header: '外径 D', cell: (r) => r.D },
    { key: 'C', header: 'PCD C', cell: (r) => r.C },
    { key: 'n', header: '穴数', cell: (r) => r.n },
    { key: 'h', header: '穴径 h', cell: (r) => r.h },
    { key: 'bolt', header: 'ボルト', cell: (r) => `M${r.bolt}` },
    {
      key: 't',
      header: '厚さ t',
      cell: (r) => (
        <>
          {r.t}
          {flangeTableMarks(r).t && <UnverifiedMark />}
        </>
      ),
    },
    { key: 'hex', header: '六角ボルト長さ', cell: (r) => <BoltLengthCell length={r.hex.length} row={r} /> },
    { key: 'stud', header: 'スタッド長さ', cell: (r) => <BoltLengthCell length={r.stud.length} row={r} /> },
  ]

  const exportHeaders = [
    '呼び径',
    '外径 D [mm]',
    'PCD C [mm]',
    'ボルト穴の数',
    'ボルト穴の径 h [mm]',
    'ボルトの呼び',
    '厚さ t [mm]',
    '六角ボルト長さの目安 [mm]',
    'スタッドボルト長さの目安 [mm]',
    // ※（規格原文で未確認）の値があるときだけ、確認状況の列を付ける
    ...(hasStatus ? ['確認状況'] : []),
  ]
  const exportRows = rows.map((r) => [
    r.size,
    r.D,
    r.C,
    r.n,
    r.h,
    `M${r.bolt}`,
    r.t,
    r.hex.length,
    r.stud.length,
    ...(hasStatus ? [flangeTableStatus(r)] : []),
  ])
  const exportNote = [
    `典拠: ${standardLabel('JIS B 2220')} ${flangeTableLabel(pressure)}`,
    `ボルト長さはガスケット${gasket}mm・座金なし・JIS本体のナット・突き出し${threads}山・5mm刻みで計算した目安`,
    `${SITE.name}${SITE.url ? ` ${SITE.url}${meta.path}` : ''}`,
  ].join('。')

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        standards={['JIS B 2220']}
        shareTitle={meta.h1}
        lead={
          <>
            <p>
              JIS B 2220（鋼製管フランジ）の呼び圧力 {pressure}（{tableNo}）について、{sizes}
              の外径・ボルト穴中心円の径（PCD）・ボルト穴の数と径・ボルトの呼び・厚さをまとめた一覧表です。
            </p>
            <p>
              六角ボルトとスタッドボルトの長さの目安も載せています。ガスケット・座金・ナットを変えた長さや DXF 図面は、ツールで計算できます。
            </p>
          </>
        }
      >
        <ChipNav
          label="呼び圧力を切り替え"
          className="mt-4"
          links={FLANGE_TABLE_PAGES.map((page) => ({
            to: page.path,
            label: page.pressure,
            current: page.pressure === pressure,
          }))}
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        <Card title={`JIS ${pressure} フランジ寸法表`} index="01" icon={Table2} flush>
          <TableNote>
            <p>単位: mm。呼び径をタップすると、そのサイズのボルト長さをツールで計算できます。</p>
            <p>
              ボルト長さは、同じフランジ2枚・ガスケット {gasket} mm・座金なし・ナットからの突き出し {threads}
              山で計算し、5mm刻みに切り上げた目安です。
            </p>
            {(unverifiedRows.length > 0 || unverifiedT) && (
              <p className="font-semibold text-orange-800">
                ※ は規格原文での確認が済んでいない値です
                {markedLengths && '（未確認の厚さから計算したボルト長さにも付けています）'}
                。重要な用途では JIS B 2220 の原文で確認してください。
              </p>
            )}
          </TableNote>
          <div className="flex justify-end px-4 pt-2">
            <TableExport
              title={`JIS ${pressure} フランジ寸法表（JIS B 2220 ${tableNo}）`}
              filename={`JIS_${pressure}_flange`}
              headers={exportHeaders}
              rows={exportRows}
              note={exportNote}
            />
          </div>
          <div className="mt-2">
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.size} caption={`JIS ${pressure} フランジ寸法表`} />
          </div>
          <div className="space-y-1 p-4">
            <Citation code="JIS B 2220" detail={flangeTableLabel(pressure)} />
            <Citation code="JIS B 1181" detail={`${nutTables} 六角ナット・スタイル1`} suffix="のナット高さ（ボルト長さの計算）" />
            <Citation code="JIS B 0205-2" suffix="の並目ピッチ（突き出しの計算）" />
          </div>
        </Card>

        <Card title="表の見方と注意" index="02" icon={Info}>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-700 [&>li]:ml-5 [&>li]:list-disc">
            <li>呼び径の「A」は管の呼び径です（例: 50A = 2B）。ボルトの本数はボルト穴の数と同じです。</li>
            {pressure === '10K' && <li>10K薄形フランジ（寸法が別の表）は載せていません。</li>}
            <li>
              厚さ t は、平面座（RF）のフランジでは座の高さ f を含む厚さです（JIS B 2220 {GASKET_SEAT_TABLE}。例: {example.size} は f ={' '}
              {exampleFace ?? '—'} mm）。座を含まない厚さの資料と組み合わせるときは、その分を足して考えてください。
            </li>
            <li>
              {pressure === '20K'
                ? '20K には全面座（FF）の欄がなく、平面座（RF）などです'
                : `${pressure} で平面座（RF）の欄があるのは WN・IT 形だけで、スリップオン溶接式（${pressure === '16K' ? 'SOH' : 'SOP・SOH'}）や閉止フランジ（BL）などは${
                    pressure === '5K' ? '全面座（FF）だけです' : '全面座（FF）などで、RF の欄は「—」です'
                  }`}
              （JIS B 2220 {FLANGE_SEAT_COMBINATION_TABLE}）。市販品や図面の呼び方と違うことがあるので、現物・図面の表記も確認してください。
            </li>
            <li>
              厚さの許容差はプラス側だけです（JIS B 2220 {FLANGE_TOLERANCE_TABLE}。20 mm 以下 +{flangeThicknessTolerance(20)} mm、20 mm を超え 50 mm 以下 +
              {flangeThicknessTolerance(50)} mm。RF は t − f に対して）。実物は表の厚さより厚いことがあるので、ボルトの突き出しには余裕を見てください。
            </li>
            {unverifiedRows.length > 0 && (
              <li>
                {unverifiedRows.join('・')}
                の行（※）は、規格原文での確認が済んでいません。
              </li>
            )}
            {(pressure === '16K' || pressure === '20K') && (
              <li>
                {pressure} に 175A・225A はありません（JIS B 2220 {FLANGE_SIZE_TABLE_NO}）。90A はあります。
              </li>
            )}
            <li>
              ボルト長さは計算上の必要長さを切り上げた値です。市販品の長さはメーカーによって違うので、在庫の長さも確認してください。
            </li>
          </ul>

          <div className="mt-4">
            <FormulaInfo>
              <p>ボルト長さ（六角ボルトは首下長さ、スタッドボルトは全長）は、次の式で求めています。</p>
              <Formula>六角ボルト L = t + t + G + m + k × P</Formula>
              <Formula>スタッドボルト L = t + t + G + 2m + 2 × k × P</Formula>
              <p>
                例: {pressure} {example.size}（M{example.bolt}、t = {example.t}）
              </p>
              <Formula>
                六角 = {example.t} + {example.t} + {gasket} + {trim(example.hex.nutHeight)} + {threads} × {trim(example.hex.pitch)} ={' '}
                {trim(example.hex.required)} → {example.hex.length ?? '—'} mm
              </Formula>
              <Formula>
                スタッド = {example.t} + {example.t} + {gasket} + 2 × {trim(example.stud.nutHeight)} + 2 × {threads} ×{' '}
                {trim(example.stud.pitch)} = {trim(example.stud.required)} → {example.stud.length ?? '—'} mm
              </Formula>
              <FormulaLegend
                items={[
                  ['t', `フランジの厚さ（JIS B 2220 ${tableNo}。RF は座の高さを含む）`],
                  ['G', 'ガスケットの厚さ'],
                  ['m', 'ナットの高さ（JIS B 1181 本体・スタイル1の最大値）'],
                  ['k × P', 'ナットからの突き出し（山数 × 並目ピッチ）'],
                ]}
              />
              <p>計算値を 5mm 刻みに切り上げています。</p>
            </FormulaInfo>
          </div>
        </Card>

        <Card title="関連する計算・寸法表" index="03" icon={Link2}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ActionLink to={toolHref(FLANGE_TOOL_PATH, { pressure })}>
                条件を変えてボルト長さを計算する（{pressure}）
              </ActionLink>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-zinc-500">
                このフランジに使うボルトの寸法（二面幅・ボルト穴など）
              </p>
              <ChipNav
                label="ボルトの寸法まとめ"
                className="mt-2"
                links={bolts.map((d) => ({ to: screwPath(d), label: `M${d}` }))}
              />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-zinc-500">鋼管の寸法表</p>
              <ChipNav
                label="鋼管の寸法表"
                className="mt-2"
                links={PIPE_TABLE_PAGES.map((page) => ({ to: page.path, label: page.label }))}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}
