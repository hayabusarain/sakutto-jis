import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

interface PlaceholderFieldProps {
  label: string
  /** 入力欄に薄く表示する例（例: 「10K」） */
  placeholder: string
  kind?: 'select' | 'number'
  unit?: string
  hint?: string
}

/**
 * 入力フォームのダミー。見た目は本番の入力欄と同じで、操作はできない。
 * 計算ロジックを実装するときに、本物の select / input に置き換える。
 */
export function PlaceholderField({
  label,
  placeholder,
  kind = 'select',
  unit,
  hint,
}: PlaceholderFieldProps) {
  const id = useId()

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={kind === 'number' ? 'decimal' : undefined}
          placeholder={placeholder}
          disabled
          className="h-12 w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-50 px-3 pr-12 text-base text-slate-900 placeholder:text-slate-400"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
          {kind === 'select' ? <ChevronDown className="size-5" aria-hidden /> : unit}
        </span>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
