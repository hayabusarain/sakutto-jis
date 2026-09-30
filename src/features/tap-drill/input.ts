import { availableGrade, findSize, pitchesOf } from './calc'
import { TOLERANCE_GRADES, type ToleranceGrade } from './data'

/** ねじ下穴径ツールの入力。キー名は他のツールからのリンク（toolHref）でも使う */
export interface TapDrillInput {
  d: number
  p: number
  grade: ToleranceGrade
  /** 手持ちのドリル径（入力途中の文字列のまま保存） */
  drill: string
}

export const DEFAULT_INPUT: TapDrillInput = { d: 10, p: 1.5, grade: 6, drill: '' }

export function isTapDrillInput(value: unknown): value is TapDrillInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const size = typeof v.d === 'number' ? findSize(v.d) : undefined
  return (
    size !== undefined &&
    typeof v.p === 'number' &&
    pitchesOf(size).includes(v.p) &&
    TOLERANCE_GRADES.includes(v.grade as ToleranceGrade) &&
    typeof v.drill === 'string'
  )
}

/**
 * URL で一部の項目だけ指定されたときに、ほかの項目を整える。
 * - 呼び径だけ（?d=12）→ ピッチはそのサイズの並目（並目が無ければ最初の細目）
 * - そのサイズに無いピッチ（?d=12&p=2）→ 並目に直す
 * - 規格に無い等級（?grade=9）→ 6H
 * - 等級を指定していなければ、規定のある等級にする（?d=1 → 5H）
 * 規格に無い呼び径（?d=13）は直さない（isTapDrillInput で弾かれ、URL は無視される）。
 */
export function normalizeTapDrillInput(
  state: TapDrillInput,
  keys: readonly (keyof TapDrillInput)[],
): TapDrillInput {
  const size = findSize(state.d)
  if (!size) return state
  const pitches = pitchesOf(size)
  const p = keys.includes('p') && pitches.includes(state.p) ? state.p : pitches[0]
  const validGrade = TOLERANCE_GRADES.includes(state.grade) ? state.grade : 6
  const grade =
    keys.includes('grade') && validGrade === state.grade ? validGrade : availableGrade(size.d, p, validGrade)
  return { ...state, p, grade }
}
