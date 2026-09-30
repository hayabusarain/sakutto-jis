import { Drill, Nut, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { FlangeBoltTool } from '../features/flange-bolt/FlangeBoltTool'
import { TapDrillTool } from '../features/tap-drill/TapDrillTool'
import { TOOL_IDS, type ToolId } from './ids'

export interface ToolDefinition {
  id: ToolId
  /** タブに表示する名前 */
  label: string
  description: string
  /** 計算の根拠にしているJIS規格 */
  standards: readonly string[]
  icon: LucideIcon
  component: ComponentType
}

// ツールを追加するときは ids.ts の TOOL_IDS とここの両方に足す（足りないと型エラーになる）
const definitions = {
  'flange-bolt': {
    label: 'JISフランジ＆ボルト長',
    description:
      '呼び圧力と呼び径から、フランジの寸法・ボルト本数・必要なボルト長さを求めます。',
    standards: ['JIS B 2220', 'JIS B 1180', 'JIS B 1181'],
    icon: Nut,
    component: FlangeBoltTool,
  },
  'tap-drill': {
    label: 'ねじ下穴径',
    description: 'ねじの呼びとピッチから、タップ加工に必要な下穴径の目安を求めます。',
    standards: ['JIS B 0205', 'JIS B 1004'],
    icon: Drill,
    component: TapDrillTool,
  },
} satisfies Record<ToolId, Omit<ToolDefinition, 'id'>>

export const TOOLS: readonly ToolDefinition[] = TOOL_IDS.map((id) => ({
  id,
  ...definitions[id],
}))
