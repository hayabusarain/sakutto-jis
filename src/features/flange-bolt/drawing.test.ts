import { describe, expect, it } from 'vitest'
import { findFlange } from './calc'
import { boltHolePositions, flangeDxf } from './drawing'

describe('boltHolePositions', () => {
  it('PCD 上に等間隔で、中心線をまたぐ', () => {
    const row = findFlange('10K', '50A')!
    const holes = boltHolePositions(row)
    expect(holes).toHaveLength(4)
    for (const hole of holes) {
      expect(Math.hypot(hole.x, hole.y)).toBeCloseTo(60, 6)
      expect(Math.abs(hole.x)).toBeGreaterThan(1)
      expect(Math.abs(hole.y)).toBeGreaterThan(1)
    }
  })
})

describe('flangeDxf', () => {
  it('R12 の構造で、円の数が 外形 + 内径 + 穴 + PCD', () => {
    const row = findFlange('10K', '100A')!
    const dxf = flangeDxf('10K', row, 114.3)
    expect(dxf.startsWith('  0\r\nSECTION')).toBe(true)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
    expect(dxf.match(/\r\nCIRCLE\r\n/g)).toHaveLength(1 + 1 + row.n + 1)
    expect(dxf).toContain('JIS B 2220 10K 100A')
  })
})
