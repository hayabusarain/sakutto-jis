import { ArrowLeftRight, BookOpen, Calculator, ClipboardList, Table2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { Link } from '../../router/Link'
import {
  absoluteToGauge,
  convert,
  echoValue,
  findUnit,
  formatFeetInches,
  formatValue,
  gaugeToAbsolute,
  isExact,
  isPhysicalTemperature,
  nearestInchFraction,
  parseValue,
  plainValue,
  valueCommaNote,
} from './calc'
import { QUANTITIES, QUANTITY_KEYS, type Quantity, type UnitDef } from './data'
import { DEFAULT_INPUT, isUnitConvertInput, normalizeInput, STORAGE_KEY, type PressureRef } from './state'

const REF_OPTIONS = [
  { value: 'gauge' as const, label: 'ゲージ圧' },
  { value: 'abs' as const, label: '絶対圧' },
]

const REF_TEXT: Record<PressureRef, string> = { gauge: 'ゲージ圧', abs: '絶対圧' }

const CELSIUS = findUnit('temperature', 'C')!
const FAHRENHEIT = findUnit('temperature', 'F')!
const KELVIN = findUnit('temperature', 'K')!
const INCH_UNIT = findUnit('length', 'in')!

/** 早見表に載せる温度 [°C] */
const TEMPERATURE_ROWS = [-196, -40, -20, 0, 10, 20, 25, 40, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500, 1000]

/** 換算するもの（5つ）を1タップで切り替える。320px でも1行に収まるよう小さめの文字にする */
function QuantityTabs({ value, onChange }: { value: Quantity; onChange: (value: Quantity) => void }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-zinc-700">換算するもの</legend>
      <div className="grid grid-cols-5 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1">
        {QUANTITY_KEYS.map((key) => (
          <label key={key} className="min-w-0">
            <input
              type="radio"
              name={name}
              value={key}
              checked={key === value}
              onChange={() => onChange(key)}
              className="peer sr-only"
            />
            <span className="flex h-10 cursor-pointer items-center justify-center rounded-sm text-sm font-semibold whitespace-nowrap text-zinc-600 transition-colors peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-500">
              {QUANTITIES[key].label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** 単位のボタン（ラジオボタン）。スマホでは3列 */
function UnitPicker({
  label,
  units,
  value,
  onChange,
}: {
  label: string
  units: readonly UnitDef[]
  value: string
  onChange: (id: string) => void
}) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-zinc-700">{label}</legend>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {units.map((unit) => (
          <label key={unit.id} className="min-w-0">
            <input
              type="radio"
              name={name}
              value={unit.id}
              checked={unit.id === value}
              onChange={() => onChange(unit.id)}
              className="peer sr-only"
            />
            <span className="num flex h-11 cursor-pointer items-center justify-center rounded-sm border border-zinc-300 bg-white px-1 text-sm font-semibold whitespace-nowrap text-zinc-700 hover:border-zinc-500 peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-500">
              {unit.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface ValueFieldProps {
  value: string
  onChange: (value: string) => void
  unit: string
  allowNegative: boolean
  /** 分数（1-1/4）を打てるよう、数字だけでないキーボードにする */
  allowFraction: boolean
  error?: string
  hint: string
}

/** 値の入力欄。スマホの数字キーボードにはマイナスが無いことがあるので、±ボタンを付ける */
function ValueField({ value, onChange, unit, allowNegative, allowFraction, error, hint }: ValueFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const toggleSign = () => {
    const trimmed = value.trim()
    onChange(/^[-−－ー]/.test(trimmed) ? trimmed.replace(/^[-−－ー]\s*/, '') : `-${trimmed}`)
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-zinc-700">
        値
      </label>
      <div className="flex gap-1.5">
        {allowNegative && (
          <button
            type="button"
            onClick={toggleSign}
            className="num flex size-12 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-lg font-bold text-zinc-700 hover:border-zinc-500"
            aria-label="プラス・マイナスを切り替え"
          >
            ±
          </button>
        )}
        <div className="relative min-w-0 flex-1">
          <input
            id={id}
            type="text"
            inputMode={allowFraction ? 'text' : 'decimal'}
            autoComplete="off"
            enterKeyHint="done"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={allowFraction ? '1-1/4' : '10'}
            aria-invalid={error ? true : undefined}
            aria-describedby={[error ? errorId : null, hintId].filter(Boolean).join(' ')}
            className={`h-12 w-full rounded-md border bg-white px-3 pr-20 text-lg text-zinc-900 tabular-nums placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40 ${
              error ? 'border-red-500' : 'border-zinc-300'
            }`}
          />
          <span className="num pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-zinc-500">
            {unit}
          </span>
        </div>
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
      <p id={hintId} className="mt-1 text-xs text-zinc-500">
        {hint}
      </p>
    </div>
  )
}

/** 主結果。長い数値（0.0000101972 など）でも 320px で折り返せるようにする */
function MainResult({
  label,
  value,
  unit,
  children,
}: {
  label: string
  value?: string
  unit: string
  children: ReactNode
}) {
  let size = 'text-4xl sm:text-5xl'
  if (value !== undefined && value.length > 11) size = 'text-2xl sm:text-4xl'
  else if (value !== undefined && value.length > 8) size = 'text-3xl sm:text-5xl'
  return (
    <div className="rounded-md bg-zinc-900 p-4 text-white">
      <p className="text-xs font-semibold tracking-wider text-zinc-400">{label}</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className={`num font-bold break-all ${size}`}>{value ?? '—'}</span>
        <span className="num text-lg font-semibold text-zinc-400">{unit}</span>
      </p>
      <div className="mt-2 text-xs leading-relaxed text-zinc-300">{children}</div>
    </div>
  )
}

export function UnitConvertTool() {
  const [input, setInput] = useToolState(STORAGE_KEY, DEFAULT_INPUT, isUnitConvertInput, normalizeInput)
  const quantity = QUANTITIES[input.q]
  const from = findUnit(input.q, input.from) ?? quantity.units[0]
  const to = findUnit(input.q, input.to) ?? quantity.units[1]
  const isPressure = input.q === 'pressure'
  const isLength = input.q === 'length'
  const isTemperature = input.q === 'temperature'

  const parsed = parseValue(input.v)
  // 「-」だけ（±ボタンを押した直後）は入力途中としてエラーにしない
  const typing = /^\s*[-−－ー]?\s*$/.test(input.v)
  let error: string | undefined
  if (!typing && parsed === null) {
    error = '数値として読めません（例: 10、0.5、1,000、1-1/4）'
  } else if (parsed !== null && parsed < 0 && !quantity.allowNegative) {
    error = '0 以上の値を入力してください。'
  } else if (parsed !== null && isTemperature && !isPhysicalTemperature(parsed, from)) {
    error = '絶対零度（−273.15 °C ＝ −459.67 °F ＝ 0 K）より低い温度です。'
  } else if (parsed !== null && isPressure && input.ref === 'abs' && parsed < 0) {
    error = '絶対圧は 0 以上です（マイナスはゲージ圧で入力してください）。'
  }
  const value = error === undefined ? parsed : null
  const result = value === null ? null : convert(value, from, to)

  const changeQuantity = (q: Quantity) => {
    if (q === input.q) return
    const def = QUANTITIES[q]
    setInput({ ...input, q, from: def.defaultFrom, to: def.defaultTo })
  }
  const changeFrom = (id: string) => {
    setInput({ ...input, from: id, to: id === input.to ? input.from : input.to })
  }
  const changeTo = (id: string) => {
    if (id === input.from) return
    setInput({ ...input, to: id })
  }
  const swap = () => setInput({ ...input, from: input.to, to: input.from })

  // 入力した値は6桁に丸めずに見せる（換算結果だけを丸める）
  const valueText = value === null ? '' : echoValue(value)
  const comma = valueCommaNote(input.v)
  const refText = isPressure ? `（${REF_TEXT[input.ref]}）` : ''
  const mark = (x: number) => (isExact(x) ? '=' : '≒')
  const rows = quantity.units.map((unit) => ({ unit, value: value === null ? null : convert(value, from, unit) }))

  // 圧力: ゲージ圧 ↔ 絶対圧（同じ単位のまま、標準大気圧を足し引き）
  const otherRef: PressureRef = input.ref === 'gauge' ? 'abs' : 'gauge'
  const otherRefValue =
    result === null || !isPressure ? null : input.ref === 'gauge' ? gaugeToAbsolute(result, to) : absoluteToGauge(result, to)

  // 長さ: インチの分数
  const inches = value === null || !isLength ? null : convert(value, from, INCH_UNIT)
  const fractions = inches === null ? [] : [16, 32, 64].map((den) => nearestInchFraction(inches, den))

  const copyText =
    value === null
      ? ''
      : [
          `【単位換算】${quantity.label} ${valueText} ${from.label}${refText}`,
          ...rows
            .filter((row) => row.unit.id !== from.id && row.value !== null)
            .map((row) => `${mark(row.value!)} ${formatValue(row.value!)} ${row.unit.label}`),
          isLength && inches !== null ? `（${nearestInchFraction(inches, 64).text}″ 付近・1/64 in 単位）` : '',
          otherRefValue !== null
            ? `${REF_TEXT[otherRef]}では ${mark(otherRefValue)} ${formatValue(otherRefValue)} ${to.label}（大気圧 101.325 kPa として）`
            : '',
          '換算係数は定義値（1 kgf = 9.80665 N、1 in = 25.4 mm、1 lb = 0.45359237 kg）',
          '（サクッとJIS）',
        ]
          .filter(Boolean)
          .join('\n')

  // 換算表
  const tableUnits = quantity.units
  const factorColumns: Column<UnitDef>[] = [
    { key: 'unit', header: '1 単位', cell: (row) => <span className="num">1 {row.label}</span> },
    ...tableUnits.map((unit) => ({
      key: unit.id,
      header: <span className="num">{unit.label}</span>,
      cell: (row: UnitDef) =>
        row.id === unit.id ? <span className="text-zinc-400">1</span> : formatValue(convert(1, row, unit)),
    })),
  ]
  const temperatureColumns: Column<number>[] = [
    { key: 'C', header: '°C', cell: (c) => <span className="num">{formatValue(c)}</span> },
    { key: 'F', header: '°F', cell: (c) => formatValue(convert(c, CELSIUS, FAHRENHEIT)) },
    { key: 'K', header: 'K', cell: (c) => formatValue(convert(c, CELSIUS, KELVIN)) },
  ]
  const exportHeaders = isTemperature ? ['°C', '°F', 'K'] : ['1 単位', ...tableUnits.map((unit) => unit.label)]
  const exportRows = isTemperature
    ? TEMPERATURE_ROWS.map((c) => [
        c,
        plainValue(convert(c, CELSIUS, FAHRENHEIT)),
        plainValue(convert(c, CELSIUS, KELVIN)),
      ])
    : tableUnits.map((row) => [
        `1 ${row.label}`,
        ...tableUnits.map((unit) => (row.id === unit.id ? 1 : plainValue(convert(1, row, unit)))),
      ])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <QuantityTabs value={input.q} onChange={changeQuantity} />
          <ValueField
            value={input.v}
            onChange={(v) => setInput({ ...input, v })}
            unit={from.label}
            allowNegative={quantity.allowNegative}
            allowFraction={isLength && (from.id === 'in' || from.id === 'ft')}
            error={error}
            hint={
              comma ??
              (isLength
                ? 'インチは分数でも入力できます（例: 1-1/4、3/8）。'
                : isTemperature
                  ? '氷点下は ± ボタンでマイナスにできます。'
                  : isPressure
                    ? '真空（大気圧より低い）はマイナスのゲージ圧で入力できます。'
                    : 'カンマは 1,000 なら3桁区切り、0,5 なら小数点として読みます。')
            }
          />
          <UnitPicker label="入力の単位" units={quantity.units} value={from.id} onChange={changeFrom} />
          <div className="flex items-end gap-1.5">
            <div className="min-w-0 flex-1">
              <SelectField
                label="換算先の単位"
                value={to.id}
                options={quantity.units
                  .filter((unit) => unit.id !== from.id)
                  .map((unit) => ({ value: unit.id, label: unit.label }))}
                onChange={changeTo}
              />
            </div>
            <button
              type="button"
              onClick={swap}
              className="flex h-12 shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-500"
              aria-label="入力の単位と換算先を入れ替え"
            >
              <ArrowLeftRight className="size-4" aria-hidden />
              入替
            </button>
          </div>
          {isPressure && (
            <SegmentedControl
              label="入力した圧力の基準"
              value={input.ref}
              options={REF_OPTIONS}
              onChange={(ref) => setInput({ ...input, ref })}
              hint="圧力計の読みはふつうゲージ圧（大気圧との差）です。"
            />
          )}
        </div>
      </Card>

      <Card
        title="結果"
        index="02"
        icon={Calculator}
        id="unit-convert-result"
        aside={value !== null ? <CopyButton text={copyText} /> : undefined}
      >
        <MainResult
          label={`${quantity.label}を ${to.label} に換算${refText}`}
          value={result === null ? undefined : formatValue(result)}
          unit={to.label}
        >
          {result === null || value === null ? (
            error ? '入力を確認してください。' : '値を入力してください。'
          ) : (
            <span className="num">
              {valueText} {from.label} {mark(result)} {formatValue(result)} {to.label}
            </span>
          )}
        </MainResult>

        <p className="mt-3 text-xs text-zinc-500">すべての単位での値（行をタップすると上に大きく表示）</p>
        <ul className="mt-1" aria-label={`${quantity.label}のすべての単位での値`}>
          {rows.map((row) => {
            const isFrom = row.unit.id === from.id
            const isTo = row.unit.id === to.id
            let note: string | null = null
            if (row.value !== null && row.unit.id === 'in') {
              const fraction = nearestInchFraction(row.value, 64)
              note = `${Math.abs(fraction.errorMm) < 5e-7 ? '=' : '≒'} ${fraction.text}″（1/64 in 単位）`
            } else if (row.value !== null && row.unit.id === 'ft') {
              const exact = Math.abs(Math.round(row.value * 12 * 16) - row.value * 12 * 16) < 1e-6
              note = `${exact ? '=' : '≒'} ${formatFeetInches(row.value * 12)}（1/16 in 単位）`
            }
            return (
              <li key={row.unit.id} className="border-b border-zinc-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => changeTo(row.unit.id)}
                  disabled={isFrom}
                  aria-pressed={isFrom ? undefined : isTo}
                  className={`flex min-h-12 w-full items-center gap-3 px-2 py-2 text-left ${
                    isTo
                      ? 'bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]'
                      : isFrom
                        ? 'cursor-default bg-zinc-50'
                        : 'hover:bg-zinc-50'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="num block text-sm font-semibold text-zinc-900">
                      {row.unit.label}
                      {isFrom && (
                        <span className="ml-1.5 rounded-sm bg-zinc-200 px-1 py-0.5 align-[1px] text-[10px] font-semibold text-zinc-600">
                          入力
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] leading-snug text-zinc-500">{row.unit.reading}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num block text-base font-semibold break-all text-zinc-900 sm:text-lg">
                      {row.value === null ? '—' : isFrom ? echoValue(row.value) : formatValue(row.value)}
                    </span>
                    {note && <span className="num block text-[11px] text-zinc-500">{note}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {isPressure && otherRefValue !== null && (
          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-zinc-600">{REF_TEXT[otherRef]}に直すと</span>
              <span className="num text-lg font-semibold text-zinc-900">
                {mark(otherRefValue)} {formatValue(otherRefValue)} {to.label}
                <span className="ml-1 text-xs font-normal text-zinc-500">{otherRef === 'abs' ? 'abs' : 'G'}</span>
              </span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              絶対圧 ＝ ゲージ圧 ＋ 大気圧。大気圧を標準大気圧 101.325 kPa としています。実際の大気圧は天気や標高で変わります（標高 1000 m では約 90 kPa）。
            </p>
            {otherRef === 'abs' && otherRefValue < 0 && (
              <p className="mt-1 text-xs font-semibold text-red-700">
                絶対圧がマイナスになります。真空は −101.325 kPa（ゲージ圧）より低くなりません。入力を確認してください。
              </p>
            )}
          </div>
        )}

        {isLength && inches !== null && (
          <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-bold tracking-wider text-zinc-500">インチの分数（いちばん近い値）</p>
            <dl className="mt-1">
              {fractions.map((fraction) => (
                <div
                  key={fraction.denominator}
                  className="flex items-baseline justify-between gap-3 border-b border-zinc-200 py-1.5 last:border-b-0"
                >
                  <dt className="text-sm text-zinc-600">1/{fraction.denominator} in 単位</dt>
                  <dd className="text-right">
                    <span className="num text-base font-semibold text-zinc-900">{fraction.text}″</span>
                    <span className="num ml-2 text-xs text-zinc-500">
                      {Math.abs(fraction.errorMm) < 5e-7
                        ? 'ぴったり'
                        : `差 ${fraction.errorMm > 0 ? '+' : '−'}${formatValue(Math.abs(fraction.errorMm), 3)} mm`}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-1 text-xs text-zinc-500">差は「分数の寸法 − 入力の寸法」です。</p>
          </div>
        )}

        {isPressure && (
          <p className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs leading-relaxed text-orange-900">
            フランジの「10K」などは<strong>呼び圧力</strong>で、「10 kgf/cm² まで使える」という意味ではありません。使える圧力（最高使用圧力）は材料・温度・流体によって変わるので、規格表で確認してください。
            <Link
              to="/flange-bolt-length"
              className="ml-1 font-semibold text-orange-900 underline underline-offset-2 hover:text-orange-950"
            >
              フランジ寸法を見る
            </Link>
          </p>
        )}

        <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
          <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            換算係数は定義どおりの値（1 kgf = 9.80665 N、1 in = 25.4 mm、1 lb = 0.45359237 kg など）から計算しています。表示は有効数字6桁（丸めた値は「≒」）。
          </span>
        </p>

        <div className="mt-4">
          <FormulaInfo>
            {isTemperature ? (
              <>
                <p>温度は比例ではないので、式で換算します（K を経由）。</p>
                <Formula>°F = °C × 9/5 + 32</Formula>
                <Formula>K = °C + 273.15</Formula>
                {value !== null && result !== null && (
                  <Formula>
                    例: {valueText} {from.label} → {formatValue(from.toBase(value))} K → {formatValue(result)} {to.label}
                  </Formula>
                )}
                <p>
                  温度の「差」（上昇量など）を換算するときは、1 K = 1 °C の差 = 1.8 °F の差です（32 や 273.15 は足しません）。
                </p>
              </>
            ) : (
              <>
                <p>
                  入力の値を基準の単位（{quantity.base}）に直し、換算先の単位 1 つ分で割ります。
                </p>
                <Formula>換算値 = 値 × a ÷ b</Formula>
                <FormulaLegend
                  items={[
                    ['a', `1 ${from.label} = ${formatValue(from.factor ?? 1, 12)} ${quantity.base}`],
                    ['b', `1 ${to.label} = ${formatValue(to.factor ?? 1, 12)} ${quantity.base}`],
                  ]}
                />
                {value !== null && result !== null && (
                  <>
                    <Formula>
                      例: {valueText} × {formatValue(from.factor ?? 1, 12)} ÷ {formatValue(to.factor ?? 1, 12)}
                    </Formula>
                    <Formula>
                      　　{mark(result)} {formatValue(result)} {to.label}
                    </Formula>
                  </>
                )}
              </>
            )}
            <p className="text-xs font-semibold text-zinc-600">使っている定義（{quantity.label}）</p>
            <FormulaLegend items={quantity.units.map((unit) => [unit.label, unit.definition] as const)} />
            {isPressure && (
              <p>
                ゲージ圧 ↔ 絶対圧は、標準大気圧 101.325 kPa を足し引きしています（絶対圧 ＝ ゲージ圧 ＋ 101.325 kPa）。
              </p>
            )}
            <p>
              元になる定義: 標準重力 9.80665 m/s²（1 kgf = 9.80665 N）、1 in = 25.4 mm、1 lb = 0.45359237 kg、1 bar = 100 kPa、1 atm = 101.325 kPa。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card
        title={isTemperature ? '温度の早見表' : `${quantity.label}の換算表`}
        index="03"
        icon={Table2}
        className="lg:col-span-2"
        flush
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <p className="min-w-0 flex-1 basis-56 text-xs text-zinc-500">
            {isTemperature
              ? '°C を基準にした早見表です。'
              : '行の単位 1 つが、列の単位でいくつになるかの表です（有効数字6桁）。入力の単位の行を強調しています。'}
          </p>
          <TableExport
            title={isTemperature ? '温度の早見表' : `${quantity.label}の換算表（行の単位 1 つが、列の単位でいくつか）`}
            filename={`unit-convert-${input.q}`}
            headers={exportHeaders}
            rows={exportRows}
            note="換算係数は定義値から計算（有効数字6桁）。サクッとJIS"
          />
        </div>
        <div className="mt-2">
          {isTemperature ? (
            <DataTable
              columns={temperatureColumns}
              rows={TEMPERATURE_ROWS}
              rowKey={(c) => String(c)}
              isHighlighted={(c) => value !== null && from.id === 'C' && c === value}
              caption="温度の早見表（°C・°F・K）"
            />
          ) : (
            <DataTable
              columns={factorColumns}
              rows={tableUnits}
              rowKey={(row) => row.id}
              isHighlighted={(row) => row.id === from.id}
              caption={`${quantity.label}の換算表`}
            />
          )}
        </div>
      </Card>

      {value !== null && result !== null && (
        <StickyResult
          targetId="unit-convert-result"
          label={`${valueText} ${from.label}${refText} ${mark(result)}`}
          value={formatValue(result)}
          unit={to.label}
        />
      )}
    </div>
  )
}
