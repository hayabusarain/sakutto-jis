import { describe, expect, it } from 'vitest'
import {
  fillRatio,
  findORing,
  flatFillRatio,
  flatGroove,
  flatSqueezeRange,
  grooveDepth,
  hasB3Misprint,
  needsBackupRing,
  noBackupMaxClearance,
  oRingNumbers,
  pressureBandLabel,
  pressureBandShortLabel,
  squeeze,
  squeezeRange,
  stretch,
} from './calc'
import {
  B3_MISPRINT,
  BACKUP_PRESSURE_LIMITS,
  D1_TOL_NOTE,
  DYNAMIC_MATERIAL_NOTE,
  E_NOTE,
  GROUPS,
  HARDNESSES,
  HOUSING_TABLES,
  NO_BACKUP_MAX_CLEARANCE,
  RING_TABLES,
  SOURCE_NOTE,
} from './data'

describe('findORing', () => {
  it('P20: 19.8 × 2.4、ハウジング d20 / D24、溝幅 3.2', () => {
    const ring = findORing('P', 'P20')!
    expect(ring.d1).toBe(19.8)
    expect(ring.group.d2).toBe(2.4)
    expect(ring.d).toBe(20)
    expect(ring.D).toBe(24)
    expect(ring.group.widths[0]).toBe(3.2)
  })

  it.each([
    ['P10', 1.9, 10, 13],
    ['P10A', 2.4, 10, 14],
    ['P22', 2.4, 22, 26],
    ['P22A', 3.5, 22, 28],
    ['P50', 3.5, 50, 56],
    ['P48A', 5.7, 48, 58],
    ['P150', 5.7, 150, 160],
    ['P150A', 8.4, 150, 165],
    ['P11.2', 2.4, 11.2, 15.2],
  ])('A サイズの境目 %s: 太さ %s・d %s・D %s', (no, d2, d, D) => {
    const ring = findORing('P', no)!
    expect(ring.group.d2).toBe(d2)
    expect(ring.d).toBe(d)
    expect(ring.D).toBe(D)
  })

  it('G25 は 24.4 × 3.1、d25 / D30。G150 から太さ 5.7', () => {
    expect(findORing('G', 'G25')).toMatchObject({ d1: 24.4, d: 25, D: 30 })
    expect(findORing('G', 'G145')!.group.d2).toBe(3.1)
    expect(findORing('G', 'G150')!.group.d2).toBe(5.7)
  })
})

describe('計算', () => {
  it('P20 のつぶし率 = (2.4 − 2.0) ÷ 2.4 = 16.7%', () => {
    const ring = findORing('P', 'P20')!
    expect(grooveDepth(ring)).toBe(2)
    expect(squeeze(2.4, 2)).toBeCloseTo(16.67, 2)
    const range = squeezeRange(ring)!
    expect(range.min).toBeLessThan(16.67)
    expect(range.max).toBeGreaterThan(16.67)
  })

  it('P20 の充てん率（バックアップリングなし）= π/4×2.4² ÷ (3.2×2.0) = 70.7%', () => {
    expect(fillRatio(findORing('P', 'P20')!, 0)).toBeCloseTo(70.69, 1)
  })

  it('P20 の伸び = (20 − 19.8) ÷ 19.8 = 1.0%', () => {
    expect(stretch(findORing('P', 'P20')!)).toBeCloseTo(1.01, 2)
  })
})

describe('データの整合性', () => {
  it.each(['P', 'G'] as const)('%s: 内径は昇順で、溝底径 d より小さく、d1 公差は正', (series) => {
    let previous = 0
    for (const no of oRingNumbers(series)) {
      const ring = findORing(series, no)!
      expect(ring.d1, no).toBeLessThan(ring.d)
      expect(ring.d1Tol, no).toBeGreaterThan(0)
      // A サイズは同じ呼びの別の太さなので、内径が前より小さいことがある
      if (!no.endsWith('A')) expect(ring.d1, no).toBeGreaterThan(previous - 0.001)
      previous = ring.d1
      // Oリングの外径は、ロッド型の溝底径 D より大きい（つぶしがある）
      expect(ring.d1 + 2 * ring.group.d2, no).toBeGreaterThan(ring.D)
    }
  })

  it('すべてのサイズでつぶし率が 5〜30% の範囲に収まる', () => {
    for (const series of ['P', 'G'] as const) {
      for (const no of oRingNumbers(series)) {
        const ring = findORing(series, no)!
        const value = squeeze(ring.group.d2, grooveDepth(ring))
        expect(value, no).toBeGreaterThan(5)
        expect(value, no).toBeLessThan(30)
      }
    }
  })

  it('サイズ数: P は 122、G は 46', () => {
    expect(oRingNumbers('P')).toHaveLength(122)
    expect(oRingNumbers('G')).toHaveLength(46)
  })
})

describe('JIS の表に載っているつぶし率の範囲を再現する', () => {
  // 円筒面（運動用・固定用）。値は JIS B 2401-2:2012 表3 の参考欄の印刷値。
  // G25 の最大は 21.85 と印刷されている（計算は (3.2 − 2.5) ÷ 3.2 = 21.875%。小数1桁の比較で一致）
  it.each([
    ['P', 'P3', 14.8, 24.2],
    ['P', 'P10A', 10.8, 19.7],
    ['P', 'P22A', 9.4, 16.7],
    ['P', 'P48A', 8.4, 14.2],
    ['P', 'P150A', 7.9, 12.3],
    ['G', 'G25', 13.3, 21.85],
    ['G', 'G150', 8.4, 14.2],
  ] as const)('円筒面 %s %s: %s〜%s%%', (series, no, min, max) => {
    const range = squeezeRange(findORing(series, no)!)!
    expect(range.min).toBeCloseTo(min, 1)
    expect(range.max).toBeCloseTo(max, 1)
  })

  // 平面（固定用）。JIS B 2401-2:2012 表4 の参考欄の印刷値
  it.each([
    ['P', 'P3', 20.3, 31.8],
    ['P', 'P10A', 19.9, 29.7],
    ['P', 'P22A', 19.1, 26.4],
    ['P', 'P48A', 16.5, 22.0],
    ['P', 'P150A', 15.8, 19.9],
    ['G', 'G25', 18.3, 26.6],
    ['G', 'G150', 16.5, 22.0],
  ] as const)('平面 %s %s: %s〜%s%%', (series, no, min, max) => {
    const range = flatSqueezeRange(findORing(series, no)!)
    expect(range.min).toBeCloseTo(min, 1)
    expect(range.max).toBeCloseTo(max, 1)
  })
})

describe('flatGroove', () => {
  it('P3 内圧用: 溝外径 6.2、外圧用: 溝内径 3', () => {
    const ring = findORing('P', 'P3')!
    expect(flatGroove(ring, 'internal')).toMatchObject({ outer: 6.2, inner: 1.2, depth: 1.4, width: 2.5 })
    expect(flatGroove(ring, 'external')).toMatchObject({ outer: 8, inner: 3 })
  })

  it('G25 内圧用: 溝外径 30、P22A 外圧用: 溝内径 22', () => {
    expect(flatGroove(findORing('G', 'G25')!, 'internal').outer).toBe(30)
    expect(flatGroove(findORing('P', 'P22A')!, 'external').inner).toBe(22)
  })

  it('内圧用はOリングの外周が溝の外壁に、外圧用は内周が溝の内壁に当たる', () => {
    for (const series of ['P', 'G'] as const) {
      for (const no of oRingNumbers(series)) {
        const ring = findORing(series, no)!
        const outerOfRing = ring.d1 + 2 * ring.group.d2
        const internal = flatGroove(ring, 'internal')
        const external = flatGroove(ring, 'external')
        // 内圧用: Oリングの外径 ≧ 溝外径（外壁に押し付けて入れる）
        expect(outerOfRing, no).toBeGreaterThanOrEqual(internal.outer)
        // 外圧用: Oリングの内径 ≦ 溝内径（内壁に少し伸ばしてはめる）
        expect(ring.d1, no).toBeLessThanOrEqual(external.inner)
        // 反対側の壁とは当たらない
        expect(ring.d1, no).toBeGreaterThan(internal.inner)
        expect(outerOfRing, no).toBeLessThan(external.outer)
      }
    }
  })

  it('平面溝の充てん率（P20）= π/4×2.4² ÷ (3.2×1.8) = 78.5%', () => {
    expect(flatFillRatio(findORing('P', 'P20')!)).toBeCloseTo(78.5, 1)
  })
})

describe('バックアップリングなしで使えるすきま 2g（JIS B 2401-2:2012 表2）', () => {
  it('表の値（硬さ 70・90 × 圧力の5区分）', () => {
    expect(NO_BACKUP_MAX_CLEARANCE[70]).toEqual([0.35, 0.3, 0.15, 0.07, 0.03])
    expect(NO_BACKUP_MAX_CLEARANCE[90]).toEqual([0.65, 0.6, 0.5, 0.3, 0.17])
    expect(BACKUP_PRESSURE_LIMITS).toEqual([4.0, 6.3, 10.0, 16.0, 25.0])
  })

  it('圧力が高いほど小さく（増えない）、硬さ 90 は 70 より大きい', () => {
    for (const hardness of HARDNESSES) {
      const values = NO_BACKUP_MAX_CLEARANCE[hardness]
      expect(values).toHaveLength(BACKUP_PRESSURE_LIMITS.length)
      for (let i = 1; i < values.length; i++) expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
    NO_BACKUP_MAX_CLEARANCE[70].forEach((value, i) => expect(NO_BACKUP_MAX_CLEARANCE[90][i]).toBeGreaterThan(value))
  })

  it('区分の上端はその区分に含む。25.0 MPa を超えると表の区分にない', () => {
    expect(noBackupMaxClearance(70, 0)).toEqual({ status: 'ok', index: 0, max: 0.35 })
    expect(noBackupMaxClearance(70, 4)).toEqual({ status: 'ok', index: 0, max: 0.35 })
    expect(noBackupMaxClearance(70, 4.01)).toEqual({ status: 'ok', index: 1, max: 0.3 })
    expect(noBackupMaxClearance(90, 10)).toEqual({ status: 'ok', index: 2, max: 0.5 })
    expect(noBackupMaxClearance(90, 16.5)).toEqual({ status: 'ok', index: 4, max: 0.17 })
    expect(noBackupMaxClearance(70, 25)).toEqual({ status: 'ok', index: 4, max: 0.03 })
    expect(noBackupMaxClearance(70, 25.1)).toEqual({ status: 'above' })
    expect(noBackupMaxClearance(70, -1)).toEqual({ status: 'invalid' })
    expect(noBackupMaxClearance(70, Number.NaN)).toEqual({ status: 'invalid' })
  })

  it('すきまが最大値を超えたらバックアップリングを使う', () => {
    // 硬さ 70・10 MPa は 0.15 まで
    expect(needsBackupRing(70, 10, 0.15)).toBe(false)
    expect(needsBackupRing(70, 10, 0.2)).toBe(true)
    // 硬さ 90 なら 0.5 まで
    expect(needsBackupRing(90, 10, 0.2)).toBe(false)
    expect(needsBackupRing(70, 30, 0.01)).toBeNull()
  })

  it('区分の表記', () => {
    expect(pressureBandLabel(0)).toBe('4.0 以下')
    expect(pressureBandLabel(1)).toBe('4.0 を超え 6.3 以下')
    expect(pressureBandLabel(4)).toBe('16.0 を超え 25.0 以下')
    expect(pressureBandShortLabel(0)).toBe('〜4.0')
    expect(pressureBandShortLabel(1)).toBe('4.0超〜6.3')
    expect(pressureBandShortLabel(4)).toBe('16.0超〜25.0')
  })
})

describe('溝幅 b3 の印刷の誤り（JIS B 2401-2:2012 表3 の P48A〜P60 の欄）', () => {
  it('サイトの値は 11.5（b2 9.0 より広い。同じ太さの G150 グループと同じ）', () => {
    expect(GROUPS.P5_7.widths[2]).toBe(11.5)
    expect(GROUPS.P5_7.widths[2]).toBeGreaterThan(GROUPS.P5_7.widths[1])
    expect(GROUPS.G5_7.widths).toEqual(GROUPS.P5_7.widths)
    expect(findORing('P', 'P50A')!.group.widths[2]).toBe(11.5)
  })

  it('P48A〜P60 だけが該当する', () => {
    const affected = oRingNumbers('P').filter((no) => hasB3Misprint(findORing('P', no)!))
    expect(affected[0]).toBe(B3_MISPRINT.first)
    expect(affected.at(-1)).toBe(B3_MISPRINT.last)
    expect(affected).toEqual(['P48A', 'P50A', 'P52', 'P53', 'P55', 'P56', 'P58', 'P60'])
    for (const no of ['P48', 'P50', 'P62', 'P150']) expect(hasB3Misprint(findORing('P', no)!), no).toBe(false)
    expect(hasB3Misprint(findORing('G', 'G150')!)).toBe(false)
  })
})

describe('典拠・注記の文言（JIS B 2401-1・-2:2012 の原文と照合済み）', () => {
  it('数値の出どころは 2012年版の表。「確認中」「未照合」は付けない', () => {
    expect(SOURCE_NOTE).toContain('JIS B 2401-1:2012 表5・表6')
    expect(SOURCE_NOTE).toContain('JIS B 2401-2:2012 表3・表4')
    expect(SOURCE_NOTE).toContain('旧 JIS B 2406:1991 と同じ値')
    for (const text of [SOURCE_NOTE, E_NOTE, DYNAMIC_MATERIAL_NOTE, D1_TOL_NOTE]) {
      expect(text).not.toMatch(/確認中|未照合|未確認/)
      // 2012年版は第1部・第2部に分かれている（「JIS B 2401:2012」という規格はない）
      expect(text).not.toMatch(/JIS B 2401:/)
    }
  })

  it('表の番号', () => {
    expect(RING_TABLES.P.no).toBe('表5')
    expect(RING_TABLES.G.no).toBe('表6')
    expect(HOUSING_TABLES.backup.no).toBe('表2')
    expect(HOUSING_TABLES.cylinder.no).toBe('表3')
    expect(HOUSING_TABLES.flat.no).toBe('表4')
  })

  it('運動用の材料の注意は 2012年版の注記1 の言い方（VMQ・望ましい）', () => {
    expect(DYNAMIC_MATERIAL_NOTE).toContain('VMQ')
    expect(DYNAMIC_MATERIAL_NOTE).toContain('機械的強度の小さい材料')
    expect(DYNAMIC_MATERIAL_NOTE).toContain('望ましい')
    expect(DYNAMIC_MATERIAL_NOTE).not.toContain('4種C')
  })

  it('材料による内径の許容差の倍率は ACM・HNBR も含む', () => {
    expect(D1_TOL_NOTE).toContain('NBR・EPDM の値')
    expect(D1_TOL_NOTE).toContain('VMQ（旧4種C）・ACM は1.5倍')
    expect(D1_TOL_NOTE).toContain('FKM（旧4種D）・HNBR は1.2倍')
  })

  it('E は規格の用語「溝加工深さのばらつき」', () => {
    expect(E_NOTE).toContain('溝加工深さのばらつき')
    expect(E_NOTE).toContain('K の最大値と最小値の差')
    expect(E_NOTE).toContain('表3')
  })
})
