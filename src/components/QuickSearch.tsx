import { Search, X } from 'lucide-react'
import {
  useDeferredValue,
  useId,
  useMemo,
  useRef,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { matchTools, quickSearch, SEARCH_EXAMPLES } from '../lib/quickSearch'
import { TOOLS } from '../tools/registry'
import { SearchActionsContext, type SearchActions } from './search/context'
import { QueryChips } from './search/QueryChips'
import { SearchResults } from './search/SearchResults'

interface QuickSearchProps {
  query: string
  onQueryChange: (query: string) => void
  /** page: トップページに埋め込む / dialog: ヘッダーから開く検索画面（結果だけがスクロールする） */
  variant?: 'page' | 'dialog'
  /** 結果のリンクでツールへ移るとき */
  onNavigate?: () => void
}

const FOCUSABLE = 'a[href], button:not([disabled])'

/**
 * 呼び（M12・50A・P20・Rc1/2・10K 50A・二面幅17 など）を入れると、関連する寸法をまとめて表示する検索欄。
 * 計算は lib/quickSearch.ts の純粋関数。入力はすべて画面内で処理し、通信しない（オフラインでも使える）。
 */
export function QuickSearch({ query, onQueryChange, variant = 'page', onNavigate }: QuickSearchProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 入力のたびに表示が引っかからないよう、結果の計算は入力より少し遅れてよい
  const deferredQuery = useDeferredValue(query)
  const result = useMemo(() => quickSearch(deferredQuery), [deferredQuery])
  const tools = useMemo(
    () => (result.status === 'unknown' ? matchTools(deferredQuery, TOOLS) : []),
    [result.status, deferredQuery],
  )

  const focusables = () => Array.from(resultsRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

  // 候補などのボタンで検索し直したら、結果の先頭を見せる（キーボードは開かない）
  const actions = useMemo<SearchActions>(
    () => ({
      search: (next) => {
        onQueryChange(next)
        requestAnimationFrame(() => {
          const results = resultsRef.current
          if (!results) return
          results.focus({ preventScroll: true })
          if (variant === 'dialog') {
            results.scrollTop = 0
          } else if ((formRef.current?.getBoundingClientRect().top ?? 0) < 0) {
            formRef.current?.scrollIntoView({ block: 'start' })
          }
        })
      },
      navigate: () => onNavigate?.(),
    }),
    [onQueryChange, onNavigate, variant],
  )

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 日本語入力の変換確定の Enter では動かさない
    if (event.nativeEvent.isComposing || event.keyCode === 229) return
    if (event.key === 'ArrowDown') {
      const first = focusables()[0]
      if (first) {
        event.preventDefault()
        first.focus()
      }
    } else if (event.key === 'Escape' && query !== '' && variant === 'page') {
      event.preventDefault()
      onQueryChange('')
    }
  }

  // 結果の中は ↑↓ でリンク・ボタンを順に移れる（先頭で ↑ なら入力欄へ戻る）
  const onResultsKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = focusables()
    const index = items.indexOf(document.activeElement as HTMLElement)
    if (index < 0 && document.activeElement !== resultsRef.current) return
    event.preventDefault()
    if (event.key === 'ArrowDown') items[Math.min(index + 1, items.length - 1)]?.focus()
    else if (index <= 0) inputRef.current?.focus()
    else items[index - 1]?.focus()
  }

  // Enter（スマホの「検索」）では画面を移らず、キーボードを閉じて結果を見せる
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (result.status === 'empty') return
    resultsRef.current?.focus({ preventScroll: variant === 'dialog' })
  }

  const statusText =
    result.status === 'found'
      ? `${result.cards.map((card) => card.title).join('、')} の寸法を表示しています`
      : result.status === 'invalid'
        ? result.messages[0]
        : result.status === 'unknown'
          ? tools.length > 0
            ? `ツールが ${tools.length} 件見つかりました`
            : '当てはまる呼びが見つかりませんでした'
          : ''

  const isDialog = variant === 'dialog'

  return (
    <SearchActionsContext.Provider value={actions}>
      <div className={isDialog ? 'flex min-h-0 flex-1 flex-col' : ''}>
        <form
          ref={formRef}
          role="search"
          aria-label="呼びで検索"
          onSubmit={onSubmit}
          className={isDialog ? 'shrink-0 border-b border-zinc-200 bg-white px-3 py-3 sm:px-4' : 'scroll-mt-16'}
        >
          <label htmlFor={id} className={isDialog ? 'sr-only' : 'mb-1.5 block text-sm font-bold text-zinc-800'}>
            呼びで検索
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-zinc-400"
              aria-hidden
            />
            <input
              ref={inputRef}
              id={id}
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="M12・50A・P20 など"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-describedby={hintId}
              aria-controls={`${id}-results`}
              className={`num w-full rounded-md border-2 border-zinc-900 bg-white pr-12 pl-10 text-zinc-900 placeholder:font-sans placeholder:text-zinc-400 focus:border-orange-600 focus:outline-2 focus:outline-orange-500/30 ${
                isDialog ? 'h-12 text-lg' : 'h-14 text-xl'
              }`}
            />
            {query !== '' && (
              <button
                type="button"
                onClick={() => {
                  onQueryChange('')
                  inputRef.current?.focus()
                }}
                className="absolute inset-y-0 right-1 my-auto flex size-10 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="入力を消す"
              >
                <X className="size-5" aria-hidden />
              </button>
            )}
          </div>
          <p id={hintId} className={isDialog ? 'sr-only' : 'mt-1.5 text-xs leading-relaxed text-zinc-500'}>
            ねじ・管・Oリング・フランジの呼びから、下穴・二面幅・外径・溝などをまとめて表示します。全角・小文字でも大丈夫です。
          </p>
          {query.trim() === '' && (
            <QueryChips
              label="例"
              queries={SEARCH_EXAMPLES}
              onSelect={actions.search}
              className="mt-2"
            />
          )}
        </form>

        <p role="status" className="sr-only">
          {statusText}
        </p>

        <div
          ref={resultsRef}
          id={`${id}-results`}
          tabIndex={-1}
          role="region"
          aria-label="検索結果"
          onKeyDown={onResultsKeyDown}
          className={
            isDialog
              ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 outline-none sm:px-4'
              : 'scroll-mt-16 outline-none empty:hidden [&:not(:empty)]:mt-4'
          }
        >
          <SearchResults query={deferredQuery} result={result} tools={tools} />
          {isDialog && result.status === 'empty' && (
            <p className="hidden px-1 text-xs leading-relaxed text-zinc-500 pointer-fine:block">
              <kbd className="num rounded-xs border border-zinc-300 bg-white px-1">↓</kbd> で結果のリンクへ、
              <kbd className="num rounded-xs border border-zinc-300 bg-white px-1">Esc</kbd> で閉じます。
            </p>
          )}
        </div>
      </div>
    </SearchActionsContext.Provider>
  )
}
