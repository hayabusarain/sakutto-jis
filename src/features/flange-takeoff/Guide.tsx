import { Faq, GuideSection } from '../../components/Guide'
import { Link } from '../../router/Link'
import { FLANGE_TABLE_NO } from '../flange-bolt/data'
import { spareCount, takeoff, TAKEOFF_ITEM_KINDS, type TakeoffConditions } from './calc'
import { DEFAULT_INPUT, FLANGE_TOOL_PATH, MAX_ROWS, type TakeoffRow } from './input'
import { ITEM_UNITS, itemGroupTitle, itemSpec, takeoffConditionsText } from './labels'

/** ツールの既定の条件（六角ボルト・ガスケット 3mm・JIS本体ナット・座金なし・3山・5mm刻み） */
const DEFAULT_CONDITIONS: TakeoffConditions = {
  type: DEFAULT_INPUT.type,
  gasket: Number(DEFAULT_INPUT.gasket),
  washers: DEFAULT_INPUT.washers,
  nut: DEFAULT_INPUT.nut,
  threads: DEFAULT_INPUT.threads,
  rounding: DEFAULT_INPUT.rounding,
}

/** 解説の例: 10K 50A × 6か所・10K 80A × 2か所・20K 100A × 1か所 */
const EXAMPLE_ROWS: readonly TakeoffRow[] = [
  { pressure: '10K', size: '50A', count: '6' },
  { pressure: '10K', size: '80A', count: '2' },
  { pressure: '20K', size: '100A', count: '1' },
]
const EXAMPLE = takeoff(EXAMPLE_ROWS, DEFAULT_CONDITIONS, 0)
const STUD_EXAMPLE = takeoff(EXAMPLE_ROWS, { ...DEFAULT_CONDITIONS, type: 'stud' }, 0)
const [K10_50A, K10_80A] = EXAMPLE.lines
/** 10K 50A と 80A のボルトが同じ呼び・長さで、1つの品目にまとまるか */
const MERGED_EXAMPLE =
  K10_50A.flange.bolt === K10_80A.flange.bolt && K10_50A.bolt.length === K10_80A.bolt.length

const SPARE_EXAMPLES = [5, 10].map((percent) => ({ percent, quantity: 32, spare: spareCount(32, percent) }))

const cell = 'border-b border-zinc-100 px-2 py-1.5 whitespace-nowrap'
const head = 'border-b border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-semibold whitespace-nowrap text-zinc-600'

export function FlangeTakeoffGuide() {
  return (
    <GuideSection>
      <p>
        配管工事やメンテナンスで、フランジの継手を「10K 50A が 6か所、10K 80A が 2か所…」と並べると、発注に必要なボルト（呼び × 長さ）・ナット・平座金・ガスケットの数をまとめて数えるツールです。ボルトの呼び・本数・長さは、JISフランジ＆ボルト長さと同じ JIS B 2220 のデータと計算を使っています。一覧は {MAX_ROWS} 行まで入れられ、URL にも入るので LINE などでそのまま共有できます。
      </p>

      <Faq q="拾い出しはどう数える？（10K 50A × 6・10K 80A × 2・20K 100A × 1 の例）">
        <p>
          1か所あたりのボルトの本数はフランジのボルト穴の数（JIS B 2220 の表の n）です。それにか所数を掛け、同じ呼び・長さのボルトはまとめます。既定の条件（{takeoffConditionsText(DEFAULT_CONDITIONS)}）では次のとおりです。
        </p>
        <ul className="num list-disc pl-5">
          {EXAMPLE.lines.map((line) => (
            <li key={line.index}>
              {line.pressure} {line.size}（{FLANGE_TABLE_NO[line.pressure]}: M{line.flange.bolt}・{line.flange.n}穴）×{' '}
              {line.joints}か所 = ボルト {line.bolts}本・ガスケット {line.gaskets}枚
            </li>
          ))}
        </ul>
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">拾い出しの例（品目ごとの数量）</caption>
          {TAKEOFF_ITEM_KINDS.map((kind) => {
            const items = EXAMPLE.items.filter((item) => item.kind === kind)
            if (items.length === 0) return null
            return (
              <tbody key={kind}>
                <tr>
                  <th scope="colgroup" colSpan={2} className={`${head} text-left`}>
                    {itemGroupTitle(kind, DEFAULT_CONDITIONS)}
                  </th>
                </tr>
                {items.map((item) => (
                  <tr key={item.key}>
                    <th scope="row" className={`${cell} num text-left font-semibold`}>
                      {itemSpec(item)}
                    </th>
                    <td className={`${cell} num text-right`}>
                      {item.total}
                      {ITEM_UNITS[item.kind]}
                    </td>
                  </tr>
                ))}
              </tbody>
            )
          })}
        </table>
        {MERGED_EXAMPLE && (
          <p>
            10K 50A と 10K 80A はどちらも M{K10_50A.flange.bolt}×{K10_50A.bolt.length} なので、1つの品目にまとめて数えています（
            {K10_50A.bolts} + {K10_80A.bolts} = {K10_50A.bolts + K10_80A.bolts}本）。
          </p>
        )}
      </Faq>

      <Faq q="スタッドボルトにすると、ナットが2倍になるのはなぜ？">
        <p>
          スタッドボルト（全ねじ）は頭が無く、両端にナットを付けて締めるからです。六角ボルトはナット1個（反対側は頭）なので、ボルトと同じ数です。上の例をスタッドボルトにすると、ボルト {STUD_EXAMPLE.totals.bolt.quantity}本に対してナットは{' '}
          {STUD_EXAMPLE.totals.nut.quantity}個になります。ボルトの長さも、ナット2個分の高さと両側の突き出しを足すので長くなります。
        </p>
      </Faq>

      <Faq q="予備はどれくらい見ておく？">
        <p>
          締付けのときに落とす・ねじ山を傷める、ガスケットを取付けで傷める、といったことに備えて、少し多めに手配することがあります。このツールでは、品目ごとに「必要数 × 割合」を切り上げて足します（例:{' '}
          {SPARE_EXAMPLES.map((e) => `${e.quantity}本の${e.percent}% → ${e.spare}本`).join('、')}）。数の少ない品目でも1つは予備が付きます。
        </p>
        <p>5%・10% はこのサイトの選択肢で、規格の値ではありません。現場や会社の決まりがあれば、それに合わせてください（目安）。</p>
      </Faq>

      <Faq q="ガスケットの寸法（内径・外径）が出ないのはなぜ？">
        <p>
          管フランジ用ガスケットの寸法（JIS B 2404 など）は、このサイトではまだ規格の原文と照合できていないため、載せていません。拾い出しでは、呼び圧力・呼び径・厚さごとの枚数だけを出しています。
        </p>
        <p>
          全面形（フランジの外径まで覆う形）かリング形かは、フランジの座（全面座 FF・平面座 RF）や現物に合わせて選び、寸法はメーカーの資料などで確かめてください。
        </p>
      </Faq>

      <Faq q="バルブや機器のフランジと組む継手は？">
        <p>
          このツールは、相手側も同じフランジ（同じ厚さ）としてボルトの長さを計算します。バルブ・ポンプ・機器のフランジは厚さが違うことがあるので、一覧の各行の「M16×60」などのボタンから
          <Link to={FLANGE_TOOL_PATH}>JISフランジ＆ボルト長さ</Link>
          を同じ条件で開き、「相手側フランジの厚さ」を入れて長さを確かめてください。
        </p>
      </Faq>

      <Faq q="ボルトの長さは「JISフランジ＆ボルト長さ」と同じ？">
        <p>
          同じです。ボルトの種類・ガスケットの厚さ・ナット・平座金・突き出し・丸めの選択肢と既定値をそろえていて、同じ条件なら同じ長さになります（相手側の厚さは「同じフランジ」の場合）。市販品の長さはメーカーによって違うので、在庫の長さも確認してください。
        </p>
      </Faq>
    </GuideSection>
  )
}
