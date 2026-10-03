/**
 * 寸法表ページ（フランジの呼び圧力別・鋼管の規格別・Oリングの系列別）のパス・題名・説明文。
 * ツールの画面は既定の条件の表しか静的HTMLに入らないため、表ごとに検索から直接たどれるページを作る。
 */
import { oRingNumbers } from '../../features/o-ring/calc'
import { HOUSING_TABLES, RING_TABLES, type ORingSeries } from '../../features/o-ring/data'
import { FLANGE_TABLE_NO, FLANGES, PRESSURE_CLASSES, type PressureClass } from '../../features/flange-bolt/data'
import { sizesOf } from '../../features/steel-pipe/calc'
import { PIPE_SPECS, PIPE_STANDARD_TABLE, type PipeSpec } from '../../features/steel-pipe/data'
import type { Crumb } from '../../lib/structuredData'
import type { StandardCode } from '../../standards'
import { CATEGORY_LABELS, TOOLS } from '../../tools/registry'

export interface ContentPageMeta {
  path: string
  /** <title>（サイト名を除く） */
  title: string
  /** ページの見出し（h1） */
  h1: string
  /** meta description */
  description: string
  /** リンク・パンくずに使う短い名前 */
  label: string
  /** 見出しの上に出す分類 */
  category: string
  /** ホームからこのページまで */
  breadcrumb: readonly Crumb[]
  standards: readonly StandardCode[]
}

export const HOME_CRUMB: Crumb = { label: 'ホーム', path: '/' }

export const FLANGE_TOOL_PATH = '/flange-bolt-length'
export const PIPE_TOOL_PATH = '/steel-pipe'
export const ORING_TOOL_PATH = '/o-ring'

/** ツールのパンくず（ツールの登録名を使う） */
export function toolCrumb(path: string): Crumb {
  const tool = TOOLS.find((t) => t.path === path)
  return { label: tool?.navLabel ?? path, path }
}

function toolCategory(path: string): string {
  const tool = TOOLS.find((t) => t.path === path)
  return tool ? CATEGORY_LABELS[tool.category] : ''
}

const range = (list: readonly string[]) => `${list[0]}〜${list[list.length - 1]}`

export interface FlangeTablePageMeta extends ContentPageMeta {
  pressure: PressureClass
}

export const FLANGE_TABLE_PAGES: readonly FlangeTablePageMeta[] = PRESSURE_CLASSES.map((pressure) => {
  const path = `${FLANGE_TOOL_PATH}/${pressure.toLowerCase()}`
  const label = `${pressure} 寸法表`
  const sizes = range(FLANGES[pressure].map((row) => row.size))
  return {
    pressure,
    path,
    title: `JIS ${pressure} フランジ寸法表（外径・PCD・ボルト穴・厚さ・ボルト長さ）`,
    h1: `JIS ${pressure} フランジ寸法表`,
    description: `JIS B 2220 鋼製管フランジ ${pressure}（${FLANGE_TABLE_NO[pressure]}）の${sizes}について、外径・PCD（ボルト穴中心円の径）・ボルト穴の数と径・ボルトの呼び・厚さを一覧にしました。六角ボルト・スタッドボルトの長さの目安も載せています。`,
    label,
    category: toolCategory(FLANGE_TOOL_PATH),
    breadcrumb: [HOME_CRUMB, toolCrumb(FLANGE_TOOL_PATH), { label, path }],
    standards: ['JIS B 2220', 'JIS B 1181', 'JIS B 0205-2'],
  }
})

export interface PipeTablePageMeta extends ContentPageMeta {
  spec: PipeSpec
}

const PIPE_TEXT: Record<PipeSpec, { title: string; h1: string; kind: string }> = {
  sgp: {
    title: 'SGP 鋼管寸法表（外径・厚さ・内径・重量 kg/m）',
    h1: 'SGP 鋼管寸法表（配管用炭素鋼鋼管）',
    kind: '配管用炭素鋼鋼管（SGP）',
  },
  sch40: {
    title: 'Sch40 鋼管寸法表（STPG・外径・厚さ・内径・重量 kg/m）',
    h1: 'Sch40 鋼管寸法表（圧力配管用炭素鋼鋼管 STPG）',
    kind: '圧力配管用炭素鋼鋼管（STPG）のスケジュール40',
  },
  sch80: {
    title: 'Sch80 鋼管寸法表（STPG・外径・厚さ・内径・重量 kg/m）',
    h1: 'Sch80 鋼管寸法表（圧力配管用炭素鋼鋼管 STPG）',
    kind: '圧力配管用炭素鋼鋼管（STPG）のスケジュール80',
  },
}

export const PIPE_TABLE_PAGES: readonly PipeTablePageMeta[] = (Object.keys(PIPE_SPECS) as PipeSpec[]).map(
  (spec) => {
    const path = `${PIPE_TOOL_PATH}/${spec}`
    const label = `${PIPE_SPECS[spec].label} 寸法表`
    const sizes = sizesOf(spec).map((size) => size.a)
    const text = PIPE_TEXT[spec]
    return {
      spec,
      path,
      title: text.title,
      h1: text.h1,
      description: `${PIPE_SPECS[spec].standard}（${PIPE_STANDARD_TABLE[PIPE_SPECS[spec].standard].no}）${text.kind}の${range(sizes)}（${sizes.length}サイズ）について、外径・厚さ・内径・単位質量（kg/m）・内容積を一覧にしました。A呼び・B呼び（インチ）の両方で探せます。`,
      label,
      category: toolCategory(PIPE_TOOL_PATH),
      breadcrumb: [HOME_CRUMB, toolCrumb(PIPE_TOOL_PATH), { label, path }],
      standards: [PIPE_SPECS[spec].standard],
    }
  },
)

export interface ORingTablePageMeta extends ContentPageMeta {
  series: ORingSeries
}

const ORING_USE: Record<ORingSeries, string> = { P: '運動用・固定用', G: '固定用' }

export const ORING_TABLE_PAGES: readonly ORingTablePageMeta[] = (['P', 'G'] as const).map((series) => {
  const path = `${ORING_TOOL_PATH}/${series.toLowerCase()}`
  const label = `${series} 寸法表`
  const numbers = oRingNumbers(series)
  return {
    series,
    path,
    title: `Oリング ${series} 寸法表と溝寸法（JIS B 2401・${range(numbers)}）`,
    h1: `Oリング ${series} 系列の寸法表と溝寸法`,
    description: `JIS B 2401-1（${RING_TABLES[series].no}）のOリング ${series} 系列（${ORING_USE[series]}）${range(numbers)}の${numbers.length}サイズについて、内径・太さと、JIS B 2401-2（${HOUSING_TABLES.cylinder.no}・${HOUSING_TABLES.flat.no}）の円筒面の溝（d・D・溝幅）・平面の溝の寸法を一覧にしました。`,
    label,
    category: toolCategory(ORING_TOOL_PATH),
    breadcrumb: [HOME_CRUMB, toolCrumb(ORING_TOOL_PATH), { label, path }],
    standards: ['JIS B 2401-1', 'JIS B 2401-2'],
  }
})

/** ツールのページから案内する寸法表 */
export function tablePagesOf(toolPath: string): readonly ContentPageMeta[] {
  if (toolPath === FLANGE_TOOL_PATH) return FLANGE_TABLE_PAGES
  if (toolPath === PIPE_TOOL_PATH) return PIPE_TABLE_PAGES
  if (toolPath === ORING_TOOL_PATH) return ORING_TABLE_PAGES
  return []
}
