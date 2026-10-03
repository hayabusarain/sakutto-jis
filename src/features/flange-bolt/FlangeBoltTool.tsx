import { Calculator, ChevronDown, ClipboardList, Download, PenTool, Search } from 'lucide-react'
import { useState } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks, type RelatedLink } from '../../components/RelatedLinks'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { downloadText } from '../../lib/download'
import { parseNumber, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { standardLabel, type StandardCode } from '../../standards'
import { BOLT_SIZES } from '../bolt-size/data'
import { pipeDimensions } from '../steel-pipe/calc'
import { ClassComparisonCard } from './ClassComparisonCard'
import {
  findFlange,
  flangeBoltLength,
  flangeThicknessTolerance,
  isRowUnverified,
  isUnverified,
  nearestSize,
  protrusionThreads,
  raisedFaceHeight,
  spannerSize,
  type BoltConditions,
} from './calc'
import {
  COARSE_PITCH,
  FLANGE_SEAT_COMBINATION_TABLE,
  FLANGE_TABLE_NO,
  FLANGE_TOLERANCE_TABLE,
  FLANGES,
  flangeTableLabel,
  GASKET_SEAT_TABLE,
  PIPE_OD,
  PRESSURE_CLASSES,
  UNVERIFIED_LEGEND,
  type FlangeRow,
  type PressureClass,
} from './data'
import { dxfFilename, flangeDxf, isDrawableBore, tapDrillFor, type DrawingKind } from './drawing'
import { ExportInAside, ExportInBody } from './ExportSlot'
import { FlangePreview } from './FlangePreview'
import { IDENTIFY_CARD_ID, IdentifyCard } from './IdentifyCard'
import { DEFAULT_INPUT, isFlangeInput, normalizeFlangeInput, THREAD_CHOICES } from './input'
import {
  BOLT_TYPE_LABELS,
  conditionsText,
  detailSummary,
  markedText,
  NUT_LABELS,
  otherSpannerText,
  sizeLabel,
} from './labels'
import { Marked, UnverifiedLegend } from './Unverified'

const RESULT_CARD_ID = 'flange-result'

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
  { value: '5mm', label: '5mm刻み' },
  { value: 'jis', label: 'JIS標準長さ' },
] as const
const DRAWING_OPTIONS = [
  { value: 'flange', label: '本体' },
  { value: 'through', label: '通し穴' },
  { value: 'tap', label: 'タップ' },
] as const
/** 現場でよく使う呼び径 */
const QUICK_SIZES = ['15A', '20A', '25A', '40A', '50A', '80A', '100A', '150A'] as const
/** 厚さの許容差の区分の例（JIS B 2220 表22。このツールの厚さ 9〜36 mm は 20 以下か 20 を超え 50 以下） */
const TOLERANCE_UP_TO_20 = flangeThicknessTolerance(20)
const TOLERANCE_UP_TO_50 = flangeThicknessTolerance(50)

export function FlangeBoltTool() {
  const [input, setInput] = useToolState('flange-bolt', DEFAULT_INPUT, isFlangeInput, normalizeFlangeInput)
  const [drawingKind, setDrawingKind] = useState<DrawingKind>('flange')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [sizeNotice, setSizeNotice] = useState<string | null>(null)

  const row = findFlange(input.pressure, input.size) ?? FLANGES['10K'][6]
  const sizes = FLANGES[input.pressure]

  const gasket = parseNumber(input.gasket)
  const gasketValid = gasket !== null && gasket >= 0 && gasket < 50

  // 相手側の厚さは「空欄なら同じフランジ」。入力があるのに読めないときは計算しない（黙って置き換えると短いボルトになる）
  const t2Blank = input.t2.trim() === ''
  const t2Input = parseNumber(input.t2)
  const t2Valid = t2Blank || (t2Input !== null && t2Input > 0 && t2Input < 200)
  const t2 = t2Blank || t2Input === null ? row.t : t2Input

  // 詳細条件の中にエラーが出たら開く（描画中に前回の値と比べて state を直す、React の推奨パターン）
  const [prevT2Valid, setPrevT2Valid] = useState(t2Valid)
  if (prevT2Valid !== t2Valid) {
    setPrevT2Valid(t2Valid)
    if (!t2Valid) setDetailsOpen(true)
  }

  // 図面の内径は「空欄なら管外径、0 なら穴なし」。それ以外で描けない値はエラーにする
  const boreBlank = input.bore.trim() === ''
  const boreInput = parseNumber(input.bore)
  const bore = boreBlank ? PIPE_OD[row.size] : (boreInput ?? 0)
  const boreValid = boreBlank || boreInput === 0 || (boreInput !== null && isDrawableBore(row, boreInput))

  const conditions: BoltConditions | null =
    gasketValid && t2Valid
      ? {
          type: input.type,
          gasket,
          washers: input.washers,
          nut: input.nut,
          threads: input.threads,
          rounding: input.rounding,
          t2: t2Blank ? null : t2Input,
        }
      : null
  const result = conditions ? flangeBoltLength(row, conditions) : null

  const nuts = input.type === 'stud' ? 2 : 1
  const spanner = spannerSize(row.bolt, input.nut)
  const rowUnverified = isRowUnverified(input.pressure, row.size)
  const faceHeight = raisedFaceHeight(row.size)
  const tUnverified = isUnverified(input.pressure, row.size, 't')
  // 典拠の表番号。M22 は JIS B 1180・B 1181 本体の第2選択（表4）、座金は JIS B 1256 の第2選択（表8）
  const secondChoiceBolt = BOLT_SIZES.find((size) => size.d === row.bolt)?.secondChoice === true
  const bodyTable = secondChoiceBolt ? '表4' : '表3'
  const nutTable = input.nut === 'style1' ? `${bodyTable} 六角ナット・スタイル1` : '附属書JA 表JA.9 六角ナット・上'
  const headTable = input.nut === 'style1' ? bodyTable : '附属書JA 表JA.8'
  const washerTable = secondChoiceBolt ? '表8 並形・部品等級A（第2選択）' : '表7 並形・部品等級A（第1選択）'

  const citedStandards: StandardCode[] = [
    'JIS B 2220',
    'JIS B 1181',
    ...(input.type === 'hex' || input.rounding === 'jis' ? (['JIS B 1180'] as const) : []),
    'JIS B 0205-2',
    ...(input.washers > 0 ? (['JIS B 1256'] as const) : []),
  ]
  const boltName = BOLT_TYPE_LABELS[input.type]
  const spec = result?.length ? `M${row.bolt} × ${result.length}` : `M${row.bolt}`
  const spannerUse = input.type === 'stud' ? '両側のナット用' : '頭側・ナット側'
  // もう一方の規格（JIS本体 ⇔ 旧JIS）の二面幅が違うときは並べて出す（M10・M12・M22。現場のスパナは旧JIS のこともある）
  const otherSpanner = otherSpannerText(row.bolt, input.nut)

  const selectFlange = (pressure: PressureClass, size: string) => {
    setSizeNotice(null)
    setInput({ ...input, pressure, size })
  }
  const changePressure = (pressure: PressureClass) => {
    // 同じ呼び径が無い圧力（16K・20K に 175A・225A は無い。JIS B 2220 表12）に切り替えたら、最も近い呼び径にする
    const size = nearestSize(pressure, input.size)
    setSizeNotice(size === input.size ? null : `${pressure} に ${input.size} は無いため、${size} にしました。`)
    setInput({ ...input, pressure, size })
  }

  const copyText = [
    `【フランジボルト】JIS ${input.pressure} ${row.size}`,
    `${boltName} ${markedText(spec, tUnverified && Boolean(result?.length))}　${row.n}本（ナット ${row.n * nuts}個${input.washers ? `・座金 ${row.n * input.washers}枚` : ''}）`,
    spanner
      ? `スパナ ${spanner} mm × 2（${spannerUse}・${NUT_LABELS[input.nut]}${otherSpanner ? `。${otherSpanner} mm` : ''}）`
      : '',
    result
      ? `必要長さ ${trim(result.required)} mm（ガスケット ${trim(gasket ?? 0)} mm・突き出し ${input.threads}山${
          t2Blank ? '' : `・相手側 ${trim(t2)} mm`
        }）`
      : '',
    `外径 ${markedText(row.D, rowUnverified)} / PCD ${markedText(row.C, rowUnverified)} / 穴 ${markedText(
      `${row.n}-φ${row.h}`,
      rowUnverified,
    )} / 厚さ ${markedText(row.t, tUnverified)}`,
    tUnverified ? UNVERIFIED_LEGEND : '',
    `典拠: ${citedStandards
      .map((code) => (code === 'JIS B 2220' ? `${standardLabel(code)} ${FLANGE_TABLE_NO[input.pressure]}` : standardLabel(code)))
      .join(' / ')}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const relatedLinks: RelatedLink[] = [
    { to: toolHref('/bolt-size', { d: row.bolt }), label: `M${row.bolt} のボルト・ナット寸法` },
    { to: toolHref('/tap-drill', { d: row.bolt, p: COARSE_PITCH[row.bolt] }), label: `M${row.bolt} のタップ下穴` },
    ...(pipeDimensions('sgp', row.size)
      ? [{ to: toolHref('/steel-pipe', { spec: 'sgp', a: row.size }), label: `SGP ${row.size} の管の寸法・重量` }]
      : []),
  ]

  const drawingOptions = { kind: drawingKind, bore, boreIsPipeOd: boreBlank }
  const tapDrill = tapDrillFor(row.bolt)
  const downloadDxf = () => {
    downloadText(
      dxfFilename(input.pressure, row.size, drawingKind),
      flangeDxf(input.pressure, row, drawingOptions),
      'application/dxf',
    )
  }

  const lengthOf = (r: FlangeRow) => (conditions ? flangeBoltLength(r, conditions).length : null)
  const cellUnverified = (r: FlangeRow, field: 'D' | 't') => isUnverified(input.pressure, r.size, field)
  const columns: Column<FlangeRow>[] = [
    { key: 'size', header: '呼び径', cell: (r) => r.size },
    { key: 'D', header: '外径 D', cell: (r) => <Marked value={r.D} unverified={cellUnverified(r, 'D')} /> },
    { key: 'C', header: 'PCD C', cell: (r) => <Marked value={r.C} unverified={cellUnverified(r, 'D')} /> },
    { key: 'n', header: '穴数', cell: (r) => <Marked value={r.n} unverified={cellUnverified(r, 'D')} /> },
    { key: 'h', header: '穴径 h', cell: (r) => <Marked value={r.h} unverified={cellUnverified(r, 'D')} /> },
    { key: 't', header: '厚さ t', cell: (r) => <Marked value={r.t} unverified={cellUnverified(r, 't')} /> },
    {
      // ボルトの呼び × 今の条件の長さ（例: M16×60）。部品表にそのまま使える形
      key: 'bolt',
      header: 'ボルト（今の条件）',
      cell: (r) => <Marked value={`M${r.bolt}×${lengthOf(r) ?? '—'}`} unverified={cellUnverified(r, 't')} />,
    },
  ]
  const tableHasUnverified = sizes.some((r) => cellUnverified(r, 't'))
  const conditionNote = conditions ? conditionsText(conditions) : '入力エラーのため計算していません'

  const tableExport = (
    <TableExport
      title={`JIS ${input.pressure} フランジ寸法表（JIS B 2220 ${FLANGE_TABLE_NO[input.pressure]}）`}
      filename={`flange_JIS${input.pressure}`}
      headers={['呼び径', '外径 D [mm]', 'PCD C [mm]', '穴数', '穴径 h [mm]', '厚さ t [mm]', 'ボルト', 'ボルト長さ [mm]']}
      rows={sizes.map((r) => {
        const rowMark = cellUnverified(r, 'D')
        const tMark = cellUnverified(r, 't')
        const length = lengthOf(r)
        return [
          r.size,
          markedText(r.D, rowMark),
          markedText(r.C, rowMark),
          markedText(r.n, rowMark),
          markedText(r.h, rowMark),
          markedText(r.t, tMark),
          markedText(`M${r.bolt}`, rowMark),
          length === null ? '' : markedText(length, tMark),
        ]
      })}
      note={`典拠: ${standardLabel('JIS B 2220')} ${flangeTableLabel(input.pressure)}。ボルト長さは計算値（${conditionNote}）。${
        tableHasUnverified ? UNVERIFIED_LEGEND : ''
      }`}
    />
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList} className="lg:self-start">
        <div className="grid gap-4">
          <div>
            <SegmentedControl label="呼び圧力" value={input.pressure} options={PRESSURE_OPTIONS} onChange={changePressure} />
            {sizeNotice && (
              <p className="mt-1 text-xs font-semibold text-orange-800" role="status">
                {sizeNotice}
              </p>
            )}
          </div>
          <div>
            <SelectField
              label="呼び径"
              value={row.size}
              options={sizes.map((r) => ({
                value: r.size,
                label: `${sizeLabel(r.size)}${isRowUnverified(input.pressure, r.size) ? '※' : ''}`,
              }))}
              onChange={(size) => selectFlange(input.pressure, size)}
              stepper
              quickPicks={QUICK_SIZES}
            />
            <button
              type="button"
              onClick={() => document.getElementById(IDENTIFY_CARD_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-1 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
            >
              <Search className="size-3.5 text-orange-600" aria-hidden />
              呼び径・圧力がわからないときは、実測から探す
            </button>
          </div>
          <SegmentedControl
            label="ボルトの種類"
            value={input.type}
            options={TYPE_OPTIONS}
            onChange={(type) => setInput({ ...input, type })}
            hint={input.type === 'stud' ? '両端にナットを付けるスタッドボルト（全ねじ）' : '片側が頭の六角ボルト'}
          />
          <NumberField
            label="ガスケット（パッキン）の厚さ"
            value={input.gasket}
            onChange={(value) => setInput({ ...input, gasket: value })}
            placeholder="3"
            unit="mm"
            error={gasketValid ? undefined : '0 以上 50 未満の数値で入力してください'}
            hint="シートガスケットは 1.5・2・3 mm がよく使われます。"
          />

          <details
            open={detailsOpen}
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
            className="group rounded-md border border-zinc-200"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-800">詳細条件</span>
                {!t2Valid && (
                  <span className="block text-xs font-semibold text-red-700">相手側フランジの厚さを確認してください</span>
                )}
                <span className="block text-xs leading-relaxed text-zinc-500">
                  {detailSummary({
                    nut: input.nut,
                    washers: input.washers,
                    threads: input.threads,
                    t2: t2Blank ? null : t2Valid ? t2 : 'error',
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
                hint="JIS本体はスタイル1の最大高さ、旧JISは附属書JA 1種の高さで計算します。スパナの大きさもこれに合わせます。"
              />
              <SegmentedControl
                label="平座金"
                value={String(input.washers) as '0' | '1' | '2'}
                options={WASHER_OPTIONS}
                onChange={(value) => setInput({ ...input, washers: Number(value) as 0 | 1 | 2 })}
                hint={
                  input.nut === 'style1'
                    ? 'JIS B 2220（21.2）では、JIS本体のボルト・ナットで締めるとき（M24 以下）は、平座金（JIS B 1256 並形・部品等級A）の併用が望ましいとしています。'
                    : undefined
                }
              />
              <SegmentedControl
                label="ナットからの突き出し"
                value={String(input.threads)}
                options={THREAD_OPTIONS}
                onChange={(value) => setInput({ ...input, threads: Number(value) })}
              />
              <NumberField
                label="相手側フランジの厚さ（任意）"
                value={input.t2}
                onChange={(value) => setInput({ ...input, t2: value })}
                placeholder={`空欄なら同じ ${row.t}`}
                unit="mm"
                error={t2Valid ? undefined : '正の数値で入力してください（空欄なら同じ厚さ）'}
                hint="バルブや機器のフランジと組むときなど、相手の厚さが違う場合に入力します。"
              />
              <SegmentedControl
                label="長さの丸め"
                value={input.rounding}
                options={ROUNDING_OPTIONS}
                onChange={(rounding) => setInput({ ...input, rounding })}
              />
            </div>
          </details>
        </div>
      </Card>

      <Card
        title="結果"
        index="02"
        icon={Calculator}
        id={RESULT_CARD_ID}
        className="lg:row-span-2 lg:self-start"
        aside={<CopyButton text={copyText} />}
      >
        <PrimaryResult
          label={`${boltName}の長さ（JIS ${input.pressure} ${row.size}）`}
          value={result?.length == null ? undefined : <Marked value={result.length} unverified={tUnverified} dark large />}
          unit="mm"
        >
          {!result ? (
            !gasketValid ? (
              'ガスケットの厚さを数値で入力してください。'
            ) : (
              '相手側フランジの厚さを正の数値で入力してください（詳細条件。空欄なら同じ厚さ）。'
            )
          ) : result.length === null ? (
            'JIS標準長さ（300mmまで）を超えています。5mm刻みに切り替えてください。'
          ) : (
            <>
              <span className="num font-semibold text-white">
                {spec}　{row.n}本
              </span>
              <br />
              計算上の必要長さ <span className="num">{trim(result.required)} mm</span> を
              {input.rounding === '5mm' ? '5mm刻み' : 'JIS標準長さ'}に切り上げ
              {tUnverified && (
                <>
                  <br />
                  <span className="text-orange-300">
                    ※ {input.pressure} {row.size} のフランジ厚さ t は規格原文で未確認のため、長さも確認してください。
                  </span>
                </>
              )}
            </>
          )}
        </PrimaryResult>

        <dl className="mt-3">
          <ResultItem
            label="ボルトの呼び × 本数"
            value={<Marked value={`M${row.bolt} × ${row.n}`} unverified={rowUnverified} />}
            unit="本"
            note={`ナット ${row.n * nuts}個${input.washers ? `・平座金 ${row.n * input.washers}枚` : ''}`}
          />
          <ResultItem
            label="スパナ（二面幅）"
            value={spanner}
            unit={otherSpanner ? `mm（${otherSpanner}）` : 'mm'}
            note={spanner === undefined ? undefined : `${spannerUse}に2本（${NUT_LABELS[input.nut]}）`}
          />
          <ResultItem
            label="ナットからの実際の突き出し"
            value={result?.actualProtrusion == null ? undefined : trim(result.actualProtrusion)}
            unit="mm"
            note={
              result?.actualProtrusion != null
                ? `約 ${trim(protrusionThreads(result.actualProtrusion, result.pitch))} 山（ピッチ ${trim(result.pitch)} mm）`
                : undefined
            }
          />
          <ResultItem label="フランジ外径 D" value={<Marked value={row.D} unverified={rowUnverified} />} unit="mm" />
          <ResultItem
            label="ボルト穴中心円の径（PCD）C"
            value={<Marked value={row.C} unverified={rowUnverified} />}
            unit="mm"
          />
          <ResultItem label="ボルト穴" value={<Marked value={`${row.n}-φ${row.h}`} unverified={rowUnverified} />} />
          <ResultItem label="フランジの厚さ t" value={<Marked value={row.t} unverified={tUnverified} />} unit="mm" />
        </dl>
        {tUnverified && (
          <UnverifiedLegend className="mt-2">
            {rowUnverified
              ? `（${input.pressure} ${row.size} は寸法すべてが未確認です）`
              : '（規格原文で確認中）'}
          </UnverifiedLegend>
        )}

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 2220" detail={flangeTableLabel(input.pressure)} />
          <Citation code="JIS B 1181" detail={nutTable} suffix="のナット高さ・二面幅" />
          {input.type === 'hex' && input.rounding === 'jis' && (
            <Citation
              code="JIS B 1180"
              detail={headTable === '表3' ? '表3' : `${headTable}（二面幅）・表3（呼び長さ）`}
              suffix="のボルト頭の二面幅・呼び長さの系列"
            />
          )}
          {input.type === 'hex' && input.rounding === '5mm' && (
            <Citation code="JIS B 1180" detail={headTable} suffix="のボルト頭の二面幅" />
          )}
          {input.type === 'stud' && input.rounding === 'jis' && (
            <Citation code="JIS B 1180" detail="表3" suffix="の六角ボルトの呼び長さの系列を準用" />
          )}
          {input.washers > 0 && <Citation code="JIS B 1256" detail={washerTable} suffix="の座金厚さ" />}
          <Citation code="JIS B 0205-2" suffix="の並目ピッチ（突き出しの計算）" />
        </div>

        {result && (
          <div className="mt-4">
            <FormulaInfo>
              <p>ボルト首下長さ（スタッドボルトは全長）を、次の式で求めています。</p>
              {input.type === 'hex' ? (
                <Formula>
                  L = t<sub>1</sub> + t<sub>2</sub> + G + n × W + m + k × P
                </Formula>
              ) : (
                <Formula>
                  L = t<sub>1</sub> + t<sub>2</sub> + G + n × W + 2m + 2 × k × P
                </Formula>
              )}
              <Formula>
                = {trim(row.t)} + {trim(t2)} + {trim(gasket ?? 0)} + {input.washers} × {trim(result.washerThickness)} +{' '}
                {nuts > 1 ? `2 × ${trim(result.nutHeight)}` : trim(result.nutHeight)} +{' '}
                {nuts > 1 ? '2 × ' : ''}
                {input.threads} × {trim(result.pitch)} = {trim(result.required)} mm → {result.length ?? '—'} mm
              </Formula>
              <FormulaLegend
                items={[
                  [<>t<sub>1</sub>, t<sub>2</sub></>, `フランジの厚さ（JIS B 2220 ${FLANGE_TABLE_NO[input.pressure]}。RF は座の高さを含む）`],
                  ['G', 'ガスケットの厚さ'],
                  ['n × W', '平座金の枚数 × 厚さ'],
                  ['m', 'ナットの高さ'],
                  ['k × P', 'ナットからの突き出し（山数 × 並目ピッチ）'],
                ]}
              />
              <p>
                計算値を
                {input.rounding === '5mm'
                  ? '5mm刻み'
                  : `JIS B 1180 の${input.type === 'stud' ? '六角ボルトの' : ''}呼び長さの系列（70mmまでは5mm、80〜160mmは10mm、160mmを超えると20mm刻み）`}
                に切り上げています。市販品の長さはメーカーによって異なるので、在庫の長さも確認してください。
              </p>
              <p>
                フランジの厚さ t は JIS B 2220 {FLANGE_TABLE_NO[input.pressure]} の値です。平面座（RF）のフランジでは、t は座の高さ f
                {faceHeight !== undefined && `（${row.size} は ${faceHeight} mm）`}を含みます（{GASKET_SEAT_TABLE}）。座を含まない厚さの資料と組み合わせるときは、その分を相手側の厚さに足してください。
              </p>
              <p>
                なお、JIS B 2220 {FLANGE_SEAT_COMBINATION_TABLE} の組合せでは、5K・10K・16K で平面座（RF）の欄があるのは WN・IT 形だけで、スリップオン溶接式（SOP・SOH）や閉止フランジ（BL）は RF
                の欄が「—」です。20K には全面座（FF）の欄がありません。市販品や図面の呼び方と違うことがあるので、現物・図面の表記も確認してください。
              </p>
              <p>
                フランジの厚さの許容差はプラス側だけです（JIS B 2220 {FLANGE_TOLERANCE_TABLE}。20 mm 以下 +{TOLERANCE_UP_TO_20} mm、20 mm を超え 50 mm 以下 +
                {TOLERANCE_UP_TO_50} mm。RF は t − f に対して）。実物のフランジは表の t より厚いことがあるので、突き出しには余裕を見てください（目安）。
              </p>
              <p>
                ナットの高さは、JIS本体はスタイル1の最大値（JIS B 1181 表3・表4）、旧JISは附属書JA 1種の基準寸法（表JA.9）です。旧JIS
                の仕上げ程度「並」のナットは高さの許容差が ±（M8〜M12 ±0.8、M14〜M22 ±0.9、M24〜M36 ±1.0 mm。表JA.13）なので、計算に使った高さより
                1 mm 近く高いことがあります。
              </p>
              <p>
                スパナの大きさは六角ナット（六角ボルトの頭も同じ）の二面幅で、JIS本体は本体の値、旧JISは附属書JA の値です。
              </p>
            </FormulaInfo>
          </div>
        )}

        <RelatedLinks links={relatedLinks} />
      </Card>

      <IdentifyCard
        index="03"
        selected={{ pressure: input.pressure, size: row.size }}
        onSelect={selectFlange}
        className="lg:self-start"
      />

      <ClassComparisonCard
        index="04"
        pressure={input.pressure}
        size={row.size}
        conditions={conditions}
        onSelect={(pressure) => selectFlange(pressure, row.size)}
        className="lg:col-span-2"
      />

      <Card title="フランジ図面（CADデータ）" index="05" icon={PenTool} className="lg:col-span-2">
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FlangePreview row={row} bore={boreValid ? bore : 0} kind={drawingKind} />
          <div className="space-y-4">
            <p className="num text-sm text-zinc-700">
              JIS {input.pressure} {row.size}　D{row.D} / PCD{row.C} /{' '}
              {drawingKind === 'tap' ? `${row.n}-M${row.bolt}（下穴 φ${tapDrill ?? '—'}）` : `${row.n}-φ${row.h}`}
            </p>
            <SegmentedControl
              label="DXFの種類"
              value={drawingKind}
              options={DRAWING_OPTIONS}
              onChange={setDrawingKind}
              hint={
                drawingKind === 'flange'
                  ? 'フランジ本体の正面図（ボルト穴 φh）。'
                  : drawingKind === 'through'
                    ? '相手側（機器のノズル・当て板など）に、同じ PCD で通し穴 φh をあける図。'
                    : `相手側に M${row.bolt} のめねじを立てる図（スタッドボルト用）。下穴を実線の円、ねじの谷の径を 3/4 の細線の円で描きます。このツールのスタッドボルトの長さは両ナット（通しボルト）の場合です。めねじにねじ込む植込みボルトの長さは、ねじ込み長さを含めて別に決めてください。`
              }
            />
            <NumberField
              label="図面の内径（任意）"
              value={input.bore}
              onChange={(value) => setInput({ ...input, bore: value })}
              placeholder={`空欄なら管外径 ${PIPE_OD[row.size]}`}
              unit="mm"
              hint="空欄のときは SGP の管外径を参考として描きます（差込み溶接フランジの穴径ではありません）。0 を入れると穴なし（閉止フランジ）の図になります。"
              error={boreValid ? undefined : `0 または ${row.C - row.h} mm 未満の数値で入力してください（ボルト穴にかからない大きさ）`}
            />
            <button
              type="button"
              onClick={downloadDxf}
              disabled={!boreValid}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              <Download className="size-4" aria-hidden />
              DXF をダウンロード（2D・正面図）
            </button>
            <p className="text-xs leading-relaxed text-zinc-500">
              外形・内径・穴（OUTLINE）、PCD・中心線・穴の中心マーク（CENTER）、
              {drawingKind === 'tap' && 'めねじの谷の径（THREAD）、'}
              寸法メモ（NOTE）のレイヤー。単位 mm。φ は CAD の %%c で書いています。
              {drawingKind !== 'flange' && '外形は参考（相手側の形に合わせて直してください）。'}
              {drawingKind === 'tap' && 'ねじ深さ・下穴深さは入れていません。'}
            </p>
            {drawingKind === 'tap' && (
              <Citation code="ISO 2306" suffix={`の推奨ドリル径（M${row.bolt} 並目。6H の範囲内。ねじ下穴径ツールと同じ計算）`} />
            )}
          </div>
        </div>
      </Card>

      <Card
        title={`JIS ${input.pressure} フランジ寸法表`}
        index="06"
        className="lg:col-span-2"
        flush
        aside={<ExportInAside>{tableExport}</ExportInAside>}
      >
        <ExportInBody>{tableExport}</ExportInBody>
        <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-500">
          単位: mm。行をタップするとそのサイズを選べます。ボルトの長さは今の条件（{conditionNote}）で計算。
        </p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={sizes}
            rowKey={(r) => r.size}
            isHighlighted={(r) => r.size === row.size}
            onRowClick={(r) => selectFlange(input.pressure, r.size)}
            caption={`JIS ${input.pressure} フランジ寸法表`}
          />
        </div>
        {tableHasUnverified && (
          <div className="px-4 pt-2 pb-4">
            <UnverifiedLegend>（規格原文で確認中。未確認の厚さから計算したボルト長さにも付けています）</UnverifiedLegend>
          </div>
        )}
      </Card>

      <StickyResult
        targetId={RESULT_CARD_ID}
        label={`JIS ${input.pressure} ${row.size}・${boltName}`}
        value={result?.length ? `M${row.bolt}×${result.length}${tUnverified ? '※' : ''}` : '—'}
        unit={`${row.n}本${spanner ? `・スパナ${spanner}` : ''}`}
      />
    </div>
  )
}
