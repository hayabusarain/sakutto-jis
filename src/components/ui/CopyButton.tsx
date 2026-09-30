import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CopyButtonProps {
  /** コピーする文章（LINEやメモに貼り付けやすい形） */
  text: string
  label?: string
}

export function CopyButton({ text, label = '結果をコピー' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{copied ? 'コピーしました' : label}</span>
    </button>
  )
}
