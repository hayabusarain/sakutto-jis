import { useId } from 'react'

interface NumberFieldProps {
  label: string
  /** 入力途中の「8.」なども保てるよう、文字列のまま扱う */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  unit?: string
  hint?: string
  /** 入力が正しくないときのメッセージ（計算しない） */
  error?: string
  /** 計算はできるが、打ち間違いが疑われるときの注意（例: m 欄に mm で入力） */
  warning?: string
  /** 注意に対するワンタップの修正（例: 「5.5 m に直す」） */
  fix?: { label: string; onClick: () => void }
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  hint,
  error,
  warning,
  fix,
}: NumberFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const warningId = `${id}-warning`
  const describedBy = [error ? errorId : null, !error && warning ? warningId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`h-12 w-full rounded-md border bg-white px-3 pr-12 text-base text-zinc-900 tabular-nums placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40 ${
            error ? 'border-red-500' : warning ? 'border-orange-500' : 'border-zinc-300'
          }`}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      {!error && warning && (
        <p id={warningId} className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-orange-800">
          {warning}
          {fix && (
            <button
              type="button"
              onClick={fix.onClick}
              className="h-8 rounded-sm border border-orange-400 bg-orange-50 px-2 text-xs font-semibold text-orange-900 hover:bg-orange-100"
            >
              {fix.label}
            </button>
          )}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-zinc-600">
          {hint}
        </p>
      )}
    </div>
  )
}
