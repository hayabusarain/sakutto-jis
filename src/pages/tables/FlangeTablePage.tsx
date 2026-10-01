import { Info, Link2, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { TableExport } from '../../components/ui/TableExport'
import type { PressureClass } from '../../features/flange-bolt/data'
import { trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { standardLabel } from '../../standards'
import { ActionLink, ChipNav, PageHeader, TableNote, UnverifiedMark } from '../content/PageHeader'
import { screwPath } from '../screws/screwPages'
import { flangeTableRows, TABLE_BOLT_CONDITIONS, type FlangeTableRow } from './tableData'
import { FLANGE_TABLE_PAGES, FLANGE_TOOL_PATH, PIPE_TABLE_PAGES } from './tablePages'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

export function FlangeTablePage({ pressure }: { pressure: PressureClass }) {
  const meta = FLANGE_TABLE_PAGES.find((page) => page.pressure === pressure)!
  const rows = flangeTableRows(pressure)
  const sizes = `${rows[0].size}〜${rows[rows.length - 1].size}`
  const unverifiedRows = rows.filter((row) => row.unverified.row).map((row) => row.size)
  const unverifiedT = rows.some((row) => row.unverified.t)
  const example = rows.find((row) => row.size === '50A') ?? rows[0]
  const bolts = [...new Set(rows.map((row) => row.bolt))].sort((a, b) => a - b)
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
          {r.unverified.row && <UnverifiedMark />}
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
          {r.unverified.t && !r.unverified.row && <UnverifiedMark />}
        </>
      ),
    },
    { key: 'hex', header: '六角ボルト長さ', cell: (r) => r.hex.length ?? '—' },
    { key: 'stud', header: 'スタッド長さ', cell: (r) => r.stud.length ?? '—' },
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
    '確認状況',
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
    r.unverified.row ? '要確認（行全体）' : r.unverified.t ? '要確認（厚さ）' : '',
  ])
  const exportNote = [
    `典拠: ${standardLabel('JIS B 2220')}（${pressure}・並形）`,
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
              JIS B 2220（鋼製管フランジ）の呼び圧力 {pressure}・並形について、{sizes}
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
        <Card title={`JIS ${pressure} フランジ寸法表（並形）`} index="01" icon={Table2} flush>
          <TableNote>
            <p>単位: mm。呼び径をタップすると、そのサイズのボルト長さをツールで計算できます。</p>
            <p>
              ボルト長さは、同じフランジ2枚・ガスケット {gasket} mm・座金なし・ナットからの突き出し {threads}
              山で計算し、5mm刻みに切り上げた目安です。
            </p>
            {(unverifiedRows.length > 0 || unverifiedT) && (
              <p className="font-semibold text-orange-800">
                ※ は規格原文での確認が済んでいない値です。重要な用途では JIS B 2220 の原文で確認してください。
              </p>
            )}
          </TableNote>
          <div className="flex justify-end px-4 pt-2">
            <TableExport
              title={`JIS ${pressure} フランジ寸法表（JIS B 2220・並形）`}
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
            <Citation code="JIS B 2220" detail={`${pressure}（並形）`} suffix="のフランジ寸法" />
            <Citation code="JIS B 1181" suffix="のナット高さ（ボルト長さの計算）" />
            <Citation code="JIS B 0205-2" suffix="の並目ピッチ（突き出しの計算）" />
          </div>
        </Card>

        <Card title="表の見方と注意" index="02" icon={Info}>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-700 [&>li]:ml-5 [&>li]:list-disc">
            <li>呼び径の「A」は管の呼び径です（例: 50A = 2B）。ボルトの本数はボルト穴の数と同じです。</li>
            <li>
              厚さ t は、座（RF）の高さを含む厚さです。座を含まない厚さの資料と組み合わせるときは、その分を足して考えてください。
            </li>
            {unverifiedRows.length > 0 && (
              <li>
                {unverifiedRows.join('・')}
                の行（※）は、規格原文での確認が済んでいません。
              </li>
            )}
            {pressure === '5K' && (
              <li>50A の厚さは資料により 12 と 14 があり、ボルトが長めになる 14 を載せています（※）。</li>
            )}
            {pressure === '16K' && (
              <li>16K の厚さ（※）は規格原文での確認が済んでいません。厚さから求めたボルト長さも、目安としてご覧ください。</li>
            )}
            {(pressure === '16K' || pressure === '20K') && (
              <li>
                {pressure} の表に 175A・225A はありません。90A は規格にあるか確認できていないため載せていません。
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
                  ['t', 'フランジの厚さ（JIS B 2220。座の高さを含む）'],
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
