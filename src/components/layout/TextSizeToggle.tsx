import { usePersistentState } from '../../hooks/usePersistentState'
import { useEffect } from 'react'

type TextSize = 'md' | 'lg'

const isTextSize = (value: unknown): value is TextSize => value === 'md' || value === 'lg'

/** 保存場所（index.html の小さなスクリプトと同じキー） */
const STORAGE_KEY = 'sakutto-jis:text-size'

function applyTextSize(size: TextSize) {
  if (size === 'lg') document.documentElement.dataset.textSize = 'lg'
  else delete document.documentElement.dataset.textSize
}

/**
 * 直射日光の下や老眼でも読みやすいよう、文字を大きくする切り替え。
 * 表示前のちらつきを防ぐため、保存した値は index.html の小さなスクリプトが先に反映している。
 * 表示直後（事前レンダリングとの突き合わせ中）は保存した値をまだ読んでいないので、
 * ここで html の属性を書き換えると、いったん標準の大きさに戻ってしまう。
 * そのため属性は、ボタンを押したときと、別のタブで切り替えたときだけ変える。
 */
export function TextSizeToggle() {
  const [size, setSize] = usePersistentState<TextSize>('text-size', 'md', isTextSize)

  // 別のタブで切り替えたときも、このタブの表示をそろえる
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return
      let next: unknown = null
      try {
        next = event.newValue === null ? null : JSON.parse(event.newValue)
      } catch {
        // 壊れた値は標準として扱う
      }
      applyTextSize(isTextSize(next) ? next : 'md')
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const large = size === 'lg'
  const handleClick = () => {
    const next: TextSize = large ? 'md' : 'lg'
    setSize(next)
    applyTextSize(next)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={large}
      className={`relative flex h-9 items-center gap-0.5 rounded-sm border px-2.5 font-bold after:absolute after:inset-x-0 after:-inset-y-1 print:hidden ${
        large ? 'border-orange-500 bg-orange-500 text-zinc-900' : 'border-zinc-600 text-zinc-200 hover:border-zinc-400'
      }`}
      title="文字の大きさを切り替え"
    >
      <span className="text-xs" aria-hidden>
        あ
      </span>
      <span className="text-base" aria-hidden>
        あ
      </span>
      {/* 押した状態（aria-pressed）で大小を伝えるので、名前は切り替えても変えない */}
      <span className="sr-only">文字を大きく表示</span>
    </button>
  )
}
