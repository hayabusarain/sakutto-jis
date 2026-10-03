import { Info, Link2, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { TableExport } from '../../components/ui/TableExport'
import {
  MASS_FACTOR,
  nonGeneralPurposeSizes,
  unitMass,
  unitMassText,
  type PipeDimensions,
} from '../../features/steel-pipe/calc'
import { PIPE_EDITION_NOTE, PIPE_SPECS, PIPE_STANDARD_TABLE, type PipeSpec } from '../../features/steel-pipe/data'
import { fixed, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { standardLabel, STANDARDS } from '../../standards'
import { ActionLink, ChipNav, PageHeader, TableNote } from '../content/PageHeader'
import { pipeTableRows } from './tableData'
import { FLANGE_TABLE_PAGES, PIPE_TABLE_PAGES, PIPE_TOOL_PATH } from './tablePages'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

export function PipeTablePage({ spec }: { spec: PipeSpec }) {
  const meta = PIPE_TABLE_PAGES.find((page) => page.spec === spec)!
  const info = PIPE_SPECS[spec]
  const rows = pipeTableRows(spec)
  const sizes = `${rows[0].size.a}〜${rows[rows.length - 1].size.a}`
  const example = rows.find((row) => row.size.a === '50A') ?? rows[0]
  const table = PIPE_STANDARD_TABLE[info.standard]
  const nonGeneral = nonGeneralPurposeSizes(spec)

  const columns: Column<PipeDimensions>[] = [
    {
      key: 'a',
      header: '呼び径',
      align: 'left',
      cell: (row) => (
        <Link to={toolHref(PIPE_TOOL_PATH, { spec, a: row.size.a })} className={rowLinkClass}>
          {row.size.a}
          <span className="sr-only">（{info.label}）の重量を計算する</span>
        </Link>
      ),
    },
    { key: 'b', header: 'B', cell: (row) => row.size.b },
    { key: 'od', header: '外径 D', cell: (row) => fixed(row.od, 1) },
    { key: 't', header: '厚さ t', cell: (row) => fixed(row.t, 1) },
    { key: 'id', header: '内径 d', cell: (row) => fixed(row.id, 1) },
    { key: 'w', header: '質量 kg/m', cell: (row) => unitMassText(row.massPerM) },
    { key: 'v', header: '内容積 L/m', cell: (row) => fixed(row.volumePerM, 2) },
    { key: 's', header: '外表面積 m²/m', cell: (row) => fixed(row.surfacePerM, 3) },
  ]

  const exportHeaders = [
    '呼び径（A）',
    '呼び径（B）',
    '外径 D [mm]',
    '厚さ t [mm]',
    '内径 d [mm]',
    '単位質量 [kg/m]',
    '内容積 [L/m]',
    '外表面積 [m²/m]',
  ]
  const exportRows = rows.map((row) => [
    row.size.a,
    row.size.b,
    fixed(row.od, 1),
    fixed(row.t, 1),
    fixed(row.id, 1),
    unitMassText(row.massPerM),
    fixed(row.volumePerM, 2),
    fixed(row.surfacePerM, 3),
  ])

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        standards={[info.standard]}
        shareTitle={meta.h1}
        lead={
          <>
            <p>
              {info.standard}（{STANDARDS[info.standard].title}）{table.no} の {info.label}
              について、{sizes} の外径・厚さ・内径・1mあたりの質量（kg/m）・内容積・外表面積をまとめた一覧表です。
            </p>
            <p>長さと本数から鋼管の重量（満水時を含む）を出すときは、ツールで計算できます。</p>
          </>
        }
      >
        <ChipNav
          label="規格を切り替え"
          className="mt-4"
          links={PIPE_TABLE_PAGES.map((page) => ({
            to: page.path,
            label: PIPE_SPECS[page.spec].label,
            current: page.spec === spec,
          }))}
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        <Card title={`${info.name} 寸法・質量表`} index="01" icon={Table2} flush>
          <TableNote>
            <p>単位: mm（質量・内容積・外表面積を除く）。呼び径をタップすると、そのサイズで重量を計算できます。</p>
            <p>B はインチ呼び（例: 50A = 2B）。質量は黒管の値です{spec === 'sgp' && '（ソケットを含まない）'}。</p>
          </TableNote>
          <div className="flex justify-end px-4 pt-2">
            <TableExport
              title={`${info.name} 寸法・質量表（${standardLabel(info.standard)} ${table.no}）`}
              filename={`steel_pipe_${spec}`}
              headers={exportHeaders}
              rows={exportRows}
              note={`典拠: ${standardLabel(info.standard)} ${table.no} ${table.title}（2019年版の原文と照合。2026年版とは未照合）。内径・内容積・外表面積は外径と厚さから計算。${SITE.name}${SITE.url ? ` ${SITE.url}${meta.path}` : ''}`}
            />
          </div>
          <div className="mt-2">
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.size.a} caption={`${info.name} 寸法・質量表`} />
          </div>
          <div className="space-y-1 p-4">
            <Citation code={info.standard} detail={`${table.no} ${table.title}`} suffix="の外径・厚さ・単位質量" />
            <p className="text-xs leading-relaxed text-zinc-500">{PIPE_EDITION_NOTE}</p>
          </div>
        </Card>

        <Card title="表の見方と注意" index="02" icon={Info}>
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-700 [&>li]:ml-5 [&>li]:list-disc">
            <li>外径は SGP と STPG（Sch40・Sch80）で共通です。同じ呼び径でも、規格によって厚さ（内径）が違います。</li>
            {spec !== 'sgp' && (
              <li>Sch40・Sch80 の外径・厚さ・単位質量は、STPG370 と STPG410 で共通です（JIS G 3454 {table.no}）。</li>
            )}
            {nonGeneral.length > 0 && (
              <li>
                {nonGeneral.join('・')} は、JIS G 3454 {table.no} で汎用品（太枠内）とされていないサイズです。入手できるかはメーカー・商社に確認してください。
              </li>
            )}
            <li>内径は「外径 − 2 × 厚さ」で求めた値です。</li>
            <li>
              質量は、JIS の式で計算して有効数字3桁に丸めた単位質量です（黒管）。亜鉛めっき管（白管）はめっきの分だけ重くなり、厚さの許容差によっても実際の質量は多少ばらつきます。
            </li>
            <li>内容積（L/m）は、満水時の水の質量（kg/m）とほぼ同じ数値です。配管の支持や運搬の荷重の目安に使えます。</li>
            <li>
              {spec === 'sgp'
                ? '175A・225A は SGP にだけあるサイズです（Sch40・Sch80 の表にはありません）。'
                : '175A・225A は SGP にだけあるサイズのため、この表にはありません。'}
            </li>
          </ul>
          <div className="mt-4">
            <FormulaInfo>
              <p>単位質量・内径・内容積・外表面積は、次の式で求めています（{example.size.a} の例）。</p>
              <Formula>
                W = {MASS_FACTOR} × t × (D − t) = {MASS_FACTOR} × {fixed(example.t, 1)} × ({fixed(example.od, 1)} −{' '}
                {fixed(example.t, 1)}) = {trim(unitMass(example.od, example.t), 4)} → 有効数字3桁で{' '}
                {unitMassText(example.massPerM)} kg/m
              </Formula>
              <Formula>
                d = D − 2t = {fixed(example.od, 1)} − 2 × {fixed(example.t, 1)} = {fixed(example.id, 1)} mm
              </Formula>
              <Formula>
                内容積 = π/4 × d² × 1m = π/4 × {fixed(example.id, 1)}² × 1000 ÷ 10⁶ = {fixed(example.volumePerM, 2)} L/m
              </Formula>
              <Formula>
                外表面積 = π × D × 1m = π × {fixed(example.od, 1)} ÷ 1000 = {fixed(example.surfacePerM, 3)} m²/m
              </Formula>
              <FormulaLegend
                items={[
                  ['D', '外径 [mm]'],
                  ['t', '厚さ [mm]'],
                  ['d', '内径 [mm]'],
                  ['W', '単位質量 [kg/m]（鋼の密度 7.85 g/cm³）'],
                ]}
              />
            </FormulaInfo>
          </div>
        </Card>

        <Card title="関連する計算・寸法表" index="03" icon={Link2}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ActionLink to={toolHref(PIPE_TOOL_PATH, { spec })}>長さと本数から重量を計算する（{info.label}）</ActionLink>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wider text-zinc-500">JISフランジの寸法表</p>
              <ChipNav
                label="JISフランジの寸法表"
                className="mt-2"
                links={FLANGE_TABLE_PAGES.map((page) => ({ to: page.path, label: page.pressure }))}
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
