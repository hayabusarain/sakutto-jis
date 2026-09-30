import { useRef, type KeyboardEvent } from 'react'
import { panelDomId, tabDomId, type ToolId } from '../tools/ids'
import type { ToolDefinition } from '../tools/registry'

interface ToolTabsProps {
  tools: readonly ToolDefinition[]
  activeId: ToolId
  onChange: (id: ToolId) => void
}

/** ツール切替タブ。スマホではアイコンを上に置いて幅を節約し、ツールが増えたら横スクロール。 */
export function ToolTabs({ tools, activeId, onChange }: ToolTabsProps) {
  const tabRefs = useRef(new Map<ToolId, HTMLButtonElement>())

  // WAI-ARIA のタブ操作：矢印キー / Home / End で移動
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tools.findIndex((tool) => tool.id === activeId)
    const nextIndex = {
      ArrowRight: (index + 1) % tools.length,
      ArrowLeft: (index - 1 + tools.length) % tools.length,
      Home: 0,
      End: tools.length - 1,
    }[event.key]
    if (nextIndex === undefined) return

    event.preventDefault()
    const next = tools[nextIndex]
    onChange(next.id)
    tabRefs.current.get(next.id)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="計算ツール"
      onKeyDown={handleKeyDown}
      className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1"
    >
      {tools.map(({ id, label, icon: Icon }) => {
        const selected = id === activeId
        return (
          <button
            key={id}
            ref={(el) => {
              if (el) tabRefs.current.set(id, el)
              else tabRefs.current.delete(id)
            }}
            id={tabDomId(id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelDomId(id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`flex min-h-12 min-w-36 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:flex-row sm:gap-2 sm:px-3 sm:text-base ${
              selected
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap leading-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
