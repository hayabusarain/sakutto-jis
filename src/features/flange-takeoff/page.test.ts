import { describe, expect, it } from 'vitest'
import { render } from '../../entry-server'
import { TAKEOFF_TOOL_PATH } from './input'

describe('事前レンダリング', () => {
  it('既定の一覧（10K 50A × 1か所）の結果・典拠・行のリンクが出る', () => {
    const rendered = render(TAKEOFF_TOOL_PATH)
    expect(rendered.found).toBe(true)
    expect(rendered.title).toBe('フランジのボルト・ナット・ガスケット拾い出し（JIS 5K〜20K）｜サクッとJIS')
    const { html } = rendered
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
    // 10K 50A: M16・4穴、16+16+3+14.8+6 = 55.8 → 60
    expect(html).toContain('M16×60')
    expect(html).toContain('表15 呼び圧力10Kフランジの寸法')
    expect(html).toContain('表3 六角ナット・スタイル1')
    expect(html).toContain('href="/flange-bolt-length?pressure=10K&amp;size=50A"')
    // ガスケットの寸法は載せていないことを書く
    expect(html).toContain('寸法は載せていません')
  })

  it('JISフランジ＆ボルト長さから拾い出しへのリンクがある（条件は渡さない）', () => {
    const { html } = render('/flange-bolt-length')
    expect(html).toContain(`href="${TAKEOFF_TOOL_PATH}"`)
  })
})
