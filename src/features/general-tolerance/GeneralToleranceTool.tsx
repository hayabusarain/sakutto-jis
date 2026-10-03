import { Calculator, Check, ClipboardList, Copy, PenLine, Table2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { copyText } from '../../lib/clipboard'
import { parseNumber, trim } from '../../lib/format'
import { standardLabel } from '../../standards'
import {
  angleLimits,
  decimalsOfInput,
  drawingNote,
  findRange,
  formatTolerance,
  isOnBoundary,
  linearLimits,
  lookupTolerance,
  shortRangeLabel,
  TABLES,
  type ToleranceKind,
} from './calc'
import { CLASS_NAMES, MIN_SIZE, TOLERANCE_CLASSES, type SizeRange, type ToleranceClass } from './data'
import { DEFAULT_INPUT, isGeneralToleranceInput, normalizeInput, STORAGE_KEY } from './state'

const KIND_OPTIONS: { value: ToleranceKind; label: string }[] = [
  { value: 'linear', label: '長さ' },
  { value: 'chamfer', label: '面取・R' },
  { value: 'angle', label: '角度' },
]

const KIND_TITLES: Record<ToleranceKind, string> = {
  linear: '長さ寸法（面取り部分を除く）',
  chamfer: '面取り部分の長さ寸法（かどの丸み・面取り）',
  angle: '角度寸法',
}

const KIND_HINTS: Record<ToleranceKind, string> = {
  linear: '穴位置・外形・段差・円弧の半径など、ふつうの長さ寸法。',
  chamfer: 'C1・R2 などの、かどの面取り・かどの丸みの寸法（円弧の半径 R50 などは「長さ」）。',
  angle: '角度の許容差は、角度をはさむ短い方の辺の長さで決まります。',
}

/** 公差等級の選択。記号（f・m・c・v）と名前を2段で出し、320px でも折り返さないようにする */
function ClassPicker({ value, onChange }: { value: ToleranceClass; onChange: (value: ToleranceClass) => void }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-zinc-700">公差等級</legend>
      <div className="grid grid-cols-4 gap-1 rounded-md border border-zinc-200 bg-zinc-100 p-1">
        {TOLERANCE_CLASSES.map((cls) => (
          <label key={cls} className="min-w-0">
            <input
              type="radio"
              name={name}
              value={cls}
              checked={cls === value}
              onChange={() => onChange(cls)}
              className="peer sr-only"
            />
            <span className="flex h-12 cursor-pointer flex-col items-center justify-center rounded-sm leading-tight text-zinc-600 transition-colors peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-orange-500">
              <span className="num text-base font-bold">{cls}</span>
              <span className="text-[11px] font-semibold whitespace-nowrap">{CLASS_NAMES[cls]}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-500">図面の表題欄の指示（JIS B 0405-m の「m」など）に合わせます。</p>
    </fieldset>
  )
}

/** ISO との関係（JIS B 0405 のまえがき: ISO 2768-1:1989 を技術的内容を変更せずに翻訳） */
const ISO_SUFFIX = '準拠（ISO 2768-1:1989 と同じ値）'

/** 書き出し（コピー・CSV）の注記。典拠は表の番号と表題まで */
function exportNote(kind: ToleranceKind): string {
  const { no, title } = TABLES[kind].source
  return `典拠: ${standardLabel('JIS B 0405')} ${no} ${title}（ISO 2768-1:1989 と同じ値）。（サクッとJIS）`
}

/**
 * 数値の書かれていない直角の扱い。JIS B 0405 の 1.(b) と JIS B 0419:1991 の 6.1
 * （JIS B 0419 を指示したときは、暗示された直角に JIS B 0405 の角度の普通公差を適用しない）
 */
const IMPLIED_RIGHT_ANGLE_NOTE =
  '角度の数値が書かれていない直角（90°）は、図面に JIS B 0419 の指示がなければこの表を使います。「JIS B 0419-mK」のように JIS B 0419 も指示されているときは、その直角には JIS B 0405 の角度の普通公差は使わず、JIS B 0419 の直角度の普通公差によります（JIS B 0419:1991 の 6.1）。'

/** 図面の注記だけをコピーする（URL は付けない） */
function NoteCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])
  return (
    <button
      type="button"
      onClick={async () => setCopied(await copyText(text))}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      <span aria-live="polite">{copied ? 'コピーしました' : '注記をコピー'}</span>
    </button>
  )
}

interface ClassRow {
  cls: ToleranceClass
  tolerance: string
  lower: string
  upper: string
}

/** 3つの普通公差表の1つ（区分が行、等級が列）。今の区分の行と、選んだ等級のセルを強調する */
function ToleranceTable({
  kind,
  highlightIndex,
  cls,
}: {
  kind: ToleranceKind
  highlightIndex: number | null
  cls: ToleranceClass
}) {
  const { ranges, tolerances } = TABLES[kind]
  const indexed = ranges.map((range, index) => ({ range, index }))
  const unit = kind === 'angle' ? '' : ' [mm]'
  const { no } = TABLES[kind].source
  // 書き出しの見出しは規格の表の言い方（基準寸法の区分・対象とする角度の短い方の辺の長さの区分）
  const firstHeader = kind === 'angle' ? '対象とする角度の短い方の辺の長さの区分 [mm]' : '基準寸法の区分 [mm]'
  const cellText = (index: number, c: ToleranceClass) => {
    const value = tolerances[c][index]
    return value === null ? '—' : formatTolerance(kind, value)
  }
  const columns: Column<{ range: SizeRange; index: number }>[] = [
    {
      key: 'range',
      header: kind === 'angle' ? '短い方の辺' : '寸法の区分',
      cell: (row) => <span className="num">{shortRangeLabel(row.range)}</span>,
    },
    ...TOLERANCE_CLASSES.map((c) => ({
      key: c,
      header: (
        <span className={`inline-flex flex-col items-end leading-tight ${c === cls ? 'text-orange-700' : ''}`}>
          <span className="num text-sm font-bold">{c}</span>
          <span className="text-[10px]">{CLASS_NAMES[c]}</span>
        </span>
      ),
      cell: (row: { range: SizeRange; index: number }) => {
        const text = cellText(row.index, c)
        if (text === '—') return <span className="text-zinc-400">—</span>
        return row.index === highlightIndex && c === cls ? (
          <span className="rounded-sm bg-orange-700 px-1.5 py-0.5 font-bold text-white">{text}</span>
        ) : (
          text
        )
      },
    })),
  ]
  return (
    <section className="border-t border-zinc-200 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <h3 className="text-sm font-bold text-zinc-800">
          {KIND_TITLES[kind]}
          <span className="ml-1.5 text-xs font-normal text-zinc-500">（{no}）</span>
        </h3>
        <TableExport
          title={`普通公差 ${KIND_TITLES[kind]}の許容差${unit}（JIS B 0405 ${no}）`}
          filename={`jis-b-0405-${kind}`}
          headers={[firstHeader, ...TOLERANCE_CLASSES.map((c) => `${c} ${CLASS_NAMES[c]}`)]}
          rows={indexed.map((row) => [row.range.label, ...TOLERANCE_CLASSES.map((c) => cellText(row.index, c))])}
          note={exportNote(kind)}
        />
      </div>
      <div className="mt-2">
        <DataTable
          columns={columns}
          rows={indexed}
          rowKey={(row) => String(row.index)}
          isHighlighted={(row) => row.index === highlightIndex}
          caption={`普通公差 ${KIND_TITLES[kind]}の許容差`}
        />
      </div>
    </section>
  )
}

export function GeneralToleranceTool() {
  const [input, setInput] = useToolState(STORAGE_KEY, DEFAULT_INPUT, isGeneralToleranceInput, normalizeInput)
  const { kind, cls } = input
  const isAngle = kind === 'angle'

  const size = parseNumber(input.d)
  const sizeDecimals = decimalsOfInput(input.d)
  const angle = isAngle ? parseNumber(input.angle) : null
  const angleValid = angle !== null && angle > 0 && angle < 360

  let sizeError: string | undefined
  if (input.d.trim() !== '' && size === null) sizeError = '数値を入力してください。'
  else if (size !== null && size <= 0) sizeError = '0 より大きい値を入力してください。'
  const angleError =
    isAngle && input.angle.trim() !== '' && !angleValid ? '0 より大きく 360 未満の角度を入力してください。' : undefined

  const found = size !== null && size > 0 ? lookupTolerance(kind, cls, size) : null
  const rangeIndex = size !== null && size > 0 ? findRange(TABLES[kind].ranges, size) : null
  const highlightIndex = rangeIndex?.status === 'ok' ? rangeIndex.index : null
  const range = highlightIndex === null ? null : TABLES[kind].ranges[highlightIndex]

  // 等級ごとの許容差と上下の寸法
  const classRows: ClassRow[] = TOLERANCE_CLASSES.map((c) => {
    const tol = highlightIndex === null ? null : TABLES[kind].tolerances[c][highlightIndex]
    if (tol === null || size === null) return { cls: c, tolerance: '—', lower: '—', upper: '—' }
    if (isAngle) {
      if (!angleValid) return { cls: c, tolerance: formatTolerance(kind, tol), lower: '—', upper: '—' }
      const limits = angleLimits(angle, tol)
      return { cls: c, tolerance: formatTolerance(kind, tol), lower: limits.lower, upper: limits.upper }
    }
    const limits = linearLimits(size, sizeDecimals, tol)
    return { cls: c, tolerance: formatTolerance(kind, tol), lower: limits.lower, upper: limits.upper }
  })
  const selected = classRows.find((row) => row.cls === cls)!
  const ok = found?.status === 'ok'
  const selectedAngle = ok && isAngle && angleValid ? angleLimits(angle, found.tolerance) : null

  // 入力した桁のまま表示する（120.00 → 120.00）
  const sizeText = size === null ? '' : size.toFixed(Math.min(sizeDecimals, 6))
  const unitText = isAngle ? '' : 'mm'
  const note = drawingNote(cls)
  const source = TABLES[kind].source
  const isRightAngle = isAngle && angleValid && Math.abs(angle - 90) < 1e-9
  const classLabel = `${CLASS_NAMES[cls]} ${cls}`
  const nominalText = isAngle ? (angleValid ? `${trim(angle, 4)}°` : '') : `${sizeText} mm`

  let message: string
  if (size === null || sizeError) message = '寸法を入力してください。'
  else if (found?.status === 'below')
    message = `${MIN_SIZE} mm 未満の寸法には普通公差の表を使わず、寸法のあとに許容差を個々に指示します。`
  else if (found?.status === 'above')
    message =
      '4000 mm を超える長さ寸法は、普通公差の表（表1）にありません。図面に許容差を個々に書いておくと確実です。'
  else if (found?.status === 'none' && range)
    message = `${classLabel} には「${range.label}」の区分の許容差がありません（${source.no} の「—」）。ほかの等級を使うか、許容差を個々に書いておくと確実です。`
  else if (ok && isAngle)
    message = selectedAngle
      ? `${nominalText} → ${selectedAngle.lower} 〜 ${selectedAngle.upper}（短い方の辺 ${sizeText} mm：${range?.label}）`
      : `短い方の辺 ${sizeText} mm（${range?.label}）。角度を入れると上下の値も出します。`
  else if (ok) message = `${nominalText} → ${selected.lower} 〜 ${selected.upper} mm（区分: ${range?.label}）`
  else message = '寸法を入力してください。'

  const copyLines = ok
    ? [
        `【普通公差 JIS B 0405】${KIND_TITLES[kind]}`,
        isAngle
          ? `角度 ${nominalText || '—'}（短い方の辺 ${sizeText} mm）・${classLabel}: ${selected.tolerance}`
          : `${nominalText}・${classLabel}: ${selected.tolerance} mm`,
        selected.lower !== '—' ? `範囲: ${selected.lower} 〜 ${selected.upper}${unitText ? ` ${unitText}` : ''}` : '',
        `区分: ${range?.label}${isAngle ? '（短い方の辺の長さ）' : ''}`,
        `図面の注記: ${note}`,
        `典拠: ${standardLabel('JIS B 0405')} ${source.no} ${source.title}（ISO 2768-1:1989 と同じ値）`,
        '（サクッとJIS）',
      ]
    : []
  const copy = copyLines.filter(Boolean).join('\n')

  const example = ok && !isAngle && size !== null
  const tolMm = ok && !isAngle ? found.tolerance / 1000 : null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SegmentedControl
            label="寸法の種類"
            value={kind}
            options={KIND_OPTIONS}
            onChange={(value) => setInput({ ...input, kind: value })}
            hint={KIND_HINTS[kind]}
          />
          <NumberField
            label={
              kind === 'linear' ? '寸法（図面の値）' : kind === 'chamfer' ? '面取り・丸みの寸法' : '短い方の辺の長さ'
            }
            value={input.d}
            onChange={(d) => setInput({ ...input, d })}
            placeholder={kind === 'chamfer' ? '1' : '50'}
            unit="mm"
            error={sizeError}
            warning={
              found?.status === 'below'
                ? `${MIN_SIZE} mm 未満は普通公差の対象外です。`
                : found?.status === 'above'
                  ? '4000 mm を超える寸法は表にありません。'
                  : undefined
            }
            hint={kind === 'chamfer' ? 'C1 なら 1、R2.5 なら 2.5 を入力。' : undefined}
          />
          {isAngle && (
            <NumberField
              label="角度（10進の度）"
              value={input.angle}
              onChange={(value) => setInput({ ...input, angle: value })}
              placeholder="90"
              unit="°"
              error={angleError}
              hint="30′ は 0.5° です（例: 22°30′ → 22.5）。空欄なら許容差だけを表示します。"
            />
          )}
          <ClassPicker value={cls} onChange={(value) => setInput({ ...input, cls: value })} />
        </div>
      </Card>

      <Card
        title="結果"
        index="02"
        icon={Calculator}
        id="general-tolerance-result"
        aside={ok ? <CopyButton text={copy} /> : undefined}
      >
        <PrimaryResult
          label={`普通公差（${classLabel}）${isAngle ? '・角度' : kind === 'chamfer' ? '・面取り' : ''}`}
          value={ok ? selected.tolerance : undefined}
          unit={ok && !isAngle ? 'mm' : undefined}
        >
          {message}
        </PrimaryResult>

        {ok && (
          <dl className="mt-3">
            {!isAngle && (
              <>
                <ResultItem label="最大（上の寸法）" value={selected.upper} unit="mm" />
                <ResultItem label="最小（下の寸法）" value={selected.lower} unit="mm" />
              </>
            )}
            {isAngle && selectedAngle && (
              <>
                <ResultItem label="最大" value={selectedAngle.upper} note={`10進 ${selectedAngle.upperDecimal}`} />
                <ResultItem label="最小" value={selectedAngle.lower} note={`10進 ${selectedAngle.lowerDecimal}`} />
              </>
            )}
          </dl>
        )}

        {isRightAngle && <p className="mt-2 text-xs leading-relaxed text-zinc-600">{IMPLIED_RIGHT_ANGLE_NOTE}</p>}

        {size !== null && size > 0 && highlightIndex !== null && isOnBoundary(kind, size) && (
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            区分の境目です。{sizeText} mm ちょうどは「{range?.label}」に入ります（「〜以下」の区分に含む）。
          </p>
        )}

        {highlightIndex !== null && (
          <div className="mt-4">
            <p className="text-xs font-bold tracking-wider text-zinc-500">
              全等級（{isAngle ? `短い方の辺 ${sizeText} mm` : `${sizeText} mm`}）
            </p>
            <ul className="mt-1 rounded-md border border-zinc-200" aria-label="等級ごとの許容差と上下の値">
              {classRows.map((row) => {
                const active = row.cls === cls
                return (
                  <li key={row.cls} className="border-b border-zinc-100 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setInput({ ...input, cls: row.cls })}
                      aria-pressed={active}
                      className={`flex min-h-12 w-full items-center gap-3 px-3 py-1.5 text-left ${
                        active ? 'bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]' : 'hover:bg-zinc-50'
                      }`}
                    >
                      <span className={`min-w-0 flex-1 text-sm ${active ? 'font-bold text-zinc-900' : 'text-zinc-700'}`}>
                        <span className="num font-bold">{row.cls}</span> {CLASS_NAMES[row.cls]}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-base font-semibold text-zinc-900">{row.tolerance}</span>
                        <span className="num block text-[11px] text-zinc-500">
                          {row.lower === '—' ? (row.tolerance === '—' ? '規定なし' : '—') : `${row.lower} 〜 ${row.upper}`}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-1 text-xs text-zinc-500">タップすると、その等級を選べます。</p>
          </div>
        )}

        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-500">
            <PenLine className="size-3.5" aria-hidden />
            図面の注記（表題欄の中か、その近くに書く）
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <code className="num text-base font-semibold text-zinc-900">{note}</code>
            <NoteCopyButton text={note} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            長さ・面取り・角度に、同じ等級の普通公差が適用されます。規格の例は「{note}」の形で、「普通公差 {note}
            」と書くことも多いです。
          </p>
        </div>

        <div className="mt-3">
          <Citation code="JIS B 0405" detail={`${source.no} ${source.title}`} suffix={ISO_SUFFIX} />
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>
              寸法が入る区分を表から探し、等級の許容差を読みます。区分は「〜を超え〜以下」で、上端の値はその区分に含みます（3
              mm ちょうどは「0.5 以上 3 以下」）。
            </p>
            {isAngle ? (
              <>
                <p>角度は、角度をはさむ2辺のうち短い方の辺の長さで区分を選びます。</p>
                <p>{IMPLIED_RIGHT_ANGLE_NOTE}</p>
                <Formula>最大 = 角度 + 許容差</Formula>
                <Formula>最小 = 角度 − 許容差（1° = 60′）</Formula>
                {selectedAngle && ok && (
                  <Formula>
                    例: {nominalText} ± {selected.tolerance.slice(1)} → {selectedAngle.lower} 〜 {selectedAngle.upper}
                  </Formula>
                )}
              </>
            ) : (
              <>
                <Formula>最大 = 寸法 + 許容差</Formula>
                <Formula>最小 = 寸法 − 許容差</Formula>
                {example && tolMm !== null && (
                  <>
                    <Formula>
                      例: {sizeText} + {trim(tolMm, 3)} = {selected.upper} mm
                    </Formula>
                    <Formula>
                      　　{sizeText} − {trim(tolMm, 3)} = {selected.lower} mm
                    </Formula>
                  </>
                )}
                <p>上下の寸法は、入力した寸法と許容差のうち小数点以下の桁が多い方にそろえて表示します。</p>
              </>
            )}
            <FormulaLegend
              items={[
                ['f', '精級'],
                ['m', '中級'],
                ['c', '粗級'],
                ['v', '極粗級'],
                ['—', 'その区分には許容差の規定なし'],
              ]}
            />
            <p>
              {MIN_SIZE} mm 未満の長さ寸法・面取り部分の寸法は普通公差の対象外で、寸法のあとに許容差を個々に指示します（表1・表2
              の注）。長さ寸法の表（表1）は 4000 mm までです。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card title="普通公差の表（JIS B 0405）" index="03" icon={Table2} className="lg:col-span-2" flush>
        <p className="px-4 pt-3 text-xs text-zinc-500">
          単位: mm（角度の許容差は度・分）。区分の「30超〜120」は「30 を超え 120 以下」、「〜10」は「10
          以下」、「6超」は「6 を超えるもの」の意味です。入力した寸法の区分の行と、選んだ等級を強調しています。
        </p>
        <div className="mt-1">
          {(['linear', 'chamfer', 'angle'] as const).map((k) => (
            <ToleranceTable key={k} kind={k} highlightIndex={k === kind ? highlightIndex : null} cls={cls} />
          ))}
        </div>
        <div className="border-t border-zinc-200 p-4">
          <Citation code="JIS B 0405" detail="表1・表2・表3" suffix={ISO_SUFFIX} />
        </div>
      </Card>

      {ok && (
        <StickyResult
          targetId="general-tolerance-result"
          label={`普通公差 ${classLabel}・${isAngle ? `短辺 ${sizeText} mm` : nominalText}`}
          value={selected.tolerance}
          unit={isAngle ? undefined : 'mm'}
        />
      )}
    </div>
  )
}
