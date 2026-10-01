import { useSearchActions } from './context'

interface QueryChipsProps {
  /** 前に付ける短い見出し（例: 「例」「候補」） */
  label: string
  queries: readonly string[]
  /** 押したときの処理（省略時は、その呼びで検索し直す） */
  onSelect?: (query: string) => void
  className?: string
}

/** 呼びのボタンを並べる（入力例・候補・関連） */
export function QueryChips({ label, queries, onSelect, className = '' }: QueryChipsProps) {
  const { search } = useSearchActions()
  if (queries.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label={label}>
      <span className="mr-0.5 text-xs font-semibold text-zinc-500" aria-hidden>
        {label}
      </span>
      {queries.map((query) => (
        <button
          key={query}
          type="button"
          onClick={() => (onSelect ?? search)(query)}
          aria-label={`「${query}」で検索`}
          className="num h-10 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-semibold whitespace-nowrap text-zinc-800 hover:border-zinc-900 focus-visible:outline-2 focus-visible:outline-orange-500"
        >
          {query}
        </button>
      ))}
    </div>
  )
}
