import { Faq, GuideSection } from '../../components/Guide'
import { fixed, trim } from '../../lib/format'
import { standardLabel } from '../../standards'
import {
  allORings,
  CROSS_SECTIONS,
  findByMatingDiameter,
  findORing,
  flatGroove,
  flatSqueezeRange,
  grooveDepth,
  identifyByRing,
  oRingNumbers,
  squeeze,
  squeezeRange,
  type ORing,
} from './calc'
import type { ORingSeries } from './data'

const ring = (series: ORingSeries, no: string) => findORing(series, no)!
const list = (values: readonly number[]) => values.map((value) => trim(value)).join('・')
const names = (rings: readonly ORing[]) => rings.map((r) => r.no).join('・')

/** 系列ごとの太さの種類（小さい順） */
function thicknesses(series: ORingSeries): number[] {
  const values = oRingNumbers(series).map((no) => ring(series, no).group.d2)
  return [...new Set(values)].sort((a, b) => a - b)
}

/** 全サイズのつぶし率の範囲（許容差の両端を含む） */
function squeezeSpan(kind: 'cylinder' | 'flat') {
  const ranges = allORings().map((r) => (kind === 'flat' ? flatSqueezeRange(r) : squeezeRange(r)!))
  return {
    min: Math.min(...ranges.map((r) => r.min)),
    max: Math.max(...ranges.map((r) => r.max)),
  }
}

/** ページ下部の「解説・よくある質問」。数値はすべて data.ts・calc.ts から計算する */
export function ORingGuide() {
  const p20 = ring('P', 'P20')
  const p50 = ring('P', 'P50')
  const g50 = ring('G', 'G50')
  const p10 = ring('P', 'P10')
  const p10a = ring('P', 'P10A')
  const bore30 = findByMatingDiameter('piston', 30).exact
  const shaft30 = findByMatingDiameter('rod', 30).exact
  const measured = identifyByRing(24.6, 3.5).candidates[0]
  const cylinder = squeezeSpan('cylinder')
  const flat = squeezeSpan('flat')
  const p20Squeeze = squeeze(p20.group.d2, grooveDepth(p20))
  const p20Internal = flatGroove(p20, 'internal')
  const p20External = flatGroove(p20, 'external')
  const aNumbers = oRingNumbers('P').filter((no) => no.endsWith('A'))

  return (
    <GuideSection>
      <Faq q="Oリングの P と G の違いは？">
        <p>
          P は運動用と固定用の両方に使える系列、G は固定用の系列です（{standardLabel('JIS B 2401-1')}）。 P は{' '}
          {oRingNumbers('P').length} サイズで太さが {list(thicknesses('P'))} mm、G は {oRingNumbers('G').length}{' '}
          サイズで太さが {list(thicknesses('G'))} mm です。
        </p>
        <p>
          同じ数字でも溝の寸法が違うことがあります。たとえば P50 と G50 はどちらも d = {trim(p50.d)} mm ですが、D は P50
          が {trim(p50.D)} mm、G50 が {trim(g50.D)} mm
          です。取り違えると漏れの原因になるので、番号は系列の文字まで確認してください。
        </p>
      </Faq>

      <Faq q="呼び番号（P20 など）の数字は何の寸法？">
        <p>
          Oリングの内径ではなく、ハウジング（溝）の d の寸法です。P20 は内径 d1 = {trim(p20.d1)} mm・太さ d2 ={' '}
          {trim(p20.group.d2)} mm で、溝は d = {trim(p20.d)} mm、D = {trim(p20.D)} mm です。d
          はピストン型では溝底径、ロッド型では軸径、D はピストン型ではシリンダ内径、ロッド型では溝底径にあたります。
        </p>
      </Faq>

      <Faq q="シリンダ内径や軸径から番号を選ぶには？">
        <p>
          ピストン型（ピストンに溝）はシリンダ内径が D に、ロッド型（穴側に溝）は軸径が d
          に合う番号を選びます。たとえばシリンダ内径 30 mm なら {names(bore30)}、軸径 30 mm なら {names(shaft30)}{' '}
          です。数字が同じ番号（P30）がシリンダ内径 30 mm に合うわけではない点に注意してください。
        </p>
        <p>上の「選び方」で「相手寸法」を選ぶと、P・G の両方から合う番号を探せます（G は固定用のみ）。</p>
      </Faq>

      <Faq q="古いOリングの番号を調べるには？">
        <p>
          内径と太さを測り、「選び方」の「実物寸法」に入れてください。太さを近い規格の太さ（{list(CROSS_SECTIONS)}{' '}
          mm）に寄せて、内径の近い順に候補を出します。たとえば {trim(24.6)} × {trim(3.5)} mm なら {measured.ring.no}（
          {trim(measured.ring.d1)} × {trim(measured.ring.group.d2)} mm）が最も近い候補です。
        </p>
        <p>
          使ったOリングはつぶれや膨潤で寸法が変わっているので、候補は目安です。溝の寸法（d・D・溝幅）も測って確かめると確実です。インチ系（AS568）など
          JIS 以外のOリングは含みません。
        </p>
      </Faq>

      <Faq q="つぶし率・充てん率とは？">
        <p>
          つぶし率は、Oリングの太さが溝の深さまでつぶされる割合で、(太さ − 溝の深さ) ÷ 太さ × 100 です。P20
          の円筒面の溝では ({trim(p20.group.d2)} − {trim(grooveDepth(p20))}) ÷ {trim(p20.group.d2)} × 100 ={' '}
          {fixed(p20Squeeze, 1)}% になります。
        </p>
        <p>
          {standardLabel('JIS B 2401-2')} の溝寸法どおりにつくると、太さと溝の寸法許容差を含めたつぶし率は、円筒面で{' '}
          {fixed(cylinder.min, 1)}〜{fixed(cylinder.max, 1)}%（偏心は含まない）、平面で {fixed(flat.min, 1)}〜
          {fixed(flat.max, 1)}%
          の範囲に入ります（全サイズ）。充てん率は、溝の断面積に対するOリングの断面積の割合です。膨潤や熱膨張の逃げがあるかの目安に使います。
        </p>
      </Faq>

      <Faq q="バックアップリングを入れると溝幅はどう変わる？">
        <p>
          バックアップリングの分だけ溝幅 b を広げます。P20 では、なし {trim(p20.group.widths[0])} mm・1個{' '}
          {trim(p20.group.widths[1])} mm・2個 {trim(p20.group.widths[2])} mm です（許容差はどれも
          +0.25/0）。片側から圧力がかかるときは圧力と反対側に1個、両側からかかるときは2個入れます。溝の d・D
          は変わりません。
        </p>
      </Faq>

      <Faq q="P10 と P10A のように「A」が付く番号の違いは？">
        <p>
          A 付きは、A の付かない同じ数字の番号と d が同じで、ひとつ太いOリングを使う番号です。P10 は太さ{' '}
          {trim(p10.group.d2)} mm・D = {trim(p10.D)} mm、P10A は太さ {trim(p10a.group.d2)} mm・D = {trim(p10a.D)} mm
          で、d はどちらも {trim(p10.d)} mm です。A 付きの番号は {aNumbers.join('・')} で、D
          が違うので溝を共用できません。
        </p>
      </Faq>

      <Faq q="平面溝の「内圧用」と「外圧用」の違いは？">
        <p>
          内圧用は内側から圧力がかかる溝で、Oリングの外周が溝の外壁に当たるよう溝の外径が決まっています。外圧用（真空など）はOリングの内周が溝の内壁に当たるよう溝の内径が決まっています。P20
          では、内圧用の溝外径が {trim(p20Internal.outer)} mm、外圧用の溝内径が {trim(p20External.inner)} mm です。深さ
          h は {trim(p20Internal.depth)} mm、溝幅は {trim(p20Internal.width)} mm で共通です。
        </p>
      </Faq>
    </GuideSection>
  )
}
