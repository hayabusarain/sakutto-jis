import {
  ArrowLeftRight,
  Cylinder,
  Disc3,
  Drill,
  Nut,
  Ruler,
  ScanSearch,
  Torus,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { BoltSizeTool } from '../features/bolt-size/BoltSizeTool'
import { BoltSizeGuide } from '../features/bolt-size/Guide'
import { FlangeBoltTool } from '../features/flange-bolt/FlangeBoltTool'
import { FlangeBoltGuide } from '../features/flange-bolt/Guide'
import { GeneralToleranceTool } from '../features/general-tolerance/GeneralToleranceTool'
import { GeneralToleranceGuide } from '../features/general-tolerance/Guide'
import { ORingGuide } from '../features/o-ring/Guide'
import { ORingTool } from '../features/o-ring/ORingTool'
import { PipeThreadGuide } from '../features/pipe-thread/Guide'
import { PipeThreadTool } from '../features/pipe-thread/PipeThreadTool'
import { SteelPipeGuide } from '../features/steel-pipe/Guide'
import { SteelPipeTool } from '../features/steel-pipe/SteelPipeTool'
import { TapDrillGuide } from '../features/tap-drill/Guide'
import { TapDrillTool } from '../features/tap-drill/TapDrillTool'
import { ThreadIdGuide } from '../features/thread-id/Guide'
import { ThreadIdTool } from '../features/thread-id/ThreadIdTool'
import { UnitConvertGuide } from '../features/unit-convert/Guide'
import { UnitConvertTool } from '../features/unit-convert/UnitConvertTool'
import type { StandardCode } from '../standards'

export type ToolCategory = 'piping' | 'fastening' | 'sealing' | 'general'

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  piping: '配管',
  fastening: 'ねじ・締結',
  sealing: 'シール',
  general: '設計・換算',
}

export interface ToolDefinition {
  /** URLのパス（例: /tap-drill） */
  path: string
  /** ページ見出し・タイトルに使う正式名 */
  name: string
  /** ナビゲーション用の短い名前 */
  navLabel: string
  /** <title> 用（検索される言葉に合わせる）。無ければ name */
  seoTitle?: string
  /** 一覧・meta description 用の説明 */
  description: string
  category: ToolCategory
  /** 計算・データの根拠にしているJIS規格 */
  standards: readonly StandardCode[]
  icon: LucideIcon
  component: ComponentType
  /** ページ下部の「解説・よくある質問」 */
  guide?: ComponentType
}

/** 並び順がそのままナビゲーションとトップページの順になる */
export const TOOLS: readonly ToolDefinition[] = [
  {
    path: '/flange-bolt-length',
    seoTitle: 'JISフランジ寸法表（5K・10K・16K・20K）とボルト長さ計算',
    name: 'JISフランジ＆ボルト長さ',
    navLabel: 'フランジ・ボルト長',
    description:
      'JIS B 2220 鋼製管フランジの寸法（外径・PCD・ボルト穴・厚さ）と、ガスケット・ナット・座金から必要なボルト長さを計算します。',
    category: 'piping',
    standards: ['JIS B 2220', 'JIS B 1180', 'JIS B 1181', 'JIS B 1256', 'JIS B 0205-2'],
    icon: Disc3,
    component: FlangeBoltTool,
    guide: FlangeBoltGuide,
  },
  {
    path: '/steel-pipe',
    seoTitle: '鋼管寸法表 SGP・Sch40・Sch80（外径・厚さ・重量）',
    name: '鋼管の寸法・重量（SGP・Sch）',
    navLabel: '鋼管寸法・重量',
    description:
      'SGP（配管用炭素鋼鋼管）とSTPG（Sch40・Sch80）の外径・厚さ・内径・単位質量を一覧し、長さから重量を計算します。',
    category: 'piping',
    standards: ['JIS G 3452', 'JIS G 3454'],
    icon: Cylinder,
    component: SteelPipeTool,
    guide: SteelPipeGuide,
  },
  {
    path: '/pipe-thread',
    seoTitle: '管用ねじ寸法表と下穴径（R・Rc・Rp・G／PT・PF）',
    name: '管用ねじ（R・Rc・Rp・G）寸法と下穴径',
    navLabel: '管用ねじ',
    description:
      '管用テーパねじ（R・Rc・Rp）と管用平行ねじ（G）の基準径・山数・ピッチ、G の推奨下穴径と Rc の奥端内径（下穴の目安）を調べられます。旧JIS（PT・PS・PF）表記にも対応。',
    category: 'piping',
    standards: ['JIS B 0203', 'JIS B 0202'],
    icon: Wrench,
    component: PipeThreadTool,
    guide: PipeThreadGuide,
  },
  {
    path: '/tap-drill',
    seoTitle: 'ねじ下穴径 早見表と計算（M1〜M68 並目・細目）',
    name: 'ねじ下穴径（メートルねじ）',
    navLabel: 'ねじ下穴径',
    description:
      'メートル並目・細目ねじの下穴径を、めねじ内径の許容範囲（4H〜7H）とひっかかり率から求めます。手持ちドリルの適否も判定できます。',
    category: 'fastening',
    standards: ['JIS B 0205-2', 'JIS B 0205-4', 'JIS B 0209-1', 'JIS B 1004', 'ISO 2306'],
    icon: Drill,
    component: TapDrillTool,
    guide: TapDrillGuide,
  },
  {
    path: '/bolt-size',
    seoTitle: 'ボルト・ナット二面幅と座ぐり寸法表（M3〜M36）',
    name: 'ボルト・ナットの二面幅と座ぐり寸法',
    navLabel: '二面幅・座ぐり',
    description:
      '六角ボルト・ナットの二面幅（スパナサイズ）、六角穴付きボルトの六角レンチサイズ、ボルト穴径と座ぐり寸法をまとめて確認できます。',
    category: 'fastening',
    standards: ['JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'],
    icon: Nut,
    component: BoltSizeTool,
    guide: BoltSizeGuide,
  },
  {
    path: '/o-ring',
    seoTitle: 'Oリング寸法表と溝寸法（JIS B 2401 P・G）',
    name: 'Oリング・Oリング溝寸法',
    navLabel: 'Oリング・溝',
    description:
      'JIS B 2401 のOリング（P・G）寸法とハウジング（溝）寸法を呼び番号から求め、つぶし率・充てん率も計算します。',
    category: 'sealing',
    standards: ['JIS B 2401-1', 'JIS B 2401-2'],
    icon: Torus,
    component: ORingTool,
    guide: ORingGuide,
  },
  {
    path: '/thread-identify',
    seoTitle: 'ねじの種類を実測で判別（M・R・Rc・G／ノギスとピッチ）',
    name: 'ねじの判別（実測から）',
    navLabel: 'ねじ判別',
    description:
      'ノギスで測った径とピッチ（山数）から、メートルねじ・管用テーパねじ（R・Rc）・管用平行ねじ（G）のどれかを候補付きで判別します。',
    category: 'fastening',
    standards: ['JIS B 0205-2', 'JIS B 0203', 'JIS B 0202'],
    icon: ScanSearch,
    component: ThreadIdTool,
    guide: ThreadIdGuide,
  },
  {
    path: '/general-tolerance',
    seoTitle: '普通公差 JIS B 0405 早見表と計算（f・m・c・v）',
    name: '普通公差（JIS B 0405）',
    navLabel: '普通公差',
    description:
      '寸法を入れると、JIS B 0405 の普通公差（精級 f・中級 m・粗級 c・極粗級 v）の許容差と上下の寸法を求めます。面取り・角度の普通公差も確認できます。',
    category: 'general',
    standards: ['JIS B 0405'],
    icon: Ruler,
    component: GeneralToleranceTool,
    guide: GeneralToleranceGuide,
  },
  {
    path: '/unit-convert',
    seoTitle: '単位換算（圧力 MPa・kgf/cm²・bar・psi／トルク／力／インチ）',
    name: '単位換算（圧力・トルク・力・長さ）',
    navLabel: '単位換算',
    description:
      '圧力（MPa・kgf/cm²・bar・psi・kPa）、トルク（N·m・kgf·m・kgf·cm）、力（N・kgf）、長さ（mm・インチ）を、定義どおりの換算係数で一度に換算します。',
    category: 'general',
    standards: [],
    icon: ArrowLeftRight,
    component: UnitConvertTool,
    guide: UnitConvertGuide,
  },
]
