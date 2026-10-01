import { Breadcrumb } from '../components/layout/Breadcrumb'
import { SourceNote } from '../components/SourceNote'
import { ShareButton } from '../components/ui/ShareButton'
import { Link } from '../router/Link'
import { standardLabel } from '../standards'
import { CATEGORY_LABELS, type ToolDefinition } from '../tools/registry'
import { ChipNav, type ChipLink } from './content/PageHeader'
import { SCREW_INDEX_META, SCREW_PAGES } from './screws/screwPages'
import { tablePagesOf } from './tables/tablePages'

/** ツールのページから案内する、静的な寸法表・まとめのページ */
function relatedPages(toolPath: string): { title: string; links: ChipLink[] } | null {
  const tables = tablePagesOf(toolPath)
  if (tables.length > 0) {
    return { title: '寸法表を一覧で見る', links: tables.map((page) => ({ to: page.path, label: page.label })) }
  }
  if (toolPath === '/tap-drill' || toolPath === '/bolt-size') {
    return {
      title: 'ねじのサイズ別まとめ（下穴・二面幅・ボルト穴・座ぐり）',
      links: [
        ...SCREW_PAGES.map((page) => ({ to: page.path, label: page.label })),
        { to: SCREW_INDEX_META.path, label: '一覧表' },
      ],
    }
  }
  return null
}

export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const { component: ToolComponent, guide: Guide, icon: Icon } = tool
  const related = relatedPages(tool.path)

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

      {related && (
        <section className="mt-6 print:hidden" aria-labelledby="related-pages">
          <h2 id="related-pages" className="text-xs font-bold tracking-wider text-zinc-600">
            {related.title}
          </h2>
          <ChipNav label={related.title} className="mt-2" links={related.links} />
        </section>
      )}

      {Guide && (
        <div className="mt-6">
          <Guide />
        </div>
      )}

      <div className="mt-6">
        <SourceNote standards={tool.standards} />
        <p className="mt-2 text-xs text-zinc-600">
          数値の作り方と確認の状況は
          <Link to="/editorial-policy" className="mx-0.5 font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900">
            編集方針・データの確認方法
          </Link>
          にまとめています。
        </p>
      </div>
    </>
  )
}
