import { Citation } from '../../components/Citation'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { findPipeThread, gMinorLimits, gRecommendedDrill, pitch } from '../../features/pipe-thread/calc'
import { PIPE_THREAD_TABLES, THREAD_KINDS, type PipeThreadKind } from '../../features/pipe-thread/data'
import { MASS_FACTOR, unitMass, unitMassText } from '../../features/steel-pipe/calc'
import { PIPE_EDITION_NOTE, PIPE_STANDARD_TABLE } from '../../features/steel-pipe/data'
import { fixed, trim } from '../../lib/format'
import { pipeTableRows } from '../tables/tableData'
import { findSheet } from './printPages'
import { SGP_SHEET_ROWS, THREAD_SHEET_ROWS, type SgpSheetRow, type ThreadSheetRow } from './sheetData'
import { SheetHeading, SheetNotes, SheetPage, SheetTable, type SheetColumn } from './SheetLayout'

const SGP_TABLE = PIPE_STANDARD_TABLE['JIS G 3452']

const SGP_COLUMNS: SheetColumn<SgpSheetRow>[] = [
  { key: 'a', header: '呼び径', cell: (row) => row.a },
  { key: 'b', header: 'B', cell: (row) => row.b },
  { key: 'od', header: '外径 D', cell: (row) => <span className="font-bold">{row.od}</span> },
  { key: 't', header: '厚さ t', cell: (row) => row.t },
  { key: 'id', header: '内径 d', cell: (row) => row.id },
  {
    key: 'mass',
    header: (
      <>
        単位質量<span className="block font-normal">kg/m</span>
      </>
    ),
    cell: (row) => row.mass,
  },
]

const THREAD_COLUMNS: SheetColumn<ThreadSheetRow>[] = [
  { key: 'size', header: '呼び', cell: (row) => row.size },
  { key: 'pipe', header: '管', cell: (row) => row.pipeA },
  { key: 'tpi', header: '山数', cell: (row) => <span className="font-bold">{row.tpi}</span> },
  { key: 'p', header: 'ピッチ P', cell: (row) => row.pitch },
  { key: 'd', header: '外径 d', cell: (row) => row.d },
  { key: 'd1', header: '谷径 d1', cell: (row) => row.d1 },
  {
    key: 'g',
    header: (
      <>
        G 下穴<span className="block font-normal">（計算値）</span>
      </>
    ),
    cell: (row) => row.gDrill,
  },
]

/** 計算ロジック（画面だけ）。鋼管の寸法表・管用ねじのツールと同じ式・同じ例 */
function PipeFormula() {
  const example = pipeTableRows('sgp').find((row) => row.size.a === '50A')!
  const thread = findPipeThread('1/2')!
  const g = gMinorLimits(thread)
  return (
    <FormulaInfo title="内径・単位質量・ピッチ・G 下穴の計算ロジック">
      <p>
        SGP の単位質量は JIS
        の式で計算して有効数字3桁に丸めた値（規格の表と同じ）、内径は外径と厚さからの計算値です（50A の例）。
      </p>
      <Formula>
        W = {MASS_FACTOR} × t × (D − t) = {MASS_FACTOR} × {fixed(example.t, 1)} × ({fixed(example.od, 1)} −{' '}
        {fixed(example.t, 1)}) = {trim(unitMass(example.od, example.t), 4)} → {unitMassText(example.massPerM)} kg/m
      </Formula>
      <Formula>
        d = D − 2t = {fixed(example.od, 1)} − 2 × {fixed(example.t, 1)} = {fixed(example.id, 1)} mm
      </Formula>
      <p>
        管用ねじのピッチは山数から、G の推奨下穴径はめねじ内径 D1 の許容範囲の中央に最も近い 0.1mm
        刻みの径として求めています（1/2 の例）。
      </p>
      <Formula>
        P = 25.4 ÷ 山数 = 25.4 ÷ {thread.tpi} = {fixed(pitch(thread.tpi), 4)} mm
      </Formula>
      <Formula>
        G 下穴 = ({fixed(g.min, 3)} + {fixed(g.max, 3)}) ÷ 2 = {trim((g.min + g.max) / 2, 4)} →{' '}
        {fixed(gRecommendedDrill(thread), 1)} mm
      </Formula>
      <FormulaLegend
        items={[
          ['D', '外径 [mm]'],
          ['t', '厚さ [mm]'],
          ['W', '単位質量 [kg/m]（鋼の密度 7.85 g/cm³）'],
          ['D1', 'G めねじ内径（JIS B 0202 付表1 の基準寸法 〜 付表2 の公差を足した値）'],
        ]}
      />
    </FormulaInfo>
  )
}

/** 旧JIS の記号と今の記号の対応（「PT → R・Rc、PS → Rp、PF → G」） */
const OLD_NAMES = (() => {
  const byOld = new Map<string, PipeThreadKind[]>()
  for (const kind of Object.keys(THREAD_KINDS) as PipeThreadKind[]) {
    const old = THREAD_KINDS[kind].old
    byOld.set(old, [...(byOld.get(old) ?? []), kind])
  }
  return [...byOld].map(([old, kinds]) => `${old} → ${kinds.join('・')}`).join('、')
})()

export function PipeSheetPage() {
  const meta = findSheet('pipe')
  return (
    <SheetPage
      meta={meta}
      density="normal"
      summary={<p>単位 mm（単位質量は kg/m）。SGP の外径は Sch40・Sch80（STPG）と共通です。</p>}
      citations={
        <>
          <Citation
            code="JIS G 3452"
            detail={`${SGP_TABLE.no} ${SGP_TABLE.title}`}
            suffix="（SGP の外径・厚さ・単位質量）"
          />
          <p className="pl-5 text-xs leading-relaxed text-zinc-500">{PIPE_EDITION_NOTE}</p>
          <Citation code="JIS B 0203" detail={PIPE_THREAD_TABLES.taper} suffix="（R・Rc の山数・基準径）" />
          <Citation
            code="JIS B 0202"
            detail={`${PIPE_THREAD_TABLES.parallel}・${PIPE_THREAD_TABLES.parallelTolerance}`}
            suffix="（G の山数・基準径。G 下穴はめねじ内径 D1 の公差から計算）"
          />
        </>
      }
      formula={<PipeFormula />}
    >
      {/* 印刷では2つの表を横に並べて、A4 縦1枚に収める */}
      <div className="grid gap-4 print:grid-cols-[minmax(0,43fr)_minmax(0,57fr)] print:items-start print:gap-x-3">
        <section className="min-w-0">
          <SheetHeading aside={`JIS G 3452 ${SGP_TABLE.no}・黒管`}>SGP（配管用炭素鋼鋼管）</SheetHeading>
          <SheetTable
            caption="SGP の外径・厚さ・内径・単位質量"
            columns={SGP_COLUMNS}
            rows={SGP_SHEET_ROWS}
            rowKey={(row) => row.a}
          />
          <SheetNotes>
            <li>B はインチ呼び（例: 50A = 2B）です。内径は「外径 − 2 × 厚さ」の計算値です。</li>
            <li>単位質量は黒管の値（ソケットを含まない）です。亜鉛めっき管（白管）はめっきの分だけ重くなります。</li>
          </SheetNotes>
        </section>
        <section className="min-w-0">
          <SheetHeading aside="JIS B 0203・B 0202">管用ねじ（R・Rc・G）</SheetHeading>
          <SheetTable
            caption="管用ねじの山数・ピッチ・外径・谷径・G 下穴"
            columns={THREAD_COLUMNS}
            rows={THREAD_SHEET_ROWS}
            rowKey={(row) => row.size}
          />
          <SheetNotes>
            <li>
              「管」は対応する管の呼び径です。山数は 25.4 mm あたりの山の数で、R・Rc・Rp・G に共通です。外径・谷径は、テーパねじ（R・Rc）では基準径の位置の値（G と共通）です。旧JIS の記号は{' '}
              {OLD_NAMES} です。
            </li>
            <li>
              G 下穴（計算値）は規格の値ではなく、めねじ内径の許容範囲の中央付近から求めた 0.1mm
              刻みの径です。タップメーカーの推奨値と違う場合があります。Rc・Rp
              の下穴径はタップメーカーの推奨値を確認してください。
            </li>
          </SheetNotes>
        </section>
      </div>
    </SheetPage>
  )
}
