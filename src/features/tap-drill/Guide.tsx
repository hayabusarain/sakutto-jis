import { Faq, GuideSection } from '../../components/Guide'
import { fixed, trim } from '../../lib/format'
import {
  B1004_SERIES,
  b1004SeriesHole,
  chartRow,
  engagementPercent,
  findSize,
  formatHole,
  formatSignificant,
  holeCandidates,
  minorDiameterLimits,
  stressArea,
  threadName,
  TWO_H1_PER_PITCH,
  type ChartRow,
} from './calc'
import { METRIC_SIZES, TOLERANCE_GRADES } from './data'

// 解説の数値はすべて calc.ts・data.ts から計算する（表と食い違わないように）

const coarsePitch = (d: number) => findSize(d)?.coarse ?? 0
const coarseRow = (d: number) => chartRow(d, coarsePitch(d), 6) as ChartRow
const range = (d: number, p: number, grade: 4 | 5 | 6 | 7) => {
  const limits = minorDiameterLimits(d, p, grade)
  return limits ? `${fixed(limits.min, 3)}〜${fixed(limits.max, 3)}` : '—'
}

const QUICK = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24].map(coarseRow)
const M12 = coarseRow(12)
const M12_OK = holeCandidates(12, coarsePitch(12))
  .filter((row) => row.fits[6] === 'ok')
  .map((row) => formatHole(row.hole))
/** JIS B 1004 の系列の M12 の下穴径（100 % は 10.1、95 % は 10.2、90 % は 10.3） */
const M12_SERIES_100 = b1004SeriesHole(12, coarsePitch(12), 100)
const M12_SERIES_95 = b1004SeriesHole(12, coarsePitch(12), 95)
const M12_SERIES_90 = b1004SeriesHole(12, coarsePitch(12), 90)
const M12_LIMITS_6H = minorDiameterLimits(12, coarsePitch(12), 6)!
const FINE_EXAMPLES = [
  [8, 1],
  [10, 1.25],
  [12, 1.5],
  [16, 1.5],
  [20, 1.5],
].map(([d, p]) => chartRow(d, p, 6) as ChartRow)
const M10 = coarseRow(10)
const M10_LIMITS_6H = minorDiameterLimits(10, M10.p, 6)!
const M10_MAX_ENGAGEMENT = engagementPercent(10, M10.p, M10_LIMITS_6H.max)
const RULE_ENGAGEMENT = 100 / TWO_H1_PER_PITCH
const NO_6H_COARSE = METRIC_SIZES.filter(
  (size) => size.coarse !== null && minorDiameterLimits(size.d, size.coarse, 6) === null,
)
const AS_EXAMPLES = [8, 10, 12, 16, 20, 24].map((d) => ({ d, as: stressArea(d, coarsePitch(d)) }))

const name = (row: { d: number; p: number }) => threadName(row.d, row.p)

export function TapDrillGuide() {
  return (
    <GuideSection>
      <p>
        ねじ下穴径は、タップでめねじを立てる前にドリルであける穴の径です。あけた穴が、めねじの内径 D1
        の許容範囲（JIS B 0209-1 の公差）に入っていれば、ねじ山が規格どおりの高さで立ちます。このツールは、その範囲と
        ISO 2306 の推奨ドリル径から下穴径を求めています。手持ちのドリル径を入れると、そのドリルで立てられるねじも逆引きできます。
      </p>

      <Faq q={`M12 の下穴径は何 mm？ ${M12_OK.join('・')} のどれでもよい？`}>
        <p>
          並目 M12（ピッチ {trim(M12.p)}）の推奨下穴径は <strong className="num">{formatHole(M12.hole)} mm</strong>{' '}
          です。6H のめねじ内径の範囲は <span className="num">{range(12, M12.p, 6)} mm</span> なので、0.1 mm 刻みでは{' '}
          <span className="num">{M12_OK.join('・')} mm</span>{' '}
          が範囲に入り、どれも使えます。ただし実際の穴はドリル径より少し大きく仕上がるので、上限に近い{' '}
          <span className="num">{M12_OK[M12_OK.length - 1]} mm</span> は避けるのが無難です。細目なら{' '}
          {FINE_EXAMPLES.filter((row) => row.d === 12).map((row, index) => (
            <span key={row.p}>
              {index > 0 && '、'}
              <span className="num">
                {name(row)} は {formatHole(row.hole)} mm
              </span>
            </span>
          ))}
          です。
        </p>
        <p>
          JIS B 1004（ねじ下穴径）は1つの径に決めず、ひっかかり率ごとの系列で下穴径を表にしています。M12 なら 95 % の系列が{' '}
          <span className="num">{formatHole(M12_SERIES_95)} mm</span>、90 % が <span className="num">{formatHole(M12_SERIES_90)} mm</span>{' '}
          です。100 % の <span className="num">{formatHole(M12_SERIES_100)} mm</span> は、0.1 mm に丸めた値のため D1 の最小{' '}
          <span className="num">{fixed(M12_LIMITS_6H.min, 3)} mm</span> をわずかに下回り、このツールでは「小さすぎ」と判定します。
        </p>
      </Faq>

      <Faq q="よく使うねじ（M3〜M24 並目）の下穴径の一覧は？">
        <p>6H のめねじに対する推奨下穴径です。全サイズ（M1〜M68）と細目は、上の早見表にあります。</p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-5">
          {QUICK.map((row) => (
            <li key={row.d} className="num">
              {name(row)} → <strong>{formatHole(row.hole)}</strong> mm
            </li>
          ))}
        </ul>
      </Faq>

      <Faq q="下穴径の計算式は？「呼び径 − ピッチ」でよい？">
        <p>
          目安は「呼び径 − ピッチ」で、M10 なら 10 − {trim(M10.p)} = {trim(10 - M10.p)} mm です。この径のひっかかり率は、サイズによらず約{' '}
          {fixed(RULE_ENGAGEMENT, 1)}% になります。
        </p>
        <p>
          きちんと確かめるなら、めねじ内径の基準寸法 D1 = D − {TWO_H1_PER_PITCH} × P と、公差域クラスごとの公差 T
          <sub>D1</sub> から、下穴径が D1 〜 D1 + T<sub>D1</sub> に入るかを見ます。M10（6H）は{' '}
          <span className="num">{range(10, M10.p, 6)} mm</span> です。
        </p>
      </Faq>

      <Faq q="細目ねじの下穴径は？">
        <p>考え方は並目と同じで、範囲に入る径のうち「呼び径 − ピッチ」に近いものを選びます（6H）。</p>
        <ul className="grid grid-cols-1 gap-y-0.5 sm:grid-cols-2">
          {FINE_EXAMPLES.map((row) => (
            <li key={`${row.d}x${row.p}`} className="num">
              {name(row)} → <strong>{formatHole(row.hole)}</strong> mm（D1 {range(row.d, row.p, 6)}）
            </li>
          ))}
        </ul>
      </Faq>

      <Faq q="ひっかかり率とは？ 何％にすればよい？">
        <p>
          ひっかかり率は、ねじ山がどれだけかみ合うかの割合で、(D − 下穴径) ÷ ({TWO_H1_PER_PITCH} × P) × 100
          で求めます（JIS B 1004 の表1 の式）。下穴径が D1 ちょうどなら 100% です。JIS B 1004 は、ひっかかり率{' '}
          {B1004_SERIES.join('・')} % の {B1004_SERIES.length} つの系列で下穴径を表にしています。
        </p>
        <p>
          このツールは、率ではなく「めねじ内径 D1 の許容範囲に入るか」で判定しています。たとえば M10（6H）では、範囲の下限{' '}
          {fixed(M10_LIMITS_6H.min, 3)} mm で 100%、上限 {fixed(M10_LIMITS_6H.max, 3)} mm で{' '}
          {fixed(M10_MAX_ENGAGEMENT, 1)}% です。この間で、タップ立てのしやすさ（率を下げる）と強度（率を上げる）を材料や用途に合わせて選びます。
        </p>
      </Faq>

      <Faq q="4H・5H・6H・7H の違いは？ どれを選ぶ？">
        <p>
          めねじの公差域クラス（等級）です。数字が大きいほど内径 D1 の許容範囲が広く、下穴径を選べる幅も広がります。JIS B 0209-1
          の表8 では、一般用（中）は 6H が推奨されています。ただし M1.4 以下は、5H か 4H を選ぶとされています（同 12.）。M10 の例:
        </p>
        <ul className="space-y-0.5">
          {TOLERANCE_GRADES.map((grade) => (
            <li key={grade} className="num">
              {grade}H: {range(10, M10.p, grade)} mm
            </li>
          ))}
        </ul>
        {NO_6H_COARSE.length > 0 && (
          <p>
            {NO_6H_COARSE.map((size) => `M${trim(size.d)}`).join('・')}{' '}
            の並目は 6H の公差が規定されていないため、このツールでは規定のある等級（5H など）に切り替えて求めます。
          </p>
        )}
      </Faq>

      <Faq q="有効断面積 As とは？ M10・M12 の値は？">
        <p>
          ボルトの引張荷重や締付け力の計算に使う断面積で、JIS B 1082 の式 As = π/4 × ((d2 + d3) ÷ 2)² で求めます（d2
          は有効径、d3 = d1 − H/6）。並目の値（有効数字3桁。JIS B 1082 の表1 の値と同じ）:
        </p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-3">
          {AS_EXAMPLES.map((row) => (
            <li key={row.d} className="num">
              M{row.d}: <strong>{formatSignificant(row.as)}</strong> mm²
            </li>
          ))}
        </ul>
        <p>全サイズ・細目の値は、上の「ねじの基準寸法・有効断面積 As 一覧」にあります。</p>
      </Faq>

      <Faq q="転造タップ（盛上げタップ）の下穴径も同じ？">
        <p>
          いいえ。ここの下穴径は、削ってねじ山を作る<strong>切削タップ</strong>用です。転造タップは材料を盛り上げてねじ山を作るため、切削タップより大きい下穴を使います。値はタップメーカーの推奨値を確認してください。
        </p>
      </Faq>
    </GuideSection>
  )
}
