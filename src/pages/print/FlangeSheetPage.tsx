import { Citation } from '../../components/Citation'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { BOLT_JA_TABLE, NUT_JA_TABLE } from '../../features/bolt-size/calc'
import { BOLT_SIZES } from '../../features/bolt-size/data'
import { raisedFaceHeight } from '../../features/flange-bolt/calc'
import {
  ALL_FLANGE_TABLES_LABEL,
  FLANGE_SIZE_TABLE_NO,
  FLANGE_TABLE_NO,
  flangeTableLabel,
  GASKET_SEAT_TABLE,
  PRESSURE_CLASSES,
  UNVERIFIED_LEGEND,
  type PressureClass,
} from '../../features/flange-bolt/data'
import { trim } from '../../lib/format'
import { UnverifiedMark } from '../content/PageHeader'
import { flangeTableRows, TABLE_BOLT_CONDITIONS } from '../tables/tableData'
import { findSheet } from './printPages'
import { flangeSheetRows, type FlangeSheetRow } from './sheetData'
import { SheetHeading, SheetNotes, SheetPage, SheetTable, type SheetColumn } from './SheetLayout'

const { gasket, threads } = TABLE_BOLT_CONDITIONS

function Length({ value, marked }: { value: string; marked: boolean }) {
  return (
    <>
      {value}
      {value !== '—' && marked && <UnverifiedMark />}
    </>
  )
}

/** 列。detailed（10K だけの早見表）は二面幅とスタッドボルトの長さも載せる */
function columns(detailed: boolean): SheetColumn<FlangeSheetRow>[] {
  return [
    {
      key: 'size',
      header: '呼び径',
      cell: (row) => (
        <>
          {row.size}
          {row.marks.size && <UnverifiedMark />}
        </>
      ),
    },
    { key: 'D', header: '外径 D', cell: (row) => row.D },
    { key: 'C', header: 'PCD C', cell: (row) => row.C },
    { key: 'holes', header: '穴数-穴径', cell: (row) => row.holes },
    { key: 'bolt', header: 'ボルト', cell: (row) => row.bolt },
    ...(detailed ? [{ key: 'across', header: '二面幅', cell: (row: FlangeSheetRow) => row.across }] : []),
    {
      key: 't',
      header: '厚さ t',
      cell: (row) => (
        <>
          {row.t}
          {row.marks.t && <UnverifiedMark />}
        </>
      ),
    },
    detailed
      ? {
          key: 'hex',
          group: 'ボルト長さの目安',
          header: '六角ボルト',
          cell: (row) => (
            <span className="font-bold">
              <Length value={row.hex} marked={row.marks.lengths} />
            </span>
          ),
        }
      : {
          key: 'hex',
          header: '六角ボルト長さ',
          cell: (row) => (
            <span className="font-bold">
              <Length value={row.hex} marked={row.marks.lengths} />
            </span>
          ),
        },
    ...(detailed
      ? [
          {
            key: 'stud',
            group: 'ボルト長さの目安',
            header: 'スタッド',
            cell: (row: FlangeSheetRow) => <Length value={row.stud} marked={row.marks.lengths} />,
          },
        ]
      : []),
  ]
}

/** 計算ロジック（画面だけ）。寸法表のページと同じ式・同じ例（50A） */
function FlangeFormula({ pressure }: { pressure: PressureClass }) {
  const rows = flangeTableRows(pressure)
  const example = rows.find((row) => row.size === '50A') ?? rows[0]
  return (
    <FormulaInfo title="ボルト長さの計算ロジック">
      <p>ボルト長さ（六角ボルトは首下長さ、スタッドボルトは全長）は、次の式で求めて 5mm 刻みに切り上げています。</p>
      <Formula>六角ボルト L = t + t + G + m + k × P</Formula>
      <Formula>スタッドボルト L = t + t + G + 2m + 2 × k × P</Formula>
      <p>
        例: {pressure} {example.size}（M{example.bolt}、t = {example.t}）
      </p>
      <Formula>
        六角 = {example.t} + {example.t} + {gasket} + {trim(example.hex.nutHeight)} + {threads} ×{' '}
        {trim(example.hex.pitch)} = {trim(example.hex.required)} → {example.hex.length ?? '—'} mm
      </Formula>
      <Formula>
        スタッド = {example.t} + {example.t} + {gasket} + 2 × {trim(example.stud.nutHeight)} + 2 × {threads} ×{' '}
        {trim(example.stud.pitch)} = {trim(example.stud.required)} → {example.stud.length ?? '—'} mm
      </Formula>
      <FormulaLegend
        items={[
          ['t', `フランジの厚さ（JIS B 2220。RF は座の高さを含む）`],
          ['G', `ガスケットの厚さ（${gasket} mm）`],
          ['m', 'ナットの高さ（JIS B 1181 本体・スタイル1の最大値）'],
          ['k × P', `ナットからの突き出し（${threads} 山 × 並目ピッチ）`],
        ]}
      />
    </FormulaInfo>
  )
}

/** ナット高さの表（JIS B 1181 スタイル1。第2選択の M22 は表4、ほかは表3） */
function nutTables(pressures: readonly PressureClass[]): string {
  const bolts = new Set(pressures.flatMap((pressure) => flangeTableRows(pressure).map((row) => row.bolt)))
  const tables = new Set(
    [...bolts].map((bolt) => (BOLT_SIZES.find((size) => size.d === bolt)?.secondChoice ? '表4' : '表3')),
  )
  return [...tables].sort().join('・')
}

export function FlangeSheetPage({ sheet }: { sheet: 'flange-10k' | 'flange' }) {
  const meta = findSheet(sheet)
  const detailed = sheet === 'flange-10k'
  const pressures: readonly PressureClass[] = detailed ? ['10K'] : PRESSURE_CLASSES
  const tables = pressures.map((pressure) => ({ pressure, rows: flangeSheetRows(pressure) }))
  const hasUnverified = tables.some(({ rows }) =>
    rows.some((row) => row.marks.size || row.marks.t || row.marks.lengths),
  )
  const cols = columns(detailed)
  const example = flangeTableRows(pressures[0]).find((row) => row.size === '50A')

  return (
    <SheetPage
      meta={meta}
      density={detailed ? 'loose' : 'compact'}
      summary={
        <p>
          単位 mm。鋼製管フランジ（JIS B 2220）の主要寸法です。「穴数-穴径」の 4-19 は、径 19 mm のボルト穴が 4
          個（ボルトも 4 本）です。
        </p>
      }
      citations={
        <>
          <Citation code="JIS B 2220" detail={detailed ? flangeTableLabel('10K') : ALL_FLANGE_TABLES_LABEL} />
          {detailed ? (
            <>
              <Citation
                code="JIS B 1180"
                detail={`本体 表3・表4、附属書JA ${BOLT_JA_TABLE}`}
                suffix="（ボルトの二面幅）"
              />
              <Citation
                code="JIS B 1181"
                detail={`本体 ${nutTables(pressures)} 六角ナット・スタイル1、附属書JA ${NUT_JA_TABLE}`}
                suffix="（ナットの二面幅と、ボルト長さの計算に使うナット高さ）"
              />
            </>
          ) : (
            <Citation
              code="JIS B 1181"
              detail={`${nutTables(pressures)} 六角ナット・スタイル1`}
              suffix="のナット高さ（ボルト長さの計算）"
            />
          )}
          <Citation code="JIS B 0205-2" detail="表2 呼び径及びピッチの選択" suffix="の並目ピッチ（突き出しの計算）" />
        </>
      }
      formula={<FlangeFormula pressure={pressures[0]} />}
    >
      {/* 画面では縦に並べ（列が多く、横に並べると表の右側が隠れる）、印刷では 2×2 に並べて A4 縦1枚に収める */}
      <div className={detailed ? '' : 'grid gap-4 print:grid-cols-2 print:gap-x-3 print:gap-y-2'}>
        {tables.map(({ pressure, rows }) => (
          <section key={pressure} className="min-w-0">
            <SheetHeading aside={`JIS B 2220 ${FLANGE_TABLE_NO[pressure]}`}>{pressure} フランジ</SheetHeading>
            <SheetTable
              caption={`JIS ${pressure} フランジの寸法とボルト長さの目安`}
              columns={cols}
              rows={rows}
              rowKey={(row) => row.size}
            />
          </section>
        ))}
      </div>
      <SheetNotes>
        <li>
          ボルト長さは、同じフランジ2枚・ガスケット {gasket}{' '}
          mm・座金なし・JIS本体のナット（スタイル1）・ナットからの突き出し {threads}
          山で計算し、5mm 刻みに切り上げた目安です（六角ボルト L = 2t + {gasket} + ナット高さ + {threads} × ピッチ
          {example?.hex.length
            ? `。例: ${pressures[0]} ${example.size} は ${trim(example.hex.required)} → ${example.hex.length}`
            : ''}
          ）。市販品の長さはメーカーで違うので、在庫の長さも確認してください。
        </li>
        <li>
          厚さ t は、平面座（RF）のフランジでは座の高さ f を含みます（JIS B 2220 {GASKET_SEAT_TABLE}。例: 50A は f ={' '}
          {raisedFaceHeight('50A') ?? '—'} mm）。厚さの許容差はプラス側だけなので、実物は表より厚いことがあります。
        </li>
        {detailed && (
          <li>
            二面幅は六角ボルト・ナットの JIS本体の値で、（ ）は旧JIS（附属書JA）の値です。10K薄形は載せていません。
          </li>
        )}
        {!detailed && (
          <li>16K・20K に 175A・225A はありません（JIS B 2220 {FLANGE_SIZE_TABLE_NO}）。10K薄形は載せていません。</li>
        )}
        {hasUnverified && <li>{UNVERIFIED_LEGEND}です。重要な用途では JIS B 2220 の原文で確認してください。</li>}
      </SheetNotes>
    </SheetPage>
  )
}
