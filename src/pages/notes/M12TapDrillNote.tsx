import { Citation } from '../../components/Citation'
import { formatHole, TWO_H1_PER_PITCH, type HoleCandidate, type HoleFit } from '../../features/tap-drill/calc'
import { fixed, trim } from '../../lib/format'
import { Link } from '../../router/Link'
import { screwPath } from '../screws/paths'
import {
  M12,
  M12_CANDIDATES,
  M12_LIMITS,
  M12_S100,
  m12Engagement,
  SERIES_ROWS,
  tapDrillHref,
  type SeriesRow,
} from './examples'
import { NoteCalc, NoteLayout, NoteSection, NoteTable } from './NoteLayout'
import { M12_TAP_DRILL_NOTE } from './notePages'

const FIT_MARK: Record<HoleFit, string> = { ok: '○', small: '小', large: '大' }
const fitCell = (grade: 5 | 6 | 7) => (row: HoleCandidate) => FIT_MARK[row.fits[grade] ?? 'ok']
const range = (min: number, max: number) => (
  <>
    <span className="whitespace-nowrap">{fixed(min, 3)}〜</span>
    <span className="whitespace-nowrap">{fixed(max, 3)}</span>
  </>
)
const percent = (value: number) => `${fixed(value, 1)} %`

const M10_ROW = SERIES_ROWS.find((row) => row.d === 10)!

export function M12TapDrillNote() {
  const { d, p, s95, s90, limits6H } = M12
  const tolerance6H = limits6H.max - limits6H.min
  const upper = M12_CANDIDATES.find((row) => row.fits[6] === 'ok' && row.fits[5] === 'large')

  return (
    <NoteLayout
      meta={M12_TAP_DRILL_NOTE}
      lead={
        <p>
          結論から言うと、M12（並目 ピッチ {trim(p)} mm）の下穴は {formatHole(s95)} mm でも {formatHole(s90)} mm でも、JIS
          のめねじ内径の範囲（6H: {fixed(limits6H.min, 3)}〜{fixed(limits6H.max, 3)} mm）に入ります。JIS B 1004 では{' '}
          {formatHole(s95)} mm がひっかかり率 95 %、{formatHole(s90)} mm が 90 % の系列の値です。
        </p>
      }
      actions={[
        { to: tapDrillHref(d, p, s90), label: `${formatHole(s90)} mm のドリルで M${d} を判定する` },
        { to: screwPath(d), label: `M${d} の寸法まとめ` },
      ]}
    >
      <NoteSection id="range" title="範囲の求め方">
        <p>
          下穴であけた径が、めねじの内径 D<sub>1</sub> になります。D<sub>1</sub> の最小は基準寸法、最大は基準寸法に公差 T
          <sub>D1</sub> を足した値です。
        </p>
        <NoteCalc>
          D<sub>1</sub> = {d} − {TWO_H1_PER_PITCH} × {trim(p)} = {fixed(limits6H.min, 3)} mm
        </NoteCalc>
        <NoteCalc>
          6H の最大 = {fixed(limits6H.min, 3)} + {fixed(tolerance6H, 3)} = {fixed(limits6H.max, 3)} mm
        </NoteCalc>
        <p>
          5H の最大は {fixed(M12_LIMITS[5].max, 3)} mm、7H は {fixed(M12_LIMITS[7].max, 3)} mm で、{formatHole(s95)}・
          {formatHole(s90)} mm はどの等級でも範囲に入ります。
        </p>
        <div className="space-y-1">
          <Citation code="JIS B 0205-4" detail="5. 基準寸法の式" suffix="で D1 を計算" />
          <Citation code="JIS B 0209-1" detail="表3 めねじ内径の公差" suffix="を適用" />
        </div>
      </NoteSection>

      <NoteSection id="engagement" title="ひっかかり率で比べる">
        <p>ひっかかり率は、ねじ山がどれだけ深くかみ合うかの割合です。下穴が小さいほど率が上がります。</p>
        <NoteCalc>
          ひっかかり率 = ({d} − 下穴径) ÷ ({TWO_H1_PER_PITCH} × {trim(p)}) × 100
        </NoteCalc>
        <NoteTable
          caption={`M${d} の下穴径とひっかかり率、等級ごとの判定`}
          columns={[
            { header: '下穴径', cell: (row: HoleCandidate) => formatHole(row.hole) },
            { header: 'ひっかかり率', cell: (row: HoleCandidate) => percent(row.engagement) },
            { header: '5H', cell: fitCell(5) },
            { header: '6H', cell: fitCell(6) },
            { header: '7H', cell: fitCell(7) },
          ]}
          rows={M12_CANDIDATES}
          rowKey={(row) => String(row.hole)}
        />
        <p className="text-xs text-zinc-600">単位 mm。○ は範囲内、小 は小さすぎ、大 は大きすぎ。</p>
        <p>
          {formatHole(M12_S100)} mm は 100 % の系列の値ですが、0.1 mm に丸めた値のため D<sub>1</sub> の最小（
          {fixed(limits6H.min, 3)} mm）をわずかに下回ります。
          {upper &&
            `${formatHole(upper.hole)} mm（${percent(upper.engagement)}）は 6H には入りますが、5H では大きすぎです。`}
        </p>
        <div className="space-y-1">
          <Citation code="JIS B 1004" detail="表1 下穴径の系列（ひっかかり率の式）・表2（並目）" />
        </div>
      </NoteSection>

      <NoteSection id="choose" title="どちらを選ぶか">
        <p>どちらも規格の範囲内なので、強度（率を上げる）とタップの立てやすさ（率を下げる）のどちらを重く見るかで選びます。</p>
        <ul>
          <li>
            {formatHole(s95)} mm（{percent(m12Engagement(s95))}）: ねじ山が深くかかる側。ISO 2306 の推奨ドリル径で、このサイトの推奨下穴径もこの値です。
          </li>
          <li>{formatHole(s90)} mm（{percent(m12Engagement(s90))}）: 削る量が減り、タップを立てやすい側です。</li>
        </ul>
        <p>
          実際の穴はドリル径より少し大きく仕上がることがあるので、範囲の上限に近い径は避けるのが無難です。材料や工具メーカーの推奨値があれば、そちらを優先してください。転造タップ（盛上げタップ）は切削タップより大きい下穴を使うので、この表の値は当てはまりません。
        </p>
        <p>
          手持ちのドリルが使えるかは、<Link to={tapDrillHref(d, p, s90)}>ねじ下穴径のツール</Link>
          にドリル径を入れると、等級ごとに判定できます。
        </p>
        <div className="space-y-1">
          <Citation code="ISO 2306" suffix="の推奨ドリル径（JIS ではない）" />
        </div>
      </NoteSection>

      <NoteSection id="sizes" title="ほかのサイズ（M6〜M16 並目）">
        <p>JIS B 1004 の式で計算した 95 %・90 % の系列と、6H の範囲、このサイトの推奨下穴径です。</p>
        <NoteTable
          caption="並目ねじの下穴径の系列と 6H の範囲"
          columns={[
            { header: 'ねじ', cell: (row: SeriesRow) => `M${row.d}`, left: true },
            { header: '95 %', cell: (row: SeriesRow) => formatHole(row.s95) },
            { header: '90 %', cell: (row: SeriesRow) => formatHole(row.s90) },
            { header: '6H の範囲', cell: (row: SeriesRow) => range(row.limits6H.min, row.limits6H.max), wrap: true },
            { header: '推奨', cell: (row: SeriesRow) => formatHole(row.recommended.hole) },
          ]}
          rows={SERIES_ROWS}
          rowKey={(row) => String(row.d)}
        />
        <p className="text-xs text-zinc-600">
          単位 mm。系列の値は JIS B 1004 の表と同じく、ピッチ 1.5 mm 以下は 0.01 mm、1.75 mm 以上は 0.1 mm に丸めています。推奨は ISO 2306
          の推奨ドリル径です。
        </p>
        <p>
          ピッチ 1.5 mm 以下では、系列の値が 0.01 mm 単位になります（M10 なら {formatHole(M10_ROW.s95)} と{' '}
          {formatHole(M10_ROW.s90)}）。M10 の推奨 {formatHole(M10_ROW.recommended.hole)} mm はその間で、ひっかかり率は{' '}
          {percent(M10_ROW.recommendedEngagement)} です。
        </p>
        <div className="space-y-1">
          <Citation code="JIS B 1004" detail="表1 下穴径の系列" suffix="の式で計算" />
          <Citation code="JIS B 0209-1" detail="表3 めねじ内径の公差" suffix="を適用" />
        </div>
      </NoteSection>
    </NoteLayout>
  )
}
