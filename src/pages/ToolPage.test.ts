import { describe, expect, it } from 'vitest'
import { render } from '../entry-server'
import { findPage, PAGES } from '../routes'
import { TOOLS } from '../tools/registry'

const htmlOf = (path: string) => render(path).html.replace(/<!-- -->/g, '')

describe('ツールのページ', () => {
  it('説明文はスマホで2行に縮めるが、全文を HTML に残し「続きを読む」で開ける', () => {
    for (const tool of TOOLS) {
      const html = htmlOf(tool.path)
      expect(html, tool.path).toContain(tool.description)
      expect(html, tool.path).toContain('max-sm:line-clamp-2')
      expect(html, tool.path).toMatch(/<button type="button" aria-expanded="false" aria-controls="[^"]+"[^>]*>続きを読む<\/button>/)
      // 測る前からボタンを出すので、どの説明文もスマホの2行（約40字）より長いこと
      expect(tool.description.length, tool.path).toBeGreaterThan(40)
    }
  })

  it('関係する現場メモへのリンクを出す', () => {
    expect(htmlOf('/tap-drill')).toContain('href="/notes/m12-tap-drill"')
    const flange = htmlOf('/flange-bolt-length')
    expect(flange).toContain('href="/notes/flange-bolt-length"')
    expect(flange).toContain('href="/notes/across-flats-old-jis"')
    expect(htmlOf('/o-ring')).not.toContain('href="/notes/')
  })

  it('ツールの題名は計算・判別を先に、寸法表のページは「寸法表」の題名のまま', () => {
    expect(findPage('/flange-bolt-length')?.title).toMatch(/^JISフランジのボルト長さ計算と寸法/)
    for (const pressure of ['5k', '10k', '16k', '20k']) {
      expect(findPage(`/flange-bolt-length/${pressure}`)?.title, pressure).toContain('フランジ寸法表')
    }
    expect(new Set(PAGES.map((page) => page.title)).size).toBe(PAGES.length)
  })
})
