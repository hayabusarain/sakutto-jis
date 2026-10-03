import {
  ArrowRight,
  Calculator,
  ChevronDown,
  ClipboardList,
  ListPlus,
  Minus,
  Plus,
  Settings2,
  Table2,
  Trash2,
} from 'lucide-react'
import { useId, useState } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks } from '../../components/RelatedLinks'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { parseNumber, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { findFlange, nearestSize } from '../flange-bolt/calc'
import { FLANGE_TABLE_NO, FLANGES, PRESSURE_CLASSES, type PressureClass } from '../flange-bolt/data'
import { ExportInAside, ExportInBody } from '../flange-bolt/ExportSlot'
import { THREAD_CHOICES } from '../flange-bolt/input'
import { BOLT_TYPE_LABELS, detailSummary, NUT_LABELS, ROUNDING_LABELS, sizeLabel } from '../flange-bolt/labels'
import { nutsPerBolt, spareCount, takeoff, TAKEOFF_ITEM_KINDS, type TakeoffConditions, type TakeoffLine } from './calc'
import {
  decodeRows,
  DEFAULT_INPUT,
  encodeRows,
  flangeToolHref,
  isTakeoffInput,
  MAX_COUNT,
  MAX_ROWS,
  normalizeTakeoffInput,
  parseJointCount,
  sanitizeCount,
  SPARE_CHOICES,
  type TakeoffRow,
} from './input'
import {
  boltSpec,
  flangeTablesLabel,
  GASKET_NOTE,
  ITEM_UNITS,
  itemGroupTitle,
  itemSpec,
  nutTableLabel,
  sourceText,
  takeoffConditionsText,
  takeoffText,
  washerTableLabel,
} from './labels'

const RESULT_CARD_ID = 'takeoff-result'

const PRESSURE_OPTIONS = PRESSURE_CLASSES.map((p) => ({ value: p, label: p }))
const TYPE_OPTIONS = [
  { value: 'hex', label: '六角ボルト' },
  { value: 'stud', label: 'スタッド' },
] as const
const NUT_OPTIONS = [
  { value: 'style1', label: NUT_LABELS.style1 },
  { value: 'ja1', label: NUT_LABELS.ja1 },
] as const
const WASHER_OPTIONS = [
  { value: '0', label: 'なし' },
  { value: '1', label: '片側' },
  { value: '2', label: '両側' },
] as const
const THREAD_OPTIONS = THREAD_CHOICES.map((n) => ({ value: String(n), label: `${n}山` }))
const ROUNDING_OPTIONS = [
  { value: '5mm', label: ROUNDING_LABELS['5mm'] },
  { value: 'jis', label: ROUNDING_LABELS.jis },
] as const
const SPARE_OPTIONS = SPARE_CHOICES.map((p) => ({ value: String(p), label: p === 0 ? 'なし' : `${p}%` }))
/** 予備の説明の例（32本の5% = 1.6 → 2本） */
const SPARE_EXAMPLE = { quantity: 32, percent: 5, spare: spareCount(32, 5) }
/** 現場でよく使う呼び径（JISフランジ＆ボルト長さのよく使う呼び径と同じ。どのクラスにもある） */
const QUICK_SIZES = ['15A', '20A', '25A', '40A', '50A', '80A', '100A', '150A'] as const

const selectClass =
  'h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white pr-7 pl-2 text-base text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40'
const iconButton =
  'flex size-11 shrink-0 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-30'

/** 継手ごとの内訳の表の1行（最後に合計の行） */
interface BreakdownRow {
  key: string
  label: string
  joints: number | null
  spec: string
  perJoint: number | null
  bolts: number
  nuts: number
  washers: number
  gaskets: number
  table: string
  total: boolean
}

export function FlangeTakeoffTool() {
  const [input, setInput] = useToolState('flange-takeoff', DEFAULT_INPUT, isTakeoffInput, normalizeTakeoffInput)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addPressure, setAddPressure] = useState<PressureClass>('10K')
  const [addSize, setAddSize] = useState('50A')
  const [status, setStatus] = useState('')
  const [rowNotice, setRowNotice] = useState<{ index: number; text: string } | null>(null)
  const addSizeId = useId()

  const rows = decodeRows(input.rows) ?? []
  const setRows = (next: readonly TakeoffRow[]) => setInput({ ...input, rows: encodeRows(next) })

  const gasket = parseNumber(input.gasket)
  const gasketValid = gasket !== null && gasket >= 0 && gasket < 50
  const conditions: TakeoffConditions | null = gasketValid
    ? {
        type: input.type,
        gasket,
        washers: input.washers,
        nut: input.nut,
        threads: input.threads,
        rounding: input.rounding,
      }
    : null
  const result = conditions ? takeoff(rows, conditions, input.spare) : null
  const lineAt = (index: number): TakeoffLine | undefined => result?.lines.find((line) => line.index === index)
  const counted = result?.lines.filter((line) => line.joints !== null) ?? []
  const hasItems = (result?.items.length ?? 0) > 0
  const nuts = nutsPerBolt(input)

  // ---------------------------------------------------------------------------
  // 一覧の操作

  const updateRow = (index: number, patch: Partial<TakeoffRow>) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const changeRowPressure = (index: number, pressure: PressureClass) => {
    const row = rows[index]
    // 同じ呼び径が無い圧力（16K・20K に 175A・225A は無い。JIS B 2220 表12）にしたら、最も近い呼び径にする
    const size = nearestSize(pressure, row.size)
    setRowNotice(size === row.size ? null : { index, text: `${pressure} に ${row.size} は無いため、${size} にしました。` })
    updateRow(index, { pressure, size })
  }

  const stepCount = (index: number, delta: 1 | -1) => {
    const current = Number(rows[index].count) || 0
    const next = Math.min(MAX_COUNT, Math.max(1, current + delta))
    updateRow(index, { count: String(next) })
  }

  const removeRow = (index: number) => {
    const row = rows[index]
    setRowNotice(null)
    setStatus(`${index + 1}行目（${row.pressure} ${row.size}）を削除しました。`)
    setRows(rows.filter((_, i) => i !== index))
  }

  const clearRows = () => {
    if (!window.confirm('一覧の継手をすべて削除しますか？')) return
    setRowNotice(null)
    setStatus('一覧をすべて削除しました。')
    setRows([])
  }

  /** 継手を1か所足す。同じ呼び圧力・呼び径の行があれば、その行のか所数を増やす */
  const addJoint = (pressure: PressureClass, size: string) => {
    setRowNotice(null)
    const existing = rows.findIndex((row) => row.pressure === pressure && row.size === size)
    if (existing !== -1) {
      const next = Math.min(MAX_COUNT, (Number(rows[existing].count) || 0) + 1)
      updateRow(existing, { count: String(next) })
      setStatus(`${pressure} ${size} を1か所増やしました（${existing + 1}行目: ${next}か所）。`)
      return
    }
    if (rows.length >= MAX_ROWS) {
      setStatus(`一覧に入れられるのは ${MAX_ROWS} 行までです。`)
      return
    }
    setRows([...rows, { pressure, size, count: '1' }])
    setStatus(`${pressure} ${size} を追加しました（${rows.length + 1}行目: 1か所）。`)
  }

  const changeAddPressure = (pressure: PressureClass) => {
    setAddPressure(pressure)
    setAddSize(nearestSize(pressure, addSize))
  }

  // ---------------------------------------------------------------------------
  // 結果の文章・表

  const copyText =
    result && conditions
      ? takeoffText(result, conditions, input.spare)
      : '【フランジ部品の拾い出し】ガスケットの厚さを入力してください'

  const itemsExport =
    result && conditions && hasItems ? (
      <TableExport
        title={`フランジ部品の拾い出し（${result.joints}か所${input.spare > 0 ? `・予備${input.spare}%` : ''}）`}
        filename="flange_takeoff"
        headers={['品名', '呼び', '長さ・厚さ [mm]', '数量', '単位', 'うち予備']}
        rows={result.items.map((item) => [
          itemGroupTitle(item.kind, conditions),
          item.kind === 'bolt' ? `M${item.bolt}` : itemSpec(item),
          item.kind === 'bolt' ? (item.length ?? '') : item.kind === 'gasket' ? trim(conditions.gasket) : '',
          item.total,
          ITEM_UNITS[item.kind],
          item.spare,
        ])}
        note={`条件: ${takeoffConditionsText(conditions)}。${GASKET_NOTE}典拠: ${sourceText(result, conditions)}`}
      />
    ) : null

  const breakdownRows: BreakdownRow[] = result
    ? [
        ...result.lines.map(
          (line): BreakdownRow => ({
            key: String(line.index),
            label: `${line.pressure} ${line.size}`,
            joints: line.joints,
            spec: boltSpec(line.flange.bolt, line.bolt.length),
            perJoint: line.perJoint.bolts,
            bolts: line.bolts,
            nuts: line.nuts,
            washers: line.washers,
            gaskets: line.gaskets,
            table: FLANGE_TABLE_NO[line.pressure],
            total: false,
          }),
        ),
        {
          key: 'total',
          label: '合計',
          joints: result.joints,
          spec: '',
          perJoint: null,
          bolts: result.totals.bolt.quantity,
          nuts: result.totals.nut.quantity,
          washers: result.totals.washer.quantity,
          gaskets: result.totals.gasket.quantity,
          table: '',
          total: true,
        },
      ]
    : []
  const strong = (row: BreakdownRow, value: string | number) => (row.total ? <strong>{value}</strong> : value)
  const breakdownColumns: Column<BreakdownRow>[] = [
    { key: 'label', header: '継手', cell: (row) => row.label },
    {
      key: 'joints',
      header: 'か所',
      cell: (row) =>
        row.joints === null ? <span className="font-semibold text-red-700">未入力</span> : strong(row, row.joints),
    },
    { key: 'spec', header: 'ボルトの呼び', cell: (row) => row.spec },
    { key: 'perJoint', header: '本/か所', cell: (row) => row.perJoint ?? '' },
    { key: 'bolts', header: 'ボルト（本）', cell: (row) => strong(row, row.bolts) },
    { key: 'nuts', header: 'ナット（個）', cell: (row) => strong(row, row.nuts) },
    ...(input.washers > 0
      ? [{ key: 'washers', header: '平座金（枚）', cell: (row: BreakdownRow) => strong(row, row.washers) }]
      : []),
    { key: 'gaskets', header: 'ガスケット（枚）', cell: (row) => strong(row, row.gaskets) },
    { key: 'table', header: '寸法の表（JIS B 2220）', cell: (row) => row.table },
  ]
  const breakdownExport =
    result && conditions && result.lines.length > 0 ? (
      <TableExport
        title="フランジ部品の拾い出し（継手ごとの内訳）"
        filename="flange_takeoff_rows"
        headers={[
          '呼び圧力',
          '呼び径',
          'か所数',
          'ボルトの呼び',
          'ボルト長さ [mm]',
          '1か所の本数',
          'ボルト [本]',
          'ナット [個]',
          '平座金 [枚]',
          'ガスケット [枚]',
          '寸法の表（JIS B 2220）',
        ]}
        rows={[
          ...result.lines.map((line) => [
            line.pressure,
            line.size,
            line.joints ?? '未入力',
            `M${line.flange.bolt}`,
            line.bolt.length ?? '',
            line.perJoint.bolts,
            line.bolts,
            line.nuts,
            line.washers,
            line.gaskets,
            FLANGE_TABLE_NO[line.pressure],
          ]),
          [
            '合計',
            '',
            result.joints,
            '',
            '',
            '',
            result.totals.bolt.quantity,
            result.totals.nut.quantity,
            result.totals.washer.quantity,
            result.totals.gasket.quantity,
            '',
          ],
        ]}
        note={`予備は含みません。条件: ${takeoffConditionsText(conditions)}。${GASKET_NOTE}典拠: ${sourceText(result, conditions)}`}
      />
    ) : null

  const pressures = result?.pressures ?? []
  const boltSizes = result?.boltSizes ?? []
  const flangeTables = flangeTablesLabel(pressures)
  const nutTable = nutTableLabel(boltSizes, input.nut)
  const washerTable = washerTableLabel(boltSizes)
  const example = counted[0]
  const boltName = BOLT_TYPE_LABELS[input.type]

  const primaryNote = !gasketValid
    ? 'ガスケットの厚さを数値で入力してください（共通の条件）。'
    : rows.length === 0
      ? '継手を一覧に追加してください。'
      : !hasItems
        ? 'か所数を入力してください。'
        : null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card
        title="継手の一覧"
        index="01"
        icon={ClipboardList}
        className="lg:self-start"
        aside={
          rows.length > 0 ? (
            <button
              type="button"
              onClick={clearRows}
              className="inline-flex h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
            >
              <Trash2 className="size-3.5" aria-hidden />
              すべて削除
            </button>
          ) : undefined
        }
      >
        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-zinc-300 px-3 py-4 text-center text-sm text-zinc-600">
            継手がありません。下の「継手を追加」から入れてください。
          </p>
        ) : (
          <ol className="space-y-2">
            {rows.map((row, index) => {
              const line = lineAt(index)
              const flange = line?.flange ?? findFlange(row.pressure, row.size)
              const name = `${index + 1}行目（${row.pressure} ${row.size}）`
              const countError =
                parseJointCount(row.count) === null
                  ? row.count === ''
                    ? 'か所数を入力してください（集計に入れていません）'
                    : `1〜${MAX_COUNT} の整数で入力してください（集計に入れていません）`
                  : null
              const errorId = `row-${index}-error`
              const spec = flange ? boltSpec(flange.bolt, line?.bolt.length ?? null) : '—'
              return (
                <li key={index} className="rounded-md border border-zinc-200 p-2">
                  <div className="flex items-center gap-1.5">
                    <span className="num w-5 shrink-0 text-center text-xs font-bold text-zinc-400" aria-hidden>
                      {index + 1}
                    </span>
                    <div className="relative w-[4.5rem] shrink-0">
                      <select
                        value={row.pressure}
                        onChange={(event) => changeRowPressure(index, event.target.value as PressureClass)}
                        aria-label={`${index + 1}行目の呼び圧力`}
                        className={selectClass}
                      >
                        {PRESSURE_CLASSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute inset-y-0 right-1.5 my-auto size-4 text-zinc-500" aria-hidden />
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <select
                        value={row.size}
                        onChange={(event) => {
                          setRowNotice(null)
                          updateRow(index, { size: event.target.value })
                        }}
                        aria-label={`${index + 1}行目の呼び径`}
                        className={selectClass}
                      >
                        {/* 狭い画面でも切れないよう、一覧では A 呼称だけ（B 呼称は追加の欄に出す） */}
                        {FLANGES[row.pressure].map((r) => (
                          <option key={r.size} value={r.size}>
                            {r.size}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute inset-y-0 right-1.5 my-auto size-4 text-zinc-500" aria-hidden />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className={iconButton}
                      aria-label={`${name}を削除`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-6">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => stepCount(index, -1)}
                        disabled={(Number(row.count) || 0) <= 1}
                        className={iconButton}
                        aria-label={`${name}のか所数を1つ減らす`}
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={row.count}
                        onChange={(event) => updateRow(index, { count: sanitizeCount(event.target.value) })}
                        aria-label={`${name}のか所数`}
                        aria-invalid={countError ? true : undefined}
                        aria-describedby={countError ? errorId : undefined}
                        className={`num h-11 w-14 rounded-md border bg-white px-1 text-center text-base text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-orange-500/40 ${
                          countError ? 'border-red-500' : 'border-zinc-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => stepCount(index, 1)}
                        disabled={(Number(row.count) || 0) >= MAX_COUNT}
                        className={iconButton}
                        aria-label={`${name}のか所数を1つ増やす`}
                      >
                        <Plus className="size-4" aria-hidden />
                      </button>
                      <span className="text-sm text-zinc-600">か所</span>
                    </div>
                    {flange && (
                      <Link
                        to={flangeToolHref(row, input)}
                        className="ml-auto inline-flex min-h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 hover:border-zinc-900"
                        aria-label={`${name}: ${boltName} ${spec}・${flange.n}本/か所。この条件のボルト長さの計算を開く`}
                      >
                        <span className="num">{spec}</span>
                        <span className="text-xs font-normal text-zinc-600">・{flange.n}本/か所</span>
                        <ArrowRight className="size-3.5 shrink-0 text-orange-600" aria-hidden />
                      </Link>
                    )}
                  </div>
                  {countError && (
                    <p id={errorId} className="mt-1 pl-6 text-xs font-semibold text-red-700">
                      {countError}
                    </p>
                  )}
                  {rowNotice?.index === index && (
                    <p className="mt-1 pl-6 text-xs font-semibold text-orange-800" role="status">
                      {rowNotice.text}
                    </p>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-800">
            <ListPlus className="size-4 text-orange-600" aria-hidden />
            継手を追加
          </p>
          <div className="mt-3 grid gap-3">
            <SegmentedControl label="呼び圧力" value={addPressure} options={PRESSURE_OPTIONS} onChange={changeAddPressure} />
            <div>
              <label htmlFor={addSizeId} className="mb-1.5 block text-sm font-semibold text-zinc-700">
                呼び径
              </label>
              <div className="flex gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <select
                    id={addSizeId}
                    value={addSize}
                    onChange={(event) => setAddSize(event.target.value)}
                    className={`${selectClass} h-12`}
                  >
                    {FLANGES[addPressure].map((r) => (
                      <option key={r.size} value={r.size}>
                        {sizeLabel(r.size)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute inset-y-0 right-1.5 my-auto size-4 text-zinc-500" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={() => addJoint(addPressure, addSize)}
                  className="inline-flex h-12 shrink-0 items-center gap-1 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  <Plus className="size-4" aria-hidden />
                  追加
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-600" id={`${addSizeId}-quick`}>
                よく使う呼び径（押すたびに {addPressure} を1か所追加）
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`${addSizeId}-quick`}>
                {QUICK_SIZES.filter((size) => findFlange(addPressure, size)).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => addJoint(addPressure, size)}
                    aria-label={`${addPressure} ${size} を1か所追加`}
                    className="num inline-flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-sm border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-700 hover:border-zinc-500"
                  >
                    <Plus className="size-3 text-orange-600" aria-hidden />
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-2 min-h-4 text-xs font-semibold text-zinc-700" role="status">
            {status}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            同じ呼び圧力・呼び径が一覧にあるときは、その行のか所数を増やします。一覧は {MAX_ROWS} 行まで、1行のか所数は {MAX_COUNT} まで。
          </p>
        </div>
      </Card>

      <Card title="共通の条件" index="02" icon={Settings2} className="lg:col-start-1 lg:self-start">
        <div className="grid gap-4">
          <SegmentedControl
            label="ボルトの種類"
            value={input.type}
            options={TYPE_OPTIONS}
            onChange={(type) => setInput({ ...input, type })}
            hint={input.type === 'stud' ? '両端にナットを付けるスタッドボルト（ナットは1本に2個）' : '片側が頭の六角ボルト（ナットは1本に1個）'}
          />
          <NumberField
            label="ガスケット（パッキン）の厚さ"
            value={input.gasket}
            onChange={(value) => setInput({ ...input, gasket: value })}
            placeholder="3"
            unit="mm"
            error={gasketValid ? undefined : '0 以上 50 未満の数値で入力してください'}
            hint="全部の継手で同じ厚さとして計算します。"
          />
          <SegmentedControl
            label="予備"
            value={String(input.spare)}
            options={SPARE_OPTIONS}
            onChange={(value) => setInput({ ...input, spare: Number(value) })}
            hint={`品目ごとに、必要数 × 割合を切り上げて足します（例: ${SPARE_EXAMPLE.quantity}本の${SPARE_EXAMPLE.percent}% → ${SPARE_EXAMPLE.spare}本）。割合は目安で、規格の値ではありません。`}
          />

          <details
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
            className="group rounded-md border border-zinc-200"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-800">詳細条件</span>
                <span className="block text-xs leading-relaxed text-zinc-500">
                  {detailSummary({
                    nut: input.nut,
                    washers: input.washers,
                    threads: input.threads,
                    t2: null,
                    rounding: input.rounding,
                  })}
                </span>
              </span>
              <ChevronDown className="size-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-4 border-t border-zinc-200 p-3">
              <SegmentedControl
                label="ナット"
                value={input.nut}
                options={NUT_OPTIONS}
                onChange={(nut) => setInput({ ...input, nut })}
                hint="JIS本体はスタイル1の最大高さ、旧JISは附属書JA 1種の高さでボルト長さを計算します。"
              />
              <SegmentedControl
                label="平座金"
                value={String(input.washers) as '0' | '1' | '2'}
                options={WASHER_OPTIONS}
                onChange={(value) => setInput({ ...input, washers: Number(value) as 0 | 1 | 2 })}
                hint="ボルト1本あたりの枚数（片側 1枚・両側 2枚）で数え、厚さをボルト長さに足します。"
              />
              <SegmentedControl
                label="ナットからの突き出し"
                value={String(input.threads)}
                options={THREAD_OPTIONS}
                onChange={(value) => setInput({ ...input, threads: Number(value) })}
              />
              <SegmentedControl
                label="長さの丸め"
                value={input.rounding}
                options={ROUNDING_OPTIONS}
                onChange={(rounding) => setInput({ ...input, rounding })}
              />
            </div>
          </details>
          <p className="text-xs leading-relaxed text-zinc-600">
            ボルトの長さは「JISフランジ＆ボルト長さ」と同じ計算で、相手側も同じフランジとしています。バルブ・機器のフランジと組む継手は、一覧の「M16×60」などのボタンから計算を開き、相手側の厚さを入れて確かめてください。
          </p>
        </div>
      </Card>

      <Card
        title="拾い出し結果"
        index="03"
        icon={Calculator}
        id={RESULT_CARD_ID}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
        aside={<CopyButton text={copyText} />}
      >
        <PrimaryResult
          label={`ボルトの合計（${result?.joints ?? 0}か所）`}
          value={hasItems && result ? result.totals.bolt.total : undefined}
          unit="本"
        >
          {primaryNote ??
            (result && (
              <>
                <span className="num font-semibold text-white">
                  ナット {result.totals.nut.total}個
                  {result.totals.washer.total > 0 && `・平座金 ${result.totals.washer.total}枚`}・ガスケット{' '}
                  {result.totals.gasket.total}枚
                </span>
                {input.spare > 0 && (
                  <>
                    <br />
                    予備 {input.spare}% を品目ごとに切り上げて含みます（予備なしはボルト {result.totals.bolt.quantity}本）。
                  </>
                )}
              </>
            ))}
        </PrimaryResult>

        {result && result.skipped.length > 0 && (
          <p className="mt-2 text-xs font-semibold text-red-700">
            か所数が入っていない {result.skipped.map((i) => `${i + 1}行目`).join('・')} は集計していません。
          </p>
        )}

        {result && conditions && hasItems && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold tracking-wider text-zinc-500">品目ごとの数量（発注用）</h3>
              {itemsExport}
            </div>
            <table className="mt-2 w-full border-collapse text-sm">
              <caption className="sr-only">品目ごとの数量（品名・呼び・数量）</caption>
              {TAKEOFF_ITEM_KINDS.map((kind) => {
                const items = result.items.filter((item) => item.kind === kind)
                if (items.length === 0) return null
                return (
                  <tbody key={kind}>
                    <tr>
                      <th
                        scope="colgroup"
                        colSpan={2}
                        className="border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left text-xs font-bold text-zinc-600"
                      >
                        {itemGroupTitle(kind, conditions)}
                      </th>
                    </tr>
                    {items.map((item) => (
                      <tr key={item.key} className="border-b border-zinc-100">
                        <th scope="row" className="num px-2 py-2 text-left text-base font-semibold text-zinc-900">
                          {itemSpec(item)}
                        </th>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className="num text-lg font-semibold text-zinc-900">{item.total}</span>
                          <span className="ml-1 text-sm text-zinc-500">{ITEM_UNITS[item.kind]}</span>
                          {item.spare > 0 && (
                            <span className="block text-xs text-zinc-500">
                              うち予備 <span className="num">{item.spare}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )
              })}
            </table>
          </>
        )}

        <p className="mt-3 text-xs leading-relaxed text-zinc-600">
          {GASKET_NOTE}
          ガスケットの寸法（JIS B 2404 など）は、このサイトでは規格原文と照合していないため出していません。形（全面形・リング形）と寸法は、フランジの座（FF・RF）や現物、メーカーの資料で確かめてください。
        </p>

        <div className="mt-3 space-y-1">
          {flangeTables && (
            <Citation code="JIS B 2220" detail={flangeTables} suffix="のボルトの呼び・穴数・フランジの厚さ" />
          )}
          {nutTable && <Citation code="JIS B 1181" detail={nutTable} suffix="のナット高さ（ボルト長さの計算）" />}
          {input.rounding === 'jis' && (
            <Citation
              code="JIS B 1180"
              detail="表3"
              suffix={input.type === 'stud' ? 'の六角ボルトの呼び長さの系列を準用' : 'の呼び長さの系列'}
            />
          )}
          {input.washers > 0 && washerTable && <Citation code="JIS B 1256" detail={washerTable} suffix="の座金厚さ" />}
          <Citation code="JIS B 0205-2" suffix="の並目ピッチ（突き出しの計算）" />
        </div>

        {result && example && example.joints !== null && (
          <div className="mt-4">
            <FormulaInfo>
              <p>
                数量は、JIS B 2220 の表のボルト穴の数 n と、入力したか所数から数えています。同じ呼び・長さのボルト、同じ呼びのナット・平座金は、行をまたいでまとめています。
              </p>
              <Formula>ボルト = n × か所数</Formula>
              <Formula>ナット = ボルト × {nuts}</Formula>
              {input.washers > 0 && <Formula>平座金 = ボルト × {input.washers}</Formula>}
              <Formula>ガスケット = か所数</Formula>
              {input.spare > 0 && <Formula>予備 = 必要数 × {input.spare} ÷ 100</Formula>}
              <p>
                ナットは{input.type === 'stud' ? 'スタッドボルトの両側に付けるので1本に2個' : '六角ボルト1本に1個'}
                {input.washers > 0 && `、平座金は1本に${input.washers}枚（${input.washers === 1 ? '片側' : '両側'}）`}、ガスケットは1か所に1枚です。
                {input.spare > 0 && '予備は品目ごとに計算し、端数は切り上げます。'}
              </p>
              <p className="num">
                例: {example.pressure} {example.size}（{FLANGE_TABLE_NO[example.pressure]}: n = {example.flange.n}・M{example.flange.bolt}）×{' '}
                {example.joints}か所 → ボルト {example.flange.n} × {example.joints} = {example.bolts}本、ナット {example.bolts} × {nuts} ={' '}
                {example.nuts}個{input.washers > 0 && `、平座金 ${example.bolts} × ${input.washers} = ${example.washers}枚`}、ガスケット{' '}
                {example.gaskets}枚
              </p>
              <p>ボルトの長さは、JISフランジ＆ボルト長さと同じ式です（相手側も同じフランジ）。</p>
              {input.type === 'hex' ? (
                <Formula>L = t + t + G + n × W + m + k × P</Formula>
              ) : (
                <Formula>L = t + t + G + n × W + 2m + 2 × k × P</Formula>
              )}
              <Formula>
                = {trim(example.flange.t)} + {trim(example.flange.t)} + {trim(conditions?.gasket ?? 0)} + {input.washers} ×{' '}
                {trim(example.bolt.washerThickness)} + {nuts > 1 ? `2 × ${trim(example.bolt.nutHeight)}` : trim(example.bolt.nutHeight)} +{' '}
                {nuts > 1 ? '2 × ' : ''}
                {input.threads} × {trim(example.bolt.pitch)} = {trim(example.bolt.required)} mm → {example.bolt.length ?? '—'} mm
              </Formula>
              <FormulaLegend
                items={[
                  ['t', `フランジの厚さ（JIS B 2220 ${FLANGE_TABLE_NO[example.pressure]}。RF は座の高さを含む）`],
                  ['G', 'ガスケットの厚さ'],
                  ['n × W', '平座金の枚数 × 厚さ'],
                  ['m', 'ナットの高さ'],
                  ['k × P', 'ナットからの突き出し（山数 × 並目ピッチ）'],
                ]}
              />
              <p>
                計算値を{input.rounding === '5mm' ? '5mm刻み' : 'JIS B 1180 の呼び長さの系列'}
                に切り上げています。市販品の長さはメーカーによって異なるので、在庫の長さも確認してください。行ごとの計算の詳細は、一覧の「{boltSpec(example.flange.bolt, example.bolt.length)}」などのボタンから開けます。
              </p>
            </FormulaInfo>
          </div>
        )}

        <RelatedLinks
          links={boltSizes.map((bolt) => ({
            to: toolHref('/bolt-size', { d: bolt }),
            label: `M${bolt} のボルト・ナット寸法`,
          }))}
        />
      </Card>

      <Card
        title="継手ごとの内訳"
        index="04"
        icon={Table2}
        className="lg:col-span-2"
        flush
        aside={breakdownExport && <ExportInAside>{breakdownExport}</ExportInAside>}
      >
        {breakdownExport && <ExportInBody>{breakdownExport}</ExportInBody>}
        {result && result.lines.length > 0 ? (
          <>
            <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-500">
              予備は含みません。ボルトの長さは共通の条件（{conditions ? takeoffConditionsText(conditions) : ''}）で計算。
            </p>
            <div className="mt-2">
              <DataTable
                columns={breakdownColumns}
                rows={breakdownRows}
                rowKey={(row) => row.key}
                caption="継手ごとの内訳"
              />
            </div>
          </>
        ) : (
          <p className="px-4 py-4 text-sm text-zinc-600">
            {gasketValid ? '継手を一覧に追加すると、ここに行ごとの数が出ます。' : 'ガスケットの厚さを数値で入力してください。'}
          </p>
        )}
      </Card>

      <StickyResult
        targetId={RESULT_CARD_ID}
        label={`拾い出し ${result?.joints ?? 0}か所・${boltName}`}
        value={hasItems && result ? String(result.totals.bolt.total) : '—'}
        unit={hasItems && result ? `本・ナット${result.totals.nut.total}個` : undefined}
      />
    </div>
  )
}
