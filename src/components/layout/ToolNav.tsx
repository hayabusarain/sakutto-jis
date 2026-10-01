import { useEffect, useRef } from 'react'
import { useRouter } from '../../router/context'
import { Link } from '../../router/Link'
import { TOOLS } from '../../tools/registry'

/** 全ページ共通のツール切替バー。スクロールしても上部に残る */
export function ToolNav() {
  const { pathname } = useRouter()
  const listRef = useRef<HTMLUListElement>(null)
  const activeRef = useRef<HTMLAnchorElement>(null)

  // スマホで選択中のツールが見切れないよう、バーの横スクロール位置だけを合わせる。
  // 文字の大きさや画面の幅が変わってタブの幅が変わったときも、合わせ直す
  useEffect(() => {
    const list = listRef.current
    const active = activeRef.current
    if (!list || !active) return
    const center = () => {
      list.scrollLeft = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2
    }
    center()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(center)
    observer.observe(list)
    observer.observe(active)
    return () => observer.disconnect()
  }, [pathname])

  return (
    <nav
      aria-label="計算ツール"
      className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden"
    >
      {/* スマホで横にスクロールできることが分かるよう、右端を少しぼかす */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-white to-transparent lg:hidden"
        aria-hidden
      />
      <ul
        ref={listRef}
        className="no-scrollbar relative mx-auto flex max-w-5xl overflow-x-auto px-2 pr-8 sm:pl-4 lg:pr-4"
      >
        {TOOLS.map(({ path, navLabel, icon: Icon }) => {
          // 寸法表のページ（/flange-bolt-length/10k など）も、そのツールを選択中として表示する
          const active = pathname === path || pathname.startsWith(`${path}/`)
          return (
            <li key={path} className="shrink-0">
              <Link
                to={path}
                ref={active ? activeRef : undefined}
                aria-current={active ? 'page' : undefined}
                className={`flex h-12 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-orange-600 text-zinc-900'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {navLabel}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
