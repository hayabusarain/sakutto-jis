import { trim } from '../../lib/format'
import { FLAT_DEPTH_TOL, flatGroove, type HousingType, type ORing } from './calc'
import type { GrooveKind } from './input'

/** 許容差（上/下）。CAD に貼っても化けないよう、マイナスは半角「-」 */
function deviation(upper: number, lower: number): string {
  const part = (value: number) => (value === 0 ? '0' : value > 0 ? `+${trim(value)}` : `-${trim(-value)}`)
  return `${part(upper)}/${part(lower)}`
}

const BACKUP_LABELS = ['バックアップリングなし', 'バックアップリング1個', 'バックアップリング2個'] as const

/**
 * 図面に書く溝の指示（参考）。数値は JIS B 2401-2 の表から。1行に1項目。
 * 円筒面は d・D と溝幅、平面は規格で決まる側の径・溝幅・深さ。反対側の径は（ ）の参考寸法にする。
 */
export function grooveCallout(ring: ORing, groove: GrooveKind, housing: HousingType, backup: 0 | 1 | 2): string[] {
  const { group } = ring
  if (groove === 'cylinder') {
    const tol = group.diaTol
    const d = `φ${trim(ring.d)}${tol === null ? '' : ` ${deviation(0, -tol)}`}`
    const D = `φ${trim(ring.D)}${tol === null ? '' : ` ${deviation(tol, 0)}`}`
    return [
      `Oリング溝 JIS B 2401-2 ${ring.no}（${housing === 'piston' ? 'ピストン型' : 'ロッド型'}・${BACKUP_LABELS[backup]}）`,
      ...(housing === 'piston' ? [`シリンダ内径 ${D}`, `溝底径 ${d}`] : [`軸径 ${d}`, `溝底径 ${D}`]),
      `溝幅 ${trim(group.widths[backup])} +0.25/0`,
      `溝底の角 R${trim(group.rMax)}以下`,
      `偏心量 ${trim(group.eMax)}以下`,
      `Oリング ${ring.no}（内径 ${trim(ring.d1)} × 太さ ${trim(group.d2)}）`,
    ]
  }
  const pressure = groove === 'flat-internal' ? 'internal' : 'external'
  const flat = flatGroove(ring, pressure)
  return [
    `Oリング溝 JIS B 2401-2 ${ring.no}（平面・${pressure === 'internal' ? '内圧用' : '外圧用'}）`,
    ...(pressure === 'internal'
      ? [`溝外径 φ${trim(flat.outer)}`, `溝内径 (φ${trim(flat.inner)})`]
      : [`溝内径 φ${trim(flat.inner)}`, `溝外径 (φ${trim(flat.outer)})`]),
    `溝幅 ${trim(flat.width)} +0.25/0`,
    `溝深さ ${trim(flat.depth)} ±${FLAT_DEPTH_TOL}`,
    `溝底の角 R${trim(group.rMax)}以下`,
    `Oリング ${ring.no}（内径 ${trim(ring.d1)} × 太さ ${trim(group.d2)}）`,
  ]
}
