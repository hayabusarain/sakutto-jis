import { ArrowRight, Check, ScanSearch, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { fixed, parseNumber, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { THREAD_KINDS } from '../pipe-thread/data'
import {
  diameterFromCircumference,
  findByOd,
  hardToTellSpecs,
  isCloseOdMatch,
  isWallFar,
  nearestSpecs,
  odMatchTolerance,
  OD_TOLERANCE_MIN,
  OD_TOLERANCE_RATIO,
  pipeThreadFor,
  wallMatches,
  WALL_HARD_TO_TELL,
  WALL_TOLERANCE_MIN,
  WALL_TOLERANCE_RATIO,
} from './calc'
import { PIPE_SIZES, PIPE_SPECS, type PipeSpec } from './data'

type MeasureMode = 'od' | 'circ'

const MODE_OPTIONS = [
  { value: 'od', label: '外径（ノギス）' },
  { value: 'circ', label: '周長（巻尺）' },
] as const satisfies readonly { value: MeasureMode; label: string }[]

/** 差を符号付きで表示する（+0.3 / −0.03） */
function signed(value: number, digits = 2): string {
  const text = trim(Math.abs(value), digits)
  if (text === '0') return '0'
  return `${value > 0 ? '+' : '−'}${text}`
}

const specNames = (specs: readonly { spec: PipeSpec }[]) => specs.map((m) => PIPE_SPECS[m.spec].label).join('・')

// 注意書きの例（ねじ部は管の外径より細い）。data から取り出す
const EXAMPLE_PIPE = PIPE_SIZES.find((size) => size.a === '15A')!
const EXAMPLE_THREAD = pipeThreadFor(EXAMPLE_PIPE.a)!
const MIN_OD = PIPE_SIZES[0].od
const MAX_OD = PIPE_SIZES[PIPE_SIZES.length - 1].od

interface MeasureFinderProps {
  /** いま選んでいる規格・呼び径 */
  spec: PipeSpec
  selectedA: string
  /** 呼び径（と、肉厚から判断できれば規格）を選ぶ */
  onSelect: (a: string, spec?: PipeSpec) => void
  className?: string
}

/** 実測した外径・周長（と肉厚）から、呼び径と規格の候補を探す */
export function MeasureFinder({ spec, selectedA, onSelect, className }: MeasureFinderProps) {
  const [mode, setMode] = useState<MeasureMode>('od')
  const [value, setValue] = useState('')
  const [wall, setWall] = useState('')

  const measured = parseNumber(value)
  const valueEntered = value.trim() !== ''
  const valueValid = measured !== null && measured > 0
  const od = valueValid ? (mode === 'od' ? measured : diameterFromCircumference(measured)) : null
  const matches = od === null ? [] : findByOd(od)
  const best = matches[0]
  const second = matches[1]
  const close = best ? isCloseOdMatch(best) : false

  const t = parseNumber(wall)
  const wallEntered = wall.trim() !== ''
  const wallError =
    !wallEntered || !best
      ? undefined
      : t === null || t <= 0
        ? '0 より大きい数を入力してください'
        : t >= best.size.od / 2
          ? `外径（${fixed(best.size.od, 1)} mm）の半分より小さい値を入力してください`
          : undefined
  const wallRows = best && wallEntered && !wallError && t !== null ? wallMatches(best.size.a, t) : []
  const nearest = nearestSpecs(wallRows)
  const wallFar = nearest.length > 0 && isWallFar(nearest[0])
  const hardToTell = hardToTellSpecs(wallRows)
  // 肉厚から規格を判断できたときだけ規格も切り替える（同じ厚さの規格が複数なら、今の規格を優先）
  const pickSpec =
    nearest.length > 0 && !wallFar
      ? (nearest.find((m) => m.spec === spec) ?? nearest[0]).spec
      : undefined

  const thread = best ? pipeThreadFor(best.size.a) : undefined
  const alreadySelected = best !== undefined && best.size.a === selectedA && (pickSpec ?? spec) === spec

  return (
    <Card title="実測から呼び径を探す" index="03" icon={ScanSearch} className={className}>
      <div className="grid gap-4">
        <SegmentedControl
          label="測ったもの"
          value={mode}
          options={MODE_OPTIONS}
          onChange={(next) => {
            // 外径と周長は桁が違うので、測り方を変えたら値を消す（359 の周長を外径として読まないように）
            setMode(next)
            setValue('')
          }}
          hint={
            mode === 'od'
              ? 'ねじの無い部分の外径を測ります。'
              : '管に直角に1周巻いた長さ（外周）。太くてノギスが入らない管に。'
          }
        />
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={mode === 'od' ? '外径' : '周長'}
            value={value}
            onChange={setValue}
            placeholder={mode === 'od' ? '60.5' : '359'}
            unit="mm"
            error={valueEntered && !valueValid ? '0 より大きい数を入力してください' : undefined}
          />
          <NumberField
            label="肉厚（任意）"
            value={wall}
            onChange={setWall}
            placeholder="3.8"
            unit="mm"
            error={wallError}
          />
        </div>

        {best && od !== null ? (
          <div aria-live="polite" className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            {mode === 'circ' && measured !== null && (
              <p className="num text-xs text-zinc-600">
                外径 = {trim(measured, 1)} ÷ π = {fixed(od, 2)} mm
              </p>
            )}
            <p className="mt-1 text-xs font-semibold text-zinc-600">いちばん近い呼び径</p>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="num text-3xl font-bold text-zinc-900">{best.size.a}</span>
              <span className="num text-sm text-zinc-600">（{best.size.b}B）</span>
            </p>
            <p className="num mt-1 text-sm text-zinc-700">
              <span className="whitespace-nowrap">表の外径 {fixed(best.size.od, 1)} mm</span> ／{' '}
              <span className="whitespace-nowrap">差 {signed(best.delta)} mm</span>
            </p>

            {!close && (
              <p className="mt-2 flex gap-1.5 rounded-sm border border-orange-300 bg-orange-50 p-2 text-xs font-semibold text-orange-900">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span>
                  {od < MIN_OD - odMatchTolerance(MIN_OD) || od > MAX_OD + odMatchTolerance(MAX_OD)
                    ? `表の範囲（外径 ${fixed(MIN_OD, 1)}〜${fixed(MAX_OD, 1)} mm）の外です。`
                    : `いちばん近い ${best.size.a} とも ${trim(Math.abs(best.delta), 1)} mm 違います（目安 ${trim(odMatchTolerance(best.size.od), 1)} mm 以内）。`}
                  塗装・保温材の上から測っていないか、別の種類の管でないかを確かめてください。
                </span>
              </p>
            )}

            {second && (
              <p className="num mt-2 text-xs text-zinc-600">
                次に近い: {second.size.a}（外径 {fixed(second.size.od, 1)}、差 {signed(second.delta, 1)}）
              </p>
            )}

            {wallRows.length > 0 && t !== null && (
              <div className="mt-3 border-t border-zinc-200 pt-3">
                <p className="text-xs font-semibold text-zinc-600">
                  肉厚 <span className="num">{trim(t, 2)}</span> mm に近い規格（{best.size.a}）
                </p>
                <ul className="mt-1.5 grid gap-1">
                  {wallRows.map((row) => {
                    const isNearest = !wallFar && nearest.some((m) => m.spec === row.spec)
                    return (
                      <li
                        key={row.spec}
                        className={`num flex items-baseline justify-between gap-2 rounded-sm px-2 py-1 text-sm ${
                          isNearest ? 'bg-white font-semibold text-zinc-900 ring-1 ring-orange-400' : 'text-zinc-600'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          {isNearest && <Check className="size-3.5 text-orange-600" aria-label="近い" />}
                          {PIPE_SPECS[row.spec].label}
                        </span>
                        <span>
                          {fixed(row.t, 1)} mm（差 {signed(row.delta)}）
                        </span>
                      </li>
                    )
                  })}
                </ul>
                {nearest.length > 1 && !wallFar && (
                  <p className="mt-1.5 text-xs text-zinc-600">
                    {specNames(nearest)} は {best.size.a} で同じ厚さです。
                  </p>
                )}
                {wallFar && (
                  <p className="mt-1.5 text-xs font-semibold text-orange-900">
                    どの規格の厚さとも離れています（このツールに無い厚さの管かもしれません）。
                  </p>
                )}
                {!wallFar && hardToTell.length > 0 && (
                  <p className="mt-1.5 text-xs text-zinc-600">
                    {specNames(nearest)} と {specNames(hardToTell)} の厚さの差は{' '}
                    <span className="num">{trim(Math.abs(hardToTell[0].t - nearest[0].t), 2)}</span> mm
                    しかなく、実測では見分けにくい差です。管の表示（印字など）も確かめてください。
                  </p>
                )}
              </div>
            )}

            <div className="mt-3 border-t border-zinc-200 pt-3 text-sm">
              {thread ? (
                <p className="text-zinc-700">
                  対応する管用ねじ:{' '}
                  <span className="num font-semibold text-zinc-900">
                    R{thread.size}
                  </span>
                  <span className="text-xs text-zinc-600">（旧 {THREAD_KINDS.R.old}{thread.size}）</span>{' '}
                  <Link
                    to={toolHref('/pipe-thread', { size: thread.size, kind: 'R' })}
                    className="inline-flex min-h-10 items-center gap-0.5 text-sm font-semibold text-zinc-900 underline underline-offset-2"
                  >
                    寸法を見る
                    <ArrowRight className="size-3.5 text-orange-600" aria-hidden />
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-zinc-600">
                  {best.size.a} に対応する管用ねじは、このサイトの管用ねじの表にありません。
                </p>
              )}
            </div>

            <button
              type="button"
              disabled={alreadySelected}
              onClick={() => onSelect(best.size.a, pickSpec)}
              className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-default disabled:bg-zinc-300 disabled:text-zinc-700"
            >
              {alreadySelected
                ? `${pickSpec ? `${PIPE_SPECS[pickSpec].label} ` : ''}${best.size.a} を選択中`
                : `${pickSpec ? `${PIPE_SPECS[pickSpec].label} ` : ''}${best.size.a} を選んで質量を計算`}
            </button>
          </div>
        ) : (
          <p className="text-xs text-zinc-600">
            {mode === 'od' ? '外径' : '周長'}を入れると、いちばん近い呼び径を表示します。肉厚も入れると SGP・Sch40・Sch80
            のどれに近いかがわかります。
          </p>
        )}

        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-zinc-600">
          <li>
            ねじ部は管の外径より細くなります（例: {EXAMPLE_PIPE.a} の管の外径{' '}
            <span className="num">{fixed(EXAMPLE_PIPE.od, 1)}</span> mm に対し、R{EXAMPLE_THREAD.size}{' '}
            のねじの外径は <span className="num">{EXAMPLE_THREAD.d}</span> mm）。ねじの無い部分で測ってください。
          </li>
          <li>mm で入力します。塗装・保温材・テープの上から測ると太めに出ます。</li>
          <li>
            対象は SGP（JIS G 3452）と STPG の Sch40・Sch80（JIS G 3454）です。ステンレス鋼管・銅管・塩ビ管などは別の規格のため、この結果は当てはまりません。
          </li>
        </ul>

        <div className="space-y-1">
          <Citation code="JIS G 3452" suffix="・JIS G 3454 の外径・厚さと比較" />
          <Citation code="JIS B 0203" suffix="の管用ねじの呼びと外径" />
        </div>

        <FormulaInfo>
          <p>巻尺で測った周長 C を π で割ると外径 D になります。</p>
          <Formula>D = C ÷ π</Formula>
          {mode === 'circ' && measured !== null && od !== null && (
            <Formula>
              例: {trim(measured, 1)} ÷ π = {fixed(od, 2)} mm
            </Formula>
          )}
          <p>
            表の外径との差（実測 − 表）が、{OD_TOLERANCE_MIN} mm と外径の {OD_TOLERANCE_RATIO * 100}%
            の大きい方を超えるときは「どの呼び径とも違う」と表示します
            {best && (
              <>
                （{best.size.a} なら <span className="num">{trim(odMatchTolerance(best.size.od), 2)}</span> mm）
              </>
            )}
            。巻尺の誤差を見込んだこのサイトの目安で、JIS の外径の許容差ではありません。
          </p>
          <p>
            肉厚は、その呼び径の SGP・Sch40・Sch80 の厚さと比べ、差がいちばん小さい規格を示します。差が厚さの{' '}
            {WALL_TOLERANCE_RATIO * 100}%（{WALL_TOLERANCE_MIN} mm 未満なら {WALL_TOLERANCE_MIN} mm）を超えるときは
            「どの規格とも離れている」、ほかの規格との厚さの差が {WALL_HARD_TO_TELL} mm 以下のときは「見分けにくい」と表示します（どちらもこのサイトの目安）。
          </p>
          <FormulaLegend
            items={[
              ['C', '周長（外周）[mm]'],
              ['D', '外径 [mm]'],
            ]}
          />
        </FormulaInfo>
      </div>
    </Card>
  )
}
