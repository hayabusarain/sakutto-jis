import type { MouseEvent, ReactNode } from 'react'
import { Faq, GuideSection } from '../../components/Guide'
import { usePersistentState } from '../../hooks/usePersistentState'
import { stateQuery, toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { pipeDimensions } from '../steel-pipe/calc'
import { convert, findUnit, formatValue, isExact } from './calc'
import type { Quantity } from './data'
import { DEFAULT_INPUT, inputFor, isUnitConvertInput, normalizeInput, STORAGE_KEY } from './state'

/** 「1 kgf/cm² = 0.0980665 MPa」の形（数値は calc から計算する） */
function eq(quantity: Quantity, value: number, fromId: string, toId: string): string {
  const from = findUnit(quantity, fromId)!
  const to = findUnit(quantity, toId)!
  const result = convert(value, from, to)
  return `${formatValue(value)} ${from.label} ${isExact(result) ? '=' : '≒'} ${formatValue(result)} ${to.label}`
}

/**
 * 同じページの条件を切り替えるリンク。ページは読み直さずに入力を書き換え、結果へスクロールする
 * （同じツールへの Link では入力が URL から読み直されないため）。新しいタブで開けば URL の条件で表示される。
 */
function TryLink({
  q,
  v,
  from,
  to,
  children,
}: {
  q: Quantity
  v: string
  from: string
  to: string
  children: ReactNode
}) {
  const [, setInput] = usePersistentState(STORAGE_KEY, DEFAULT_INPUT, isUnitConvertInput)
  const next = inputFor(q, v, from, to)
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    setInput(next)
    document.getElementById('unit-convert-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  // ツールが URL に書くのと同じクエリ（開き直したときに同じ条件になる）
  const query = stateQuery(next, DEFAULT_INPUT, normalizeInput)
  return (
    <a href={`/unit-convert${query ? `?${query}` : ''}`} onClick={handleClick}>
      {children}
    </a>
  )
}

/** ページ下部の「解説・よくある質問」 */
export function UnitConvertGuide() {
  const pipe32 = pipeDimensions('sgp', '32A')
  return (
    <GuideSection>
      <Faq q="1 kgf/cm² は何 MPa？">
        <p>
          <span className="num">{eq('pressure', 1, 'kgfcm2', 'MPa')}</span> です（1 kgf = 9.80665 N、1 cm² = 0.0001 m² から）。「約
          0.1 MPa」と覚えることが多いですが、約 2% の違いがあります。
        </p>
        <p>
          例: <span className="num">{eq('pressure', 10, 'kgfcm2', 'MPa')}</span>（
          <TryLink q="pressure" v="10" from="kgfcm2" to="MPa">
            10 kgf/cm² を換算
          </TryLink>）
        </p>
      </Faq>
      <Faq q="1 MPa は何 kgf/cm²？">
        <p>
          <span className="num">{eq('pressure', 1, 'MPa', 'kgfcm2')}</span> です。
          <span className="num">{eq('pressure', 0.5, 'MPa', 'kgfcm2')}</span>（
          <TryLink q="pressure" v="1" from="MPa" to="kgfcm2">
            MPa から換算
          </TryLink>
          ）。
        </p>
      </Faq>
      <Faq q="1 インチは何 mm？">
        <p>
          <span className="num">1 in = 25.4 mm</span> ちょうど（定義）です。分数のインチは「1-1/4」のように入力できます:{' '}
          <span className="num">{eq('length', 1.25, 'in', 'mm')}</span>（<TryLink q="length" v="1-1/4" from="in" to="mm">
            1-1/4 インチを換算
          </TryLink>）。
        </p>
        <p>
          ただし、配管の呼び径「1-1/4B（32A）」は実際の寸法ではありません。
          {pipe32 && (
            <>
              SGP 32A の外径は <span className="num">{pipe32.od} mm</span> です（
              <Link to={toolHref('/steel-pipe', { a: '32A' })}>鋼管の寸法を見る</Link>）。
            </>
          )}
        </p>
      </Faq>
      <Faq q="psi・bar を MPa にするには？">
        <p>
          <span className="num">{eq('pressure', 100, 'psi', 'MPa')}</span>、
          <span className="num">{eq('pressure', 1, 'bar', 'MPa')}</span>（1 bar = 100 kPa の定義）です。海外製の圧力計やタイヤ・コンプレッサーでよく使われます。
        </p>
      </Faq>
      <Faq q="kgf·m・kgf·cm と N·m の関係は？">
        <p>
          <span className="num">{eq('torque', 1, 'kgfm', 'Nm')}</span>、
          <span className="num">{eq('torque', 1, 'kgfcm', 'Nm')}</span> です。kgf·m と kgf·cm は 100
          倍違うので、古い締付けトルク表を読むときは単位をよく確認してください。
        </p>
        <p>
          インチ系の工具では <span className="num">{eq('torque', 1, 'lbfft', 'Nm')}</span>（ft·lb と書くこともあります）。
        </p>
      </Faq>
      <Faq q="ゲージ圧と絶対圧の違いは？">
        <p>
          ゲージ圧は大気圧との差（ふつうの圧力計の読み）、絶対圧は真空を 0 とした圧力です。絶対圧 ＝ ゲージ圧 ＋
          大気圧で、このツールでは大気圧を標準大気圧 101.325 kPa としています。「MPaG」「MPa abs」のように書き分けることがあります。
        </p>
      </Faq>
      <Faq q="JIS フランジの 10K は 10 kgf/cm² まで使えるということ？">
        <p>
          いいえ。5K・10K などは<strong>呼び圧力</strong>という区分の名前で、使える圧力（最高使用圧力）は材料・温度・流体によって規格で決められています。単位換算した値をそのまま使用圧力の上限と考えないでください。
        </p>
      </Faq>
      <Faq q="換算係数はどこから？">
        <p>
          すべて定義どおりの値から計算しています: 標準重力 9.80665 m/s²（1 kgf = 9.80665 N）、1 in = 25.4 mm、1 lb = 0.45359237
          kg、1 bar = 100 kPa、1 atm = 101.325 kPa、1 mmHg = 101325/760 Pa、1 mH₂O = 9.80665 kPa。表示は有効数字6桁に丸めています。
        </p>
      </Faq>
    </GuideSection>
  )
}
