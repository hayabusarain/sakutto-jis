import { useId } from 'react'

interface NumberFieldProps {
  label: string
  /** 入力途中の「8.」なども保てるよう、文字列のまま扱う */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  unit?: string
  hint?: string
}

export function NumberField({ label, value, onChange, placeholder, unit, hint }: NumberFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`

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
          aria-describedby={hint ? hintId : undefined}
          className="h-12 w-full rounded-md border border-zinc-300 bg-white px-3 pr-12 text-base text-zinc-900 tabular-nums placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40"
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}
