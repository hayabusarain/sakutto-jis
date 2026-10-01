import { ChevronRight } from 'lucide-react'
import { Link } from '../../router/Link'

/**
 * パンくずのリンク。見た目の文字は小さいまま、押せる範囲を上下に広げて高さ 40px にする
 * （上下は見出しまでの余白に収まる）
 */
export const CRUMB_LINK_CLASS =
  'relative inline-block hover:text-zinc-900 hover:underline after:absolute after:-inset-x-1 after:-inset-y-3'

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="パンくずリスト" className="text-xs text-zinc-600">
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/" className={CRUMB_LINK_CLASS}>
            ホーム
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="size-3" />
        </li>
        <li aria-current="page" className="truncate text-zinc-700">
          {current}
        </li>
      </ol>
    </nav>
  )
}
