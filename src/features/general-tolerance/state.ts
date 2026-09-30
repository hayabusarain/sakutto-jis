import { TOLERANCE_KINDS, type ToleranceKind } from './calc'
import { TOLERANCE_CLASSES, type ToleranceClass } from './data'

/** 画面の入力（URL のクエリと同じキー。例: /general-tolerance?d=120&cls=f） */
export interface GeneralToleranceInput {
  /** 長さ（linear）・面取り（chamfer）・角度（angle） */
  kind: ToleranceKind
  /** 寸法 [mm]。角度のときは角度をはさむ短い方の辺の長さ（入力途中の文字列のまま保存） */
  d: string
  /** 公差等級 */
  cls: ToleranceClass
  /** 角度 [°]（角度のときだけ使う） */
  angle: string
}

export const STORAGE_KEY = 'general-tolerance'

export const DEFAULT_INPUT: GeneralToleranceInput = { kind: 'linear', d: '50', cls: 'm', angle: '90' }

export function isGeneralToleranceInput(value: unknown): value is GeneralToleranceInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    TOLERANCE_KINDS.includes(v.kind as ToleranceKind) &&
    typeof v.d === 'string' &&
    TOLERANCE_CLASSES.includes(v.cls as ToleranceClass) &&
    typeof v.angle === 'string'
  )
}

/**
 * URL の一部指定を整える。等級は大文字でも受け付け（cls=M → m）、
 * 角度だけ指定されたら角度の普通公差を表示する（?angle=45 → kind=angle）。
 */
export function normalizeInput(
  state: GeneralToleranceInput,
  keys: readonly (keyof GeneralToleranceInput)[],
): GeneralToleranceInput {
  const cls = String(state.cls).trim().toLowerCase() as ToleranceClass
  let kind = state.kind
  if (!TOLERANCE_KINDS.includes(kind)) kind = DEFAULT_INPUT.kind
  if (keys.includes('angle') && !keys.includes('kind')) kind = 'angle'
  return {
    kind,
    d: state.d,
    cls: TOLERANCE_CLASSES.includes(cls) ? cls : DEFAULT_INPUT.cls,
    angle: state.angle,
  }
}
