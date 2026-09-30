import { Check, Copy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'

/**
 * 文字列をそのままコピーするボタン（URL を付けない）。図面の注記欄に貼る呼びなどに使う。
 * 共通の CopyButton は末尾に今の URL を付けるため、ここでは別に持つ。
 */
export function TextCopyButton({ text, label = 'コピー' }: { text: string; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleClick = async () => setStatus((await copyText(text)) ? 'copied' : 'failed')

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`「${text}」を${label}`}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {status === 'copied' ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : status === 'failed' ? (
        <X className="size-3.5 text-red-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{status === 'copied' ? 'コピー済み' : status === 'failed' ? '失敗' : label}</span>
    </button>
  )
}
