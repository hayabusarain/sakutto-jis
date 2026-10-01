import { Faq, GuideSection } from '../../components/Guide'
import { fixed } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { findPipeThread, gMinorLimits, pitch as pipePitch, rcInnerMinorDiameter } from '../pipe-thread/calc'
import { findSize, minorDiameterLimits } from '../tap-drill/calc'
import {
  diameterSigma,
  FORM_PENALTY,
  INTERNAL_GRADE,
  PITCH_CAUTION_PERCENT,
  PITCH_SIGMA_RATIO,
  pitchFromCount,
  rankCandidates,
  tpiFromPitch,
} from './calc'
import { signed } from './format'
import { confusablePitches, EXAMPLE_PITCH_COUNT, R_HALF_PIPE_END, SCOPE, TAPER_EXAMPLE_SPACING } from './tips'

const ex = (search: Record<string, string>) => toolHref('/thread-identify', search)

/** 点数の説明に使う、径の差の例 [mm] */
const EXAMPLE_DELTA = 0.2
/** M10×1 のピッチ（呼びそのもの） */
const M10_FINE_PITCH = 1

export function ThreadIdGuide() {
  const half = findPipeThread('1/2')!
  const eighth = findPipeThread('1/8')!
  const halfPitch = pipePitch(half.tpi)
  const m20 = findSize(20)!
  const m12 = findSize(12)!
  const m12Internal = minorDiameterLimits(12, m12.coarse!, INTERNAL_GRADE)!
  const gHalf = gMinorLimits(half)
  const rcHalfInner = rcInnerMinorDiameter(half)
  const pitch14 = confusablePitches().find((row) => row.tpi === half.tpi)!
  const count = EXAMPLE_PITCH_COUNT
  const sampleSpan = Number(fixed(halfPitch * count, 2))
  const samplePitch = pitchFromCount(count + 1, sampleSpan)!
  const eighthPitch = pipePitch(eighth.tpi)
  const eighthExample = rankCandidates({ side: 'external', diameter: 9.7, pitch: eighthPitch }).slice(0, 3)

  return (
    <GuideSection>
      <Faq q={`ノギスで測ったら外径 約${fixed(R_HALF_PIPE_END, 1)} mm。M20 と R1/2（PT1/2）のどちら？`}>
        <p>
          径だけでは決められません。R1/2 はテーパねじで、管端の外径は {fixed(half.d, 3)} − {fixed(half.gaugeLength, 2)} ÷ 16 ={' '}
          {fixed(R_HALF_PIPE_END, 3)} mm（計算値）と、M20 の呼び径 {m20.d} mm にとても近くなります。
        </p>
        <p>
          見分けるのはピッチです。R1/2 は {half.tpi}山（P {fixed(halfPitch, 3)} mm）、M20 の並目は P {m20.coarse} mm です。
          <Link to={ex({ dia: fixed(R_HALF_PIPE_END, 3), mode: 'tpi', tpi: String(half.tpi) })}>この例で判別する</Link>
        </p>
      </Faq>

      <Faq q="ねじのピッチ（山数）はどうやって測る？">
        <p>
          ピッチゲージが無くても、ノギスで測れます。山頂を n 個数え、最初と最後の山頂の距離 L を測ると、ピッチ P = L ÷ (n − 1)、山数（25.4mm
          あたり）= 25.4 ÷ P です。
        </p>
        <p>
          例: 山頂 {count + 1} 個で L = {fixed(sampleSpan, 2)} mm なら、P = {fixed(sampleSpan, 2)} ÷ {count} ={' '}
          {fixed(samplePitch, 3)} mm、山数は {fixed(tpiFromPitch(samplePitch), 1)}山 です。{count}ピッチ分を測れば、1ピッチの読み取りの誤差が
          1/{count} になります。{half.tpi}山と P{pitch14.metric[0].pitch}（M{m12.d}）の違いも、{count}ピッチなら{' '}
          {fixed(pitch14.tenPitches, 2)} mm と {fixed(pitch14.metric[0].tenPitches, 2)} mm で、はっきり分かります。
        </p>
      </Faq>

      <Faq q="管用テーパねじ（R・PT）と平行ねじ（G・PF）の見分け方は？">
        <p>
          外径を離れた2か所で測ります。テーパねじは直径が長さの 1/16 ずつ変わるので、{TAPER_EXAMPLE_SPACING} mm 離れた2か所では{' '}
          {fixed(TAPER_EXAMPLE_SPACING / 16, 3)} mm 違います。ほぼ同じ値なら平行ねじ（G）です。
        </p>
        <p>
          R と G は基準径・山数が同じなので、1か所の径とピッチだけでは区別できません。このツールでは「テーパか平行かを確かめる」に2か所目の外径と間隔を入れると、順位に反映します。
        </p>
      </Faq>

      <Faq q={`M10×1 と 1/8（${eighth.tpi}山）の見分け方は？`}>
        <p>
          1/8 の管用ねじは外径 {fixed(eighth.d, 3)} mm（基準径の位置）、ピッチ {fixed(eighthPitch, 3)} mm で、M10×1 と径もピッチも近いねじです。
          {count}ピッチの長さは {fixed(eighthPitch * count, 2)} mm と {fixed(M10_FINE_PITCH * count, 2)} mm で違います。
        </p>
        <p>
          例えば外径 9.7 mm・{eighth.tpi}山 なら、候補は{' '}
          {eighthExample.map((c, index) => (
            <span key={c.key}>
              {index > 0 && '、'}
              <span className="num font-semibold text-zinc-900">{c.label}</span>
            </span>
          ))}{' '}
          の順です（<Link to={ex({ dia: '9.7', mode: 'tpi', tpi: String(eighth.tpi) })}>この例で判別する</Link>）。
        </p>
      </Faq>

      <Faq q="めねじ（ねじ穴・継手）の場合はどこを測る？">
        <p>
          ノギスの内側ジョウで、入口付近のねじ山の頂どうし（内径）を測ります。めねじの内径は呼び径よりかなり小さく、例えば M{m12.d} の内径は{' '}
          {fixed(m12Internal.min, 3)}〜{fixed(m12Internal.max, 3)} mm（{INTERNAL_GRADE}H の範囲）です。
        </p>
        <p>
          管用ねじでは、Rc1/2 の内径は入口で {fixed(half.d1, 3)} mm、奥へ行くほど細くなり、有効ねじ部の奥端で{' '}
          {rcHalfInner === null ? '—' : fixed(rcHalfInner, 3)} mm（計算値）です。G1/2・Rp1/2 は平行で、G の内径の範囲は{' '}
          {fixed(gHalf.min, 3)}〜{fixed(gHalf.max, 3)} mm です。
        </p>
      </Faq>

      <Faq q="インチねじ（ユニファイ UNC・UNF、ウイット）も判別できますか？">
        <p>
          いいえ。このツールが候補にするのは、メートルねじ（M{SCOPE.metricMin}〜M{SCOPE.metricMax}）と管用ねじ（R・Rc・Rp・G の{' '}
          {SCOPE.pipeMin}〜{SCOPE.pipeMax}）だけです。インチねじを測ると、多くはどの候補とも差が大きい（「離れている」）結果になりますが、たまたま「近い」候補が出ることもあります。そのため、いちばん近い候補が「よく合う」でないとき（「よく合う」でもピッチの差が {PITCH_CAUTION_PERCENT}% を超えるとき）は、結果の下にインチねじの可能性を表示します。候補の径やピッチが実測と合わないときは、{EXAMPLE_PITCH_COUNT}ピッチ分の長さで測り直し、インチねじや特殊なねじの可能性を考えてください。
        </p>
      </Faq>

      <Faq q="候補の順位はどう決めていますか？">
        <p>
          候補ごとに、実測の径が入るはずの範囲（メートルねじのおねじは呼び径、R は管端〜有効ねじ部の端、めねじは内径の許容範囲）を規格の寸法から求め、範囲からのずれ（径の差）とピッチの差を点数にします。
        </p>
        <p>
          点数 = (径の差 ÷ (0.1 + 0.01 × 基準径))² + (ピッチの差 ÷ ({PITCH_SIGMA_RATIO} × ピッチ))²。例えば M{m12.d} のおねじでは、径の差の目安は{' '}
          {fixed(diameterSigma(m12.d), 2)} mm、ピッチ {m12.coarse} mm の差の目安は {fixed(PITCH_SIGMA_RATIO * m12.coarse!, 3)} mm です。
          外径が {fixed(EXAMPLE_DELTA, 1)} mm 小さくピッチが同じなら、点数は ({signed(-EXAMPLE_DELTA, 1)} ÷{' '}
          {fixed(diameterSigma(m12.d), 2)})² = {fixed((EXAMPLE_DELTA / diameterSigma(m12.d)) ** 2, 2)} です。
        </p>
        <p>
          目安の値は、ノギスの読み取り・ねじの公差・摩耗を見込んだこのサイトの想定で、規格の値ではありません。2か所の外径でテーパか平行かを判定したときは、形が合わない候補に{' '}
          {FORM_PENALTY} 点を足します。
        </p>
      </Faq>
    </GuideSection>
  )
}
