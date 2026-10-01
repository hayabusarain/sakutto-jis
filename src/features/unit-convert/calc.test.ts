import { describe, expect, it } from 'vitest'
import { parseNumber } from '../../lib/format'
import {
  absoluteToGauge,
  convert,
  echoValue,
  findUnit,
  formatFeetInches,
  formatValue,
  gaugeToAbsolute,
  isExact,
  isPhysicalTemperature,
  nearestInchFraction,
  parseValue,
  plainValue,
  quantityOfUnit,
  roundSignificant,
  valueCommaNote,
} from './calc'
import { POUND_FORCE, QUANTITIES, QUANTITY_KEYS, type Quantity } from './data'

const unit = (quantity: Quantity, id: string) => {
  const found = findUnit(quantity, id)
  if (!found) throw new Error(`${quantity}/${id} がありません`)
  return found
}

/** 相対誤差 1e-12 以内で一致 */
function expectClose(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.max(Math.abs(expected), 1e-300) * 1e-12)
}

describe('定義値', () => {
  it('1 lbf = 0.45359237 kg × 9.80665 m/s² = 4.4482216152605 N', () => {
    expectClose(POUND_FORCE, 4.4482216152605)
  })

  it.each<[Quantity, string, number]>([
    // 圧力 [Pa]
    ['pressure', 'MPa', 1e6],
    ['pressure', 'kPa', 1e3],
    ['pressure', 'Pa', 1],
    ['pressure', 'bar', 1e5],
    ['pressure', 'kgfcm2', 98066.5],
    ['pressure', 'psi', 4.4482216152605 / 0.0254 ** 2],
    ['pressure', 'atm', 101325],
    ['pressure', 'mmHg', 101325 / 760],
    ['pressure', 'mH2O', 9806.65],
    ['pressure', 'mmH2O', 9.80665],
    // トルク [N·m]
    ['torque', 'Nm', 1],
    ['torque', 'kgfm', 9.80665],
    ['torque', 'kgfcm', 0.0980665],
    ['torque', 'lbfft', 4.4482216152605 * 0.3048],
    ['torque', 'lbfin', 4.4482216152605 * 0.0254],
    // 力 [N]
    ['force', 'N', 1],
    ['force', 'kN', 1000],
    ['force', 'kgf', 9.80665],
    ['force', 'tf', 9806.65],
    ['force', 'lbf', 4.4482216152605],
    // 長さ [m]
    ['length', 'mm', 0.001],
    ['length', 'm', 1],
    ['length', 'in', 0.0254],
    ['length', 'ft', 0.3048],
  ])('%s: 1 %s = %s（基準の単位）', (quantity, id, expected) => {
    const u = unit(quantity, id)
    expectClose(u.toBase(1), expected)
    expectClose(u.factor ?? NaN, expected)
    expectClose(u.fromBase(expected), 1)
  })

  it('単位 ID は全量で重複しない', () => {
    const ids = QUANTITY_KEYS.flatMap((q) => QUANTITIES[q].units.map((u) => u.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('既定の入力単位・表示単位はその量の単位で、互いに違う', () => {
    for (const q of QUANTITY_KEYS) {
      const def = QUANTITIES[q]
      expect(findUnit(q, def.defaultFrom)).toBeDefined()
      expect(findUnit(q, def.defaultTo)).toBeDefined()
      expect(def.defaultFrom).not.toBe(def.defaultTo)
    }
  })

  it('単位 ID から量を引ける', () => {
    expect(quantityOfUnit('kgfcm2')).toBe('pressure')
    expect(quantityOfUnit('lbfft')).toBe('torque')
    expect(quantityOfUnit('F')).toBe('temperature')
    expect(quantityOfUnit('xyz')).toBeUndefined()
  })
})

describe('よく使う換算', () => {
  const p = (id: string) => unit('pressure', id)
  it('圧力', () => {
    expectClose(convert(1, p('kgfcm2'), p('MPa')), 0.0980665)
    expectClose(convert(10, p('kgfcm2'), p('MPa')), 0.980665)
    expect(formatValue(convert(1, p('MPa'), p('kgfcm2')))).toBe('10.1972')
    expectClose(convert(1, p('bar'), p('MPa')), 0.1)
    expectClose(convert(1, p('atm'), p('kPa')), 101.325)
    expectClose(convert(760, p('mmHg'), p('atm')), 1)
    expectClose(convert(10, p('mH2O'), p('kgfcm2')), 1)
    expect(formatValue(convert(1, p('psi'), p('kPa')))).toBe('6.89476')
    expect(formatValue(convert(1, p('MPa'), p('psi')))).toBe('145.038')
    expect(formatValue(convert(1, p('MPa'), p('Pa')))).toBe('1,000,000')
  })

  it('トルク', () => {
    const t = (id: string) => unit('torque', id)
    expectClose(convert(1, t('kgfm'), t('Nm')), 9.80665)
    expectClose(convert(1, t('kgfm'), t('kgfcm')), 100)
    expect(formatValue(convert(1, t('lbfft'), t('Nm')))).toBe('1.35582')
    expectClose(convert(1, t('lbfft'), t('lbfin')), 12)
  })

  it('力', () => {
    const f = (id: string) => unit('force', id)
    expectClose(convert(1, f('tf'), f('kN')), 9.80665)
    expect(formatValue(convert(1, f('kN'), f('kgf')))).toBe('101.972')
    expect(formatValue(convert(1, f('lbf'), f('kgf')))).toBe('0.453592')
  })

  it('長さ', () => {
    const l = (id: string) => unit('length', id)
    expectClose(convert(1, l('in'), l('mm')), 25.4)
    expectClose(convert(1, l('ft'), l('mm')), 304.8)
    expectClose(convert(1, l('ft'), l('in')), 12)
    expectClose(convert(1.25, l('in'), l('mm')), 31.75)
  })

  it('温度', () => {
    const c = unit('temperature', 'C')
    const f = unit('temperature', 'F')
    const k = unit('temperature', 'K')
    expectClose(convert(0, c, f), 32)
    expectClose(convert(100, c, f), 212)
    expectClose(convert(-40, c, f), -40)
    expect(formatValue(convert(20, c, k))).toBe('293.15')
    expect(formatValue(convert(0, k, c))).toBe('-273.15')
    expect(formatValue(convert(0, k, f))).toBe('-459.67')
    expect(formatValue(convert(98.6, f, c))).toBe('37')
    expect(isPhysicalTemperature(-273.15, c)).toBe(true)
    expect(isPhysicalTemperature(-274, c)).toBe(false)
    expect(isPhysicalTemperature(-460, f)).toBe(false)
  })
})

describe('往復で元に戻る', () => {
  const samples = [1, 0.001, 3.7, 25.4, 1234.5678, 1e6]
  for (const quantity of QUANTITY_KEYS) {
    const units = QUANTITIES[quantity].units
    it(`${QUANTITIES[quantity].label}: すべての組み合わせ`, () => {
      for (const a of units) {
        for (const b of units) {
          for (const x of samples) {
            const back = convert(convert(x, a, b), b, a)
            // 温度は 273.15 などの足し引きで絶対誤差が出るので、絶対値でも比べる
            expect(Math.abs(back - x)).toBeLessThanOrEqual(Math.max(Math.abs(x) * 1e-12, 1e-9))
          }
        }
      }
    })
  }
})

describe('ゲージ圧と絶対圧', () => {
  it('標準大気圧を足し引きする', () => {
    const mpa = unit('pressure', 'MPa')
    expectClose(gaugeToAbsolute(0.5, mpa), 0.601325)
    expectClose(absoluteToGauge(0.601325, mpa), 0.5)
    expect(Math.abs(gaugeToAbsolute(0, unit('pressure', 'atm')) - 1)).toBeLessThan(1e-12)
    // 真空（−0.1 MPa ゲージ）は 1.325 kPa 絶対
    expectClose(gaugeToAbsolute(-100, unit('pressure', 'kPa')), 1.325)
  })
})

describe('parseValue', () => {
  it.each<[string, number]>([
    ['10', 10],
    ['0.5', 0.5],
    ['.5', 0.5],
    ['-40', -40],
    ['− 40', -40],
    ['１．５', 1.5],
    ['1,000', 1000],
    ['1,200', 1200],
    ['12,500.5', 12500.5],
    ['1,250.5', 1250.5],
    // 「1,200.5」を打っている途中
    ['1,200.', 1200],
    ['１，２００', 1200],
    ['8,5', 8.5],
    ['12,5', 12.5],
    // 先頭が 0 の数は3桁区切りにならない（小数点のカンマ）
    ['0,125', 0.125],
    ['-0,125', -0.125],
    ['00,125', 0.125],
    ['1,2345', 1.2345],
    ['0,125"', 0.125],
    ['1-1/4', 1.25],
    ['1 1/4', 1.25],
    ['1　1/4', 1.25],
    ['１－１／４', 1.25],
    ['3/8', 0.375],
    ['5/8"', 0.625],
    ['2 3/4″', 2.75],
    ['-1/2', -0.5],
    ['1e-7', 1e-7],
    ['1.5E3', 1500],
  ])('%s → %s', (text, expected) => {
    expect(parseValue(text)).toBe(expected)
  })

  it.each(['', ' ', 'abc', '1/0', '1.2.3', '1/2/3', '-', '1-', '10 mm', '1,2,3'])('%s → null', (text) => {
    expect(parseValue(text)).toBeNull()
  })

  it('カンマの読み方は他のツール（lib/format の parseNumber）と同じ', () => {
    for (const text of ['1,200', '1,000', '0,125', '-0,125', '12,5', '1,250.5', '1,200.', '1,2345', '１，２００']) {
      expect(parseValue(text)).toBe(parseNumber(text))
    }
  })
})

describe('valueCommaNote（カンマをどう読んだか）', () => {
  it('3桁区切り・小数点のどちらで読んだかを、parseValue と同じ数で説明する', () => {
    expect(valueCommaNote('1,200')).toBe('「1,200」は3桁区切りのカンマとして 1200 で計算しています。')
    expect(valueCommaNote('0,125')).toBe('「0,125」は小数点のカンマとして 0.125 で計算しています。')
  })

  it('末尾のインチ記号は外して見る（0,125″ も 0.125 in）', () => {
    expect(parseValue('0,125"')).toBe(0.125)
    expect(valueCommaNote('0,125"')).toBe('「0,125」は小数点のカンマとして 0.125 で計算しています。')
    expect(valueCommaNote('1,200 ″')).toBe('「1,200」は3桁区切りのカンマとして 1200 で計算しています。')
  })

  it('カンマが無い・読めないときは null', () => {
    expect(valueCommaNote('1-1/4')).toBeNull()
    expect(valueCommaNote('25.4')).toBeNull()
    expect(valueCommaNote('1,2,3')).toBeNull()
  })
})

describe('echoValue（入力した値の表示）', () => {
  it.each<[number, string]>([
    [1234567, '1,234,567'],
    [1250.125, '1,250.125'],
    [0.12345678, '0.12345678'],
    [-1234.5, '-1,234.5'],
    [0, '0'],
    [25.4, '25.4'],
    [0.000001, '0.000001'],
    [1e-7, '1×10⁻⁷'],
    [1 / 3, '0.333333333333'],
  ])('%s → %s（6桁に丸めない）', (value, expected) => {
    expect(echoValue(value)).toBe(expected)
  })
})

describe('formatValue / plainValue / isExact', () => {
  it.each<[number, string]>([
    [0, '0'],
    [25.4, '25.4'],
    [0.0980665, '0.0980665'],
    [10.197162129779, '10.1972'],
    [1000, '1,000'],
    [1e6, '1,000,000'],
    [-40, '-40'],
    [-1234.5, '-1,234.5'],
    [0.000001, '0.000001'],
    [1.2345678e-7, '1.23457×10⁻⁷'],
    [9.80665e12, '9.80665×10¹²'],
    [0.9806649999999999, '0.980665'],
  ])('%s → %s', (value, expected) => {
    expect(formatValue(value)).toBe(expected)
  })

  it('浮動小数の誤差で切り捨てにならず、四捨五入する', () => {
    // 0.0980665 + 0.101325 = 0.19939149999999998（本当は 0.1993915）
    expect(formatValue(0.0980665 + 0.101325)).toBe('0.199392')
    expect(roundSignificant(1.000005)).toBe(1.00001)
    expect(roundSignificant(9.999995)).toBe(10)
    expect(roundSignificant(999999.5)).toBe(1000000)
    expect(roundSignificant(-2.500005)).toBe(-2.50001)
    expect(roundSignificant(1.23456789e-7)).toBe(1.23457e-7)
    expect(formatValue(9.9999999e-7)).toBe('0.000001')
  })

  it('入力欄に戻す表記は区切りなし・読み直せる', () => {
    expect(plainValue(1e6)).toBe('1000000')
    expect(plainValue(10.197162129779)).toBe('10.1972')
    expect(plainValue(1.2345678e-7)).toBe('1.23457e-7')
    for (const value of [1e6, 10.197162129779, 1.2345678e-7, -273.15, 0.0703069578]) {
      expect(parseValue(plainValue(value))).toBe(roundSignificant(value))
    }
  })

  it('丸めていない値だけを「=」にする', () => {
    expect(isExact(0.0980665)).toBe(true)
    expect(isExact(0.1 + 0.2)).toBe(true)
    expect(isExact(25.4)).toBe(true)
    expect(isExact(10.197162129779)).toBe(false)
    expect(isExact(6894.757293168361)).toBe(false)
  })
})

describe('インチの分数', () => {
  it.each<[number, number, string]>([
    [1.25, 16, '1-1/4'],
    [0.5, 64, '1/2'],
    [2, 16, '2'],
    [0.375, 64, '3/8'],
    [25 / 25.4, 64, '63/64'],
    [25 / 25.4, 16, '1'],
    [10 / 25.4, 32, '13/32'],
    [-1.25, 16, '-1-1/4'],
    [0.01, 16, '0'],
  ])('%s in（1/%s）→ %s', (inches, den, text) => {
    expect(nearestInchFraction(inches, den).text).toBe(text)
  })

  it('差を mm で返す', () => {
    // 25 mm ≒ 63/64 in = 25.003 mm
    const f = nearestInchFraction(25 / 25.4, 64)
    expect(f.value).toBe(63 / 64)
    expect(f.errorMm).toBeCloseTo(0.003125, 9)
    expect(nearestInchFraction(1.25, 16).errorMm).toBe(0)
  })

  it('フィート・インチ表記', () => {
    expect(formatFeetInches(66.5)).toBe('5′ 6-1/2″')
    expect(formatFeetInches(12)).toBe('1′ 0″')
    expect(formatFeetInches(11.99)).toBe('1′ 0″')
    expect(formatFeetInches(3.25)).toBe('3-1/4″')
    expect(formatFeetInches(-18)).toBe('-1′ 6″')
  })
})
