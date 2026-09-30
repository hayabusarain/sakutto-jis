import { Breadcrumb } from '../components/layout/Breadcrumb'
import { SourceNote } from '../components/SourceNote'
import { ShareButton } from '../components/ui/ShareButton'
import { standardLabel } from '../standards'
import { CATEGORY_LABELS, type ToolDefinition } from '../tools/registry'

export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const { component: ToolComponent, icon: Icon } = tool

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <Breadcrumb current={tool.navLabel} />
        <p className="mt-4 text-xs font-semibold tracking-wider text-orange-700">
          {CATEGORY_LABELS[tool.category]}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          <Icon className="size-7 shrink-0 text-zinc-400" aria-hidden />
          {tool.name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          {tool.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ul className="flex flex-wrap gap-1.5" aria-label="参照規格">
            {tool.standards.map((code) => (
              <li
                key={code}
                className="num rounded-sm border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
              >
                {standardLabel(code)}
              </li>
            ))}
          </ul>
          <div className="ml-auto">
            <ShareButton title={tool.name} />
          </div>
        </div>
      </div>

      <ToolComponent />

      <div className="mt-6">
        <SourceNote standards={tool.standards} />
      </div>
    </>
  )
}
