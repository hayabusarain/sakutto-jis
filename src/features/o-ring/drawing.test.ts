import { describe, expect, it } from 'vitest'
import { allORings, findORing } from './calc'
import { grooveCallout } from './callout'
import { cylinderGrooveDxf, cylinderGrooveGeometry, flatGrooveDxf, grooveDxfFilename } from './drawing'
import { oRingExportTable } from './export'

/** DXF のグループコードと値の組 */
function pairs(dxf: string): [number, string][] {
  const lines = dxf.split('\r\n')
  const out: [number, string][] = []
  for (let i = 0; i + 1 < lines.length; i += 2) out.push([Number(lines[i].trim()), lines[i + 1]])
  return out
}

interface Line {
  layer: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/** ENTITIES の LINE・CIRCLE・TEXT を取り出す */
function entities(dxf: string) {
  const all = pairs(dxf)
  const start = all.findIndex(([code, value], i) => code === 2 && value === 'ENTITIES' && all[i - 1][1] === 'SECTION')
  const result: { type: string; values: Map<number, string> }[] = []
  for (let i = start + 1; i < all.length; i++) {
    const [code, value] = all[i]
    if (code === 0 && value === 'ENDSEC') break
    if (code === 0) result.push({ type: value, values: new Map() })
    else result[result.length - 1].values.set(code, value)
  }
  const lines: Line[] = result
    .filter((e) => e.type === 'LINE')
    .map((e) => ({
      layer: e.values.get(8)!,
      x1: Number(e.values.get(10)),
      y1: Number(e.values.get(20)),
      x2: Number(e.values.get(11)),
      y2: Number(e.values.get(21)),
    }))
  const circles = result
    .filter((e) => e.type === 'CIRCLE')
    .map((e) => ({
      layer: e.values.get(8)!,
      x: Number(e.values.get(10)),
      y: Number(e.values.get(20)),
      r: Number(e.values.get(40)),
    }))
  const texts = result.filter((e) => e.type === 'TEXT').map((e) => e.values.get(1)!)
  return { lines, circles, texts, types: result.map((e) => e.type) }
}

const isHorizontalAt = (line: Line, y: number) => Math.abs(line.y1 - y) < 1e-9 && Math.abs(line.y2 - y) < 1e-9

describe('cylinderGrooveDxf', () => {
  it('R12 の構造（SECTION で始まり EOF で終わる）で、ASCII のみ', () => {
    const dxf = cylinderGrooveDxf(findORing('P', 'P20')!, 'piston', 0)
    expect(dxf.startsWith('  0\r\nSECTION')).toBe(true)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
    expect(/^[\x20-\x7e\r\n]*$/.test(dxf)).toBe(true)
  })

  it('P20 ピストン型 BU0: 溝底 y = 10（d/2）、溝の口 y = 12（D/2）、溝幅 3.2', () => {
    const { lines, circles, texts } = entities(cylinderGrooveDxf(findORing('P', 'P20')!, 'piston', 0))
    const outline = lines.filter((line) => line.layer === 'OUTLINE')
    expect(outline).toHaveLength(5)
    const bottom = outline.find((line) => isHorizontalAt(line, 10))!
    expect(Math.abs(bottom.x2 - bottom.x1)).toBeCloseTo(3.2, 9)
    expect(outline.filter((line) => isHorizontalAt(line, 12))).toHaveLength(2)
    // 中心線は y = 0
    expect(lines.some((line) => line.layer === 'CENTER' && isHorizontalAt(line, 0))).toBe(true)
    // Oリングの断面（自由状態）: 溝底に接する直径 2.4 の円
    expect(circles).toEqual([{ layer: 'NOTE', x: 1.6, y: 11.2, r: 1.2 }])
    expect(texts).toContain('b 3.2 +0.25/0')
    expect(texts.some((text) => text.startsWith('%%c20 0/-0.06 (d: GROOVE DIA.)'))).toBe(true)
    expect(texts.some((text) => text.startsWith('%%c24 +0.06/0 (D: CYLINDER BORE)'))).toBe(true)
    expect(texts.some((text) => text.includes('R0.4 MAX') && text.includes('E 0.05 MAX'))).toBe(true)
    expect(texts.some((text) => text.includes('JIS B 2401-2') && text.includes('P20') && text.includes('PISTON'))).toBe(
      true,
    )
    expect(texts.some((text) => text.includes('SQUEEZE 16.7%'))).toBe(true)
  })

  it('ロッド型は溝底が D/2（外側）、溝の口が d/2 で、溝が軸に向かって開く', () => {
    const ring = findORing('P', 'P20')!
    const geometry = cylinderGrooveGeometry(ring, 'rod', 1)
    expect(geometry).toMatchObject({ width: 4.4, bottomRadius: 12, landRadius: 10 })
    const { lines, circles, texts } = entities(cylinderGrooveDxf(ring, 'rod', 1))
    const outline = lines.filter((line) => line.layer === 'OUTLINE')
    expect(outline.some((line) => isHorizontalAt(line, 12) && Math.abs(line.x2 - line.x1 - 4.4) < 1e-9)).toBe(true)
    expect(circles[0].y).toBeCloseTo(12 - 1.2, 9)
    expect(texts.some((text) => text.startsWith('%%c20 0/-0.06 (d: ROD DIA.)'))).toBe(true)
    expect(texts.some((text) => text.startsWith('%%c24 +0.06/0 (D: GROOVE DIA.)'))).toBe(true)
  })

  it('全サイズ・全条件で数値が有限（NaN を書き出さない）', () => {
    for (const ring of allORings()) {
      for (const housing of ['piston', 'rod'] as const) {
        for (const backup of [0, 1, 2] as const) {
          const dxf = cylinderGrooveDxf(ring, housing, backup)
          expect(dxf, ring.no).not.toMatch(/NaN|Infinity|undefined/)
        }
      }
      for (const pressure of ['internal', 'external'] as const) {
        expect(flatGrooveDxf(ring, pressure), ring.no).not.toMatch(/NaN|Infinity|undefined/)
      }
    }
  })
})

describe('flatGrooveDxf', () => {
  it('P20 内圧用: 溝外径 24・溝内径 17.6 の円と、深さ 1.8 × 溝幅 3.2 の断面', () => {
    const { lines, circles, texts } = entities(flatGrooveDxf(findORing('P', 'P20')!, 'internal'))
    const outlineCircles = circles.filter((circle) => circle.layer === 'OUTLINE')
    expect(outlineCircles.map((circle) => circle.r * 2).sort((a, b) => a - b)).toEqual([17.6, 24])
    const outline = lines.filter((line) => line.layer === 'OUTLINE')
    // 溝底: x = 8.8 〜 12（半径）
    const bottom = outline.find((line) => Math.abs(line.x1 - 8.8) < 1e-9 && Math.abs(line.x2 - 12) < 1e-9)!
    expect(bottom).toBeDefined()
    const face = outline.find((line) => Math.abs(line.x1 - 8.8) < 1e-9 && line.x2 === 8.8)!
    expect(Math.abs(face.y1 - face.y2)).toBeCloseTo(1.8, 9)
    // Oリングは溝の外壁に当たる位置
    const ringCircle = circles.find((circle) => circle.layer === 'NOTE')!
    expect(ringCircle.x + ringCircle.r).toBeCloseTo(12, 9)
    expect(texts.some((text) => text.includes('GROOVE OD %%c24 (STANDARD)'))).toBe(true)
    expect(texts.some((text) => text.includes('h 1.8 %%p0.05'))).toBe(true)
  })

  it('P20 外圧用: 溝内径 20 が規格値、Oリングは内壁に当たる', () => {
    const { circles, texts } = entities(flatGrooveDxf(findORing('P', 'P20')!, 'external'))
    expect(circles.filter((circle) => circle.layer === 'OUTLINE').map((circle) => circle.r)).toEqual([13.2, 10])
    const ringCircle = circles.find((circle) => circle.layer === 'NOTE')!
    expect(ringCircle.x - ringCircle.r).toBeCloseTo(10, 9)
    expect(texts.some((text) => text.includes('GROOVE ID %%c20 (STANDARD)'))).toBe(true)
  })
})

describe('grooveDxfFilename', () => {
  it('番号・型・バックアップリングの数を入れる（小数点は _）', () => {
    expect(grooveDxfFilename(findORing('P', 'P20')!, 'cylinder', 'piston', 0)).toBe('oring_groove_P20_piston_BU0.dxf')
    expect(grooveDxfFilename(findORing('P', 'P11.2')!, 'cylinder', 'rod', 2)).toBe('oring_groove_P11_2_rod_BU2.dxf')
    expect(grooveDxfFilename(findORing('G', 'G50')!, 'flat-external', 'piston', 1)).toBe(
      'oring_flat_groove_G50_external.dxf',
    )
  })
})

describe('grooveCallout（図面指示）', () => {
  it('P20 ピストン型 BU0', () => {
    expect(grooveCallout(findORing('P', 'P20')!, 'cylinder', 'piston', 0)).toEqual([
      'Oリング溝 JIS B 2401-2 P20（ピストン型・バックアップリングなし）',
      'シリンダ内径 φ24 +0.06/0',
      '溝底径 φ20 0/-0.06',
      '溝幅 3.2 +0.25/0',
      '溝底の角 R0.4以下',
      '偏心量 0.05以下',
      'Oリング P20（内径 19.8 × 太さ 2.4）',
    ])
  })

  it('G50 ロッド型 BU2: 軸径 d と溝底径 D', () => {
    const lines = grooveCallout(findORing('G', 'G50')!, 'cylinder', 'rod', 2)
    expect(lines[0]).toBe('Oリング溝 JIS B 2401-2 G50（ロッド型・バックアップリング2個）')
    expect(lines[1]).toBe('軸径 φ50 0/-0.1')
    expect(lines[2]).toBe('溝底径 φ55 +0.1/0')
    expect(lines[3]).toBe('溝幅 7.3 +0.25/0')
  })

  it('平面・内圧用は溝外径が規格値、溝内径は（ ）の参考寸法', () => {
    const lines = grooveCallout(findORing('P', 'P20')!, 'flat-internal', 'piston', 0)
    expect(lines).toContain('溝外径 φ24')
    expect(lines).toContain('溝内径 (φ17.6)')
    expect(lines).toContain('溝深さ 1.8 ±0.05')
  })

  it('平面・外圧用は溝内径が規格値', () => {
    const lines = grooveCallout(findORing('P', 'P20')!, 'flat-external', 'piston', 0)
    expect(lines).toContain('溝内径 φ20')
    expect(lines).toContain('溝外径 (φ26.4)')
  })
})

describe('oRingExportTable（表の書き出し）', () => {
  it('円筒面: 全サイズ・許容差を上下別の列に', () => {
    const table = oRingExportTable('P', false)
    expect(table.rows).toHaveLength(122)
    expect(table.headers).toHaveLength(table.rows[0].length)
    const p20 = table.rows.find((row) => row[0] === 'P20')!
    expect(p20).toEqual(['P20', 19.8, 0.22, 2.4, 0.09, 20, 0, -0.06, 24, 0.06, 0, 3.2, 4.4, 6, 0.4, 0.05])
    expect(table.note).toContain('JIS B 2401-2:2012')
  })

  it('平面: 外圧用の溝内径・内圧用の溝外径・深さと許容差', () => {
    const table = oRingExportTable('G', true)
    expect(table.rows).toHaveLength(46)
    expect(table.headers).toHaveLength(table.rows[0].length)
    const g25 = table.rows[0]
    expect(g25).toEqual(['G25', 24.4, 0.25, 3.1, 0.1, 25, 30, 2.4, 0.05, 4.1, 0.7])
  })
})
