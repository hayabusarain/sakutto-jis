import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { NumberField } from './NumberField'

const render = (value: string, extra: { error?: string; hint?: string } = {}) =>
  renderToStaticMarkup(<NumberField label="本数" value={value} onChange={() => {}} {...extra} />)

describe('NumberField', () => {
  it('カンマを含む入力は、どう読んだかを入力欄の下に出す', () => {
    expect(render('1,000')).toContain('「1,000」は3桁区切りのカンマとして 1000 で計算しています。')
    expect(render('12,5')).toContain('「12,5」は小数点のカンマとして 12.5 で計算しています。')
  })

  it('カンマが無いとき・エラーのときは出さない', () => {
    expect(render('1000')).not.toContain('カンマ')
    expect(render('1,000', { error: '1 以上の整数を入力してください。' })).not.toContain('カンマとして')
  })

  it('説明（hint）と一緒に読み上げ対象にする', () => {
    const html = render('1,000', { hint: '同じ長さの本数' })
    const describedBy = /aria-describedby="([^"]+)"/.exec(html)?.[1].split(' ') ?? []
    expect(describedBy).toHaveLength(2)
    expect(html).toContain('同じ長さの本数')
  })
})
