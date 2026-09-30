import { fixed } from '../../lib/format'
import { pitchesOf } from '../tap-drill/calc'
import type { RankedCandidate, Range } from './calc'

/** 符号付きの差（例: +0.450・−0.505・±0） */
export function signed(value: number, digits = 3): string {
  const rounded = Number(value.toFixed(digits))
  if (rounded === 0) return '±0'
  return `${rounded > 0 ? '+' : '−'}${fixed(Math.abs(rounded), digits)}`
}

/** 径の範囲（幅が無ければ1つの値） */
export function rangeText(range: Range, digits = 3): string {
  return range.min === range.max ? fixed(range.min, digits) : `${fixed(range.min, digits)}〜${fixed(range.max, digits)}`
}

/** 候補の種類の説明 */
export function kindText(candidate: RankedCandidate): string {
  switch (candidate.kind) {
    case 'M':
      return `メートル${candidate.metric!.coarse ? '並目' : '細目'}ねじ`
    case 'R':
      return '管用テーパおねじ（旧 PT）'
    case 'G':
      return '管用平行おねじ（旧 PF）'
    case 'Rc':
      return '管用テーパめねじ（旧 PT）'
    case 'G/Rp':
      return '管用平行めねじ（G＝旧 PF・Rp＝旧 PS）'
  }
}

/** 候補のピッチ（単位つき。管用ねじは山数も）。ピッチ未入力のメートルねじは、ほかのピッチも並べる */
export function pitchText(candidate: RankedCandidate): string {
  if (candidate.tpi !== null) return `${fixed(candidate.pitch, 3)} mm（${candidate.tpi}山）`
  const main = `${Number(candidate.pitch.toFixed(3))} mm`
  if (candidate.deltaPitch !== null || !candidate.metric) return main
  const others = pitchesOf(candidate.metric.size).filter((p) => p !== candidate.pitch)
  return others.length > 0 ? `${main}（ほか ${others.join('・')}）` : main
}
