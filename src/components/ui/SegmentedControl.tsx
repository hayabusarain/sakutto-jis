import { useId } from 'react'
import type { SelectOption } from './SelectField'

interface SegmentedControlProps<T extends string> {
  label: string
  value: T
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  hint?: string
}

/** 選択肢が少ないときに、1タップで選べるボタン型のラジオボタン */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SegmentedControlProps<T>) {
  const name = useId()

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</legend>
      <div className="flex gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1">
        {options.map((option) => (
          <label key={option.value} className="flex-1">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="num flex min-h-10 cursor-pointer items-center justify-center rounded-sm px-1 py-1 text-center text-sm leading-tight font-semibold text-zinc-600 sm:text-base transition-colors peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-500">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-600">{hint}</p>}
    </fieldset>
  )
}
