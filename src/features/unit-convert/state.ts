import { findUnit, quantityOfUnit } from './calc'
import { QUANTITIES, QUANTITY_KEYS, type Quantity } from './data'

export type PressureRef = 'gauge' | 'abs'

/** 画面の入力（URL のクエリと同じキー。例: /unit-convert?q=pressure&v=10&from=kgfcm2&to=MPa） */
export interface UnitConvertInput {
  /** 換算するもの（圧力・トルク・力・長さ・温度） */
  q: Quantity
  /** 入力した値（入力途中の文字列のまま保存） */
  v: string
  /** 入力の単位 */
  from: string
  /** 大きく表示する換算先の単位 */
  to: string
  /** 圧力の基準（ゲージ圧・絶対圧） */
  ref: PressureRef
}

export const STORAGE_KEY = 'unit-convert'

export const DEFAULT_INPUT: UnitConvertInput = { q: 'pressure', v: '1', from: 'kgfcm2', to: 'MPa', ref: 'gauge' }

export function isUnitConvertInput(value: unknown): value is UnitConvertInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (!QUANTITY_KEYS.includes(v.q as Quantity)) return false
  const q = v.q as Quantity
  return (
    typeof v.v === 'string' &&
    typeof v.from === 'string' &&
    typeof v.to === 'string' &&
    findUnit(q, v.from) !== undefined &&
    findUnit(q, v.to) !== undefined &&
    v.from !== v.to &&
    (v.ref === 'gauge' || v.ref === 'abs')
  )
}

/** 表示する単位（入力の単位と違うもの）を選ぶ。無効なら既定の組み合わせにする */
export function pickTo(q: Quantity, from: string, to: string): string {
  const def = QUANTITIES[q]
  if (to !== from && findUnit(q, to)) return to
  return from === def.defaultTo ? def.defaultFrom : def.defaultTo
}

/**
 * URL の一部指定を整える。単位だけ指定されたら量を合わせ（?from=psi → 圧力）、
 * 量だけ指定されたらその量の既定の単位にする（?q=torque → kgf·m を N·m に）。
 */
export function normalizeInput(
  state: UnitConvertInput,
  keys: readonly (keyof UnitConvertInput)[],
): UnitConvertInput {
  let q = state.q
  if (!QUANTITY_KEYS.includes(q) || !keys.includes('q')) {
    q =
      (keys.includes('from') ? quantityOfUnit(state.from) : undefined) ??
      (keys.includes('to') ? quantityOfUnit(state.to) : undefined) ??
      (QUANTITY_KEYS.includes(q) ? q : DEFAULT_INPUT.q)
  }
  const def = QUANTITIES[q]
  // 入力の単位が合わないときは既定にする（換算先に指定された単位とは重ならないように）
  const from = findUnit(q, state.from)
    ? state.from
    : keys.includes('to') && state.to === def.defaultFrom
      ? def.defaultTo
      : def.defaultFrom
  return { q, v: state.v, from, to: pickTo(q, from, state.to), ref: state.ref === 'abs' ? 'abs' : 'gauge' }
}

/** 条件を指定して入力を作る（解説の「この値で換算」用） */
export function inputFor(q: Quantity, v: string, from: string, to: string, ref: PressureRef = 'gauge'): UnitConvertInput {
  return normalizeInput({ q, v, from, to, ref }, ['q', 'v', 'from', 'to', 'ref'])
}
