import { describe, expect, it } from 'vitest'
import { linkAction, normalizePath, resolveLink } from './context'

describe('normalizePath', () => {
  it('末尾スラッシュ・.html・index を取り除く', () => {
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('/tap-drill')).toBe('/tap-drill')
    expect(normalizePath('/tap-drill/')).toBe('/tap-drill')
    expect(normalizePath('/tap-drill.html')).toBe('/tap-drill')
    expect(normalizePath('/index.html')).toBe('/')
  })
})

describe('resolveLink', () => {
  const at = (path: string) => new URL(path, 'https://example.com')
  const resolve = (current: string, next: string) => resolveLink(at(current), at(next))?.href ?? null

  it('同じ URL へのリンクは履歴を増やさない', () => {
    expect(resolve('/', '/')).toBeNull()
    expect(resolve('/about', '/about')).toBeNull()
    expect(resolve('/about#contact', '/about#contact')).toBeNull()
    expect(resolve('/tap-drill?d=12&p=1.75', '/tap-drill?d=12&p=1.75')).toBeNull()
  })

  it('条件の無い同じページへのリンクは、今の条件のまま（履歴を増やさない）', () => {
    expect(resolve('/tap-drill?d=12&p=1.75', '/tap-drill')).toBeNull()
    expect(resolve('/tap-drill.html?d=12&p=1.75', '/tap-drill')).toBeNull()
    expect(resolve('/?q=M12', '/')).toBeNull()
    // 見出しへのリンクは、条件を残したまま見出しへ
    expect(resolve('/tap-drill?d=12', '/tap-drill#guide')).toBe('https://example.com/tap-drill?d=12#guide')
    // 見出しを表示しているときは、見出しだけ外す
    expect(resolve('/tap-drill?d=12#guide', '/tap-drill')).toBe('https://example.com/tap-drill?d=12')
  })

  it('ほかのページ・ほかの条件へは移る', () => {
    expect(resolve('/about', '/')).toBe('https://example.com/')
    expect(resolve('/tap-drill?d=12', '/tap-drill?d=16')).toBe('https://example.com/tap-drill?d=16')
    expect(resolve('/tap-drill?d=12', '/bolt-size')).toBe('https://example.com/bolt-size')
    expect(resolve('/tap-drill', '/about#contact')).toBe('https://example.com/about#contact')
    expect(resolve('/about', '/about#contact')).toBe('https://example.com/about#contact')
  })
})

describe('linkAction', () => {
  const at = (path: string) => new URL(path, 'https://example.com')
  const act = (current: string, next: string, updateAvailable: boolean) => {
    const action = linkAction(at(current), at(next), updateAvailable)
    return 'url' in action ? `${action.type} ${action.url.href}` : action.type
  }

  it('ふだんは画面内で移り、同じ画面ならスクロールだけ', () => {
    expect(act('/tap-drill?d=12&p=1.75', '/tap-drill?d=16&p=1.5', false)).toBe(
      'push https://example.com/tap-drill?d=16&p=1.5',
    )
    expect(act('/tap-drill?d=16&p=1.5', '/tap-drill?d=16&p=1.5', false)).toBe('stay')
    expect(act('/tap-drill?d=12&p=1.75', '/tap-drill', false)).toBe('stay')
  })

  it('新しい版があれば、ほかの画面・条件へはページごと読み込む', () => {
    expect(act('/tap-drill?d=12&p=1.75', '/bolt-size', true)).toBe('load https://example.com/bolt-size')
    expect(act('/tap-drill?d=12&p=1.75', '/tap-drill?d=16&p=1.5', true)).toBe(
      'load https://example.com/tap-drill?d=16&p=1.5',
    )
  })

  it('新しい版があっても、条件の無い同じ画面へのリンク（ツールの切り替え・ロゴ）は今の条件のまま読み直す', () => {
    // 条件の無い URL を読み込むと、端末に覚えている別のタブの条件に変わってしまう
    expect(act('/tap-drill?d=12&p=1.75', '/tap-drill', true)).toBe('reload')
    expect(act('/?q=M12', '/', true)).toBe('reload')
    expect(act('/about', '/about', true)).toBe('reload')
  })
})
