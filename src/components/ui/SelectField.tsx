import { ChevronDown } from 'lucide-react'
import { useId } from 'react'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

interface SelectFieldProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  hint?: string
}

/** スマホではOS標準のピッカーが開くよう、ネイティブの select を使う */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectFieldProps<T>) {
  const id = useId()
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          aria-describedby={hint ? hintId : undefined}
          className="h-12 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-10 text-base text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 right-3 my-auto size-5 text-zinc-500"
          aria-hidden
        />
      </div>
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}
