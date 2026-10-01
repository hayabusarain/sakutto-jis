import { Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { TableExport } from '../../components/ui/TableExport'
import { CAP_NON_JIS_LEGEND } from '../../features/bolt-size/data'
import { NonJisMark } from '../../features/bolt-size/Mark'
import { trim } from '../../lib/format'
import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { ChipNav, PageHeader, TableNote } from '../content/PageHeader'
import { SCREW_INDEX_META, screwPath } from './screwPages'
import { screwSummary, SUMMARY_GRADE, SUMMARY_SIZES, type ScrewSummary } from './screwSummary'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

const SUMMARIES = SUMMARY_SIZES.map((d) => screwSummary(d)!)
/** 六角穴付きボルトが JIS B 1176 に無いサイズ（M18・M22・M27） */
const NON_JIS_SIZES = SUMMARIES.filter((row) => row.bolt.capNonJis).map((row) => `M${row.d}`)

const holeText = (row: ScrewSummary) => (row.coarse.recommended ? trim(row.coarse.recommended.hole) : '—')
const acrossText = (row: ScrewSummary) =>
  row.bolt.sIso === row.bolt.sJa ? trim(row.bolt.sIso) : `${trim(row.bolt.sIso)}（${trim(row.bolt.sJa)}）`

export function ScrewIndexPage() {
  const meta = SCREW_INDEX_META

  const columns: Column<ScrewSummary>[] = [
    {
      key: 'd',
      header: 'ねじ',
      align: 'left',
      cell: (row) => (
        <Link to={screwPath(row.d)} className={rowLinkClass}>
          M{row.d}
          <span className="sr-only">の寸法まとめ</span>
        </Link>
      ),
    },
    { key: 'p', header: '並目ピッチ', cell: (row) => trim(row.coarse.p) },
    { key: 'hole', header: '下穴径', cell: holeText },
    { key: 's', header: '二面幅', cell: acrossText },
    {
      key: 'key',
      header: '六角レンチ',
      cell: (row) => (
        <>
          {trim(row.bolt.capKey)}
          <NonJisMark show={row.bolt.capNonJis === true} />
        </>
      ),
    },
    { key: 'h2', header: 'ボルト穴 2級', cell: (row) => trim(row.bolt.holes[1]) },
    {
      key: 'cb',
      header: 'CAP座ぐり 径×深さ',
      cell: (row) =>
        row.bolt.counterbore ? (
          <>
            {trim(row.bolt.counterbore.d)}×{trim(row.bolt.counterbore.h)}
            <NonJisMark show={row.bolt.capNonJis === true} />
          </>
        ) : (
          '—'
        ),
    },
    { key: 'nut', header: 'ナット高さ', cell: (row) => trim(row.bolt.nutStyle1) },
  ]

  const exportHeaders = [
    'ねじの呼び',
    '並目ピッチ [mm]',
    `下穴径（${SUMMARY_GRADE}H・推奨） [mm]`,
    '二面幅（JIS本体） [mm]',
    '二面幅（旧JIS） [mm]',
    '六角レンチ [mm]',
    'ボルト穴径 2級 [mm]',
    'CAP座ぐり径 [mm]',
    'CAP座ぐり深さ [mm]',
    'ナット高さ（スタイル1 最大） [mm]',
    '備考',
  ]
  const exportRows = SUMMARIES.map((row) => [
    `M${row.d}`,
    row.coarse.p,
    row.coarse.recommended?.hole,
    row.bolt.sIso,
    row.bolt.sJa,
    row.bolt.capKey,
    row.bolt.holes[1],
    row.bolt.counterbore?.d,
    row.bolt.counterbore?.h,
    row.bolt.nutStyle1,
    row.bolt.capNonJis ? '六角穴付きボルトは JIS B 1176 に無いサイズ（DIN 912 などの値）' : '',
  ])

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        shareTitle={meta.h1}
        lead={
          <p>
            メートル並目ねじ M{SUMMARY_SIZES[0]}〜M{SUMMARY_SIZES[SUMMARY_SIZES.length - 1]}
            の下穴径・二面幅・六角レンチ・ボルト穴径・座ぐりを1つの表にまとめました。サイズを選ぶと、細目ねじの下穴やナットの高さ、そのボルトを使うJISフランジまで確認できます。
          </p>
        }
      >
        <ChipNav
          label="ねじの呼びを選ぶ"
          className="mt-4"
          links={SUMMARY_SIZES.map((d) => ({ to: screwPath(d), label: `M${d}` }))}
        />
      </PageHeader>

      <Card title={`ねじ寸法一覧（M${SUMMARY_SIZES[0]}〜M${SUMMARY_SIZES[SUMMARY_SIZES.length - 1]}）`} index="01" icon={Table2} flush>
        <TableNote>
          <p>
            単位: mm。下穴径は並目ねじ・公差域クラス {SUMMARY_GRADE}H の推奨値、二面幅の（ ）は旧JIS（附属書JA）、ナット高さは JIS本体スタイル1 の最大値です。
          </p>
          <p>CAP座ぐりは六角穴付きボルト用の、設計でよく使われる参考値です（規格本体の規定ではありません）。</p>
          <p>{CAP_NON_JIS_LEGEND}。</p>
        </TableNote>
        <div className="flex justify-end px-4 pt-2">
          <TableExport
            title={`ねじ寸法一覧（M${SUMMARY_SIZES[0]}〜M${SUMMARY_SIZES[SUMMARY_SIZES.length - 1]}）`}
            filename="screw_sizes"
            headers={exportHeaders}
            rows={exportRows}
            note={`典拠: JIS B 0205-2 / B 0209-1 / ISO 2306 / JIS B 1180 / B 1181 / B 1176 / B 1001。${NON_JIS_SIZES.join('・')} の六角穴付きボルトは JIS B 1176 に無いサイズ（DIN 912 などの値）。${SITE.name}${SITE.url ? ` ${SITE.url}${meta.path}` : ''}`}
          />
        </div>
        <div className="mt-2">
          <DataTable columns={columns} rows={SUMMARIES} rowKey={(row) => String(row.d)} caption="ねじ寸法一覧" />
        </div>
        <div className="space-y-1 p-4">
          <Citation code="JIS B 0205-2" suffix="の並目ピッチ" />
          <Citation code="JIS B 0209-1" suffix="のめねじ内径の公差（下穴径の範囲）" />
          <Citation code="ISO 2306" suffix="の推奨ドリル径" />
          <Citation code="JIS B 1180" suffix="の二面幅（本体・附属書JA）" />
          <Citation code="JIS B 1181" suffix="のナット高さ" />
          <Citation code="JIS B 1176" suffix="の六角穴の二面幅（† のサイズを除く）" />
          <Citation code="JIS B 1001" suffix="のボルト穴径" />
        </div>
      </Card>

      <div className="mt-6">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}
