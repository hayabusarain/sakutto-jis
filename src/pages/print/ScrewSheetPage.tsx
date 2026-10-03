import { Citation } from '../../components/Citation'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { BOLT_JA_TABLE, CAP_TABLE, HOLE_TABLE, JA_FUTURE_NOTE, NUT_JA_TABLE } from '../../features/bolt-size/calc'
import { CAP_NON_JIS_LEGEND, CAP_NON_JIS_MARK, UNVERIFIED_LEGEND } from '../../features/bolt-size/data'
import { NonJisMark } from '../../features/bolt-size/Mark'
import {
  basicMinorDiameter,
  engagementPercent,
  formatHole,
  minorDiameterLimits,
  TWO_H1_PER_PITCH,
} from '../../features/tap-drill/calc'
import { fixed, trim } from '../../lib/format'
import { UnverifiedMark } from '../content/PageHeader'
import { SUMMARY_GRADE } from '../screws/screwSummary'
import { findSheet } from './printPages'
import { SCREW_SHEET_ROWS, type ScrewSheetRow } from './sheetData'
import { SheetHeading, SheetNotes, SheetPage, SheetTable, type SheetColumn } from './SheetLayout'

const ROWS = SCREW_SHEET_ROWS
const SECOND_CHOICE = ROWS.filter((row) => row.secondChoice).map((row) => `M${row.d}`)
const NON_JIS = ROWS.filter((row) => row.capNonJis).map((row) => `M${row.d}`)
const DIFFERS = ROWS.filter((row) => row.acrossDiffers).map((row) => `M${row.d}`)
/** 下穴径がすべて ISO 2306 の推奨ドリル径か（いまは M3〜M36 の並目すべて） */
const ALL_ISO = ROWS.every((row) => row.holeBasis === 'iso2306')
const HAS_UNVERIFIED = ROWS.some((row) => row.acrossJaUnverified || row.spotFaceUnverified)

const COLUMNS: SheetColumn<ScrewSheetRow>[] = [
  { key: 'd', header: 'ねじ', cell: (row) => `M${row.d}` },
  { key: 'p', header: '並目ピッチ', cell: (row) => row.pitch },
  {
    key: 'hole',
    header: (
      <>
        下穴径<span className="block font-normal">（{SUMMARY_GRADE}H）</span>
      </>
    ),
    cell: (row) => <span className="font-bold">{row.hole}</span>,
  },
  { key: 'sIso', group: '二面幅（ボルト・ナット）', header: 'JIS本体', cell: (row) => row.acrossIso },
  {
    key: 'sJa',
    group: '二面幅（ボルト・ナット）',
    header: '旧JIS',
    cell: (row) => (
      <span className={row.acrossDiffers ? 'font-bold' : 'text-zinc-500'}>
        {row.acrossJa}
        {row.acrossJaUnverified && <UnverifiedMark />}
      </span>
    ),
  },
  { key: 'hole2', group: 'ボルト穴（JIS B 1001）', header: '穴径 2級', cell: (row) => row.boltHole },
  {
    key: 'spot',
    group: 'ボルト穴（JIS B 1001）',
    header: "ざぐり径 D'",
    cell: (row) => (
      <>
        {row.spotFace}
        {row.spotFaceUnverified && <UnverifiedMark />}
      </>
    ),
  },
  {
    key: 'key',
    group: '六角穴付きボルト',
    header: '六角レンチ',
    cell: (row) => (
      <>
        {row.hexKey}
        <NonJisMark show={row.capNonJis} />
      </>
    ),
  },
  {
    key: 'cb',
    group: '六角穴付きボルト',
    header: '座ぐり 径×深さ（参考）',
    cell: (row) =>
      row.counterbore ? (
        <>
          {row.counterbore}
          <NonJisMark show={row.capNonJis} />
        </>
      ) : (
        '—'
      ),
  },
]

/** 計算ロジックの例（M12） */
const EXAMPLE = ROWS.find((row) => row.d === 12) ?? ROWS[0]

function ScrewFormula() {
  const p = Number(EXAMPLE.pitch)
  const limits = minorDiameterLimits(EXAMPLE.d, p, SUMMARY_GRADE)
  const hole = Number(EXAMPLE.hole)
  return (
    <FormulaInfo title="下穴径の決め方（計算ロジック）">
      <p>
        下穴径は、めねじ内径 D1 の許容範囲（公差域クラス {SUMMARY_GRADE}H）に入る径から選んでいます。並目は ISO 2306
        の推奨ドリル径です。例: M{EXAMPLE.d}（P = {EXAMPLE.pitch}）
      </p>
      <Formula>
        D1 = D − {TWO_H1_PER_PITCH} × P = {EXAMPLE.d} − {TWO_H1_PER_PITCH} × {EXAMPLE.pitch} ={' '}
        {fixed(basicMinorDiameter(EXAMPLE.d, p), 3)} mm
      </Formula>
      {limits && (
        <Formula>
          {SUMMARY_GRADE}H の範囲 = {fixed(limits.min, 3)} 〜 {fixed(limits.max, 3)} mm → 下穴径 {formatHole(hole)} mm
        </Formula>
      )}
      <Formula>
        ひっかかり率 = (D − 下穴径) ÷ ({TWO_H1_PER_PITCH} × P) × 100 = ({EXAMPLE.d} − {formatHole(hole)}) ÷ (
        {TWO_H1_PER_PITCH} × {EXAMPLE.pitch}) × 100 = {trim(engagementPercent(EXAMPLE.d, p, hole), 1)} %
      </Formula>
      <FormulaLegend
        items={[
          ['D', 'ねじの呼び径 [mm]'],
          ['P', 'ピッチ [mm]'],
          ['D1', 'めねじ内径の基準寸法（JIS B 0205-4 の式）'],
        ]}
      />
      <p>二面幅・六角レンチ・ボルト穴径・ざぐり径は規格の表の値で、計算はしていません。</p>
    </FormulaInfo>
  )
}

export function ScrewSheetPage() {
  const meta = findSheet('screw')
  return (
    <SheetPage
      meta={meta}
      density="loose"
      summary={
        <p>
          単位 mm。メートル並目ねじの寸法です。細目ねじの下穴、ボルト穴
          1級・3級、ナットの高さはスマホのツールで確認できます。
        </p>
      }
      citations={
        <>
          <Citation code="JIS B 0205-2" detail="表2 呼び径及びピッチの選択" suffix="（並目ピッチ）" />
          <Citation code="JIS B 0209-1" detail="表3 めねじ内径の公差" suffix="（下穴径の範囲）" />
          <Citation code="ISO 2306" suffix="の推奨ドリル径（下穴径）" />
          <Citation
            code="JIS B 1180"
            detail={`本体 表3（第1選択）・表4（第2選択）、附属書JA ${BOLT_JA_TABLE}`}
            suffix="（ボルトの二面幅）"
          />
          <Citation
            code="JIS B 1181"
            detail={`本体 表3・表4 六角ナット・スタイル1、附属書JA ${NUT_JA_TABLE}`}
            suffix="（ナットの二面幅）"
          />
          <Citation
            code="JIS B 1176"
            detail={CAP_TABLE}
            suffix={`（六角レンチ。${CAP_NON_JIS_MARK} のサイズを除く）`}
          />
          <Citation code="JIS B 1001" detail={HOLE_TABLE} suffix="（ボルト穴径・ざぐり径）" />
        </>
      }
      formula={<ScrewFormula />}
    >
      <section>
        <SheetHeading aside="単位 mm">
          メートル並目ねじ M{ROWS[0].d}〜M{ROWS[ROWS.length - 1].d}
        </SheetHeading>
        <SheetTable caption={meta.h1} columns={COLUMNS} rows={ROWS} rowKey={(row) => String(row.d)} />
        <SheetNotes>
          <li>
            下穴径は並目ねじ・公差域クラス {SUMMARY_GRADE}H の推奨値
            {ALL_ISO ? '（ISO 2306 の推奨ドリル径。JIS B 0209-1 の範囲内）' : '（JIS B 0209-1 の範囲内）'}
            です。材質や加工条件で適した径は変わるので、目安としてお使いください。
          </li>
          <li>
            二面幅の旧JIS は JIS B 1180・B 1181 の附属書JA の値で、太字は JIS本体と違うサイズ（{DIFFERS.join('・')}
            ）です。
            {JA_FUTURE_NOTE}
          </li>
          <li>{SECOND_CHOICE.join('・')} は JIS本体では第2選択のサイズです。</li>
          <li>
            六角穴付きボルトの座ぐりは、設計でよく使われる参考値です（JIS B 1001・B 1176 の規定ではありません）。
            {CAP_NON_JIS_LEGEND}（{NON_JIS.join('・')}）。
          </li>
          <li>ざぐり径 D' の深さは、一般に黒皮が取れる程度です（JIS B 1001 備考5）。</li>
          {HAS_UNVERIFIED && <li>{UNVERIFIED_LEGEND}です。重要な用途では規格の原文で確認してください。</li>}
        </SheetNotes>
      </section>
    </SheetPage>
  )
}
