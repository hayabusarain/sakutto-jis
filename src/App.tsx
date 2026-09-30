import { BookOpen } from 'lucide-react'
import { AppFooter } from './components/layout/AppFooter'
import { AppHeader } from './components/layout/AppHeader'
import { ToolTabs } from './components/ToolTabs'
import { Badge } from './components/ui/Badge'
import { useActiveTool } from './hooks/useActiveTool'
import { panelDomId, tabDomId } from './tools/ids'
import { TOOLS } from './tools/registry'

export default function App() {
  const [activeId, setActiveId] = useActiveTool()
  const tool = TOOLS.find(({ id }) => id === activeId) ?? TOOLS[0]
  const { component: ToolComponent, icon: ToolIcon } = tool

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      {/* スクロールしてもタブを押せるよう、画面上部に固定する */}
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2">
          <ToolTabs tools={TOOLS} activeId={tool.id} onChange={setActiveId} />
        </div>
      </nav>

      <main
        id={panelDomId(tool.id)}
        role="tabpanel"
        aria-labelledby={tabDomId(tool.id)}
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 sm:pt-6"
      >
        <div className="mb-4 sm:mb-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">
            <ToolIcon className="size-6 shrink-0 text-blue-700" aria-hidden />
            {tool.label}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 sm:text-base">{tool.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tool.standards.map((standard) => (
              <Badge key={standard} tone="info">
                <BookOpen className="size-3.5" aria-hidden />
                {standard}
              </Badge>
            ))}
          </div>
        </div>

        <ToolComponent />
      </main>

      <AppFooter />
    </div>
  )
}
