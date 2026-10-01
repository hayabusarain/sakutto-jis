import { ArrowRight, SearchX, TriangleAlert } from 'lucide-react'
import { SEARCH_EXAMPLES, type QuickSearchResult } from '../../lib/quickSearch'
import type { ToolDefinition } from '../../tools/registry'
import { QueryChips } from './QueryChips'
import { SearchLink } from './SearchLink'
import { SummaryCardView } from './SummaryCardView'

interface SearchResultsProps {
  /** 入力したままの文字（メッセージに出す） */
  query: string
  result: QuickSearchResult
  /** 呼びとして読めなかったときに、言葉で見つかったツール */
  tools: readonly ToolDefinition[]
}

export function SearchResults({ query, result, tools }: SearchResultsProps) {
  if (result.status === 'empty') return null

  return (
    <div className="space-y-3">
      {result.messages.length > 0 && (
        <div
          className={`rounded-md border px-4 py-3 text-sm leading-relaxed ${
            result.status === 'found'
              ? 'border-zinc-200 bg-white text-zinc-700'
              : 'border-amber-300 bg-amber-50 text-amber-950'
          }`}
        >
          {result.messages.map((message) => (
            <p key={message} className="flex gap-2">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <span>{message}</span>
            </p>
          ))}
          <QueryChips label="候補" queries={result.suggestions} className="mt-2" />
        </div>
      )}

      {result.cards.map((card) => (
        <SummaryCardView key={card.key} card={card} />
      ))}

      {result.status === 'found' && (
        <p className="px-1 text-[11px] leading-relaxed text-zinc-500">
          値は各ツールと同じ規格データ・計算式で求めています。条件を変えたいときや計算式を確かめたいときは、各欄のボタンでツールを開いてください。
        </p>
      )}

      {result.status === 'unknown' && (
        <div className="rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-700">
          {tools.length > 0 ? (
            <>
              <p className="text-xs font-bold tracking-wider text-zinc-500">この言葉を含むツール</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {tools.map((tool) => {
                  const Icon = tool.icon
                  return (
                    <li key={tool.path}>
                      <SearchLink
                        href={tool.path}
                        className="flex min-h-11 items-center gap-2 rounded-sm border border-zinc-200 px-3 py-2 font-semibold text-zinc-900 hover:border-zinc-900"
                      >
                        <Icon className="size-4 shrink-0 text-zinc-500" aria-hidden />
                        <span className="flex-1">{tool.name}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-orange-600" aria-hidden />
                      </SearchLink>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <>
              <p className="flex gap-2">
                <SearchX className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <span>
                  「{query.trim()}」に当てはまる呼びが見つかりませんでした。次のような形で入力してください。
                </span>
              </p>
              <QueryChips label="例" queries={SEARCH_EXAMPLES} className="mt-2" />
            </>
          )}
        </div>
      )}
    </div>
  )
}
