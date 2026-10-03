import { Check, Ruler } from 'lucide-react'
import { useState } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { NumberField } from '../../components/ui/NumberField'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { parseNumber, trim } from '../../lib/format'
import { identifyFlange, isUnverified, pcdFromPitch, type IdentifyCandidate, type IdentifyGroup } from './calc'
import { ALL_FLANGE_TABLES_LABEL, type PressureClass } from './data'
import { Marked, UnverifiedLegend } from './Unverified'

export const IDENTIFY_CARD_ID = 'flange-identify'

type HoleCount = '4' | '8' | '12' | '16'
type PcdMethod = 'pitch' | 'pcd'

const HOLE_OPTIONS = (['4', '8', '12', '16'] as const).map((n) => ({ value: n, label: `${n}穴` }))
const METHOD_OPTIONS = [
  { value: 'pitch', label: '隣の穴との間隔' },
  { value: 'pcd', label: 'PCD' },
] as const

/** 任意の寸法の入力（空欄は null、読めない・0以下は 'error'） */
function readPositive(text: string): number | null | 'error' {
  if (text.trim() === '') return null
  const value = parseNumber(text)
  return value !== null && value > 0 ? value : 'error'
}

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : '±'}${trim(Math.abs(value), 1)}`

function Deviations({ candidate }: { candidate: IdentifyCandidate }) {
  const items = [
    ['外径', candidate.dD],
    ['PCD', candidate.dC],
    ['穴径', candidate.dH],
  ] as const
  const shown = items.filter(([, value]) => value !== null)
  if (shown.length === 0) return null
  return (
    <span className="num text-xs text-zinc-600">
      表 − 実測: {shown.map(([label, value]) => `${label} ${signed(value!)}`).join(' / ')}
    </span>
  )
}

/** グループ（D・PCD・穴が同じ候補）の見分け方の説明 */
function groupNote(group: IdentifyGroup, thicknessGiven: boolean): string | null {
  const { candidates } = group
  if (candidates.length < 2) return null
  const names = candidates.map((c) => c.pressure).join('・')
  const thicknesses = candidates.map((c) => c.row.t)
  const distinct = new Set(thicknesses).size
  const base = `${names} は外径・PCD・穴数・穴径が同じです。`
  if (distinct === 1) return `${base}厚さも同じで、寸法では区別できません（刻印・銘板・図面で確認してください）。`
  if (distinct < thicknesses.length) {
    return `${base}厚さで一部だけ区別できます（同じ厚さのものは刻印・銘板で確認してください）。${
      thicknessGiven ? '' : '厚さを入れると近い順に並べます。'
    }`
  }
  return `${base}厚さ t で区別します。${thicknessGiven ? '' : '厚さを入れると近い順に並べます。'}`
}

interface IdentifyCardProps {
  index: string
  selected: { pressure: PressureClass; size: string }
  onSelect: (pressure: PressureClass, size: string) => void
  className?: string
}

/** 実測（外径・穴数・穴の間隔・厚さ）から JIS フランジを探す */
export function IdentifyCard({ index, selected, onSelect, className }: IdentifyCardProps) {
  const [holes, setHoles] = useState<HoleCount>('4')
  const [method, setMethod] = useState<PcdMethod>('pitch')
  const [od, setOd] = useState('')
  const [spacing, setSpacing] = useState('')
  const [hole, setHole] = useState('')
  const [thickness, setThickness] = useState('')

  const n = Number(holes)
  const D = readPositive(od)
  const spacingValue = readPositive(spacing)
  const h = readPositive(hole)
  const t = readPositive(thickness)
  const pcd =
    spacingValue === null || spacingValue === 'error'
      ? null
      : method === 'pitch'
        ? pcdFromPitch(spacingValue, n)
        : spacingValue
  const hasError = [D, spacingValue, h, t].includes('error')
  const value = (v: number | null | 'error') => (v === 'error' ? null : v)

  const groups = hasError
    ? []
    : identifyFlange({ n, D: value(D), pcd, h: value(h), t: value(t) })
  const ready = !hasError && (value(D) !== null || pcd !== null)
  const thicknessGiven = value(t) !== null
  const anyUnverified = groups.some((g) =>
    g.candidates.some((c) => isUnverified(c.pressure, c.row.size, 't')),
  )

  const errorText = '正の数値で入力してください'

  // 測り方を切り替えたら、入力済みの値を換算して引き継ぐ（間隔のまま PCD として読まないように）
  const changeMethod = (next: PcdMethod) => {
    if (next === method) return
    if (typeof spacingValue === 'number') {
      const converted = next === 'pcd' ? pcdFromPitch(spacingValue, n) : spacingValue * Math.sin(Math.PI / n)
      setSpacing(trim(converted, 1))
    }
    setMethod(next)
  }

  return (
    <Card title="実測から探す（呼び径・圧力がわからないとき）" index={index} icon={Ruler} id={IDENTIFY_CARD_ID} className={className}>
      <p className="text-xs leading-relaxed text-zinc-600">
        刻印の無いバルブ・ポンプのフランジを、外径・ボルト穴の数・穴の間隔から JIS B 2220 の表と照らし合わせます。候補をタップすると、その呼び径でボルト長さを計算します。
      </p>
      <div className="mt-4 grid gap-4">
        <SegmentedControl label="ボルト穴の数" value={holes} options={HOLE_OPTIONS} onChange={setHoles} />
        <NumberField
          label="外径 D（任意）"
          value={od}
          onChange={setOd}
          placeholder="例: 155"
          unit="mm"
          error={D === 'error' ? errorText : undefined}
        />
        <SegmentedControl
          label="穴の位置の測り方"
          value={method}
          options={METHOD_OPTIONS}
          onChange={changeMethod}
        />
        <div>
          <NumberField
            label={method === 'pitch' ? '隣り合う穴の中心間距離 s' : 'PCD（ボルト穴中心円の直径）'}
            value={spacing}
            onChange={setSpacing}
            placeholder={method === 'pitch' ? '例: 84.9' : '例: 120'}
            unit="mm"
            error={spacingValue === 'error' ? errorText : undefined}
            hint={
              method === 'pitch'
                ? '穴の内側どうしの距離 ＋ 穴径（または外側どうし − 穴径）。片方の穴の左端から、隣の穴の左端までを測っても同じです。'
                : '向かい合う2つの穴で、片方の穴の左端からもう片方の穴の左端まで（同じ側の縁どうし）を測ると PCD になります（穴数が偶数のとき）。'
            }
          />
          {method === 'pitch' && pcd !== null && (
            <p className="num mt-1 text-xs text-zinc-700">
              → PCD = s ÷ sin(180° / {n}) = {trim(spacingValue as number, 2)} ÷ {trim(Math.sin(Math.PI / n), 4)} ={' '}
              <span className="font-semibold">{trim(pcd, 1)} mm</span>
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="穴径（任意）"
            value={hole}
            onChange={setHole}
            placeholder="例: 19"
            unit="mm"
            error={h === 'error' ? errorText : undefined}
          />
          <NumberField
            label="厚さ（任意）"
            value={thickness}
            onChange={setThickness}
            placeholder="例: 16"
            unit="mm"
            error={t === 'error' ? errorText : undefined}
          />
        </div>
        <p className="-mt-2 text-xs text-zinc-500">
          厚さは、座（RF）があれば座を含めて測ります（表の厚さ t は座の高さを含む値）。外径・PCD・穴が同じ候補の見分けに使います。
        </p>
      </div>

      <div className="mt-5" aria-live="polite">
        <h3 className="text-xs font-bold tracking-wider text-zinc-500">候補（近い順）</h3>
        {!ready ? (
          <p className="mt-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            {hasError ? '入力を確認してください。' : '外径か、穴の間隔（PCD）を入れると候補を出します。'}
          </p>
        ) : groups.length === 0 ? (
          <p className="mt-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            {n}穴の JIS フランジ（5K〜20K・10A〜300A）はこのツールの表にありません。
          </p>
        ) : (
          <>
            {!groups[0].close && (
              <p className="mt-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-xs leading-relaxed text-orange-900">
                どの候補も表の値と 3 mm 以上違います。測り直すか、JIS B 2220 以外（ASME・JPI など）のフランジの可能性も考えてください。
              </p>
            )}
            <ol className="mt-2 space-y-2">
              {groups.map((group, gi) => {
                const first = group.candidates[0].row
                const note = groupNote(group, thicknessGiven)
                return (
                  <li
                    key={`${first.D}-${first.C}-${first.n}-${first.h}`}
                    className={`rounded-md border p-3 ${gi === 0 && group.close ? 'border-zinc-900' : 'border-zinc-200'}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="text-xs font-bold text-zinc-700">
                        {gi === 0 && group.close ? '最も近い' : `候補 ${gi + 1}`}
                        {!group.close && '（差が大きい）'}
                      </span>
                      <Deviations candidate={group.candidates[0]} />
                    </div>
                    <p className="num mt-1 text-sm text-zinc-800">
                      外径 {first.D} / PCD {first.C} / {first.n}-φ{first.h} / M{first.bolt}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {group.candidates.map((candidate) => {
                        const active =
                          candidate.pressure === selected.pressure && candidate.row.size === selected.size
                        const tUnverified = isUnverified(candidate.pressure, candidate.row.size, 't')
                        const rowUnverified = isUnverified(candidate.pressure, candidate.row.size, 'D')
                        return (
                          <button
                            key={candidate.pressure}
                            type="button"
                            onClick={() => onSelect(candidate.pressure, candidate.row.size)}
                            aria-pressed={active}
                            className={`num inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 text-sm font-semibold ${
                              active
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : 'border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900'
                            }`}
                          >
                            {active && <Check className="size-4" aria-hidden />}
                            <Marked
                              value={`${candidate.pressure} ${candidate.row.size}`}
                              unverified={rowUnverified}
                              dark={active}
                            />
                            <span className={`text-xs font-normal ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>
                              t
                              <Marked value={candidate.row.t} unverified={tUnverified && !rowUnverified} dark={active} />
                              {candidate.dT !== null && `（${signed(candidate.dT)}）`}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    {note && <p className="mt-2 text-xs leading-relaxed text-zinc-600">{note}</p>}
                  </li>
                )
              })}
            </ol>
            {anyUnverified && (
              <UnverifiedLegend className="mt-2">
                。未確認の厚さで見分けるときは注意してください。
              </UnverifiedLegend>
            )}
          </>
        )}
      </div>
      <div className="mt-3">
        <Citation code="JIS B 2220" detail={ALL_FLANGE_TABLES_LABEL} suffix="から探しています" />
      </div>
    </Card>
  )
}
