import { usePersistentState } from '../../hooks/usePersistentState'
import { useEffect } from 'react'

type TextSize = 'md' | 'lg'

const isTextSize = (value: unknown): value is TextSize => value === 'md' || value === 'lg'

/**
 * 直射日光の下や老眼でも読みやすいよう、文字を大きくする切り替え。
 * 表示前のちらつきを防ぐため、index.html の小さなスクリプトでも同じ値を先に反映している。
 */
export function TextSizeToggle() {
  const [size, setSize] = usePersistentState<TextSize>('text-size', 'md', isTextSize)

  useEffect(() => {
    if (size === 'lg') document.documentElement.dataset.textSize = 'lg'
    else delete document.documentElement.dataset.textSize
  }, [size])

  const large = size === 'lg'
  return (
    <button
      type="button"
      onClick={() => setSize(large ? 'md' : 'lg')}
      aria-pressed={large}
      className={`flex h-9 items-center gap-0.5 rounded-sm border px-2.5 font-bold print:hidden ${
        large ? 'border-orange-500 bg-orange-500 text-zinc-900' : 'border-zinc-600 text-zinc-200 hover:border-zinc-400'
      }`}
      title="文字の大きさを切り替え"
    >
      <span className="text-xs">あ</span>
      <span className="text-base">あ</span>
      <span className="sr-only">{large ? '文字を標準に戻す' : '文字を大きくする'}</span>
    </button>
  )
}
