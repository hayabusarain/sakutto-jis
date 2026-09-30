/** サイトで提供するツールのID。URLハッシュ（例: #tap-drill）にも使う。 */
export const TOOL_IDS = ['flange-bolt', 'tap-drill'] as const

export type ToolId = (typeof TOOL_IDS)[number]

export const DEFAULT_TOOL_ID: ToolId = 'flange-bolt'

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value)
}

/** `#tap-drill` や `#/tap-drill` からツールIDを取り出す。不明な値は既定のツールにする。 */
export function resolveToolId(hash: string): ToolId {
  const id = hash.replace(/^#\/?/, '')
  return isToolId(id) ? id : DEFAULT_TOOL_ID
}

/** タブとパネルを aria 属性で結びつけるための DOM id */
export const tabDomId = (id: ToolId) => `tab-${id}`
export const panelDomId = (id: ToolId) => `panel-${id}`
