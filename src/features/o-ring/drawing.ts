import { DxfDrawing } from '../../lib/dxf'
import { FLAT_DEPTH_TOL, flatGroove, squeeze, type FlatPressure, type HousingType, type ORing } from './calc'

/**
 * Oリング溝の DXF（R12・単位 mm・1:1）。
 * 数値はすべて JIS B 2401-2:2012 の表3・表4（data.ts）から。溝底の角は規格が R の最大値しか決めていないので、
 * 角は描かずに「R… MAX」の注記にする。文字は ASCII のみ（%%c = φ、%%p = ±）。
 */

const r1 = (value: number) => Math.round(value * 10) / 10
/** 図面の数値（不要な0を落とす） */
const n = (value: number) => String(Number(value.toFixed(3)))

/** 溝の大きさに合わせた文字の高さ */
function textHeight(size: number): number {
  return Math.max(0.3, r1(size / 8))
}

/** 寸法線（両端に斜めの短線）。水平のみ */
function horizontalDimension(drawing: DxfDrawing, x1: number, x2: number, y: number, tick: number) {
  drawing.line('NOTE', x1, y, x2, y)
  for (const x of [x1, x2]) drawing.line('NOTE', x - tick / 2, y - tick / 2, x + tick / 2, y + tick / 2)
}

/** ±の許容差の書き方（上/下） */
function deviation(upper: number, lower: number): string {
  const part = (value: number) => (value === 0 ? '0' : value > 0 ? `+${n(value)}` : `-${n(-value)}`)
  return `${part(upper)}/${part(lower)}`
}

export interface CylinderGrooveGeometry {
  /** 溝幅 b */
  width: number
  /** 溝底の半径（ピストン型は d/2、ロッド型は D/2） */
  bottomRadius: number
  /** 溝の口の半径（相手の面。ピストン型は D/2、ロッド型は d/2） */
  landRadius: number
  /** 溝の両側に描く面の長さ */
  land: number
}

/** 円筒面の溝の半断面の寸法（ピストン型は溝が外向き、ロッド型は内向きに開く） */
export function cylinderGrooveGeometry(ring: ORing, housing: HousingType, backup: 0 | 1 | 2): CylinderGrooveGeometry {
  const width = ring.group.widths[backup]
  const depth = ring.group.dDiff / 2
  return {
    width,
    bottomRadius: housing === 'piston' ? ring.d / 2 : ring.D / 2,
    landRadius: housing === 'piston' ? ring.D / 2 : ring.d / 2,
    land: Math.max(width, 3 * depth),
  }
}

/**
 * 円筒面の溝の半断面（中心線から上側）。
 * 溝の輪郭（OUTLINE）、中心線（CENTER）、Oリングの断面（自由状態・参考）・寸法メモ（NOTE）。
 */
export function cylinderGrooveDxf(ring: ORing, housing: HousingType, backup: 0 | 1 | 2): string {
  const drawing = new DxfDrawing()
  const { group } = ring
  const { width: b, bottomRadius: rb, landRadius: rl, land: L } = cylinderGrooveGeometry(ring, housing, backup)
  const depth = group.dDiff / 2
  const th = textHeight(Math.max(b, 2 * depth))
  const opensUp = housing === 'piston'

  // 溝の輪郭: 左の面 → 左の壁 → 溝底 → 右の壁 → 右の面
  drawing.line('OUTLINE', -L, rl, 0, rl)
  drawing.line('OUTLINE', 0, rl, 0, rb)
  drawing.line('OUTLINE', 0, rb, b, rb)
  drawing.line('OUTLINE', b, rb, b, rl)
  drawing.line('OUTLINE', b, rl, b + L, rl)
  // 中心線（軸）
  drawing.line('CENTER', -L - 2 * th, 0, b + L + 2 * th, 0)
  // Oリングの断面（自由状態・溝底に接する位置）
  const ringY = opensUp ? rb + group.d2 / 2 : rb - group.d2 / 2
  drawing.circle('NOTE', b / 2, ringY, group.d2 / 2)

  // 溝幅の寸法（溝の口の外側。Oリングのはみ出しより外）
  const protrude = Math.max(0, group.d2 - depth)
  const sign = opensUp ? 1 : -1
  const dimY = rl + sign * (protrude + 2 * th)
  for (const x of [0, b]) drawing.line('NOTE', x, rl + sign * th * 0.3, x, dimY + sign * th * 0.6)
  horizontalDimension(drawing, 0, b, dimY, th * 0.8)
  drawing.text('NOTE', th * 0.4, opensUp ? dimY + th * 0.5 : dimY - th * 1.5, th, `b ${n(b)} +0.25/0`)

  // 径の注記（右側に引き出す）
  const tol = group.diaTol
  const dText = `%%c${n(ring.d)}${tol === null ? '' : ` ${deviation(0, -tol)}`}`
  const bigDText = `%%c${n(ring.D)}${tol === null ? '' : ` ${deviation(tol, 0)}`}`
  const labels =
    housing === 'piston'
      ? { bottom: `${dText} (d: GROOVE DIA.)`, land: `${bigDText} (D: CYLINDER BORE)` }
      : { bottom: `${bigDText} (D: GROOVE DIA.)`, land: `${dText} (d: ROD DIA.)` }
  const leaderEnd = b + L + th
  drawing.line('NOTE', b + th * 0.3, rb, leaderEnd, rb)
  drawing.text('NOTE', leaderEnd + th * 0.5, rb - th / 2, th, labels.bottom)
  drawing.line('NOTE', b + L + th * 0.3, rl, leaderEnd, rl)
  drawing.text('NOTE', leaderEnd + th * 0.5, rl - th / 2, th, labels.land)

  // 注記（図の上側）
  const top = Math.max(opensUp ? dimY + th * 2 : rb + th, rl + th) + th * 2
  const notes = [
    `O-RING GROOVE, CYLINDRICAL, ${housing === 'piston' ? 'PISTON' : 'ROD'} TYPE  JIS B 2401-2  ${ring.no}  BACKUP RING ${backup}`,
    `O-RING ${ring.no} (JIS B 2401-1)  d1 ${n(ring.d1)} %%p${n(ring.d1Tol)}  d2 ${n(group.d2)} %%p${n(group.d2Tol)}`,
    `b ${n(b)} +0.25/0   R${n(group.rMax)} MAX (GROOVE BOTTOM CORNERS)`,
    // E は溝加工深さ K の最大−最小（JIS B 2401-2 表3 の注 a)）。軸心のずれはその半分まで
    `E ${n(group.eMax)} MAX (K MAX-MIN, AXIS OFFSET ${n(group.eMax / 2)} MAX)`,
    `SQUEEZE ${squeeze(group.d2, depth).toFixed(1)}% (NOMINAL)   CIRCLE: O-RING SECTION, FREE STATE (REF)`,
    'REFERENCE ONLY - CHECK AGAINST JIS B 2401-2 BEFORE USE (SAKUTTO JIS)',
  ]
  notes.forEach((note, i) => drawing.text('NOTE', -L, top + (notes.length - 1 - i) * th * 1.8, th, note))
  return drawing.toString()
}

/**
 * 平面溝（固定用）: 平面図（溝の外径・内径の2つの円と中心線）と、その下に半径方向の断面 A-A。
 * 断面は平面図と同じ x 座標（半径）で描く。
 */
export function flatGrooveDxf(ring: ORing, pressure: FlatPressure): string {
  const drawing = new DxfDrawing()
  const { group } = ring
  const groove = flatGroove(ring, pressure)
  const ro = groove.outer / 2
  const ri = groove.inner / 2
  const h = groove.depth
  const b = groove.width
  const th = Math.max(0.3, r1(groove.outer / 50))

  // 平面図
  drawing.circle('OUTLINE', 0, 0, ro)
  drawing.circle('OUTLINE', 0, 0, ri)
  const extent = ro + Math.max(2, groove.outer * 0.08)
  drawing.line('CENTER', -extent, 0, extent, 0)
  drawing.line('CENTER', 0, -extent, 0, extent)

  // 断面 A-A（右半分・平面図の下）
  const L = Math.max(b, 3 * h)
  const face = -(extent + Math.max(5 * th, 3 * h))
  drawing.line('OUTLINE', Math.max(0, ri - L), face, ri, face)
  drawing.line('OUTLINE', ri, face, ri, face - h)
  drawing.line('OUTLINE', ri, face - h, ro, face - h)
  drawing.line('OUTLINE', ro, face - h, ro, face)
  drawing.line('OUTLINE', ro, face, ro + L, face)
  drawing.line('CENTER', 0, face + h + th, 0, face - 2 * h - th)
  const ringX = pressure === 'internal' ? ro - group.d2 / 2 : ri + group.d2 / 2
  drawing.circle('NOTE', ringX, face - h + group.d2 / 2, group.d2 / 2)
  drawing.text('NOTE', ro + L + th, face - h / 2 - th / 2, th, 'A-A')

  // 注記（断面の下）
  const standard =
    pressure === 'internal'
      ? `GROOVE OD %%c${n(groove.outer)} (STANDARD)   GROOVE ID %%c${n(groove.inner)} (= OD - 2b)`
      : `GROOVE ID %%c${n(groove.inner)} (STANDARD)   GROOVE OD %%c${n(groove.outer)} (= ID + 2b)`
  const notes = [
    `O-RING FLAT GROOVE (STATIC), ${pressure === 'internal' ? 'INTERNAL' : 'EXTERNAL'} PRESSURE  JIS B 2401-2  ${ring.no}`,
    standard,
    `h ${n(h)} %%p${n(FLAT_DEPTH_TOL)}   b ${n(b)} +0.25/0   R${n(group.rMax)} MAX (GROOVE BOTTOM CORNERS)`,
    `O-RING ${ring.no} (JIS B 2401-1)  d1 ${n(ring.d1)} %%p${n(ring.d1Tol)}  d2 ${n(group.d2)} %%p${n(group.d2Tol)}`,
    `SECTION A-A: RADIAL HALF SECTION   CIRCLE: O-RING SECTION, FREE STATE (REF)`,
    'REFERENCE ONLY - CHECK AGAINST JIS B 2401-2 BEFORE USE (SAKUTTO JIS)',
  ]
  const y0 = face - 2 * h - 3 * th
  notes.forEach((note, i) => drawing.text('NOTE', -ro, y0 - i * th * 1.8, th, note))
  return drawing.toString()
}

/** ダウンロードするファイル名（例: oring_groove_P20_piston_BU0.dxf） */
export function grooveDxfFilename(
  ring: ORing,
  groove: 'cylinder' | 'flat-internal' | 'flat-external',
  housing: HousingType,
  backup: 0 | 1 | 2,
): string {
  const no = ring.no.replace(/\./g, '_')
  if (groove === 'cylinder') return `oring_groove_${no}_${housing}_BU${backup}.dxf`
  return `oring_flat_groove_${no}_${groove === 'flat-internal' ? 'internal' : 'external'}.dxf`
}
