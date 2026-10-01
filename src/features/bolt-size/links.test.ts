import { describe, expect, it } from 'vitest'
import { TOOLS } from '../../tools/registry'
import { FLANGE_TOOL_PATH, TAP_DRILL_TOOL_PATH } from './calc'

describe('関連ツールへのリンク', () => {
  it('リンク先のパスが登録されている', () => {
    const paths = TOOLS.map((tool) => tool.path)
    expect(paths).toContain(FLANGE_TOOL_PATH)
    expect(paths).toContain(TAP_DRILL_TOOL_PATH)
  })
})
