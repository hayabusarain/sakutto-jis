import { Faq, GuideSection } from '../../components/Guide'
import { fixed } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { standardLabel } from '../../standards'
import { findPipeSize } from '../steel-pipe/calc'
import {
  findPipeThread,
  gInternalCalloutWithDrill,
  gMinorLimits,
  gRecommendedDrill,
  pipeThreadDesignation,
  pitch,
  rcInnerMinorDiameter,
  rPipeEndDiameter,
  rUsefulEndDiameter,
  TAPER,
} from './calc'
import { PIPE_THREAD_SIZES, PIPE_THREAD_TABLES, THREAD_KINDS, type PipeThreadKind } from './data'

const KINDS = Object.keys(THREAD_KINDS) as PipeThreadKind[]

/** 山数ごとのサイズ（例: 14山 → 1/2・3/4） */
const TPI_GROUPS = [...new Set(PIPE_THREAD_SIZES.map((t) => t.tpi))].map((tpi) => ({
  tpi,
  sizes: PIPE_THREAD_SIZES.filter((t) => t.tpi === tpi).map((t) => t.size),
}))

/** よく使うサイズ（1/8〜2） */
const COMMON = PIPE_THREAD_SIZES.filter((t) => ['1/8', '1/4', '3/8', '1/2', '3/4', '1', '1 1/4', '1 1/2', '2'].includes(t.size))

const table = 'mt-2 w-full max-w-2xl border-collapse text-xs'
const th = 'border-b border-zinc-300 bg-zinc-50 px-2 py-1.5 text-right align-bottom font-semibold text-zinc-600 first:text-left'
const td = 'num border-b border-zinc-100 px-2 py-1.5 text-right align-top whitespace-nowrap first:text-left'
const tdWrap = 'num border-b border-zinc-100 px-2 py-1.5 text-right align-top'

export function PipeThreadGuide() {
  const half = findPipeThread('1/2')!
  const halfPipe = findPipeSize(half.pipeA ?? '')
  const halfEnd = rPipeEndDiameter(half)
  const halfTaperOverA = half.gaugeLength * TAPER

  return (
    <GuideSection>
      <Faq q="PT・PS・PF と R・Rc・Rp・G の違いは？">
        <p>
          同じねじの、旧JISと今のJISの記号の違いです。今の図面・カタログでは R・Rc・Rp・G を使います（
          {standardLabel('JIS B 0203')}・{standardLabel('JIS B 0202')}）。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          {KINDS.map((kind) => (
            <li key={kind}>
              <span className="num font-semibold text-zinc-900">{kind}</span>（旧 {THREAD_KINDS[kind].old}）…{' '}
              {THREAD_KINDS[kind].name}。{THREAD_KINDS[kind].description}
            </li>
          ))}
        </ul>
      </Faq>

      <Faq q="R・Rc・Rp・G は、どの組み合わせでねじ込みますか？">
        <p>
          テーパおねじ R は、テーパめねじ Rc か平行めねじ Rp と組み合わせます（{standardLabel('JIS B 0203')}）。ねじ部で気密を取るため、シールテープや液状シール剤を併用します。
        </p>
        <p>
          平行ねじ G は G どうしで組み合わせ、気密はねじ部ではなくパッキン・Oリングで取ります（{standardLabel('JIS B 0202')}）。
        </p>
        <p>
          山数・ピッチ・基準径は R・Rc・Rp・G で共通ですが、テーパの有無が違います。R と組み合わせるめねじとして {standardLabel('JIS B 0203')}{' '}
          に定められているのは Rc と Rp で、G ではありません。
        </p>
      </Faq>

      <Faq q="管用ねじの山数とピッチは？">
        <p>山数は 25.4mm（1インチ）あたりの山の数で、ピッチ P = 25.4 ÷ 山数 です。</p>
        <div className="overflow-x-auto"><table className={table}>
          <thead>
            <tr>
              <th className={th}>山数</th>
              <th className={th}>ピッチ P [mm]</th>
              <th className={th}>呼び</th>
            </tr>
          </thead>
          <tbody>
            {TPI_GROUPS.map((group) => (
              <tr key={group.tpi}>
                <td className={td}>{group.tpi}山</td>
                <td className={td}>{fixed(pitch(group.tpi), 4)}</td>
                <td className={tdWrap}>{group.sizes.join('・')}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </Faq>

      <Faq q="G（PF）の下穴径は？">
        <p>
          G のめねじ内径は、基準寸法 D1 から D1 + 公差 までの範囲に入れます（{standardLabel('JIS B 0202')}{' '}
          {PIPE_THREAD_TABLES.parallelTolerance}）。このページの推奨下穴径は、その範囲の中央に最も近い 0.1mm 刻みの径（計算値）です。
        </p>
        <div className="overflow-x-auto"><table className={table}>
          <thead>
            <tr>
              <th className={th}>呼び</th>
              <th className={th}>内径の範囲</th>
              <th className={th}>下穴径</th>
            </tr>
          </thead>
          <tbody>
            {COMMON.map((t) => {
              const limits = gMinorLimits(t)
              return (
                <tr key={t.size}>
                  <td className={td}>G{t.size}</td>
                  <td className={td}>
                    {fixed(limits.min, 3)}〜{fixed(limits.max, 3)}
                  </td>
                  <td className={td}>φ{fixed(gRecommendedDrill(t), 1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
        <p>単位: mm。下穴径は計算値です。タップメーカーが別に推奨値を出している場合は、そちらを優先してください。</p>
      </Faq>

      <Faq q="Rc（PT）の下穴径は？">
        <p>
          Rc はテーパ 1/16 のめねじで、入口（ねじを切った部分の端面＝基準径の位置）の内径が D1、奥に行くほど細くなります。有効ねじ部の最小長さ l（{standardLabel('JIS B 0203')}{' '}
          {PIPE_THREAD_TABLES.taper}）の奥端では D1 − l/16 です。
          例えば Rc1/2 は {fixed(half.d1, 3)} − {fixed(half.usefulInternalRc ?? 0, 1)} ÷ 16 ={' '}
          {fixed(rcInnerMinorDiameter(half) ?? 0, 3)} mm です。
        </p>
        <p>
          この奥端の内径は、テーパリーマで下穴を仕上げるときの目安です。リーマを使わずにタップを立てる場合の下穴径は、タップメーカーの推奨値に従ってください。
        </p>
      </Faq>

      <Faq q="1/2 の管用ねじの外径が、15A の鋼管の外径より小さいのはなぜ？">
        <p>
          ねじは管の外周に切るので、ねじ部の外径は管の外径より小さくなります。R1/2 の基準径（管端から {fixed(half.gaugeLength, 2)} mm
          の位置）の外径は {fixed(half.d, 3)} mm、テーパで細くなる管端では {fixed(halfEnd, 3)} mm（計算値）
          {halfPipe && <>で、SGP 15A の外径 {fixed(halfPipe.od, 1)} mm（{standardLabel('JIS G 3452')}）より小さい値です</>}。
        </p>
        <div className="overflow-x-auto"><table className={table}>
          <thead>
            <tr>
              <th className={th}>呼び</th>
              <th className={th}>管の外径</th>
              <th className={th}>ねじ外径 d</th>
              <th className={th}>R 管端</th>
            </tr>
          </thead>
          <tbody>
            {COMMON.map((t) => {
              const pipe = t.pipeA ? findPipeSize(t.pipeA) : undefined
              return (
                <tr key={t.size}>
                  <td className={td}>
                    {t.size}
                    <span className="block text-[11px] text-zinc-500">{t.pipeA}</span>
                  </td>
                  <td className={td}>{pipe ? fixed(pipe.od, 1) : '—'}</td>
                  <td className={td}>{fixed(t.d, 3)}</td>
                  <td className={td}>{fixed(rPipeEndDiameter(t), 3)}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
        <p>単位: mm。管の外径は SGP・STPG 共通の値、R 管端の外径は d − a/16 の計算値です。</p>
      </Faq>

      <Faq q="テーパ 1/16 とは？">
        <p>
          軸方向に 16 進むと、直径が 1 変わる傾きです。長さ x では直径が x/16 変わります。R1/2 では、管端から基準径の位置までの{' '}
          {fixed(half.gaugeLength, 2)} mm で直径が {fixed(halfTaperOverA, 3)} mm 変わり、有効ねじ部の端（管端から a + f ={' '}
          {fixed(half.usefulExternal, 1)} mm。a が基準寸法のとき）では {fixed(rUsefulEndDiameter(half), 3)} mm になります（計算値）。
        </p>
        <p>
          そのため、ノギスで測る位置によって外径が変わります。手元のねじが R か G か分からないときは、
          <Link to={toolHref('/thread-identify')}>実測でねじを判別</Link>
          で、2か所の外径からテーパを確かめられます。
        </p>
      </Faq>

      <Faq q="図面にはどう書けばよいですか？">
        <p>
          記号と呼びを続けて書きます。例: {pipeThreadDesignation('R', '1/2')}（おねじ）、{pipeThreadDesignation('Rc', '1/2')}・
          {pipeThreadDesignation('Rp', '1/2')}（めねじ）、{pipeThreadDesignation('G', '1/2')}（G のめねじ）。
          G のおねじは有効径の公差の等級を付けて {pipeThreadDesignation('G', '1/2', 'A')}・{pipeThreadDesignation('G', '1/2', 'B')} と書きます。
        </p>
        <p>
          結果欄の「図面指示」から、そのままコピーできます。G のめねじには、計算した下穴径を添えた「{gInternalCalloutWithDrill(half)}」の形もあります（下穴径は規格の値ではなく計算値です）。
        </p>
      </Faq>
    </GuideSection>
  )
}
