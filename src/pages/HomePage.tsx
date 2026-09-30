import { ArrowRight, BookOpen, Calculator, MessageSquareWarning, Smartphone } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { QuickSearch } from '../components/QuickSearch'
import { Link } from '../router/Link'
import { SITE } from '../site'
import { standardLabel } from '../standards'
import { CATEGORY_LABELS, TOOLS, type ToolCategory } from '../tools/registry'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ToolCategory[]

const FEATURES = [
  {
    icon: BookOpen,
    title: '典拠のJISを明記',
    text: '数値の横に、根拠にした規格番号と年版を表示しています。',
  },
  {
    icon: Calculator,
    title: '計算ロジックを公開',
    text: '「計算ロジック」を開くと、式と条件をそのまま確認できます。',
  },
  {
    icon: Smartphone,
    title: 'スマホで・オフラインでも',
    text: '登録不要・無料。一度開けば電波の届かない現場でも使え、前回の入力も覚えます。ホーム画面に追加するとアプリのように起動できます。',
  },
  {
    icon: MessageSquareWarning,
    title: '誤記報告を受付',
    text: '数値の不備に気づいたら、すぐに修正できる体制をとっています。',
  },
]

const subscribeNothing = () => () => {}
const readQueryFromUrl = () => new URLSearchParams(window.location.search).get('q') ?? ''

/**
 * トップページの検索欄。入力は URL の ?q= にも残す（ツールへ移ってから「戻る」で結果に戻れる・共有できる）。
 * 事前レンダリングと食い違わないよう、URL の値は useSyncExternalStore で表示後に読む。
 */
function HomeSearch() {
  const fromUrl = useSyncExternalStore(subscribeNothing, readQueryFromUrl, () => '')
  // 入力するまでは URL の値を使う
  const [edited, setEdited] = useState<string | null>(null)
  const query = edited ?? fromUrl

  useEffect(() => {
    if (edited === null) return
    const url = new URL(window.location.href)
    if (url.pathname !== '/') return
    const q = edited.trim()
    if (q) url.searchParams.set('q', q)
    else url.searchParams.delete('q')
    const next = `${url.pathname}${url.search}${url.hash}`
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    try {
      window.history.replaceState(window.history.state, '', next)
    } catch {
      // 短時間に書き換えすぎたときなど。検索自体には影響しない
    }
  }, [edited])

  return <QuickSearch query={query} onQueryChange={setEdited} />
}

export function HomePage() {
  return (
    <>
      <section className="border-b border-zinc-300 pb-8">
        <p className="num text-xs tracking-[0.2em] text-orange-700">JIS CALC TOOLS</p>
        <h1 className="mt-2 text-3xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-4xl">
          現場で使うJISを、
          <br className="sm:hidden" />
          サクッと。
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          {SITE.description}
        </p>
        <div className="mt-6 print:hidden">
          <HomeSearch />
        </div>
      </section>

      {CATEGORIES.map((category) => (
        <section key={category} className="mt-8" aria-labelledby={`category-${category}`}>
          <h2
            id={`category-${category}`}
            className="flex items-center gap-3 text-sm font-bold tracking-wider text-zinc-500"
          >
            {CATEGORY_LABELS[category]}
            <span className="h-px flex-1 bg-zinc-300" aria-hidden />
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((tool) => tool.category === category).map((tool) => {
              const Icon = tool.icon
              return (
                <li key={tool.path}>
                  <Link
                    to={tool.path}
                    className="group flex h-full flex-col rounded-md border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-900"
                  >
                    <span className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-zinc-900 text-white">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="flex-1 font-bold leading-snug text-zinc-900">
                        {tool.name}
                      </span>
                      <ArrowRight
                        className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-2 text-xs leading-relaxed text-zinc-600">
                      {tool.description}
                    </span>
                    <span className="num mt-auto pt-3 text-[11px] text-zinc-500">
                      {tool.standards.map(standardLabel).join(' / ')}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      <section className="mt-10" aria-labelledby="features">
        <h2
          id="features"
          className="flex items-center gap-3 text-sm font-bold tracking-wider text-zinc-500"
        >
          安心して使っていただくために
          <span className="h-px flex-1 bg-zinc-300" aria-hidden />
        </h2>
        <ul className="mt-3 grid gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3 bg-white p-4">
              <Icon className="mt-0.5 size-5 shrink-0 text-orange-600" aria-hidden />
              <span>
                <span className="block text-sm font-bold text-zinc-900">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-600">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
