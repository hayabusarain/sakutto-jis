import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
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
  /** 左右に「前へ」「次へ」ボタンを付ける（手袋でもサイズを1つずつ送れる） */
  stepper?: boolean
  /** よく使う値のボタン（options にある値だけ表示する） */
  quickPicks?: readonly T[]
}

const stepButton =
  'flex size-12 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-30'

/** スマホではOS標準のピッカーが開くよう、ネイティブの select を使う */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  stepper = false,
  quickPicks,
}: SelectFieldProps<T>) {
  const id = useId()
  const hintId = `${id}-hint`
  const index = options.findIndex((option) => option.value === value)
  const picks = quickPicks?.filter((pick) => options.some((option) => option.value === pick)) ?? []

  const select = (
    <div className="relative min-w-0 flex-1">
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
  )

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      {stepper ? (
        <div className="flex gap-1.5">
          <button
            type="button"
            className={stepButton}
            disabled={index <= 0}
            onClick={() => index > 0 && onChange(options[index - 1].value)}
            aria-label={`${label}を1つ前へ`}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          {select}
          <button
            type="button"
            className={stepButton}
            disabled={index < 0 || index >= options.length - 1}
            onClick={() => index >= 0 && index < options.length - 1 && onChange(options[index + 1].value)}
            aria-label={`${label}を1つ次へ`}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      ) : (
        select
      )}
      {picks.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`よく使う${label}`}>
          {picks.map((pick) => {
            const option = options.find((o) => o.value === pick)!
            const active = pick === value
            return (
              <button
                key={pick}
                type="button"
                onClick={() => onChange(pick)}
                aria-pressed={active}
                className={`num h-11 min-w-11 rounded-sm border px-2.5 text-sm font-semibold ${
                  active
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
                }`}
              >
                {option.label.replace(/（.*$/, '')}
              </button>
            )
          })}
        </div>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}
