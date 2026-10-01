import { Check, Copy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'

/** 文章だけをコピーするボタン（CopyButton と違い URL を付けない。図面の注記に貼る用） */
export function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleClick = async () => {
    setStatus((await copyText(text)) ? 'copied' : 'failed')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {status === 'copied' ? (
        <Check className="size-4 text-emerald-600" aria-hidden />
      ) : status === 'failed' ? (
        <X className="size-4 text-red-600" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
      <span aria-live="polite">
        {status === 'copied' ? 'コピーしました' : status === 'failed' ? 'コピーできませんでした' : label}
      </span>
    </button>
  )
}
