import { Faq, GuideSection } from '../../components/Guide'
import { trim } from '../../lib/format'
import {
  findFlange,
  flangeBoltLength,
  isRowUnverified,
  isUnverified,
  pcdFromPitch,
  sameBoltPattern,
  spannerSize,
  type BoltConditions,
} from './calc'
import { FLANGES, NUT_HEIGHT, PRESSURE_CLASSES, type PressureClass } from './data'
import { IDENTIFY_CARD_ID } from './IdentifyCard'
import { DEFAULT_INPUT } from './input'
import { conditionsText, unverifiedSummary } from './labels'
import { Marked } from './Unverified'

/** ツールの既定の条件（六角ボルト・ガスケット 3mm・JIS本体ナット・座金なし・3山・5mm刻み） */
const DEFAULT_CONDITIONS: BoltConditions = {
  type: DEFAULT_INPUT.type,
  gasket: Number(DEFAULT_INPUT.gasket),
  washers: DEFAULT_INPUT.washers,
  nut: DEFAULT_INPUT.nut,
  threads: DEFAULT_INPUT.threads,
  rounding: DEFAULT_INPUT.rounding,
  t2: null,
}

const K10_50A = findFlange('10K', '50A')!
const K5_50A = findFlange('5K', '50A')!
const K16_50A = findFlange('16K', '50A')!
const HEX_EXAMPLE = flangeBoltLength(K10_50A, DEFAULT_CONDITIONS)
const STUD_EXAMPLE = flangeBoltLength(K10_50A, { ...DEFAULT_CONDITIONS, type: 'stud' })

/** 2つのクラスで、ボルト穴（PCD・穴数・穴径）が同じ呼び径 */
function samePatternSizes(a: PressureClass, b: PressureClass): string[] {
  return FLANGES[a].filter((row) => {
    const other = findFlange(b, row.size)
    return other !== undefined && sameBoltPattern(row, other)
  }).map((row) => row.size)
}

const sizeList = (sizes: readonly string[]) => sizes.join('・')

const SAME_5K_10K = samePatternSizes('5K', '10K')
/** 5K と 10K の両方にある呼び径 */
const COMMON_5K_10K = FLANGES['5K'].filter((row) => findFlange('10K', row.size)).length
/** 5K と 10K で PCD が違う呼び径の数（すべてで違えば、どのサイズでもボルトが通らない） */
const PCD_DIFFERS_5K_10K = FLANGES['5K'].filter((row) => {
  const other = findFlange('10K', row.size)
  return other !== undefined && other.C !== row.C
}).length
/** 5K と 10K で穴数または穴径が違う呼び径の数 */
const HOLES_DIFFER_5K_10K = FLANGES['5K'].filter((row) => {
  const other = findFlange('10K', row.size)
  return other !== undefined && (other.n !== row.n || other.h !== row.h)
}).length
const SAME_10K_16K = samePatternSizes('10K', '16K')
const SAME_10K_20K = samePatternSizes('10K', '20K')
const SAME_16K_20K = samePatternSizes('16K', '20K')
const COMMON_16K_20K = FLANGES['16K'].filter((row) => findFlange('20K', row.size)).length
const THICKNESS_DIFFERS_16K_20K = FLANGES['16K'].filter((row) => findFlange('20K', row.size)?.t !== row.t).length

/** フランジに使うボルトの呼び（重複なし・小さい順） */
const FLANGE_BOLTS = [...new Set(PRESSURE_CLASSES.flatMap((p) => FLANGES[p].map((row) => row.bolt)))].sort(
  (a, b) => a - b,
)

/** JIS本体と旧JIS（附属書JA）で二面幅が違うボルト */
const SPANNER_DIFFERS = FLANGE_BOLTS.filter((bolt) => spannerSize(bolt, 'style1') !== spannerSize(bolt, 'ja1'))

/** 表にある呼び径の範囲（「10A〜300A」） */
const SIZE_RANGE = `${FLANGES['10K'][0].size}〜${FLANGES['10K'].at(-1)!.size}`

const HOLE_COUNTS = [...new Set(PRESSURE_CLASSES.flatMap((p) => FLANGES[p].map((row) => row.n)))].sort((a, b) => a - b)

const cell = 'border-b border-zinc-100 px-2 py-1.5 text-right whitespace-nowrap'
const head = 'border-b border-zinc-300 bg-zinc-50 px-2 py-1.5 text-right text-xs font-semibold whitespace-nowrap text-zinc-600'

export function FlangeBoltGuide() {
  return (
    <GuideSection>
      <Faq q="フランジボルトの長さはどう決める？">
        <p>
          六角ボルトは「フランジ2枚の厚さ ＋ ガスケット ＋ 座金 ＋ ナットの高さ ＋ ナットからの突き出し（2〜3山）」を足し、5mm刻みや在庫のある長さに切り上げます。
        </p>
        <p className="num">
          例: JIS 10K 50A（厚さ {K10_50A.t}・M{K10_50A.bolt}）、ガスケット {DEFAULT_CONDITIONS.gasket} mm、座金なし、3山
          <br />= {K10_50A.t} + {K10_50A.t} + {DEFAULT_CONDITIONS.gasket} + {trim(HEX_EXAMPLE.nutHeight)} +{' '}
          {DEFAULT_CONDITIONS.threads} × {trim(HEX_EXAMPLE.pitch)} = {trim(HEX_EXAMPLE.required)} mm → M{K10_50A.bolt} ×{' '}
          {HEX_EXAMPLE.length}
        </p>
        <p>
          ナットの高さは JIS本体（スタイル1）で M16 が {NUT_HEIGHT[16].style1} mm、旧JIS 1種で {NUT_HEIGHT[16].ja1} mm と違うので、使うナットに合わせて選んでください（上の「詳細条件」）。
        </p>
      </Faq>

      <Faq q="10K フランジのボルトのサイズ・本数・長さは？">
        <p>
          JIS B 2220 の 10K の表から、ボルトの呼びと本数、このツールの既定の条件（{conditionsText(DEFAULT_CONDITIONS)}
          ）で計算した長さの目安です。ガスケットの厚さやナットが違うときは、上で条件を変えてください。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">JIS 10K フランジのボルトの呼び・本数・長さ・スパナ</caption>
            <thead>
              <tr>
                <th scope="col" className={`${head} text-left`}>
                  呼び径
                </th>
                <th scope="col" className={head}>
                  ボルト × 本数
                </th>
                <th scope="col" className={head}>
                  長さ
                </th>
                <th scope="col" className={head}>
                  スパナ
                </th>
              </tr>
            </thead>
            <tbody className="num">
              {FLANGES['10K'].map((row) => {
                const unverified = isRowUnverified('10K', row.size)
                return (
                  <tr key={row.size}>
                    <th scope="row" className={`${cell} text-left font-semibold`}>
                      <Marked value={row.size} unverified={unverified} />
                    </th>
                    <td className={cell}>
                      M{row.bolt} × {row.n}
                    </td>
                    <td className={cell}>{flangeBoltLength(row, DEFAULT_CONDITIONS).length}</td>
                    <td className={cell}>{spannerSize(row.bolt, 'style1')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">
          単位 mm。スパナは JIS本体の二面幅。※ の呼び径は、寸法を規格原文で確認できていない行です。
        </p>
      </Faq>

      <Faq q="スタッドボルト（両ナット）の長さは？">
        <p>
          両端にナットを付けるので、ナットの高さと突き出しを2つ分足します。L = t<sub>1</sub> + t<sub>2</sub> + G + 2m + 2 × 突き出し。
        </p>
        <p className="num">
          例: JIS 10K 50A = {K10_50A.t} + {K10_50A.t} + {DEFAULT_CONDITIONS.gasket} + 2 × {trim(STUD_EXAMPLE.nutHeight)} + 2 ×{' '}
          {DEFAULT_CONDITIONS.threads} × {trim(STUD_EXAMPLE.pitch)} = {trim(STUD_EXAMPLE.required)} mm →{' '}
          {STUD_EXAMPLE.length} mm
        </p>
      </Faq>

      <Faq q="5K と 10K のフランジはボルトでつながる？">
        {SAME_5K_10K.length === 0 ? (
          <p>
            つながりません。このツールの表（{SIZE_RANGE}）では、5K と 10K でボルト穴の位置（PCD）が
            {PCD_DIFFERS_5K_10K === COMMON_5K_10K ? 'すべてのサイズで' : `${COMMON_5K_10K} サイズのうち ${PCD_DIFFERS_5K_10K} サイズで`}
            違います（穴数や穴径も {COMMON_5K_10K} サイズのうち {HOLES_DIFFER_5K_10K} サイズで違います）。例えば 50A は 5K が PCD {K5_50A.C}・{K5_50A.n}-φ{K5_50A.h}（M{K5_50A.bolt}）、10K が PCD {K10_50A.C}・{K10_50A.n}-φ{K10_50A.h}（M{K10_50A.bolt}）です。
          </p>
        ) : (
          <p>5K と 10K でボルト穴が同じ呼び径: {sizeList(SAME_5K_10K)}</p>
        )}
        <p>上の「圧力クラス比較」で、選んだ呼び径の 5K〜20K を並べて確認できます。</p>
      </Faq>

      <Faq q="10K・16K・20K の違いは？ 穴の位置は同じ？">
        <p>
          ボルト穴（PCD・穴数・穴径）が 10K と同じなのは、16K が {sizeList(SAME_10K_16K)}、20K が {sizeList(SAME_10K_20K)}
          。それより大きいサイズは穴数や PCD が変わります（例: 50A は 10K が {K10_50A.n}穴、16K が {K16_50A.n}穴）。
        </p>
        <p>
          {SAME_16K_20K.length === COMMON_16K_20K
            ? '16K と 20K は表のすべてのサイズでボルト穴（PCD・穴数・穴径）が同じで、'
            : `16K と 20K は、表の ${COMMON_16K_20K} サイズのうち ${SAME_16K_20K.length} サイズでボルト穴が同じで、`}
          厚さ t が違う（{THICKNESS_DIFFERS_16K_20K} サイズ）ことで見分けます。ただし 16K の厚さは規格原文で確認できていない値（※）です。
        </p>
      </Faq>

      <Faq q="PCD（ボルト穴の中心円の直径）はどう測る？">
        <p>
          穴数が偶数なら、向かい合う2つの穴で「片方の穴の左端から、もう片方の穴の左端まで」（同じ側の縁どうし）を測ると PCD になります。管が付いていて向かいの穴まで測れないときは、隣り合う穴の中心間距離 s から PCD = s ÷ sin(180° / 穴数) で求めます。
        </p>
        <ul className="num list-disc pl-5">
          {HOLE_COUNTS.map((n) => (
            <li key={n}>
              {n}穴: PCD = s × {trim(pcdFromPitch(1, n), 3)}
            </li>
          ))}
        </ul>
        <p>
          外径・穴数・間隔から JIS の呼び径と圧力を探すには、<a href={`#${IDENTIFY_CARD_ID}`}>実測から探す</a>を使ってください。
        </p>
      </Faq>

      <Faq q="フランジボルトに使うスパナ（二面幅）は？">
        <p>
          ナットと六角ボルトの頭の二面幅です。{SPANNER_DIFFERS.map((bolt) => `M${bolt}`).join('・')}{' '}
          は JIS本体と旧JIS（附属書JA）で大きさが違います。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">フランジボルトのスパナの大きさ</caption>
            <thead>
              <tr>
                <th scope="col" className={`${head} text-left`}>
                  ボルト
                </th>
                <th scope="col" className={head}>
                  JIS本体
                </th>
                <th scope="col" className={head}>
                  旧JIS
                </th>
              </tr>
            </thead>
            <tbody className="num">
              {FLANGE_BOLTS.map((bolt) => {
                const iso = spannerSize(bolt, 'style1')
                const ja = spannerSize(bolt, 'ja1')
                return (
                  <tr key={bolt}>
                    <th scope="row" className={`${cell} text-left font-semibold`}>
                      M{bolt}
                    </th>
                    <td className={cell}>{iso}</td>
                    <td className={`${cell} ${iso !== ja ? 'font-semibold text-orange-800' : ''}`}>{ja}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-500">単位 mm。六角ボルトなら頭側とナット側で2本、スタッドボルトは両側のナットに2本使います。</p>
      </Faq>

      <Faq q="フランジの厚さ t に座（レイズドフェイス）は含まれる？ ※ の値は？">
        <p>
          このツールでは、JIS B 2220 の表の厚さ t を座（RF）の高さを含む厚さとして計算しています（メーカーの公差表の記載から判断）。座を含まない厚さの資料と組み合わせるときは、相手側の厚さにその分を足してください。
        </p>
        <p>
          ※ は規格原文で確認できていない値です。いまは {unverifiedSummary().join('、')} に付けています。確認でき次第、※ を外します。
        </p>
        {isUnverified('5K', '50A', 't') && (
          <p>
            5K 50A の厚さは資料によって値が分かれるため、ボルトが長めになる {K5_50A.t} mm を採用しています。
          </p>
        )}
      </Faq>
    </GuideSection>
  )
}
