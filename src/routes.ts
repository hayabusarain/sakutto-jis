import { createElement, type ComponentType } from 'react'
import type { Crumb, PageKind } from './lib/structuredData'
import { AboutPage } from './pages/AboutPage'
import { DisclaimerPage } from './pages/DisclaimerPage'
import { EditorialPolicyPage } from './pages/EditorialPolicyPage'
import { HomePage } from './pages/HomePage'
import { FlangeSheetPage } from './pages/print/FlangeSheetPage'
import { PipeSheetPage } from './pages/print/PipeSheetPage'
import { PrintIndexPage } from './pages/print/PrintIndexPage'
import { PRINT_INDEX_META, PRINT_SHEETS, type SheetKey } from './pages/print/printPages'
import { ScrewSheetPage } from './pages/print/ScrewSheetPage'
import { PrivacyPage } from './pages/PrivacyPage'
import { ScrewIndexPage } from './pages/screws/ScrewIndexPage'
import { ScrewPage } from './pages/screws/ScrewPage'
import { SCREW_INDEX_META, SCREW_PAGES } from './pages/screws/screwPages'
import { FlangeTablePage } from './pages/tables/FlangeTablePage'
import { ORingTablePage } from './pages/tables/ORingTablePage'
import { PipeTablePage } from './pages/tables/PipeTablePage'
import {
  FLANGE_TABLE_PAGES,
  HOME_CRUMB,
  ORING_TABLE_PAGES,
  PIPE_TABLE_PAGES,
  type ContentPageMeta,
} from './pages/tables/tablePages'
import { PAGE_UPDATED_AT, SITE, SITE_PAGES } from './site'
import type { StandardCode } from './standards'
import { TOOLS, type ToolDefinition } from './tools/registry'

export interface PageDefinition {
  path: string
  /** <title> */
  title: string
  /** <meta name="description"> */
  description: string
  /** ページの名前（見出し。構造化データに使う） */
  name: string
  /** 構造化データの種類 */
  kind: PageKind
  /** ホームからこのページまでのパンくず（構造化データに使う） */
  breadcrumb: readonly Crumb[]
  /** 最終更新日（YYYY-MM-DD）。sitemap.xml の lastmod */
  updatedAt: string
  /** 典拠の規格 */
  standards: readonly StandardCode[]
  /** 広告のスクリプトを読み込むか（運営者情報・規約のページでは読み込まない） */
  ads: boolean
  /** ツールのページなら、そのツール */
  tool?: ToolDefinition
  component?: ComponentType
}

const updatedAt = (path: string) => PAGE_UPDATED_AT[path] ?? SITE.contentUpdatedAt

const STATIC_COMPONENTS: Record<(typeof SITE_PAGES)[number]['path'], ComponentType> = {
  '/about': AboutPage,
  '/editorial-policy': EditorialPolicyPage,
  '/privacy': PrivacyPage,
  '/disclaimer': DisclaimerPage,
}

const STATIC_DESCRIPTIONS: Partial<Record<(typeof SITE_PAGES)[number]['path'], string>> = {
  '/editorial-policy': `${SITE.name}の編集方針です。JIS規格の数値の作り方・確かめ方、確度の目安、確認を進めている項目、誤りを見つけたときの訂正の方針をまとめています。`,
}

/** 決まった値を渡して描画するページ（/flange-bolt-length/10k など） */
function bind<P extends object>(Component: ComponentType<P>, props: P, name: string): ComponentType {
  const Bound = () => createElement(Component, props)
  Bound.displayName = name
  return Bound
}

/** 印刷用の早見表（/print/screw など）の画面 */
const SHEET_COMPONENTS: Record<SheetKey, ComponentType> = {
  screw: ScrewSheetPage,
  'flange-10k': bind(FlangeSheetPage, { sheet: 'flange-10k' }, 'FlangeSheetPage(10K)'),
  flange: bind(FlangeSheetPage, { sheet: 'flange' }, 'FlangeSheetPage(5K-20K)'),
  pipe: PipeSheetPage,
}

function contentPage(meta: ContentPageMeta, component: ComponentType): PageDefinition {
  return {
    path: meta.path,
    title: `${meta.title}｜${SITE.name}`,
    description: meta.description,
    name: meta.h1,
    kind: 'page',
    breadcrumb: meta.breadcrumb,
    updatedAt: updatedAt(meta.path),
    standards: meta.standards,
    ads: true,
    component,
  }
}

export const PAGES: readonly PageDefinition[] = [
  {
    path: '/',
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    name: SITE.name,
    kind: 'home',
    breadcrumb: [HOME_CRUMB],
    updatedAt: updatedAt('/'),
    standards: [],
    ads: true,
    component: HomePage,
  },
  ...TOOLS.map(
    (tool): PageDefinition => ({
      path: tool.path,
      title: `${tool.seoTitle ?? tool.name}｜${SITE.name}`,
      description: tool.description,
      name: tool.name,
      kind: 'tool',
      breadcrumb: [HOME_CRUMB, { label: tool.navLabel, path: tool.path }],
      updatedAt: updatedAt(tool.path),
      standards: tool.standards,
      ads: true,
      tool,
    }),
  ),
  ...FLANGE_TABLE_PAGES.map((meta) =>
    contentPage(meta, bind(FlangeTablePage, { pressure: meta.pressure }, `FlangeTablePage(${meta.pressure})`)),
  ),
  ...PIPE_TABLE_PAGES.map((meta) =>
    contentPage(meta, bind(PipeTablePage, { spec: meta.spec }, `PipeTablePage(${meta.spec})`)),
  ),
  ...ORING_TABLE_PAGES.map((meta) =>
    contentPage(meta, bind(ORingTablePage, { series: meta.series }, `ORingTablePage(${meta.series})`)),
  ),
  contentPage(SCREW_INDEX_META, ScrewIndexPage),
  ...SCREW_PAGES.map((meta) => contentPage(meta, bind(ScrewPage, { d: meta.d }, `ScrewPage(M${meta.d})`))),
  contentPage(PRINT_INDEX_META, PrintIndexPage),
  ...PRINT_SHEETS.map((meta) => contentPage(meta, SHEET_COMPONENTS[meta.key])),
  ...SITE_PAGES.map(
    (page): PageDefinition => ({
      path: page.path,
      title: `${page.label}｜${SITE.name}`,
      description: STATIC_DESCRIPTIONS[page.path] ?? `${SITE.name}の${page.label}です。`,
      name: page.label,
      kind: 'page',
      breadcrumb: [HOME_CRUMB, { label: page.label, path: page.path }],
      updatedAt: updatedAt(page.path),
      standards: [],
      ads: false,
      component: STATIC_COMPONENTS[page.path],
    }),
  ),
]

export const NOT_FOUND_PAGE = {
  title: `ページが見つかりません｜${SITE.name}`,
  description: SITE.description,
} as const

const PAGE_BY_PATH = new Map(PAGES.map((page) => [page.path, page]))

export function findPage(pathname: string): PageDefinition | undefined {
  return PAGE_BY_PATH.get(pathname)
}
