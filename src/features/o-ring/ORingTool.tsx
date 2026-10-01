import { ClipboardList, Download, PenTool, Table2, Torus } from 'lucide-react'
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
import { fixed, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { standardLabel } from '../../standards'
import {
  FLAT_DEPTH_TOL,
  fillRatio,
  findORing,
  flatFillRatio,
  flatGroove,
  flatSqueezeRange,
  grooveDepth,
  matingDiameter,
  oRingNumbers,
  outerDiameter,
  ringFit,
  squeeze,
  squeezeRange,
  type HousingType,
  type ORing,
} from './calc'
import { BackupClearanceInfo } from './BackupClearance'
import { grooveCallout } from './callout'
import { CopyTextButton } from './CopyTextButton'
import { DYNAMIC_MATERIAL_NOTE, E_NOTE, SOURCE_NOTE, type ORingSeries } from './data'
import { cylinderGrooveDxf, flatGrooveDxf, grooveDxfFilename } from './drawing'
import { oRingExportTable } from './export'
import { GrooveSketch } from './GrooveSketch'
import {
  DEFAULT_INPUT,
  isORingInput,
  normalizeORingInput,
  parsePositive,
  SERIES_DEFAULT_NO,
  withAutoPick,
  type ORingInput,
  type PickMode,
} from './input'
import { MatingLookup, RingLookup, UsageBadge } from './Lookup'

const MODE_OPTIONS = [
  { value: 'number', label: '呼び番号' },
  { value: 'mating', label: '相手寸法' },
  { value: 'measure', label: '実物寸法' },
] as const
const MODE_HINTS: Record<PickMode, string> = {
  number: '呼び番号（P20・G50 など）から、Oリングと溝の寸法を出します。',
  mating: 'シリンダ内径（ピストン型）や軸径（ロッド型）から、合う番号を P・G の両方で探します。',
  measure: '古いOリングの内径 × 太さを測って、近い番号を探します。',
}
const SERIES_OPTIONS = [
  { value: 'P', label: 'P（運動用）' },
  { value: 'G', label: 'G（固定用）' },
] as const
const GROOVE_OPTIONS = [
  { value: 'cylinder', label: '円筒面' },
  { value: 'flat-internal', label: '平面内圧' },
  { value: 'flat-external', label: '平面外圧' },
] as const
const HOUSING_OPTIONS = [
  { value: 'piston', label: 'ピストン型' },
  { value: 'rod', label: 'ロッド型' },
] as const
const HOUSING_HINTS: Record<HousingType, string> = {
  piston: 'ピストン（軸）側に溝。Oリングの外周がシリンダ内径 D に当たります。',
  rod: 'ハウジング（穴）側に溝。Oリングの内周がロッド（軸径 d）に当たります。',
}
const BACKUP_OPTIONS = [
  { value: '0', label: 'なし' },
  { value: '1', label: '1個' },
  { value: '2', label: '2個' },
] as const
/** よく使う番号のボタン（区切りのよい径） */
const QUICK_PICKS: Record<ORingSeries, readonly string[]> = {
  P: ['P10', 'P12', 'P16', 'P20', 'P25', 'P30', 'P40', 'P50'],
  G: ['G25', 'G30', 'G40', 'G50', 'G60', 'G80', 'G100', 'G150'],
}

const numberOptions = (series: ORingSeries) => oRingNumbers(series).map((no) => ({ value: no, label: no }))
const OPTIONS: Record<ORingSeries, { value: string; label: string }[]> = {
  P: numberOptions('P'),
  G: numberOptions('G'),
}
const ROWS: Record<ORingSeries, ORing[]> = {
  P: oRingNumbers('P').map((no) => findORing('P', no)!),
  G: oRingNumbers('G').map((no) => findORing('G', no)!),
}

const withTol = (value: number, tol: number | null, side: 'minus' | 'plus') =>
  tol === null ? trim(value) : side === 'minus' ? `${trim(value)} 0/−${trim(tol)}` : `${trim(value)} +${trim(tol)}/0`

/** 相手寸法・実物寸法の入力欄のエラー */
function positiveError(text: string): string | undefined {
  return parsePositive(text) === null ? '正の数値で入力してください' : undefined
}

export function ORingTool() {
  const [input, setInput] = useToolState('o-ring', DEFAULT_INPUT, isORingInput, normalizeORingInput)
  const ring = findORing(input.series, input.no) ?? findORing('P', 'P20')!
  const { group } = ring
  const housing = input.housing
  const isFlat = input.groove !== 'cylinder'
  const flat = isFlat ? flatGroove(ring, input.groove === 'flat-internal' ? 'internal' : 'external') : null
  const depth = flat ? flat.depth : grooveDepth(ring)
  const width = flat ? flat.width : group.widths[input.backup]
  const nominalSqueeze = squeeze(group.d2, depth)
  const range = flat ? flatSqueezeRange(ring) : squeezeRange(ring)
  const fill = flat ? flatFillRatio(ring) : fillRatio(ring, 0)
  const fit = ringFit(ring, input.groove, housing)
  const isPiston = housing === 'piston'
  const grooveLabel = flat
    ? input.groove === 'flat-internal'
      ? '平面（固定用・内圧）'
      : '平面（固定用・外圧）'
    : `円筒面（${isPiston ? 'ピストン型' : 'ロッド型'}・運動用・固定用）`
  const dName = isPiston ? '溝底径 d' : '軸径 d'
  const bigDName = isPiston ? 'シリンダ内径 D' : '溝底径 D'

  const update = (patch: Partial<ORingInput>) => setInput(withAutoPick({ ...input, ...patch }))
  const pick = (picked: ORing) => setInput({ ...input, series: picked.series, no: picked.no })

  const changeSeries = (series: ORingSeries) => {
    // 同じ呼びの番号があればそれに（P50 → G50）、無ければ既定の番号
    const same = `${series}${input.no.slice(1).replace(/A$/, '')}`
    setInput({ ...input, series, no: findORing(series, same) ? same : SERIES_DEFAULT_NO[series] })
  }
  const changeMode = (mode: PickMode) => update({ mode, groove: mode === 'mating' ? 'cylinder' : input.groove })

  // 相手寸法・実物寸法
  const mate = parsePositive(input.mate)
  const bottom = parsePositive(input.bottom)
  const bottomOrder =
    typeof mate === 'number' && typeof bottom === 'number' && (isPiston ? bottom >= mate : bottom <= mate)
      ? isPiston
        ? '溝底径 d はシリンダ内径 D より小さい値です'
        : '溝底径 D は軸径 d より大きい値です'
      : undefined
  const measuredD1 = parsePositive(input.d1)
  const measuredD2 = parsePositive(input.d2)
  const mateMismatch =
    input.mode === 'mating' && typeof mate === 'number' && Math.abs(matingDiameter(ring, housing) - mate) > 1e-6

  const callout = grooveCallout(ring, input.groove, housing, input.backup)
  const downloadDxf = () => {
    downloadText(
      grooveDxfFilename(ring, input.groove, housing, input.backup),
      flat
        ? flatGrooveDxf(ring, input.groove === 'flat-internal' ? 'internal' : 'external')
        : cylinderGrooveDxf(ring, housing, input.backup),
      'application/dxf',
    )
  }

  const copyText = [
    `【Oリング】${ring.no}（JIS B 2401${ring.series === 'G' ? '・固定用のみ' : ''}）`,
    `内径 ${trim(ring.d1)}±${trim(ring.d1Tol)} × 太さ ${trim(group.d2)}±${trim(group.d2Tol)} mm`,
    flat
      ? `溝（${grooveLabel}）: 外径 ${trim(flat.outer)} / 内径 ${trim(flat.inner)} / 深さ ${trim(flat.depth)}±${FLAT_DEPTH_TOL} / 溝幅 ${trim(flat.width)}（+0.25/0）`
      : `溝（${isPiston ? 'ピストン型' : 'ロッド型'}）: ${dName} ${trim(ring.d)} / ${bigDName} ${trim(ring.D)} / 溝幅 ${trim(width)}（+0.25/0、BU${input.backup}個）/ R${trim(group.rMax)}以下`,
    `つぶし率 ${fixed(nominalSqueeze, 1)}%`,
    `典拠: ${standardLabel('JIS B 2401-1')} / ${standardLabel('JIS B 2401-2')}`,
    SOURCE_NOTE,
    '（サクッとJIS）',
  ].join('\n')

  const sticky = flat
    ? {
        label: `${ring.no} 平面（${input.groove === 'flat-internal' ? '内圧' : '外圧'}）溝の外径 / 内径`,
        value: `${trim(flat.outer)} / ${trim(flat.inner)}`,
      }
    : {
        label: `${ring.no}（${trim(ring.d1)} × ${trim(group.d2)}）${isPiston ? 'ピストン型' : 'ロッド型'} 溝幅 ${trim(width)}`,
        value: `d${trim(ring.d)} / D${trim(ring.D)}`,
      }

  const related: RelatedLink[] = [
    { to: toolHref('/pipe-thread', { kind: 'G' }), label: '管用平行ねじ G（座面をOリングでシール）' },
    ...(isFlat
      ? [
          { to: toolHref('/bolt-size'), label: 'ふたを留めるボルトの穴・座ぐり' },
          { to: toolHref('/tap-drill'), label: 'ふたを留めるねじの下穴' },
        ]
      : []),
  ]

  const exportTable = oRingExportTable(input.series, isFlat)
  const tableExport = (
    <TableExport
      title={exportTable.title}
      filename={exportTable.filename}
      headers={exportTable.headers}
      rows={exportTable.rows}
      note={exportTable.note}
    />
  )
  const columns: Column<ORing>[] = [
    { key: 'no', header: '呼び番号', cell: (row) => row.no },
    { key: 'd1', header: '内径 d1', cell: (row) => fixed(row.d1, 1) },
    { key: 'd2', header: '太さ d2', cell: (row) => fixed(row.group.d2, 1) },
    ...(isFlat
      ? [
          { key: 'ext', header: '外圧用 溝内径', cell: (row: ORing) => trim(flatGroove(row, 'external').inner) },
          { key: 'int', header: '内圧用 溝外径', cell: (row: ORing) => trim(flatGroove(row, 'internal').outer) },
          { key: 'h', header: '深さ h', cell: (row: ORing) => fixed(row.group.flatDepth, 1) },
          { key: 'b', header: '溝幅 b', cell: (row: ORing) => fixed(row.group.flatWidth, 1) },
        ]
      : [
          { key: 'd', header: '溝 d', cell: (row: ORing) => trim(row.d) },
          { key: 'D', header: '溝 D', cell: (row: ORing) => trim(row.D) },
          { key: 'b', header: '溝幅 b', cell: (row: ORing) => fixed(row.group.widths[input.backup], 1) },
          { key: 'R', header: 'R 最大', cell: (row: ORing) => trim(row.group.rMax) },
        ]),
  ]

  const housingControl = (
    <SegmentedControl
      label="溝の位置"
      value={housing}
      options={HOUSING_OPTIONS}
      onChange={(value) => update({ housing: value })}
      hint={HOUSING_HINTS[housing]}
    />
  )

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SegmentedControl
            label="選び方"
            value={input.mode}
            options={MODE_OPTIONS}
            onChange={changeMode}
            hint={MODE_HINTS[input.mode]}
          />

          {input.mode === 'number' && (
            <>
              <SegmentedControl
                label="系列"
                value={input.series}
                options={SERIES_OPTIONS}
                onChange={changeSeries}
                hint={
                  input.series === 'P'
                    ? `P は運動用・固定用の両方に使えます（${DYNAMIC_MATERIAL_NOTE.replace(/。$/, '')}）。`
                    : 'G は固定用です。往復運動などの運動用には使えません。'
                }
              />
              <SelectField
                label="呼び番号"
                value={ring.no}
                options={OPTIONS[input.series]}
                onChange={(no) => setInput({ ...input, no })}
                stepper
                quickPicks={QUICK_PICKS[input.series]}
              />
            </>
          )}

          {input.mode === 'mating' && (
            <>
              {housingControl}
              <NumberField
                label={isPiston ? 'シリンダ内径 D' : '軸径 d（ロッド）'}
                value={input.mate}
                onChange={(value) => update({ mate: value })}
                placeholder={isPiston ? '例: 30' : '例: 20'}
                unit="mm"
                error={positiveError(input.mate)}
                              />
              <NumberField
                label={`${isPiston ? '溝底径 d' : '溝底径 D'}（わかれば）`}
                value={input.bottom}
                onChange={(value) => update({ bottom: value })}
                placeholder="空欄で可"
                unit="mm"
                error={positiveError(input.bottom) ?? bottomOrder}
                hint="既存の部品を確かめるときに入れると、両方が合う番号にしぼります。"
              />
              {typeof mate === 'number' && !bottomOrder && bottom !== null && (
                <div>
                  <MatingLookup
                    housing={housing}
                    backup={input.backup}
                    mate={mate}
                    bottom={typeof bottom === 'number' ? bottom : null}
                    selected={ring}
                    onPick={pick}
                  />
                  <div className="mt-2">
                    <Citation code="JIS B 2401-2" suffix="の d・D から検索" />
                  </div>
                </div>
              )}
            </>
          )}

          {input.mode === 'measure' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="内径 d1"
                  value={input.d1}
                  onChange={(value) => update({ d1: value })}
                  placeholder="例: 24.6"
                  unit="mm"
                  error={positiveError(input.d1)}
                                  />
                <NumberField
                  label="太さ d2"
                  value={input.d2}
                  onChange={(value) => update({ d2: value })}
                  placeholder="例: 3.5"
                  unit="mm"
                  error={positiveError(input.d2)}
                                  />
              </div>
              <p className="-mt-2 text-xs leading-relaxed text-zinc-600">
                使ったOリングは、つぶれや膨潤で寸法が変わっています。太さは何か所か測り、内径は伸ばさずに測ってください（外径を測ったときは
                外径 − 2 × 太さ が内径）。JIS B 2401 の P・G 系列だけを収録しています（真空フランジ用の V
                系列や、インチ系 AS568 などは含みません）。
              </p>
              {typeof measuredD1 === 'number' && typeof measuredD2 === 'number' && (
                <div>
                  <RingLookup d1={measuredD1} d2={measuredD2} selected={ring} onPick={pick} />
                  <div className="mt-2">
                    <Citation code="JIS B 2401-1" suffix="の内径・太さから検索" />
                  </div>
                </div>
              )}
            </>
          )}

          {input.mode !== 'mating' && (
            <SegmentedControl
              label="溝の形"
              value={input.groove}
              options={GROOVE_OPTIONS}
              onChange={(groove) => setInput({ ...input, groove })}
              hint={
                input.groove === 'cylinder'
                  ? 'ピストン・ロッドなど軸まわりの溝（運動用・固定用で共通）。'
                  : input.groove === 'flat-internal'
                    ? 'フランジ面などの平面の溝。内側から圧力がかかり、Oリングは溝の外壁に当たります。'
                    : 'フランジ面などの平面の溝。外側から圧力がかかり（真空など）、Oリングは溝の内壁に当たります。'
              }
            />
          )}
          {!isFlat && input.mode !== 'mating' && housingControl}
          {!isFlat && (
            <div className="grid gap-2">
              <SegmentedControl
                label="バックアップリング"
                value={String(input.backup)}
                options={BACKUP_OPTIONS}
                onChange={(value) => setInput({ ...input, backup: Number(value) as 0 | 1 | 2 })}
                hint="高い圧力やすきまが大きいときに、はみ出し防止で入れます。片側加圧は1個、両側加圧は2個。"
              />
              <BackupClearanceInfo />
            </div>
          )}
          <GrooveSketch
            d2={group.d2}
            width={width}
            depth={depth}
            kind={isFlat ? (input.groove as 'flat-internal' | 'flat-external') : housing}
          />
        </div>
      </Card>

      <Card id="o-ring-result" title="結果" index="02" icon={Torus} aside={<CopyButton text={copyText} />}>
        {mateMismatch && (
          <p className="mb-3 rounded-sm border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900">
            表示中の {ring.no} は、入力した{isPiston ? 'シリンダ内径' : '軸径'} φ{trim(mate as number)}{' '}
            に合っていません（{ring.no} は φ{trim(matingDiameter(ring, housing))}）。候補から選んでください。
          </p>
        )}
        <PrimaryResult
          label={`Oリング ${ring.no}（内径 × 太さ）`}
          value={`${trim(ring.d1)} × ${trim(group.d2)}`}
          unit="mm"
        >
          <span className="mb-1 flex items-center gap-2">
            <UsageBadge ring={ring} />
            {ring.series === 'G' && <span className="text-zinc-300">往復運動などの運動用には使えません。</span>}
          </span>
          内径 ±{trim(ring.d1Tol)}・太さ ±{trim(group.d2Tol)}（1種〜3種。内径の許容差は
          4種C（シリコーン・VMQ）で1.5倍、4種D（フッ素・FKM）で1.2倍）
        </PrimaryResult>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-zinc-200 bg-zinc-200 text-center">
          {(flat
            ? [
                ['溝の外径', trim(flat.outer)],
                ['溝の内径', trim(flat.inner)],
                ['溝幅 b', trim(flat.width)],
                ['溝の深さ h', trim(flat.depth)],
              ]
            : [
                [dName, trim(ring.d)],
                [bigDName, trim(ring.D)],
                [`溝幅 b（BU${input.backup}個）`, trim(width)],
                ['溝の深さ', trim(depth)],
              ]
          ).map(([label, value]) => (
            <div key={label} className="bg-white px-2 py-2.5">
              <p className="text-xs text-zinc-600">{label}</p>
              <p className="num text-xl font-bold text-zinc-900">
                {value}
                <span className="ml-0.5 text-xs font-normal text-zinc-500">mm</span>
              </p>
            </div>
          ))}
        </div>

        <dl className="mt-3">
          {flat ? (
            <>
              <ResultItem
                label={
                  input.groove === 'flat-internal'
                    ? '溝の外径（規格値・Oリングの外周が当たる）'
                    : '溝の外径（溝幅から計算）'
                }
                value={trim(flat.outer)}
                unit="mm"
              />
              <ResultItem
                label={
                  input.groove === 'flat-internal'
                    ? '溝の内径（溝幅から計算）'
                    : '溝の内径（規格値・Oリングの内周が当たる）'
                }
                value={trim(flat.inner)}
                unit="mm"
              />
              <ResultItem label="溝の深さ h の許容差" value={`±${FLAT_DEPTH_TOL}`} unit="mm" />
            </>
          ) : (
            <>
              <ResultItem
                label={isPiston ? '溝底径 d（ピストン側）' : '軸径 d（ロッド）'}
                value={withTol(ring.d, group.diaTol, 'minus')}
                unit="mm"
              />
              <ResultItem
                label={isPiston ? 'シリンダ内径 D' : '溝底径 D（ハウジング側）'}
                value={withTol(ring.D, group.diaTol, 'plus')}
                unit="mm"
              />
              <ResultItem
                label="溝の振れ E"
                value={`${trim(group.eMax)} 以下`}
                unit="mm"
                note={`軸心のずれは ${trim(group.eMax / 2)} mm 以下（E/2）`}
              />
            </>
          )}
          <ResultItem label="溝幅 b の許容差" value="+0.25/0" unit="mm" />
          <ResultItem label="溝底の角の丸み R" value={`${trim(group.rMax)} 以下`} unit="mm" />
          <ResultItem
            label="つぶし率（基準寸法）"
            value={fixed(nominalSqueeze, 1)}
            unit="%"
            note={
              range
                ? `寸法許容差を含めると ${fixed(range.min, 1)}〜${fixed(range.max, 1)}%${flat ? '' : '（偏心は含まない）'}`
                : undefined
            }
          />
          <ResultItem
            label={flat ? '充てん率' : '充てん率（バックアップリングなしの溝）'}
            value={fixed(fill, 1)}
            unit="%"
          />
          <ResultItem
            label={
              fit.kind === 'stretch'
                ? `${flat ? '溝の内壁' : '溝底 d '}にはめたときの内径の伸び`
                : `${flat ? '溝の外壁' : '溝底 D '}に入れたときの外径の縮み`
            }
            value={fixed(fit.value, 1)}
            unit="%"
          />
          <ResultItem label="Oリングの外径（参考）" value={trim(outerDiameter(ring))} unit="mm" />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 2401-1" suffix="のOリング寸法" />
          <Citation code="JIS B 2401-2" detail={grooveLabel} suffix="のハウジング寸法" />
          <p className="text-xs leading-relaxed text-zinc-600">{SOURCE_NOTE}</p>
          {!flat && <p className="text-xs leading-relaxed text-zinc-600">{E_NOTE}</p>}
        </div>

        <div className="mt-4">
          <FormulaInfo>
            {flat ? (
              <>
                <p>
                  平面溝は、内圧用は溝の外径、外圧用は溝の内径が規格で決まっています（呼び番号の数値が外圧用の溝内径、それに太さのグループごとの値を足したものが内圧用の溝外径）。反対側の径は溝幅
                  b から求めた値です。
                </p>
                <Formula>
                  {input.groove === 'flat-internal'
                    ? `溝の内径 = 溝の外径 − 2b = ${trim(flat.outer)} − 2 × ${trim(flat.width)} = ${trim(flat.inner)} mm`
                    : `溝の外径 = 溝の内径 + 2b = ${trim(flat.inner)} + 2 × ${trim(flat.width)} = ${trim(flat.outer)} mm`}
                </Formula>
              </>
            ) : (
              <>
                <p>
                  ハウジングの d は呼び番号の数値、D は太さのグループごとに決まる D − d
                  を足した値です。相手寸法から探すときは、ピストン型はシリンダ内径が D、ロッド型は軸径が d
                  に合う番号を探しています。
                </p>
                <Formula>
                  D = d + (D − d) = {trim(ring.d)} + {trim(group.dDiff)} = {trim(ring.D)} mm
                </Formula>
                <Formula>
                  溝の深さ = (D − d) ÷ 2 = ({trim(ring.D)} − {trim(ring.d)}) ÷ 2 = {trim(depth)} mm
                </Formula>
              </>
            )}
            <Formula>
              つぶし率 = (d2 − 溝の深さ) ÷ d2 × 100 = ({trim(group.d2)} − {trim(depth)}) ÷ {trim(group.d2)} × 100 ={' '}
              {fixed(nominalSqueeze, 1)}%
            </Formula>
            <Formula>
              充てん率 = (π/4 × d2²) ÷ (b × 溝の深さ) × 100 = {fixed((Math.PI / 4) * group.d2 ** 2, 2)} ÷ (
              {trim(flat ? flat.width : group.widths[0])} × {trim(depth)}) × 100 = {fixed(fill, 1)}%
            </Formula>
            {fit.kind === 'stretch' ? (
              <Formula>
                伸び = (当たる径 − d1) ÷ d1 × 100 = ({trim(fit.diameter)} − {trim(ring.d1)}) ÷ {trim(ring.d1)} × 100 ={' '}
                {fixed(fit.value, 1)}%
              </Formula>
            ) : (
              <Formula>
                縮み = (d1 + 2 × d2 − 当たる径) ÷ (d1 + 2 × d2) × 100 = ({trim(outerDiameter(ring))} −{' '}
                {trim(fit.diameter)}) ÷ {trim(outerDiameter(ring))} × 100 = {fixed(fit.value, 1)}%
              </Formula>
            )}
            <FormulaLegend
              items={[
                ['d1', 'Oリングの内径'],
                ['d2', 'Oリングの太さ'],
                ...(flat
                  ? ([
                      ['d', '外圧用の溝内径（呼び番号の数値）'],
                      ['b', '溝幅'],
                    ] as const)
                  : ([
                      ['d, D', 'ハウジングの径（JIS B 2401-2）'],
                      ['b', '溝幅（バックアップリングの数で変わる）'],
                    ] as const)),
              ]}
            />
            <p>
              つぶし率の範囲は、太さの許容差と溝の寸法許容差（円筒面は d・D、平面は深さ
              h）の両端を組み合わせた値で、規格の表に示されている範囲と同じ求め方です。実際には偏心やOリングの材料によっても変わります。伸び・縮みは基準寸法どうしの幾何計算です。
            </p>
            <p>
              溝の寸法の表（旧 JIS B 2406:1991）は、使用圧力 25.0 MPa 以下で使う溝が対象です。
              {!flat && 'バックアップリングが要るかは、条件の欄の「バックアップリングが要るかの目安」を見てください。'}
            </p>
          </FormulaInfo>
        </div>

        <RelatedLinks links={related} />
      </Card>

      <Card title="図面用（図面指示・DXF）" index="03" icon={PenTool} className="lg:col-span-2">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
              図面指示の例
              <span className="rounded-sm border border-zinc-300 px-1.5 py-0.5 text-[11px] font-semibold text-zinc-600">
                参考
              </span>
            </p>
            <pre className="num mt-2 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed whitespace-pre-wrap text-zinc-900">
              {callout.join('\n')}
            </pre>
            <div className="mt-2">
              <CopyTextButton text={callout.join('\n')} label="図面指示をコピー" />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              数値は JIS B 2401-2（旧 JIS B 2406:1991
              の表の値）です。書き方（許容差の表し方・注記の位置）は社内の製図ルールに合わせてください。（
              ）は参考寸法です。
            </p>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={downloadDxf}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              <Download className="size-4" aria-hidden />
              DXF をダウンロード（{flat ? '平面図＋断面' : `${isPiston ? 'ピストン型' : 'ロッド型'}の半断面`}）
            </button>
            <p className="num text-xs text-zinc-600">{grooveDxfFilename(ring, input.groove, housing, input.backup)}</p>
            <p className="text-xs leading-relaxed text-zinc-600">
              {flat
                ? '溝の外径・内径の円と、半径方向の断面 A-A（溝幅 × 深さ）を 1:1 で描きます。'
                : '中心線から上の半断面を 1:1 で描きます（中心線は y = 0。溝底と相手の面の高さが半径）。'}
              溝の輪郭（OUTLINE）、中心線（CENTER）、寸法メモとOリングの断面（自由状態・NOTE）の3レイヤー。溝底の角は規格が最大値だけを決めているので、角は描かずに「R…
              MAX」と注記します。単位 mm。
            </p>
          </div>
        </div>
      </Card>

      <Card
        title={`${input.series} 系列の寸法表`}
        index="04"
        icon={Table2}
        className="lg:col-span-2"
        flush
        aside={<div className="hidden sm:block">{tableExport}</div>}
      >
        {/* スマホでは見出しが狭いので、表の上に置く */}
        <div className="flex justify-end px-4 pt-3 sm:hidden">{tableExport}</div>
        <p className="px-4 pt-3 text-xs text-zinc-600">
          {isFlat ? '平面の溝（固定用）' : '円筒面の溝（運動用・固定用）'}。単位: mm。
          {isFlat ? '' : `溝幅はバックアップリング ${input.backup} 個の値。d は 0/−、D は +/0 の許容差。`}
          行をタップするとその番号を選べます。コピー・CSV には許容差などの列も入ります。
        </p>
        <div className="mt-2">
          <DataTable
            maxHeightClass="max-h-[32rem]"
            columns={columns}
            rows={ROWS[input.series]}
            rowKey={(row) => row.no}
            isHighlighted={(row) => row.no === ring.no}
            onRowClick={(row) => setInput({ ...input, no: row.no })}
            caption={`${input.series} 系列のOリングと溝の寸法表`}
          />
        </div>
      </Card>

      <StickyResult targetId="o-ring-result" label={sticky.label} value={sticky.value} unit="mm" />
    </div>
  )
}
