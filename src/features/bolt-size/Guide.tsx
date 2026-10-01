import { Faq, GuideSection } from '../../components/Guide'
import { trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import {
  ACROSS_FLATS_SIZES,
  acrossFlatsMatchLabel,
  boltSizesInFlanges,
  boltsByAcrossFlats,
  boltsByKey,
  coarsePitchOf,
  counterboreCallout,
  findBolt,
  flangesUsingBolt,
  holeCallout,
  sizeRangeLabel,
  FLANGE_TOOL_PATH,
  TAP_DRILL_TOOL_PATH,
} from './calc'
import { BOLT_SIZES, HOLE_CLASSES, isUnverified, UNVERIFIED_LEGEND } from './data'
import { Mark } from './Mark'

const bolt = (d: number) => findBolt(d)!

/** 旧JIS（附属書JA）と JIS本体で二面幅が違うサイズ */
const DIFFERENT = BOLT_SIZES.filter((size) => size.sIso !== size.sJa)
const JIS_KEY_SIZES = BOLT_SIZES.filter((size) => !size.capNonJis)
const NON_JIS_KEY_SIZES = BOLT_SIZES.filter((size) => size.capNonJis)
/** JIS外のサイズと六角レンチを共用する例 */
const SHARED_KEY = NON_JIS_KEY_SIZES[0].capKey

const th = 'border-b border-zinc-300 bg-zinc-50 px-2 py-1.5 text-left text-xs font-semibold text-zinc-600'
const td = 'border-b border-zinc-100 px-2 py-1.5 align-top'

export function BoltSizeGuide() {
  const m10 = bolt(10)
  const m12 = bolt(12)
  const holeExamples = [bolt(10), bolt(12), bolt(16)]
  const counterboreExamples = [6, 8, 10, 12, 16].map(bolt).filter((size) => size.counterbore)
  const m10cb = m10.counterbore!

  return (
    <GuideSection>
      <p>
        二面幅は、六角ボルトの頭や六角ナットの向かい合う平らな面の間の距離で、そのまま合うスパナ・メガネレンチのサイズになります。六角穴付きボルト（キャップボルト）は、六角穴の二面幅が六角レンチのサイズです。このページの数値は上の表（JIS B 1180・B 1181・B 1176・B 1001）から出しています。
      </p>

      <Faq q={`M${m10.d} のスパナは ${trim(m10.sIso)} と ${trim(m10.sJa)} のどっち？`}>
        <p>
          どちらもあります。JIS本体（ISOと同じ寸法）の M{m10.d} は <span className="num">{trim(m10.sIso)} mm</span>、旧JIS（JIS B 1180・B 1181 の附属書JA）の M{m10.d} は{' '}
          <span className="num">{trim(m10.sJa)} mm</span> です。二面幅が本体と旧JISで違うのは次の {DIFFERENT.length} サイズで、それ以外は同じです。
        </p>
        <div className="overflow-x-auto">
          <table className="num w-full max-w-sm border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>ねじ</th>
                <th className={th}>JIS本体</th>
                <th className={th}>旧JIS（附属書JA）</th>
              </tr>
            </thead>
            <tbody>
              {DIFFERENT.map((size) => (
                <tr key={size.d}>
                  <td className={td}>M{size.d}</td>
                  <td className={td}>{trim(size.sIso)} mm</td>
                  <td className={td}>{trim(size.sJa)} mm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          頭が旧JIS、ナットがJIS本体という組み合わせもあり得るので、これらのサイズでは両方のスパナを持っていくと確実です。
        </p>
      </Faq>

      <Faq q="スパナのサイズから、ボルトの太さ（M○○）を知るには？">
        <p>
          二面幅から逆に引くと次のとおりです（単位 mm）。「旧JIS」と書いたものは附属書JAの二面幅で、JIS本体の同じサイズは別の二面幅です。上の「工具のサイズからボルトを探す」でも調べられます。
        </p>
        <ul className="num grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] gap-x-3 text-[13px]">
          {ACROSS_FLATS_SIZES.map((s) => (
            <li key={s} className="border-b border-zinc-100 py-1">
              <span className="inline-block w-7 font-semibold text-zinc-900">{trim(s)}</span>→{' '}
              {boltsByAcrossFlats(s)
                .map(acrossFlatsMatchLabel)
                .join('・')}
            </li>
          ))}
        </ul>
      </Faq>

      <Faq q="六角穴付きボルト（キャップボルト）に使う六角レンチのサイズは？">
        <p>JIS B 1176 の六角穴の二面幅（六角レンチの呼び）は次のとおりです。</p>
        <ul className="num grid grid-cols-[repeat(auto-fill,minmax(8.75rem,1fr))] gap-x-3 text-[13px]">
          {JIS_KEY_SIZES.map((size) => (
            <li key={size.d} className="border-b border-zinc-100 py-1">
              <span className="inline-block w-10 font-semibold text-zinc-900">M{size.d}</span> → {trim(size.capKey)} mm
            </li>
          ))}
        </ul>
        <p>
          {NON_JIS_KEY_SIZES.map((size) => `M${size.d}`).join('・')} は JIS B 1176 に無いサイズで、表の値は DIN 912 などのものです（
          {NON_JIS_KEY_SIZES.map((size) => `M${size.d} は ${trim(size.capKey)} mm`).join('、')}
          ）。そのため同じ六角レンチを使うサイズがあり（例: {trim(SHARED_KEY)} mm は{' '}
          {boltsByKey(SHARED_KEY)
            .map((match) => `M${match.size.d}`)
            .join(' と ')}
          ）、レンチのサイズだけではボルトを決められません。
        </p>
      </Faq>

      <Faq q="フランジのボルトを締めるには、何ミリのスパナが要る？">
        <p>
          JIS B 2220 のフランジ（5K〜20K、10A〜300A）で使うボルトと、その二面幅は次のとおりです。六角ボルトなら頭とナットで2本（スタッドボルトなら両側のナットで2本）あると作業できます。
        </p>
        <ul>
          {boltSizesInFlanges().map((d) => {
            const size = bolt(d)
            return (
              <li key={d} className="border-b border-zinc-100 py-1.5 last:border-b-0">
                <p>
                  <span className="num inline-block w-12 font-bold text-zinc-900">M{d}</span>
                  スパナ <span className="num font-semibold text-zinc-900">{trim(size.sIso)} mm</span>
                  {size.sIso !== size.sJa && (
                    <span className="text-zinc-600">
                      （旧JIS <span className="num">{trim(size.sJa)} mm</span>）
                    </span>
                  )}
                </p>
                <p className="num pl-12 text-xs text-zinc-600">
                  {flangesUsingBolt(d)
                    .map((use) => `${use.pressure} ${sizeRangeLabel(use.sizes)}`)
                    .join('、')}
                </p>
              </li>
            )
          })}
        </ul>
        <p>
          ボルトの長さは <Link to={toolHref(FLANGE_TOOL_PATH)}>JISフランジ＆ボルト長さ</Link> で計算できます。
        </p>
      </Faq>

      <Faq q="ボルト穴の 1級・2級・3級 はどれを選べばいい？">
        <p>
          JIS B 1001 のボルト穴径は、1級ほど小さく（ボルトとのすき間が少なく）、そのぶん穴位置の精度が要ります。3級ほど大きく、穴位置のずれに余裕があります。迷ったら 2級（このツールの初期値）にしておくのが無難です。
        </p>
        <div className="overflow-x-auto">
          <table className="num w-full max-w-sm border-collapse text-sm">
            <thead>
              <tr>
                <th className={th}>ねじ</th>
                {HOLE_CLASSES.map((c) => (
                  <th key={c} className={th}>
                    {c}
                    <Mark show={c === '4級' && isUnverified('hole4', holeExamples[0].d)} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holeExamples.map((size) => (
                <tr key={size.d}>
                  <td className={td}>M{size.d}</td>
                  {size.holes.map((h, i) => (
                    <td key={HOLE_CLASSES[i]} className={td}>
                      {h === null ? '—' : trim(h)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          単位 mm。{UNVERIFIED_LEGEND}（4級）。
        </p>
        <p>
          ボルトを通す穴（ボルト穴）と、タップでめねじを切るための下穴は別物です。下穴は{' '}
          <Link to={toolHref(TAP_DRILL_TOOL_PATH, { d: m10.d, p: coarsePitchOf(m10.d)! })}>ねじ下穴径</Link>{' '}
          で確かめてください（M{m10.d} 並目のボルト穴 2級 は {trim(m10.holes[1])} mm ですが、下穴はずっと小さくなります）。
        </p>
      </Faq>

      <Faq q="キャップボルト（六角穴付きボルト）の座ぐり寸法は？">
        <p>
          頭が面から出ないようにする深座ぐりは、JIS の規格本体には決まった値がなく、設計でよく使われる参考値があります。このツールの値は次のとおりです（穴径 d1・座ぐり径 D・深さ H）。
        </p>
        <ul className="num space-y-1">
          {counterboreExamples.map((size) => (
            <li key={size.d}>
              <span className="inline-block w-10 font-semibold text-zinc-900">M{size.d}</span>
              穴 φ{trim(size.counterbore!.d1)}・座ぐり φ{trim(size.counterbore!.d)}・深さ {trim(size.counterbore!.h)}
            </li>
          ))}
        </ul>
        <p>
          たとえば M{m12.d} は頭部径 {trim(m12.capDk)} mm・頭部の高さ {trim(m12.capK)} mm に対して、座ぐり φ{trim(m12.counterbore!.d)}・深さ{' '}
          {trim(m12.counterbore!.h)} mm です。ワッシャーを入れるときは、その外径と厚さの分も見込んでください。
        </p>
      </Faq>

      <Faq q="穴や座ぐりは図面にどう書く？">
        <p>
          M{m10.d} の六角穴付きボルト4本の場合の書き方の例です（参考）。記号（⌴・↧）を使う現行の JIS B 0001 に沿った書き方と、文字で書く従来の書き方があります。
        </p>
        <ul className="num space-y-1 text-zinc-900">
          <li>
            <span className="font-sans text-xs text-zinc-500">記号: </span>
            {counterboreCallout(4, m10cb, 'current')}
          </li>
          <li>
            <span className="font-sans text-xs text-zinc-500">文字: </span>
            {counterboreCallout(4, m10cb, 'legacy')}
          </li>
        </ul>
        <p>
          ⌴ は深ざぐり、↧ は深さを表します。六角ボルトを通すだけの穴（2級）なら「{holeCallout(4, m10.holes[1], 'current')}」（従来は「
          {holeCallout(4, m10.holes[1], 'legacy')}」）。上の「図面指示の例」で、選んだサイズの文字をそのままコピーできます。記号の形や並べ方は、社内の製図ルールに合わせてください。
        </p>
      </Faq>
    </GuideSection>
  )
}
