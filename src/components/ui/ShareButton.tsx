import { Check, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'

interface ShareButtonProps {
  title: string
  /** 共有メニューに一緒に渡す文章（結果の要約など） */
  text?: string
}

/**
 * いま表示している条件のURLを共有する。スマホでは共有メニュー（LINE など）、
 * パソコンなど共有メニューが無い環境ではURLをコピーする。
 */
export function ShareButton({ title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleClick = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share(text ? { title, text, url } : { title, url })
        return
      } catch (error) {
        // 利用者がキャンセルしたときは何もしない
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    if (await copyText(text ? `${text}\n${url}` : url)) setCopied(true)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Share2 className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? 'URLをコピーしました' : 'この条件を共有'}</span>
    </button>
  )
}
