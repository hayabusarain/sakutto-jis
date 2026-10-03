import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { fixed, trim } from '../../lib/format'
import {
  findByMatingDiameter,
  grooveBottomDiameter,
  identifyByRing,
  CROSS_SECTIONS,
  type HousingType,
  type ORing,
} from './calc'

const signed = (value: number) => (value > 0 ? `+${trim(value)}` : value < 0 ? `−${trim(-value)}` : '±0')

/** 系列の使い道。G は固定用のみ（P50 と G50 の取り違えに気づけるよう、候補ごとに出す） */
export function UsageBadge({ ring }: { ring: ORing }) {
  return ring.series === 'G' ? (
    <span className="rounded-sm border border-orange-300 bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-800">
      固定用のみ
    </span>
  ) : (
    <span className="rounded-sm border border-zinc-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">
      運動用・固定用
    </span>
  )
}

interface CandidateProps {
  ring: ORing
  selected: boolean
  onPick: (ring: ORing) => void
  children: ReactNode
}

/** 候補の番号。タップでその番号を選ぶ */
function Candidate({ ring, selected, onPick, children }: CandidateProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(ring)}
        aria-pressed={selected}
        className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
          selected
            ? 'border-zinc-900 bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]'
            : 'border-zinc-300 bg-white hover:border-zinc-500'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="num text-base font-bold text-zinc-900">{ring.no}</span>
            <span className="num text-sm text-zinc-700">
              {trim(ring.d1)} × {trim(ring.group.d2)}
            </span>
            <UsageBadge ring={ring} />
          </span>
          <span className="mt-0.5 block text-xs text-zinc-600">{children}</span>
        </span>
        {selected ? (
          <Check className="size-5 shrink-0 text-orange-600" aria-label="選択中" />
        ) : (
          <span className="shrink-0 text-xs font-semibold text-zinc-500">選ぶ</span>
        )}
      </button>
    </li>
  )
}

const listClass = 'mt-2 grid gap-1.5'
const headingClass = 'text-sm font-semibold text-zinc-800'

interface MatingLookupProps {
  housing: HousingType
  backup: 0 | 1 | 2
  mate: number
  bottom: number | null
  selected: ORing
  onPick: (ring: ORing) => void
}

/** 相手寸法（シリンダ内径・軸径）から探した結果 */
export function MatingLookup({ housing, backup, mate, bottom, selected, onPick }: MatingLookupProps) {
  const lookup = findByMatingDiameter(housing, mate, bottom ?? undefined)
  const mateName = housing === 'piston' ? 'シリンダ内径 D' : '軸径 d'
  const bottomName = housing === 'piston' ? '溝底径 d' : '溝底径 D'
  const detail = (ring: ORing) => (
    <>
      {bottomName} <span className="num">{trim(grooveBottomDiameter(ring, housing))}</span>・溝幅{' '}
      <span className="num">{trim(ring.group.widths[backup])}</span>
      {housing === 'piston' ? '（ピストンに溝）' : '（ハウジングに溝）'}
    </>
  )
  const list = (rings: readonly ORing[]) => (
    <ul className={listClass}>
      {rings.map((ring) => (
        <Candidate key={ring.no} ring={ring} selected={ring.no === selected.no} onPick={onPick}>
          {detail(ring)}
        </Candidate>
      ))}
    </ul>
  )

  return (
    <div aria-live="polite">
      {lookup.exact.length > 0 ? (
        <>
          <p className={headingClass}>
            {mateName} <span className="num">φ{trim(mate)}</span>
            {bottom !== null && (
              <>
                ・{bottomName} <span className="num">φ{trim(bottom)}</span>
              </>
            )}{' '}
            に合う番号（{lookup.exact.length}件）
          </p>
          {list(lookup.exact)}
        </>
      ) : lookup.matches.length > 0 ? (
        <>
          <p className="text-sm font-semibold text-orange-800">
            {bottomName} φ{trim(bottom ?? 0)} と合う番号はありません。{mateName} φ{trim(mate)} の番号は次のとおりです。
          </p>
          {list(lookup.matches)}
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-orange-800">
            {mateName} φ{trim(mate)} ちょうどの番号はありません。近い径:
          </p>
          {[lookup.below, lookup.above].map(
            (group) =>
              group && (
                <div key={group.diameter} className="mt-3">
                  <p className={headingClass}>
                    φ{trim(group.diameter)}
                    <span className="ml-1 text-xs font-normal text-zinc-600">
                      （{signed(group.diameter - mate)} mm）
                    </span>
                  </p>
                  {list(group.rings)}
                </div>
              ),
          )}
        </>
      )}
    </div>
  )
}

interface RingLookupProps {
  d1: number
  d2: number
  selected: ORing
  onPick: (ring: ORing) => void
}

/** 実物の内径 × 太さから探した結果 */
export function RingLookup({ d1, d2, selected, onPick }: RingLookupProps) {
  const result = identifyByRing(d1, d2)
  return (
    <div aria-live="polite">
      {result.d2Far && (
        <p className="mb-2 rounded-sm border border-orange-300 bg-orange-50 px-2 py-1.5 text-xs font-semibold text-orange-900">
          太さ {trim(d2)} は P・G の太さ（{CROSS_SECTIONS.map((value) => trim(value)).join('・')}）から離れています。
          つぶれ・膨潤のほか、このサイトで扱っていない V 系列（真空フランジ用。太さ 4・6・10 mm）や JIS 以外（インチ系の
          AS568 など）のOリングの可能性があります。
        </p>
      )}
      <p className={headingClass}>
        太さ {result.d2Options.map((value) => trim(value)).join(' または ')} として、内径の近い順
      </p>
      <ul className={listClass}>
        {result.candidates.map(({ ring, dd1, dd2, withinTol }) => (
          <Candidate key={ring.no} ring={ring} selected={ring.no === selected.no} onPick={onPick}>
            内径の差 <span className="num">{signed(dd1)}</span>・太さの差 <span className="num">{signed(dd2)}</span>
            {withinTol ? (
              <span className="ml-1 font-semibold text-emerald-700">許容差内</span>
            ) : (
              <span className="ml-1 text-zinc-500">
                （許容差 ±{fixed(ring.d1Tol, 2)} / ±{fixed(ring.group.d2Tol, 2)}）
              </span>
            )}
          </Candidate>
        ))}
      </ul>
    </div>
  )
}
