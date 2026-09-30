import { DxfDrawing } from '../../lib/dxf'
import type { FlangeRow, PressureClass } from './data'

export interface HolePosition {
  x: number
  y: number
}

/**
 * ボルト穴の中心位置。JIS の管フランジと同じく、上下左右の中心線をまたぐ配置
 * （中心線上に穴を置かない）にする。
 */
export function boltHolePositions(row: FlangeRow): HolePosition[] {
  const r = row.C / 2
  return Array.from({ length: row.n }, (_, i) => {
    const angle = ((i + 0.5) * 2 * Math.PI) / row.n + Math.PI / 2
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
  })
}

/** フランジ正面図（外形・内径・ボルト穴・PCD・中心線）の DXF */
export function flangeDxf(pressure: PressureClass, row: FlangeRow, bore: number): string {
  const drawing = new DxfDrawing()
  drawing.circle('OUTLINE', 0, 0, row.D / 2)
  if (bore > 0 && bore < row.C - row.h) drawing.circle('OUTLINE', 0, 0, bore / 2)
  for (const hole of boltHolePositions(row)) drawing.circle('OUTLINE', hole.x, hole.y, row.h / 2)
  drawing.circle('CENTER', 0, 0, row.C / 2)

  const extent = row.D / 2 + 8
  drawing.line('CENTER', -extent, 0, extent, 0)
  drawing.line('CENTER', 0, -extent, 0, extent)

  const textHeight = Math.max(3, Math.round(row.D / 40))
  const y = -(row.D / 2 + 12 + textHeight)
  drawing.text('NOTE', -row.D / 2, y, textHeight, `JIS B 2220 ${pressure} ${row.size}`)
  drawing.text(
    'NOTE',
    -row.D / 2,
    y - textHeight * 1.8,
    textHeight,
    `D${row.D}  PCD${row.C}  ${row.n}-${row.h}  M${row.bolt}  t${row.t}${bore > 0 ? `  ID${bore}` : ''}`,
  )
  return drawing.toString()
}
