import { AlertTriangle, ArrowRight, Info, Lightbulb, Ruler, ScanSearch } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks } from '../../components/RelatedLinks'
import { Badge, type BadgeTone } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { StickyResult } from '../../components/ui/StickyResult'
import { useToolState } from '../../hooks/useToolState'
import { fixed } from '../../lib/format'
import { standardLabel } from '../../standards'
import { Link } from '../../router/Link'
import {
  candidateHref,
  diameterSigma,
  FORM_PENALTY,
  hasFormAmbiguity,
  inchCaution,
  INTERNAL_GRADE,
  matchLevel,
  MIN_TAPER_SPACING,
  PITCH_CAUTION_PERCENT,
  PITCH_SIGMA_RATIO,
  rankCandidates,
  relatedLinksFor,
  tpiFromPitch,
  type MatchLevel,
  type RankedCandidate,
} from './calc'
import { kindText, pitchText, rangeText, signed } from './format'
import {
  DEFAULT_INPUT,
  isThreadIdInput,
  normalizeThreadIdInput,
  readMeasurement,
  type FieldIssue,
  type PitchMode,
  type SideKey,
  type ThreadIdInput,
} from './input'
import { confusablePitches, EXAMPLE_PITCH_COUNT, R_HALF_PIPE_END, SCOPE, TAPER_EXAMPLE_SPACING } from './tips'

const RESULT_ID = 'thread-id-result'
const TOP_COUNT = 5

const SIDE_OPTIONS: { value: SideKey; label: string }[] = [
  { value: 'ext', label: 'おねじ' },
  { value: 'int', label: 'めねじ' },
]

const MODE_OPTIONS: { value: PitchMode; label: string }[] = [
  { value: 'count', label: '数える' },
  { value: 'pitch', label: 'ピッチ' },
  { value: 'tpi', label: '山数' },
]

const MODE_HINTS: Record<PitchMode, string> = {
  count: '山頂を n 個数え、最初と最後の山頂の距離 L をノギスで測ります。ゲージが無くても測れます。',
  pitch: 'メートルねじ用のピッチゲージで合った値（mm）。',
  tpi: '管用ねじ用（ウイット山形）のゲージで合った山数（25.4mm あたり）。',
}

const EXAMPLES: { label: string; input: Partial<ThreadIdInput> }[] = [
  { label: '20.45mm・14山', input: { side: 'ext', dia: '20.45', mode: 'tpi', tpi: '14' } },
  { label: '11.8mm・P1.75', input: { side: 'ext', dia: '11.8', mode: 'pitch', pitch: '1.75' } },
  { label: '9.7mm・28山', input: { side: 'ext', dia: '9.7', mode: 'tpi', tpi: '28' } },
  { label: 'めねじ 18.6mm・14山', input: { side: 'int', dia: '18.6', mode: 'tpi', tpi: '14' } },
]

const LEVEL_BADGE: Record<MatchLevel, { tone: BadgeTone; text: string }> = {
  good: { tone: 'ok', text: 'よく合う' },
  fair: { tone: 'warning', text: '近い' },
  poor: { tone: 'danger', text: '離れている' },
}

/** NumberField に渡す error / warning / fix */
function fieldProps(issue: FieldIssue | undefined, apply: (next: Partial<ThreadIdInput>) => void) {
  if (!issue) return {}
  if (issue.kind === 'error') return { error: issue.message }
  const fix = issue.fix
  return {
    warning: issue.message,
    fix: fix ? { label: fix.label, onClick: () => apply(fix.next) } : undefined,
  }
}

function CandidateRow({ candidate, rank }: { candidate: RankedCandidate; rank: number }) {
  const level = LEVEL_BADGE[matchLevel(candidate.score)]
  const linkName = candidate.label.replace(/・.*$/, '')
  return (
    <li className="border-b border-zinc-100 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="num flex size-6 shrink-0 items-center justify-center rounded-sm bg-zinc-100 text-xs font-bold text-zinc-600">
          {rank}
        </span>
        <span className="num min-w-0 text-lg font-bold text-zinc-900">
          {candidate.label.split('・').map((part, index) => (
            <span key={part} className="inline-block whitespace-nowrap">
              {index > 0 && '・'}
              {part}
            </span>
          ))}
        </span>
        <Link
          to={candidateHref(candidate)}
          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1 pl-2 text-xs font-semibold text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
          aria-label={candidate.metric ? `${candidate.label} の下穴径を見る` : `${linkName} の寸法を見る`}
        >
          {candidate.metric ? '下穴径' : '寸法'}
          <ArrowRight className="size-3.5 text-orange-600" aria-hidden />
        </Link>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-8 text-xs text-zinc-500">
        <Badge tone={level.tone}>{level.text}</Badge>
        {kindText(candidate)}
      </p>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 gap-y-1 pl-8 text-xs">
        <dt className="text-zinc-500">径</dt>
        <dd className="num text-zinc-800">
          {rangeText(candidate.range)} mm
          <span className="block font-sans text-[11px] text-zinc-500">{candidate.rangeNote}</span>
        </dd>
        <dd className="num text-right font-semibold whitespace-nowrap text-zinc-900">
          {candidate.deltaDiameter === 0 ? (
            <span className="font-sans text-emerald-700">範囲内</span>
          ) : (
            <span aria-label={`径の差 ${signed(candidate.deltaDiameter)} mm`}>{signed(candidate.deltaDiameter)}</span>
          )}
        </dd>
        <dt className="text-zinc-500">ピッチ</dt>
        <dd className="num text-zinc-800">{pitchText(candidate)}</dd>
        <dd className="num text-right font-semibold whitespace-nowrap text-zinc-900">
          {candidate.deltaPitch === null ? (
            <span className="font-sans font-normal text-zinc-400">—</span>
          ) : (
            <span aria-label={`ピッチの差 ${signed(candidate.deltaPitch)} mm`}>
              {signed(candidate.deltaPitch)}
              <span className="ml-1 font-normal text-zinc-500">
                ({fixed((Math.abs(candidate.deltaPitch) / candidate.pitch) * 100, 1)}%)
              </span>
            </span>
          )}
        </dd>
      </dl>
    </li>
  )
}

function Notice({ tone, children }: { tone: 'warning' | 'info'; children: ReactNode }) {
  const Icon = tone === 'warning' ? AlertTriangle : Info
  return (
    <div
      className={`mt-3 flex gap-2 rounded-md border p-3 text-xs leading-relaxed ${
        tone === 'warning' ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-zinc-200 bg-zinc-50 text-zinc-700'
      }`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${tone === 'warning' ? 'text-orange-600' : 'text-zinc-500'}`} aria-hidden />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

export function ThreadIdTool() {
  const [input, setInput] = useToolState('thread-id', DEFAULT_INPUT, isThreadIdInput, normalizeThreadIdInput)
  const apply = (next: Partial<ThreadIdInput>) => setInput({ ...input, ...next })
  const external = input.side === 'ext'

  const measurement = readMeasurement(input)
  const { diameter, pitch, issues, taper } = measurement
  const form = taper?.verdict === 'taper' ? 'taper' : taper?.verdict === 'parallel' ? 'parallel' : null
  const ranked = diameter === null ? [] : rankCandidates({ side: measurement.side, diameter, pitch, form })
  const top = ranked.slice(0, TOP_COUNT)
  const best = top[0]
  const bestLevel = best ? matchLevel(best.score) : null
  const caution = inchCaution(best)
  // 「少しずれている」の知らせ: 10ピッチ分の長さが候補と同じ表示になるとき（ピッチは合っていて径だけずれている）は比べない
  const tenPitch = (value: number) => fixed(value * EXAMPLE_PITCH_COUNT, 2)
  const pitchLengths =
    best && pitch !== null && tenPitch(pitch) !== tenPitch(best.pitch)
      ? { measured: tenPitch(pitch), candidate: tenPitch(best.pitch) }
      : null
  const softTarget = !pitchLengths ? '径' : best?.deltaDiameter === 0 ? 'ピッチ' : '径かピッチ'
  const ambiguous = hasFormAmbiguity(ranked)

  // テーパの確認欄（おねじだけ）。値が入っていれば開いておく
  const taperRef = useRef<HTMLDetailsElement>(null)
  // null のあいだは自動（値が入っていれば開く）。利用者が開け閉めしたらそれに従う
  const [taperToggle, setTaperToggle] = useState<boolean | null>(null)
  const taperOpen = taperToggle ?? (input.dia2 !== '' || input.gap !== '')
  const openTaper = () => {
    setTaperToggle(true)
    window.setTimeout(() => {
      taperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      taperRef.current?.querySelector('input')?.focus({ preventScroll: true })
    }, 0)
  }

  const side = external ? 'おねじ' : 'めねじ'
  const diameterLabel = external ? '外径（山の頂）' : '内径（山の頂）'

  const copyText = best
    ? [
        `【ねじの判別】${side} ${diameterLabel.replace('（山の頂）', '')} ${diameter} mm${
          pitch === null ? '' : `・ピッチ ${fixed(pitch, 3)} mm（${fixed(tpiFromPitch(pitch), 1)}山）`
        }${taper && taper.verdict !== 'unclear' ? `・${taper.verdict === 'taper' ? 'テーパあり' : '平行'}` : ''}`,
        ...top.map(
          (c, index) =>
            `${index + 1}. ${c.label}（径の差 ${c.deltaDiameter === 0 ? '範囲内' : `${signed(c.deltaDiameter)} mm`}${
              c.deltaPitch === null ? '' : `・ピッチの差 ${signed(c.deltaPitch)} mm`
            }）`,
        ),
        caution === 'strong'
          ? '注: どの候補とも差が大きい（インチねじ・特殊なねじの可能性あり）'
          : caution === 'soft'
            ? '注: 候補と少しずれている（測り直し、またはインチねじの可能性あり）'
            : '',
        `典拠: ${standardLabel('JIS B 0205-2')} / ${standardLabel('JIS B 0203')} / ${standardLabel('JIS B 0202')}`,
        '（サクッとJIS）',
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const tips = confusablePitches()

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="測った値" index="01" icon={Ruler}>
        <div className="grid gap-4">
          <SegmentedControl
            label="ねじの種類"
            value={input.side}
            options={SIDE_OPTIONS}
            onChange={(value) => apply({ side: value })}
            hint={external ? 'ボルト・管・継手のおすのねじ部' : 'ねじ穴・ナット・継手のめすのねじ部'}
          />
          <NumberField
            label={diameterLabel}
            value={input.dia}
            onChange={(value) => apply({ dia: value })}
            placeholder={external ? '例: 20.45' : '例: 18.6'}
            unit="mm"
            hint={
              external
                ? 'ノギスの外側ジョウで、ねじ山の頂どうしを測ります（先端の面取りは避ける）。'
                : 'ノギスの内側ジョウで、入口付近のねじ山の頂どうしを測ります。'
            }
            {...fieldProps(issues.dia, apply)}
          />
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-500">例を入れる</p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  onClick={() => apply({ ...DEFAULT_INPUT, ...example.input })}
                  className="num h-10 rounded-sm border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500"
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
          <SegmentedControl
            label="ピッチの入れ方"
            value={input.mode}
            options={MODE_OPTIONS}
            onChange={(value) => apply({ mode: value })}
            hint={MODE_HINTS[input.mode]}
          />
          {input.mode === 'count' && (
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="山頂の数 n"
                  value={input.n}
                  onChange={(value) => apply({ n: value })}
                  placeholder="11"
                  unit="個"
                  {...fieldProps(issues.n, apply)}
                />
                <NumberField
                  label="距離 L"
                  value={input.len}
                  onChange={(value) => apply({ len: value })}
                  placeholder="例: 18.14"
                  unit="mm"
                  {...fieldProps(issues.len, apply)}
                />
              </div>
              <p className="num rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                {pitch !== null
                  ? `P = ${input.len} ÷ (${input.n} − 1) = ${fixed(pitch, 3)} mm（${fixed(tpiFromPitch(pitch), 1)}山）`
                  : 'P = L ÷ (n − 1)　山頂11個なら10ピッチ分'}
              </p>
            </div>
          )}
          {input.mode === 'pitch' && (
            <NumberField
              label="ピッチ P"
              value={input.pitch}
              onChange={(value) => apply({ pitch: value })}
              placeholder="例: 1.75"
              unit="mm"
              hint={pitch !== null ? `25.4 ÷ ${fixed(pitch, 3)} = ${fixed(tpiFromPitch(pitch), 1)}山` : undefined}
              {...fieldProps(issues.pitch, apply)}
            />
          )}
          {input.mode === 'tpi' && (
            <NumberField
              label="山数（25.4mm あたり）"
              value={input.tpi}
              onChange={(value) => apply({ tpi: value })}
              placeholder="例: 14"
              unit="山"
              hint={pitch !== null ? `ピッチ P = 25.4 ÷ ${input.tpi} = ${fixed(pitch, 3)} mm` : undefined}
              {...fieldProps(issues.tpi, apply)}
            />
          )}

          {external && (
            <details
              ref={taperRef}
              open={taperOpen}
              onToggle={(event) => {
                const { open } = event.currentTarget
                if (open !== taperOpen) setTaperToggle(open)
              }}
              className="group rounded-md border border-zinc-200"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-zinc-700 select-none [&::-webkit-details-marker]:hidden">
                テーパか平行かを確かめる（任意）
                <span className="ml-auto text-xs text-zinc-400 group-open:hidden">開く</span>
              </summary>
              <div className="grid gap-3 border-t border-zinc-200 p-3">
                <p className="text-xs leading-relaxed text-zinc-600">
                  上の外径とは別の位置でもう一度外径を測り、2か所の間隔を入れます。テーパねじ（R）なら間隔 x に対して x/16（
                  {TAPER_EXAMPLE_SPACING} mm で {fixed(TAPER_EXAMPLE_SPACING / 16, 3)} mm）違います。
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="もう1か所の外径"
                    value={input.dia2}
                    onChange={(value) => apply({ dia2: value })}
                    placeholder="例: 21.08"
                    unit="mm"
                    {...fieldProps(issues.dia2, apply)}
                  />
                  <NumberField
                    label="2か所の間隔 x"
                    value={input.gap}
                    onChange={(value) => apply({ gap: value })}
                    placeholder="例: 10"
                    unit="mm"
                    {...fieldProps(issues.gap, apply)}
                  />
                </div>
                {taper && (
                  <p
                    className={`rounded-sm px-3 py-2 text-xs font-semibold ${
                      taper.verdict === 'unclear' ? 'bg-orange-50 text-orange-900' : 'bg-zinc-900 text-white'
                    }`}
                    role="status"
                  >
                    <span className="num">
                      差 {fixed(taper.difference, 3)} mm（テーパなら {fixed(taper.expected, 3)} mm）
                    </span>
                    {' → '}
                    {taper.verdict === 'taper'
                      ? 'テーパねじ（R）と判定して順位を付けています'
                      : taper.verdict === 'parallel'
                        ? '平行ねじ（G・メートルねじ）と判定して順位を付けています'
                        : taper.reason === 'short'
                          ? `間隔を ${MIN_TAPER_SPACING} mm 以上にしてください（判定に使っていません）`
                          : '差が大きすぎます。測り直してください（判定に使っていません）'}
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      </Card>

      <Card
        title="候補"
        index="02"
        icon={ScanSearch}
        id={RESULT_ID}
        aside={best ? <CopyButton text={copyText} /> : undefined}
      >
        <PrimaryResult
          label={best ? (bestLevel === 'poor' ? 'いちばん近い候補（差が大きい）' : 'いちばん近い候補') : '判別結果'}
          value={best?.label}
        >
          {best ? (
            <>
              {kindText(best)}・径の差{' '}
              <span className="num font-semibold text-white">
                {best.deltaDiameter === 0 ? '範囲内' : `${signed(best.deltaDiameter)} mm`}
              </span>
              {best.deltaPitch !== null && (
                <>
                  ・ピッチの差 <span className="num font-semibold text-white">{signed(best.deltaPitch)} mm</span>
                </>
              )}
            </>
          ) : (
            '測った径を入れると、近い規格ねじを順に表示します。'
          )}
        </PrimaryResult>

        {best && caution === 'strong' && (
          <Notice tone="warning">
            <p className="font-semibold">どの候補とも差が大きいです。</p>
            <p>
              測り直すか、インチねじ（ユニファイ UNC・UNF、ウイット）や特殊なねじの可能性を考えてください。このツールはインチねじには対応していません。
            </p>
          </Notice>
        )}
        {best && caution === 'soft' && (
          <Notice tone="info">
            <p>
              いちばん近い {best.label} とも、{softTarget}
              が少しずれています。測り直すか、インチねじ（ユニファイ UNC・UNF、ウイット）の可能性も考えてください。このツールはインチねじには対応していません。
            </p>
            {pitchLengths && (
              <p>
                山頂を {EXAMPLE_PITCH_COUNT + 1} 個数えて {EXAMPLE_PITCH_COUNT} ピッチ分の距離を測ると見分けやすくなります（入力したピッチなら{' '}
                <span className="num font-semibold">{pitchLengths.measured} mm</span>、{best.label} なら{' '}
                <span className="num font-semibold">{pitchLengths.candidate} mm</span>）。
              </p>
            )}
          </Notice>
        )}
        {best && pitch === null && (
          <Notice tone="info">
            <p>
              ピッチが未入力のため、径だけで並べています。R1/2 の管端の外径（{fixed(R_HALF_PIPE_END, 3)} mm）と M20
              のように、ピッチを入れないと取り違えやすいねじがあります。
            </p>
          </Notice>
        )}
        {ambiguous && (
          <Notice tone="info">
            <p>
              {top[0].label} と {top[1].label} は、径とピッチだけでは区別できません（基準径が同じで、テーパの有無だけが違います）。
            </p>
            {external && (
              <button
                type="button"
                onClick={openTaper}
                className="mt-1 inline-flex h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-800 hover:border-zinc-500"
              >
                2か所の外径でテーパを確かめる
              </button>
            )}
          </Notice>
        )}

        {top.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3">
              <h3 className="text-xs font-bold tracking-wider text-zinc-500">近い順の候補（上位{top.length}）</h3>
              <p className="text-[11px] text-zinc-500">右端は実測 − 候補の差 [mm]</p>
            </div>
            <ol className="mt-1">
              {top.map((candidate, index) => (
                <CandidateRow key={candidate.key} candidate={candidate} rank={index + 1} />
              ))}
            </ol>
          </>
        )}

        {best && <RelatedLinks links={relatedLinksFor(best)} />}

        <div className="mt-4 space-y-1">
          <Citation code="JIS B 0205-2" suffix="の呼び径とピッチ（メートルねじ）" />
          {!external && (
            <Citation code="JIS B 0209-1" suffix={`のめねじ内径の公差（${INTERNAL_GRADE}H）から計算`} />
          )}
          <Citation code="JIS B 0203" suffix="の基準寸法・基準の長さ・有効ねじ部の長さから計算（R・Rc・Rp）" />
          <Citation code="JIS B 0202" suffix="の基準寸法（G）" />
        </div>

        <div className="mt-4">
          <FormulaInfo title="判別の方法">
            <p>候補ごとに、実測の径が入るはずの範囲を、規格の寸法とテーパ 1/16 から求めます。</p>
            {external ? (
              <>
                <Formula>メートルねじ・G: 呼び径（外径） d</Formula>
                <Formula>R: 管端 d − a ÷ 16 〜 有効ねじ部の端 d + (ℓ − a) ÷ 16</Formula>
              </>
            ) : (
              <>
                <Formula>メートルねじ: D1 = D − 1.082532 × P 〜 D1 + T_D1（{INTERNAL_GRADE}H）</Formula>
                <Formula>Rc: 奥端 D1 − l ÷ 16 〜 入口 D1　／　G・Rp: D1 〜 D1 + 公差（G）</Formula>
              </>
            )}
            <p>
              範囲に入れば径の差は 0、外れたら近い方の端との差です。径の差とピッチの差を、それぞれの目安で割って2乗して足した点数が小さい順に並べます。
            </p>
            <Formula>
              点数 = (径の差 ÷ (0.1 + 0.01 × 基準径))²
              <br />
              　　 + (ピッチの差 ÷ ({PITCH_SIGMA_RATIO} × P))²
            </Formula>
            {best && (
              <Formula>
                例: {best.label}: ({signed(best.deltaDiameter)} ÷ {fixed(diameterSigma(best.basic), 3)})²
                {best.deltaPitch !== null &&
                  ` + (${signed(best.deltaPitch)} ÷ ${fixed(PITCH_SIGMA_RATIO * best.pitch, 3)})²`}
                {form && form !== best.form ? ` + ${FORM_PENALTY}` : ''} = {fixed(best.score, 2)}
              </Formula>
            )}
            <p>
              目安（0.1 mm + 1%、ピッチの 2%）は、ノギスの読み取り・ねじの公差・摩耗を見込んだこのサイトの想定で、規格の値ではありません。2か所の外径でテーパ・平行を判定したときは、形が合わない候補に {FORM_PENALTY} 点を足します。点数 4 以下を「よく合う」、16 以下を「近い」としています。いちばん近い候補が「よく合う」でないとき、または「よく合う」でもピッチの差が{' '}
              {PITCH_CAUTION_PERCENT}% を超えるとき（これもこのサイトの目安）は、インチねじの可能性を知らせます。
            </p>
            <FormulaLegend
              items={
                external
                  ? [
                      ['d', '外径の基準寸法（管用ねじは基準径の位置）'],
                      ['a', '基準の長さ（管端〜基準径の位置）'],
                      ['ℓ', 'R の有効ねじ部の最小長さ（管端から）'],
                      ['P', '候補のピッチ'],
                    ]
                  : [
                      ['D', 'メートルねじの呼び径'],
                      ['D1', 'めねじ内径の基準寸法'],
                      ['T_D1', 'めねじ内径の公差'],
                      ['l', 'Rc の有効ねじ部の最小長さ'],
                      ['P', '候補のピッチ'],
                    ]
              }
            />
          </FormulaInfo>
        </div>
      </Card>

      <Card title="測り方のコツ" index="03" icon={Lightbulb} className="lg:col-span-2">
        <div className="grid gap-5 text-sm leading-relaxed text-zinc-700 lg:grid-cols-3">
          <div>
            <h3 className="font-bold text-zinc-900">ピッチは{EXAMPLE_PITCH_COUNT}ピッチ以上で測る</h3>
            <p className="mt-1">
              山頂を{EXAMPLE_PITCH_COUNT + 1}個数え、最初と最後の山頂の距離を測って{EXAMPLE_PITCH_COUNT}
              で割ります。1ピッチでは見分けにくいピッチも、{EXAMPLE_PITCH_COUNT}ピッチ分の長さ（下の表・mm）なら差がはっきりします。
            </p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <caption className="sr-only">紛らわしいピッチの{EXAMPLE_PITCH_COUNT}ピッチ分の長さ [mm]</caption>
                <thead>
                  <tr className="border-b border-zinc-300 bg-zinc-50 text-zinc-600">
                    <th scope="col" className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                      管用ねじ
                    </th>
                    <th scope="col" className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">
                      {EXAMPLE_PITCH_COUNT}ピッチ
                    </th>
                    <th scope="col" className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">
                      近いメートルねじ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tips.map((row) => (
                    <tr key={row.tpi} className="border-b border-zinc-100 align-top">
                      <td className="num px-2 py-1.5 whitespace-nowrap">{row.tpi}山</td>
                      <td className="num px-2 py-1.5 text-right font-semibold whitespace-nowrap">
                        {fixed(row.tenPitches, 2)}
                      </td>
                      <td className="num px-2 py-1.5 text-right whitespace-nowrap">
                        {row.metric.map((m) => (
                          <span key={m.pitch} className="block">
                            P{m.pitch} → {fixed(m.tenPitches, 2)}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">テーパか平行かは2か所で測る</h3>
            <p className="mt-1">
              外径を x mm 離れた2か所で測ります。テーパねじ（R）は x/16 違い、{TAPER_EXAMPLE_SPACING} mm 離せば{' '}
              <span className="num font-semibold">{fixed(TAPER_EXAMPLE_SPACING / 16, 3)} mm</span>{' '}
              の差になります。同じ値なら平行ねじ（G・メートルねじ）です。R は管端がいちばん細くなります。
            </p>
          </div>
          <div>
            <h3 className="font-bold text-zinc-900">対象のねじ</h3>
            <p className="mt-1">
              メートルねじ（M{SCOPE.metricMin}〜M{SCOPE.metricMax} の並目・細目）と管用ねじ（R・Rc・Rp・G の{' '}
              {SCOPE.pipeMin}〜{SCOPE.pipeMax}）です。
              <strong className="font-semibold text-zinc-900">
                インチねじ（ユニファイ UNC・UNF、ウイット）には対応していません。
              </strong>
              どの候補とも合わないときは、これらの可能性があります。
            </p>
          </div>
        </div>
      </Card>

      {best && <StickyResult targetId={RESULT_ID} label="いちばん近い候補" value={best.label} />}
    </div>
  )
}
