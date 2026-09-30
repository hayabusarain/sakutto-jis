import { Check, Copy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'

interface CopyButtonProps {
  /** コピーする文章（LINEやメモに貼り付けやすい形）。末尾に今の条件のURLを付ける */
  text: string
  label?: string
}

export function CopyButton({ text, label = '結果をコピー' }: CopyButtonProps) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  const handleClick = async () => {
    const ok = await copyText(`${text}\n${window.location.href}`)
    setStatus(ok ? 'copied' : 'failed')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {status === 'copied' ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : status === 'failed' ? (
        <X className="size-3.5 text-red-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">
        {status === 'copied' ? 'コピーしました' : status === 'failed' ? 'コピーできませんでした' : label}
      </span>
    </button>
  )
}
