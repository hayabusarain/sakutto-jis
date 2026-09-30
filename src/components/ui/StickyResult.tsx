import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface StickyResultProps {
  /** 見えているかを監視する結果カードの id */
  targetId: string
  label: string
  value: string
  unit?: string
}

/**
 * スマホで結果カードが画面外にあるとき、画面下に答えを出し続けるバー。
 * 条件を変えながら、スクロールせずに答えを確認できる。タップで結果へ移動する。
 */
export function StickyResult({ targetId, label, value, unit }: StickyResultProps) {
  const [position, setPosition] = useState<'visible' | 'below' | 'above'>('visible')

  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPosition('visible')
        else setPosition(entry.boundingClientRect.top > 0 ? 'below' : 'above')
      },
      // 画面下のバー自体に隠れる分を差し引いて判定する
      { rootMargin: '0px 0px -64px 0px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [targetId])

  const shown = position !== 'visible'

  // バーでフッターの最下部が隠れないよう、表示中は下に余白をつける
  useEffect(() => {
    if (!shown) return
    document.body.classList.add('has-sticky-result')
    return () => document.body.classList.remove('has-sticky-result')
  }, [shown])

  if (!shown) return null

  const Icon = position === 'below' ? ArrowDown : ArrowUp

  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center gap-3 border-t-2 border-orange-600 bg-zinc-900 px-4 pb-[env(safe-area-inset-bottom)] text-left text-white shadow-[0_-4px_12px_rgba(0,0,0,0.15)] lg:hidden print:hidden"
      aria-label={`結果: ${label} ${value}${unit ?? ''}。タップで結果へ移動`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold tracking-wider text-zinc-400">{label}</span>
        <span className="flex items-baseline gap-1">
          <span className="num truncate text-2xl font-bold">{value}</span>
          {unit && <span className="text-sm text-zinc-400">{unit}</span>}
        </span>
      </span>
      <Icon className="size-5 shrink-0 text-orange-500" aria-hidden />
    </button>
  )
}
