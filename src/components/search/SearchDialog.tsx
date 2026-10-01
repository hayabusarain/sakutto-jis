import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from '../../router/context'
import { QuickSearch } from '../QuickSearch'

/**
 * ヘッダーの「検索」ボタンと、押すと開く検索画面（ネイティブの <dialog> をモーダルで使う）。
 * モーダル表示中は背後の画面が操作できず、Tab も画面内にとどまる。Esc・閉じるボタン・背景のタップで閉じ、
 * 閉じたら「検索」ボタンにフォーカスを戻す。キーボードでは「/」か Ctrl+K（⌘K）で開く。
 * 事前レンダリングでは閉じた <dialog> だけを出し、中身は開いたときに描画する。
 */
export function SearchDialog() {
  const { pathname } = useRouter()
  // 開いたときのページ。ページが変わったら（戻る操作など）自動的に閉じた扱いにする
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const [query, setQuery] = useState('')

  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  /** 閉じたあと「検索」ボタンにフォーカスを戻すか（ツールへ移るときは戻さない） */
  const returnFocus = useRef(true)
  const titleId = useId()

  const show = useCallback(() => setOpenedAt(pathname), [pathname])
  const close = useCallback((restore: boolean) => {
    returnFocus.current = restore
    dialogRef.current?.close()
  }, [])

  // 「/」（入力欄の外で）か Ctrl+K・⌘K で開く
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return
      const target = event.target instanceof HTMLElement ? event.target : null
      const typing = target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')
      const modifierK =
        event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
      const slash = event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey
      if (modifierK || slash) {
        event.preventDefault()
        show()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [show])

  // 状態に合わせて <dialog> を開け閉めする
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = true
      dialog.showModal()
      const input = dialog.querySelector('input')
      input?.focus()
      input?.select()
    } else if (!open && dialog.open) {
      // ページが変わったので閉じる（フォーカスは新しいページの本文へ）
      close(false)
    }
  }, [open, close])

  // 開いている間は、背後のページがスクロールしないようにする
  useEffect(() => {
    if (!open) return
    const { style } = document.documentElement
    const previous = style.overflow
    style.overflow = 'hidden'
    return () => {
      style.overflow = previous
    }
  }, [open])

  const onClose = () => {
    setOpenedAt(null)
    if (returnFocus.current) triggerRef.current?.focus()
    returnFocus.current = true
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-keyshortcuts="/ Control+K Meta+K"
        title="呼びで検索（/ キー）"
        className="relative flex h-9 items-center gap-1.5 rounded-sm border border-zinc-600 px-2 text-sm font-bold text-zinc-200 after:absolute after:-inset-y-1 after:inset-x-0 hover:border-zinc-400 print:hidden"
      >
        <Search className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only sm:pr-0.5">検索</span>
        <kbd className="num hidden rounded-xs border border-zinc-600 px-1 text-[10px] leading-4 font-normal text-zinc-400 lg:inline">
          /
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={onClose}
        onCancel={() => {
          returnFocus.current = true
        }}
        // 画面の外側（背景）を押したら閉じる
        onClick={(event) => {
          if (event.target === event.currentTarget) close(true)
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-zinc-950/60 sm:px-4 sm:pt-[8vh] print:hidden"
      >
        {open && (
          <div className="flex h-full flex-col bg-zinc-100 sm:mx-auto sm:h-auto sm:max-h-[84vh] sm:max-w-2xl sm:overflow-hidden sm:rounded-md sm:shadow-2xl">
            <div className="flex shrink-0 items-center gap-2 bg-zinc-900 py-1.5 pr-1.5 pl-4 text-white">
              <Search className="size-4 text-orange-500" aria-hidden />
              <h2 id={titleId} className="text-sm font-bold tracking-wide">
                呼びで検索
              </h2>
              <button
                type="button"
                onClick={() => close(true)}
                className="ml-auto flex h-10 items-center gap-1 rounded-sm px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                閉じる
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <QuickSearch
              variant="dialog"
              query={query}
              onQueryChange={setQuery}
              onNavigate={() => close(false)}
            />
          </div>
        )}
      </dialog>
    </>
  )
}
