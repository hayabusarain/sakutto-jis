import { Faq, GuideSection } from '../../components/Guide'
import { fixed, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { THREAD_KINDS } from '../pipe-thread/data'
import {
  circumference,
  diameterFromCircumference,
  findByOd,
  findPipeSize,
  MASS_FACTOR,
  nonGeneralPurposeSizes,
  pipeDimensions,
  pipeThreadFor,
  pipeWeight,
  sizesOf,
  unitMass,
  unitMassText,
} from './calc'
import { PIPE_EDITION_NOTE, PIPE_SIZES, PIPE_SPECS, PIPE_STANDARD_TABLE, WALL } from './data'

// 例に使うサイズ（数値はすべて data.ts・calc.ts から計算する）
const SGP50 = pipeDimensions('sgp', '50A')!
const SCH80_50 = pipeDimensions('sch80', '50A')!
const EXAMPLE_LENGTH = 5.5
const SGP50_WEIGHT = pipeWeight(SGP50, EXAMPLE_LENGTH)
const SIZE100 = findPipeSize('100A')!
const WALL100 = (['sgp', 'sch40', 'sch80'] as const).map((spec) => ({ spec, t: WALL[spec]['100A']![0] }))
/** SGP と Sch40 の厚さが同じ呼び径 */
const SAME_WALL = PIPE_SIZES.filter((size) => {
  const sgp = WALL.sgp[size.a]
  const sch40 = WALL.sch40[size.a]
  return sgp && sch40 && sgp[0] === sch40[0]
}).map((size) => size.a)
/** SGP にだけある呼び径 */
const SGP_ONLY = sizesOf('sgp')
  .filter((size) => !WALL.sch40[size.a] && !WALL.sch80[size.a])
  .map((size) => `${size.a}（${size.b}B）`)
// 周長の例: 100A の外周を mm に丸めた値から、外径と呼び径を逆に求める
const TAPE_EXAMPLE = Math.round(circumference(SIZE100.od))
const TAPE_OD = diameterFromCircumference(TAPE_EXAMPLE)
const TAPE_MATCH = findByOd(TAPE_OD)[0]
// 管用ねじの例
const THREAD_EXAMPLES = ['15A', '20A', '25A', '50A'].map((a) => ({ a, thread: pipeThreadFor(a)! }))
const PIPE15 = findPipeSize('15A')!
const THREAD15 = pipeThreadFor('15A')!
// 表番号（JIS G 3452 表4・JIS G 3454 表6）
const SGP_TABLE = PIPE_STANDARD_TABLE['JIS G 3452'].no
const STPG_TABLE = PIPE_STANDARD_TABLE['JIS G 3454'].no
/** JIS G 3454 表6 で汎用品（太枠内）とされていない呼び径 */
const NON_GENERAL_40 = nonGeneralPurposeSizes('sch40')
const NON_GENERAL_80 = nonGeneralPurposeSizes('sch80')

export function SteelPipeGuide() {
  return (
    <GuideSection>
      <p>
        配管用炭素鋼鋼管（SGP、JIS G 3452）と圧力配管用炭素鋼鋼管（STPG の Sch40・Sch80、JIS G 3454）の寸法と重さについて、よくある質問にまとめて答えます。数値は上の寸法表と同じデータから計算しています。
      </p>

      <Faq q="「50A」「2B」とは？呼び径と外径の関係は？">
        <p>
          呼び径は管の太さの呼び名で、A は mm 系、B はインチ系の呼び方です（{SGP50.size.a} = {SGP50.size.b}B）。呼び径は外径とも内径とも一致しません。
          {SGP50.size.a} の外径は <span className="num">{fixed(SGP50.od, 1)}</span> mm、SGP の内径は{' '}
          <span className="num">{fixed(SGP50.id, 1)}</span> mm です。
        </p>
        <p>
          外径は SGP・Sch40・Sch80 で共通で、厚さが違うぶん内径が変わります（Sch80 の {SCH80_50.size.a} は内径{' '}
          <span className="num">{fixed(SCH80_50.id, 1)}</span> mm）。
        </p>
      </Faq>

      <Faq q="SGP と Sch40・Sch80（STPG）の違いは？">
        <p>
          SGP は JIS G 3452「配管用炭素鋼鋼管」、Sch40・Sch80 は JIS G 3454「圧力配管用炭素鋼鋼管」（STPG）の厚さの区分（スケジュール番号）です。外径は同じで、厚さが違います。Sch の数字が大きいほど厚くなります。
        </p>
        <p>
          例えば {SIZE100.a} の厚さは{' '}
          {WALL100.map(({ spec, t }, index) => (
            <span key={spec}>
              {index > 0 && '・'}
              {PIPE_SPECS[spec].label} <span className="num">{fixed(t, 1)}</span> mm
            </span>
          ))}
          です。小さいサイズでは SGP と Sch40 の厚さが近く、{SAME_WALL.join('・')} は同じ厚さです。
        </p>
        <p>
          JIS G 3454 の材料には STPG370 と STPG410 がありますが、Sch40・Sch80 の外径・厚さ・単位質量は両方で共通です（{STPG_TABLE}）。
        </p>
        <p>
          どちらを使うかは、圧力・温度・流体などの設計条件と、適用される法規・社内基準で決めてください。上の結果にある「規格で比べる」の表や、寸法表の「3規格を並べる」で、厚さ・内径・重さを並べて確認できます。
        </p>
      </Faq>

      <Faq q="鋼管の重さ（kg/m）の計算式は？">
        <p>
          単位質量 W [kg/m] は、外径 D と厚さ t [mm] から次の式で求めます（JIS G 3452 {SGP_TABLE}・JIS G 3454 {STPG_TABLE}
          の注記。1 cm³ の鋼を 7.85 g とし、JIS Z 8401 の規則A で有効数字3桁に丸めます）。{MASS_FACTOR} は π × 7.85 ÷ 1000 を丸めた係数です。
        </p>
        <p className="num rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px]">
          W = {MASS_FACTOR} × t × (D − t)
        </p>
        <p>
          SGP {SGP50.size.a} なら {MASS_FACTOR} × {fixed(SGP50.t, 1)} × ({fixed(SGP50.od, 1)} − {fixed(SGP50.t, 1)}) ={' '}
          <span className="num">{trim(unitMass(SGP50.od, SGP50.t), 4)}</span> → 有効数字3桁で{' '}
          <span className="num">{unitMassText(SGP50.massPerM)}</span> kg/m。長さ {EXAMPLE_LENGTH} m の1本なら{' '}
          <span className="num">{fixed(SGP50_WEIGHT.mass, 1)}</span> kg です。
        </p>
      </Faq>

      <Faq q="巻尺で測った外周（周長）から呼び径を調べるには？">
        <p>
          外周 C を π で割ると外径になります（D = C ÷ π）。例えば外周{' '}
          <span className="num">{TAPE_EXAMPLE}</span> mm なら {TAPE_EXAMPLE} ÷ π ={' '}
          <span className="num">{fixed(TAPE_OD, 1)}</span> mm で、外径{' '}
          <span className="num">{fixed(TAPE_MATCH.size.od, 1)}</span> mm の {TAPE_MATCH.size.a} です。上の「実測から呼び径を探す」に周長を入れると、近い呼び径と、肉厚から SGP・Sch40・Sch80 のどれに近いかを表示します。
        </p>
        <p>おもな呼び径の外周（π × 外径、mm）:</p>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
          {PIPE_SIZES.map((size) => (
            <li key={size.a} className="flex justify-between gap-2 border-b border-zinc-100 py-0.5">
              <span>{size.a}</span>
              <span className="num text-zinc-900">{fixed(circumference(size.od), 1)}</span>
            </li>
          ))}
        </ul>
      </Faq>

      <Faq q="満水時の重さ・管の内容積は？">
        <p>
          1 m あたりの内容積は π/4 × 内径² で求めます。SGP {SGP50.size.a}（内径 {fixed(SGP50.id, 1)} mm）は{' '}
          <span className="num">{fixed(SGP50.volumePerM, 2)}</span> L/m です。水 1 L を 1 kg とすると、長さ{' '}
          {EXAMPLE_LENGTH} m で管 <span className="num">{fixed(SGP50_WEIGHT.mass, 1)}</span> kg ＋ 水{' '}
          <span className="num">{fixed(SGP50_WEIGHT.water, 1)}</span> kg ＝ 満水時{' '}
          <span className="num">{fixed(SGP50_WEIGHT.full, 1)}</span> kg。吊り荷や架台・支持の検討に使えます（継手・バルブ・保温材の重さは含みません）。
        </p>
      </Faq>

      <Faq q="管に切るねじ（R・PT）との対応は？ねじ部で外径を測ってもいい？">
        <p>
          鋼管に切る管用テーパおねじ R（旧 JIS の {THREAD_KINDS.R.old}）の呼びは、管の B 呼称と同じ数字です（
          {THREAD_EXAMPLES.map(({ a, thread }, index) => (
            <span key={a}>
              {index > 0 && '・'}
              {a} → R{thread.size}
            </span>
          ))}
          ）。
        </p>
        <p>
          ねじ部は管の外径より細くなります。{PIPE15.a} の管の外径 <span className="num">{fixed(PIPE15.od, 1)}</span> mm
          に対し、R{THREAD15.size} のねじの外径（基準径の位置）は <span className="num">{THREAD15.d}</span>{' '}
          mm です。実測で呼び径を調べるときは、ねじの無い部分で測ってください。ねじの寸法は{' '}
          <Link to={toolHref('/pipe-thread', { size: THREAD15.size, kind: 'R' })}>管用ねじのページ</Link>で確認できます。
        </p>
      </Faq>

      <Faq q="白管（亜鉛めっき鋼管）の重さは？">
        <p>
          このページの単位質量は黒管（めっき無し）の値です（SGP はソケットを含まない値）。白管は亜鉛めっきの分だけ重くなるので、正確な重さはメーカーの資料で確認してください。また、厚さの許容差があるため、実際の管の重さは計算値から多少ばらつきます。
        </p>
      </Faq>

      {(NON_GENERAL_40.length > 0 || NON_GENERAL_80.length > 0) && (
        <Faq q={`Sch40・Sch80 の細いサイズ（${NON_GENERAL_40[0]}〜${NON_GENERAL_40.at(-1)}）は手に入る？`}>
          <p>
            JIS G 3454 {STPG_TABLE} には載っていますが、表の太枠内（汎用品）ではないサイズがあります。Sch40 は {NON_GENERAL_40.join('・')}、Sch80 は{' '}
            {NON_GENERAL_80.join('・')} が太枠の外です。手に入るかどうかは、メーカー・商社に確認してください。
          </p>
        </Faq>
      )}

      <Faq q="JIS G 3452・G 3454 の年版は？">
        <p>
          {PIPE_EDITION_NOTE}改正版で数値が変わっていないかは、規格票で確認してください。
        </p>
      </Faq>

      {SGP_ONLY.length > 0 && (
        <Faq q={`${SGP_ONLY.map((s) => s.replace(/（.*$/, '')).join('・')} が Sch40・Sch80 に無いのは？`}>
          <p>
            {SGP_ONLY.join('・')} は SGP（JIS G 3452）にはありますが、JIS G 3454 の Sch40・Sch80
            の表にはありません。このツールで Sch40・Sch80 を選んでいるときは、これらのサイズは表示されません（選んでいた場合は外径が近いサイズに切り替わります）。
          </p>
        </Faq>
      )}
    </GuideSection>
  )
}
