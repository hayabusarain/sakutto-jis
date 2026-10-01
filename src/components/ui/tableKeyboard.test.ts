import { describe, expect, it } from 'vitest'
import { isRowMoveKey, nextRowIndex, rowTabStop } from './tableKeyboard'

describe('isRowMoveKey', () => {
  it.each(['ArrowDown', 'ArrowUp', 'Home', 'End'])('%s で行を移る', (key) => {
    expect(isRowMoveKey(key)).toBe(true)
  })

  it.each(['Enter', ' ', 'Tab', 'ArrowLeft', 'ArrowRight', 'PageDown', 'a'])('%s では移らない', (key) => {
    expect(isRowMoveKey(key)).toBe(false)
  })
})

describe('nextRowIndex', () => {
  it('上下の矢印で1行ずつ移る', () => {
    expect(nextRowIndex(3, 10, 'ArrowDown')).toBe(4)
    expect(nextRowIndex(3, 10, 'ArrowUp')).toBe(2)
  })

  it('端では止まる（回り込まない）', () => {
    expect(nextRowIndex(0, 10, 'ArrowUp')).toBe(0)
    expect(nextRowIndex(9, 10, 'ArrowDown')).toBe(9)
  })

  it('Home は先頭、End は末尾', () => {
    expect(nextRowIndex(5, 10, 'Home')).toBe(0)
    expect(nextRowIndex(5, 10, 'End')).toBe(9)
  })

  it('1行だけの表では動かない', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End'] as const) expect(nextRowIndex(0, 1, key)).toBe(0)
  })

  it('行がないときは -1', () => {
    expect(nextRowIndex(0, 0, 'End')).toBe(-1)
  })
})

describe('rowTabStop', () => {
  const keys = ['M3', 'M4', 'M5', 'M6']

  it('何も選んでいなければ先頭の行', () => {
    expect(rowTabStop(keys, null, null)).toBe('M3')
  })

  it('選択中の行があればその行', () => {
    expect(rowTabStop(keys, null, 'M5')).toBe('M5')
  })

  it('キーボードで今いる行を、選択中の行より優先する', () => {
    expect(rowTabStop(keys, 'M4', 'M5')).toBe('M4')
  })

  it('表にない行（絞り込みで消えた行など）は使わない', () => {
    expect(rowTabStop(keys, 'M8', 'M10')).toBe('M3')
    expect(rowTabStop(keys, 'M8', 'M6')).toBe('M6')
  })

  it('行がない表では undefined', () => {
    expect(rowTabStop([], null, null)).toBeUndefined()
  })
})
