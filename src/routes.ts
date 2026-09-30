import type { ComponentType } from 'react'
import { AboutPage } from './pages/AboutPage'
import { DisclaimerPage } from './pages/DisclaimerPage'
import { HomePage } from './pages/HomePage'
import { PrivacyPage } from './pages/PrivacyPage'
import { SITE, SITE_PAGES } from './site'
import { TOOLS, type ToolDefinition } from './tools/registry'

export interface PageDefinition {
  path: string
  /** <title> */
  title: string
  /** <meta name="description"> */
  description: string
  /** ツールのページなら、そのツール */
  tool?: ToolDefinition
  component?: ComponentType
}

const STATIC_COMPONENTS: Record<(typeof SITE_PAGES)[number]['path'], ComponentType> = {
  '/about': AboutPage,
  '/privacy': PrivacyPage,
  '/disclaimer': DisclaimerPage,
}

export const PAGES: readonly PageDefinition[] = [
  {
    path: '/',
    title: `${SITE.name} - ${SITE.tagline}`,
    description: SITE.description,
    component: HomePage,
  },
  ...TOOLS.map((tool) => ({
    path: tool.path,
    title: `${tool.seoTitle ?? tool.name}｜${SITE.name}`,
    description: tool.description,
    tool,
  })),
  ...SITE_PAGES.map((page) => ({
    path: page.path,
    title: `${page.label}｜${SITE.name}`,
    description: `${SITE.name}の${page.label}です。`,
    component: STATIC_COMPONENTS[page.path],
  })),
]

export const NOT_FOUND_PAGE = {
  title: `ページが見つかりません｜${SITE.name}`,
  description: SITE.description,
} as const

export function findPage(pathname: string): PageDefinition | undefined {
  return PAGES.find((page) => page.path === pathname)
}
