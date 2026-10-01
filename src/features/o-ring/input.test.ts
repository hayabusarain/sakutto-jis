import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import { DEFAULT_INPUT, isORingInput, normalizeORingInput, parsePositive, withAutoPick, type ORingInput } from './input'

/** URL のクエリから、useToolState と同じ手順で入力を作る */
function fromUrl(search: string): ORingInput | null {
  const parsed = fromQuery(search, DEFAULT_INPUT)
  if (!parsed) return null
  const next = normalizeORingInput(parsed.state, parsed.keys)
  return isORingInput(next) ? next : null
}

describe('isORingInput', () => {
  it('既定値は正しい', () => {
    expect(isORingInput(DEFAULT_INPUT)).toBe(true)
  })

  it('前の版の保存値（mode などが無い）は受け付けない', () => {
    expect(isORingInput({ series: 'P', no: 'P20', groove: 'cylinder', backup: 0 })).toBe(false)
  })

  it('系列に無い番号は受け付けない', () => {
    expect(isORingInput({ ...DEFAULT_INPUT, series: 'G', no: 'P20' })).toBe(false)
  })
})

describe('normalizeORingInput（URL の一部指定）', () => {
  it('番号だけ（?no=G50）なら系列を G にする', () => {
    expect(fromUrl('?no=G50')).toMatchObject({ series: 'G', no: 'G50', mode: 'number' })
  })

  it('小文字・空白（?no=p%2022a）も読む', () => {
    expect(fromUrl('?no=p%2022a')).toMatchObject({ series: 'P', no: 'P22A' })
  })

  it('数字だけの番号は系列の文字を付ける（?series=G&no=50）', () => {
    expect(fromUrl('?series=G&no=50')).toMatchObject({ series: 'G', no: 'G50' })
  })

  it('系列と番号が食い違うときは番号の頭文字を優先（?series=G&no=P20）', () => {
    expect(fromUrl('?series=G&no=P20')).toMatchObject({ series: 'P', no: 'P20' })
  })

  it('系列だけ（?series=G）なら G の既定の番号', () => {
    expect(fromUrl('?series=G')).toMatchObject({ series: 'G', no: 'G50' })
  })

  it('存在しない番号・系列は既定に戻す', () => {
    expect(fromUrl('?no=P21.5')).toMatchObject({ series: 'P', no: 'P20' })
    expect(fromUrl('?series=X')).toMatchObject({ series: 'P', no: 'P20' })
  })

  it('溝の形・バックアップリング・型が不正なら既定値', () => {
    expect(fromUrl('?no=P30&groove=round&backup=3&housing=x')).toMatchObject({
      no: 'P30',
      groove: 'cylinder',
      backup: 0,
      housing: 'piston',
    })
  })

  it('相手寸法だけ（?mate=30）なら「相手寸法」にして、合う番号（P24）を選ぶ', () => {
    expect(fromUrl('?mate=30')).toMatchObject({
      mode: 'mating',
      mate: '30',
      series: 'P',
      no: 'P24',
      groove: 'cylinder',
    })
  })

  it('ロッド型・溝底径つき（?housing=rod&mate=50&bottom=55）→ G50', () => {
    expect(fromUrl('?housing=rod&mate=50&bottom=55')).toMatchObject({ mode: 'mating', series: 'G', no: 'G50' })
  })

  it('相手寸法モードは円筒面にする（?mode=mating&groove=flat-internal）', () => {
    expect(fromUrl('?mode=mating&groove=flat-internal')).toMatchObject({ mode: 'mating', groove: 'cylinder' })
  })

  it('実物の寸法（?d1=24.6&d2=3.5）→「実物寸法」で P25', () => {
    expect(fromUrl('?d1=24.6&d2=3.5')).toMatchObject({ mode: 'measure', series: 'P', no: 'P25' })
  })

  it('番号を指定したリンクは、自動で番号を変えない（?mode=mating&mate=30&series=G&no=G25）', () => {
    expect(fromUrl('?mode=mating&mate=30&series=G&no=G25')).toMatchObject({ mode: 'mating', no: 'G25' })
  })

  it('ほかのツールからのリンク（?series=G&no=G30）は「呼び番号」から選んだ表示', () => {
    expect(fromUrl('?series=G&no=G30')).toMatchObject({ mode: 'number', series: 'G', no: 'G30' })
  })
})

describe('withAutoPick', () => {
  it('相手寸法: 今の番号が合わなければ、ちょうど合う最初の番号にする', () => {
    const next = withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: '30' })
    expect(next).toMatchObject({ series: 'P', no: 'P24' })
  })

  it('相手寸法: 今の番号が合っていれば変えない（G25 を選んだあと）', () => {
    const next = withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: '30', series: 'G', no: 'G25' })
    expect(next).toMatchObject({ series: 'G', no: 'G25' })
  })

  it('相手寸法: 合う番号が無い・入力途中なら変えない', () => {
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: '33' }).no).toBe('P20')
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: '3.' }).no).toBe('P20')
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: 'abc' }).no).toBe('P20')
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'mating', mate: '30', bottom: 'x' }).no).toBe('P20')
  })

  it('実物の寸法: 許容差内の候補があるときだけ選ぶ', () => {
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'measure', d1: '24.6', d2: '3.5' }).no).toBe('P25')
    expect(withAutoPick({ ...DEFAULT_INPUT, mode: 'measure', d1: '24', d2: '3.5' }).no).toBe('P20')
  })

  it('呼び番号モードでは何もしない', () => {
    expect(withAutoPick({ ...DEFAULT_INPUT, mate: '30' }).no).toBe('P20')
  })
})

describe('parsePositive', () => {
  it('空欄は undefined、正の数は数値、それ以外は null', () => {
    expect(parsePositive('')).toBeUndefined()
    expect(parsePositive('  ')).toBeUndefined()
    expect(parsePositive('３０')).toBe(30)
    expect(parsePositive('24,6')).toBe(24.6)
    // カンマはサイト共通のルール（3桁区切りか小数点か）
    expect(parsePositive('1,200')).toBe(1200)
    expect(parsePositive('0,125')).toBe(0.125)
    expect(parsePositive('0')).toBeNull()
    expect(parsePositive('-5')).toBeNull()
    expect(parsePositive('abc')).toBeNull()
  })
})
