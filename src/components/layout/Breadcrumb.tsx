import { ChevronRight } from 'lucide-react'
import { Link } from '../../router/Link'

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="パンくずリスト" className="text-xs text-zinc-600">
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/" className="hover:text-zinc-900 hover:underline">
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
