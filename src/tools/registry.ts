import { Cylinder, Disc3, Drill, Nut, Torus, Wrench, type LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { BoltSizeTool } from '../features/bolt-size/BoltSizeTool'
import { FlangeBoltTool } from '../features/flange-bolt/FlangeBoltTool'
import { ORingTool } from '../features/o-ring/ORingTool'
import { PipeThreadTool } from '../features/pipe-thread/PipeThreadTool'
import { SteelPipeTool } from '../features/steel-pipe/SteelPipeTool'
import { TapDrillTool } from '../features/tap-drill/TapDrillTool'
import type { StandardCode } from '../standards'

export type ToolCategory = 'piping' | 'fastening' | 'sealing'

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  piping: '配管',
  fastening: 'ねじ・締結',
  sealing: 'シール',
}

export interface ToolDefinition {
  /** URLのパス（例: /tap-drill） */
  path: string
  /** ページ見出し・タイトルに使う正式名 */
  name: string
  /** ナビゲーション用の短い名前 */
  navLabel: string
  /** 一覧・meta description 用の説明 */
  description: string
  category: ToolCategory
  /** 計算・データの根拠にしているJIS規格 */
  standards: readonly StandardCode[]
  icon: LucideIcon
  component: ComponentType
}

/** 並び順がそのままナビゲーションとトップページの順になる */
export const TOOLS: readonly ToolDefinition[] = [
  {
    path: '/flange-bolt-length',
    name: 'JISフランジ＆ボルト長さ',
    navLabel: 'フランジ・ボルト長',
    description:
      'JIS B 2220 鋼製管フランジの寸法（外径・PCD・ボルト穴・厚さ）と、ガスケット・ナット・座金から必要なボルト長さを計算します。',
    category: 'piping',
    standards: ['JIS B 2220', 'JIS B 1180', 'JIS B 1181', 'JIS B 1256'],
    icon: Disc3,
    component: FlangeBoltTool,
  },
  {
    path: '/steel-pipe',
    name: '鋼管の寸法・重量（SGP・Sch）',
    navLabel: '鋼管寸法・重量',
    description:
      'SGP（配管用炭素鋼鋼管）とSTPG（Sch40・Sch80）の外径・厚さ・内径・単位質量を一覧し、長さから重量を計算します。',
    category: 'piping',
    standards: ['JIS G 3452', 'JIS G 3454'],
    icon: Cylinder,
    component: SteelPipeTool,
  },
  {
    path: '/pipe-thread',
    name: '管用ねじ（R・Rc・G）寸法と下穴径',
    navLabel: '管用ねじ',
    description:
      '管用テーパねじ（R・Rc・Rp）と管用平行ねじ（G）の基準径・山数・ピッチと、タップの下穴径を調べられます。旧JIS（PT・PS・PF）表記にも対応。',
    category: 'piping',
    standards: ['JIS B 0203', 'JIS B 0202'],
    icon: Wrench,
    component: PipeThreadTool,
  },
  {
    path: '/tap-drill',
    name: 'ねじ下穴径（メートルねじ）',
    navLabel: 'ねじ下穴径',
    description:
      'メートル並目・細目ねじの下穴径を、めねじ内径の許容範囲（4H〜7H）とひっかかり率から求めます。手持ちドリルの適否も判定できます。',
    category: 'fastening',
    standards: ['JIS B 0205-2', 'JIS B 0205-4', 'JIS B 0209-1', 'JIS B 1004', 'ISO 2306'],
    icon: Drill,
    component: TapDrillTool,
  },
  {
    path: '/bolt-size',
    name: 'ボルト・ナットの二面幅と座ぐり寸法',
    navLabel: '二面幅・座ぐり',
    description:
      '六角ボルト・ナットの二面幅（スパナサイズ）、六角穴付きボルトの六角レンチサイズ、ボルト穴径と座ぐり寸法をまとめて確認できます。',
    category: 'fastening',
    standards: ['JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'],
    icon: Nut,
    component: BoltSizeTool,
  },
  {
    path: '/o-ring',
    name: 'Oリング・Oリング溝寸法',
    navLabel: 'Oリング・溝',
    description:
      'JIS B 2401 のOリング（P・G）寸法とハウジング（溝）寸法を呼び番号から求め、つぶし率・充てん率も計算します。',
    category: 'sealing',
    standards: ['JIS B 2401-1', 'JIS B 2401-2'],
    icon: Torus,
    component: ORingTool,
  },
]
