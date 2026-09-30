import { Check, ChevronDown, Wrench } from 'lucide-react'
import { useId, useState } from 'react'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { trim } from '../../lib/format'
import {
  ACROSS_FLATS_SIZES,
  acrossFlatsMatchLabel,
  boltsByAcrossFlats,
  boltsByKey,
  KEY_SIZES,
  keyMatchLabel,
} from './calc'
import { isUnverified } from './data'
import { Mark } from './Mark'

type WrenchKind = 'spanner' | 'key'

const WRENCH_OPTIONS = [
  { value: 'spanner', label: 'スパナ' },
  { value: 'key', label: '六角レンチ' },
] as const

interface Match {
  d: number
  /** 六角穴付きボルトの頭部径（同じ六角レンチの2サイズを見分ける） */
  dk: number
  label: string
  note: string
  unverified?: boolean
}

function findMatches(kind: WrenchKind, value: number): Match[] {
  if (kind === 'key') {
    return boltsByKey(value).map((match) => ({
      d: match.size.d,
      dk: match.size.capDk,
      label: keyMatchLabel(match),
      note: match.nonJis
        ? '六角穴付きボルト。JIS B 1176 に無いサイズ（DIN 912 などの値）'
        : '六角穴付きボルト（JIS B 1176）',
    }))
  }
  return boltsByAcrossFlats(value).map((match) => {
    const { size } = match
    const label = acrossFlatsMatchLabel(match)
    const base = { d: size.d, dk: size.capDk, label }
    if (match.standard === 'ja') {
      return { ...base, note: `旧JIS（附属書JA）の六角ボルト・ナット。JIS本体（ISO）の M${size.d} は ${trim(size.sIso)} mm` }
    }
    if (match.standard === 'iso') {
      return { ...base, note: `JIS本体（ISO）の六角ボルト・ナット。旧JIS（附属書JA）の M${size.d} は ${trim(size.sJa)} mm` }
    }
    if (isUnverified('sJa', size.d)) {
      return { ...base, note: 'JIS本体の六角ボルト・ナット。旧JIS（附属書JA）の値は', unverified: true }
    }
    return { ...base, note: '六角ボルト・ナット（JIS本体・旧JIS とも同じ二面幅）' }
  })
}

interface ToolFinderProps {
  /** いま選んでいるねじの呼び径 */
  selected: number
  onSelect: (d: number) => void
}

/** 手持ちのスパナ・六角レンチのサイズから、ボルトの呼びを探す */
export function ToolFinder({ selected, onSelect }: ToolFinderProps) {
  const [kind, setKind] = useState<WrenchKind>('spanner')
  const [picked, setPicked] = useState<number | null>(null)
  const sizes = kind === 'spanner' ? ACROSS_FLATS_SIZES : KEY_SIZES
  const matches = picked === null ? [] : findMatches(kind, picked)
  const toolName = kind === 'spanner' ? 'スパナ' : '六角レンチ'
  const labelId = useId()

  const pick = (value: number) => {
    setPicked(value)
    const first = findMatches(kind, value)[0]
    if (first) onSelect(first.d)
  }

  return (
    <details className="group rounded-md border border-zinc-200 bg-zinc-50 print:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-800 select-none hover:text-zinc-950 [&::-webkit-details-marker]:hidden">
        <Wrench className="size-4 shrink-0 text-orange-600" aria-hidden />
        <span className="min-w-0 flex-1">
          工具のサイズからボルトを探す
          <span className="block text-xs font-normal text-zinc-500">例: スパナ 17 → M10（旧JIS）、六角レンチ 14 → M16</span>
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="grid gap-3 border-t border-zinc-200 bg-white px-3 py-3">
        <SegmentedControl
          label="工具"
          value={kind}
          options={WRENCH_OPTIONS}
          onChange={(next) => {
            setKind(next)
            setPicked(null)
          }}
        />
        <div>
          <p id={labelId} className="text-sm font-semibold text-zinc-700">
            {kind === 'spanner' ? '合うスパナのサイズ（二面幅）' : '合う六角レンチのサイズ'}
            <span className="ml-1 text-xs font-normal text-zinc-500">mm</span>
          </p>
          <div className="mt-1.5 grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5" role="group" aria-labelledby={labelId}>
            {sizes.map((value) => {
              const active = value === picked
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => pick(value)}
                  aria-pressed={active}
                  aria-label={`${toolName} ${trim(value)} mm`}
                  className={`num h-11 rounded-sm border px-1 text-sm font-semibold ${
                    active
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  {trim(value)}
                </button>
              )
            })}
          </div>
        </div>

        <div aria-live="polite">
          {picked === null ? (
            <p className="text-xs text-zinc-500">サイズをタップすると、合うボルトを選びます。</p>
          ) : (
            <>
              <p className="text-sm text-zinc-700">
                {toolName} <span className="num font-semibold">{trim(picked)} mm</span> が合うのは
              </p>
              <ul className="mt-1.5 grid gap-1.5">
                {matches.map((match) => {
                  const active = match.d === selected
                  return (
                    <li key={match.d}>
                      <button
                        type="button"
                        onClick={() => onSelect(match.d)}
                        aria-pressed={active}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-sm border px-3 py-2 text-left ${
                          active ? 'border-orange-600 bg-orange-50' : 'border-zinc-300 bg-white hover:border-zinc-500'
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="num block text-base font-bold text-zinc-900">{match.label}</span>
                          <span className="block text-xs leading-snug text-zinc-600">
                            {match.note}
                            {match.unverified && (
                              <>
                                規格原文で未確認
                                <Mark />
                              </>
                            )}
                          </span>
                        </span>
                        {active && <Check className="size-4 shrink-0 text-orange-600" aria-hidden />}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {matches.length > 1 && (
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  同じ六角レンチを使うサイズが {matches.length} つあります。ねじの太さか頭部の径で見分けてください（頭部径{' '}
                  {matches.map((match) => `M${match.d} は ${trim(match.dk)} mm`).join('、')}）。
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </details>
  )
}
