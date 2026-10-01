import { TriangleAlert } from 'lucide-react'
import { PIPE_SPECS } from '../../features/steel-pipe/data'
import { SCREW_INDEX_META } from '../../pages/screws/screwPages'
import { FLANGE_TABLE_PAGES, ORING_TABLE_PAGES, PIPE_TABLE_PAGES } from '../../pages/tables/tablePages'
import { Link } from '../../router/Link'
import { SITE, SITE_PAGES } from '../../site'
import { CATEGORY_LABELS, TOOLS, type ToolCategory } from '../../tools/registry'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ToolCategory[]

/** 寸法表・まとめのページ（ツールとは別の、表を一覧で見るページ） */
const TABLE_LINKS = [
  ...FLANGE_TABLE_PAGES.map((page) => ({ path: page.path, label: `JISフランジ ${page.pressure}` })),
  ...PIPE_TABLE_PAGES.map((page) => ({ path: page.path, label: `鋼管 ${PIPE_SPECS[page.spec].label}` })),
  ...ORING_TABLE_PAGES.map((page) => ({ path: page.path, label: `Oリング ${page.series}` })),
  { path: SCREW_INDEX_META.path, label: 'ねじ M3〜M36' },
]

export function SiteFooter() {
  return (
    <footer className="mt-12 bg-zinc-900 text-zinc-400 print:hidden">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <p className="flex gap-2 rounded-md border border-zinc-700 p-3 text-xs leading-relaxed text-zinc-300">
          <TriangleAlert className="size-4 shrink-0 text-orange-500" aria-hidden />
          <span>
            計算結果・寸法は設計や作業の目安です。重要な用途では、必ず最新のJIS規格原本やメーカー資料で確認してください。
            <Link to="/disclaimer" className="ml-1 underline underline-offset-2 hover:text-white">
              免責事項
            </Link>
          </span>
        </p>

        <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <h2 className="text-xs font-semibold tracking-wider text-zinc-500">
                {CATEGORY_LABELS[category]}
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                {TOOLS.filter((tool) => tool.category === category).map((tool) => (
                  <li key={tool.path}>
                    <Link to={tool.path} className="hover:text-white">
                      {tool.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-zinc-500">寸法表</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {TABLE_LINKS.map((page) => (
                <li key={page.path}>
                  <Link to={page.path} className="hover:text-white">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-wider text-zinc-500">サイト情報</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {SITE_PAGES.map((page) => (
                <li key={page.path}>
                  <Link to={page.path} className="hover:text-white">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="num mt-8 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
          © {SITE.startYear} {SITE.name}
        </p>
      </div>
    </footer>
  )
}
