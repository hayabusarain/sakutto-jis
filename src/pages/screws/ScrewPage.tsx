import { ChevronLeft, ChevronRight, CircleDot, Disc3, Drill, Hexagon, Nut, Wrench } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { SourceNote } from '../../components/SourceNote'
import { Card } from '../../components/ui/Card'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { ResultItem } from '../../components/ui/ResultItem'
import { isUnverified } from '../../features/bolt-size/data'
import { formatSignificant, TWO_H1_PER_PITCH } from '../../features/tap-drill/calc'
import { fixed, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { ActionLink, ChipNav, PageHeader, UnverifiedMark } from '../content/PageHeader'
import { FLANGE_TABLE_PAGES, FLANGE_TOOL_PATH } from '../tables/tablePages'
import { SCREW_INDEX_PATH, SCREW_PAGES, screwPath } from './screwPages'
import { screwSummary, SUMMARY_GRADE, SUMMARY_SIZES, type PitchRow } from './screwSummary'

const rowLinkClass =
  '-my-2 inline-flex min-h-10 items-center underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600'

function QuickValue({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-zinc-900 px-3 py-3">
      <dt className="text-[11px] leading-snug font-semibold text-zinc-400">{label}</dt>
      <dd className="mt-1">
        <span className="num text-2xl font-bold text-white sm:text-3xl">{value}</span>
        <span className="ml-1 text-sm text-zinc-400">mm</span>
        {note && <span className="mt-0.5 block text-xs text-zinc-300">{note}</span>}
      </dd>
    </div>
  )
}

export function ScrewPage({ d }: { d: number }) {
  const meta = SCREW_PAGES.find((page) => page.d === d)!
  const summary = screwSummary(d)!
  const { bolt, coarse, metric } = summary
  const name = (row: PitchRow) => (row.kind === '並目' ? `M${d}` : `M${d}×${trim(row.p)}`)
  const jaDiffers = bolt.sIso !== bolt.sJa
  const coarseLimits = coarse.limits
  const coarseHole = coarse.recommended?.hole
  const h = (Math.sqrt(3) / 2) * coarse.p
  const stressAreaText = formatSignificant(summary.stressArea)
  const flangeHasUnverified = summary.flanges.some((use) => use.sizes.some((row) => row.unverified))

  const columns: Column<PitchRow>[] = [
    {
      key: 'name',
      header: 'ねじ',
      align: 'left',
      cell: (row) => (
        <Link to={toolHref('/tap-drill', { d, p: row.p })} className={rowLinkClass}>
          {name(row)}
          <span className="sr-only">の下穴径を計算する</span>
        </Link>
      ),
    },
    { key: 'p', header: 'ピッチ', cell: (row) => trim(row.p) },
    {
      key: 'kind',
      header: '種類',
      align: 'left',
      cell: (row) => (
        <span className="font-sans">
          {row.kind}
          {row.note && <span className="ml-1 text-xs text-zinc-500">（{row.note}）</span>}
        </span>
      ),
    },
    { key: 'hole', header: '推奨下穴径', cell: (row) => (row.recommended ? trim(row.recommended.hole) : '—') },
    {
      key: 'range',
      header: `内径の範囲（${SUMMARY_GRADE}H）`,
      cell: (row) => (row.limits ? `${fixed(row.limits.min, 3)}〜${fixed(row.limits.max, 3)}` : '—'),
    },
    {
      key: 'engagement',
      header: 'ひっかかり率',
      cell: (row) => (row.engagement === null ? '—' : `${fixed(row.engagement, 0)}%`),
    },
  ]

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        shareTitle={meta.h1}
        lead={
          <p>
            メートルねじ M{d}（並目ピッチ {trim(coarse.p)} mm
            {metric.fine.length > 0 && `、細目 ${metric.fine.map((p) => trim(p)).join('・')} mm`}
            ）で、よく確認する下穴径・二面幅・六角レンチのサイズ・ボルト穴径・座ぐり寸法・ナットの高さを、JIS規格のデータから1ページにまとめました。
          </p>
        }
        actions={
          <nav aria-label="前後のサイズ" className="flex flex-wrap gap-2 print:hidden">
            {summary.prev !== null && (
              <Link
                to={screwPath(summary.prev)}
                className="num inline-flex h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white pr-3 pl-2 text-sm font-semibold text-zinc-700 hover:border-zinc-900"
              >
                <ChevronLeft className="size-4 text-orange-600" aria-hidden />M{summary.prev}
              </Link>
            )}
            <Link
              to={SCREW_INDEX_PATH}
              className="inline-flex h-10 items-center rounded-sm border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-900"
            >
              全サイズの一覧
            </Link>
            {summary.next !== null && (
              <Link
                to={screwPath(summary.next)}
                className="num inline-flex h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white pr-2 pl-3 text-sm font-semibold text-zinc-700 hover:border-zinc-900"
              >
                M{summary.next}
                <ChevronRight className="size-4 text-orange-600" aria-hidden />
              </Link>
            )}
          </nav>
        }
      />

      <section aria-label={`M${d} のよく使う寸法`} className="mb-4 lg:mb-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md bg-zinc-700 sm:grid-cols-4">
          <QuickValue
            label={`下穴径（並目 ${trim(coarse.p)}・${SUMMARY_GRADE}H）`}
            value={coarseHole === undefined ? '—' : trim(coarseHole)}
          />
          <QuickValue
            label="二面幅（スパナ）"
            value={trim(bolt.sIso)}
            note={jaDiffers ? `旧JIS ${trim(bolt.sJa)} mm` : undefined}
          />
          <QuickValue
            label="六角レンチ（キャップボルト）"
            value={trim(bolt.capKey)}
            note={bolt.capNonJis ? 'JIS B 1176 に無いサイズ（DIN 912 などの値）' : undefined}
          />
          <QuickValue label="ボルト穴径（2級）" value={trim(bolt.holes[1])} />
        </dl>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card title="ピッチと下穴径" index="01" icon={Drill} className="lg:col-span-2" flush>
          <p className="px-4 pt-3 text-xs leading-relaxed text-zinc-600">
            単位: mm。めねじの内径の許容範囲は公差域クラス {SUMMARY_GRADE}H（一般的な等級）の値です。ねじの名前をタップすると、等級や手持ちのドリルを変えて計算できます。
          </p>
          <div className="mt-2">
            <DataTable
              columns={columns}
              rows={summary.pitches}
              rowKey={(row) => String(row.p)}
              caption={`M${d} のピッチと下穴径`}
            />
          </div>
          <div className="px-4 pt-2">
            <dl>
              <ResultItem
                label={`有効断面積 As（M${d} 並目）`}
                value={stressAreaText}
                unit="mm²"
                note="ボルトの強度計算（引張荷重 = 応力 × As）に使います"
              />
            </dl>
          </div>
          <div className="space-y-1 p-4">
            <Citation code="JIS B 0205-2" suffix="の呼び径とピッチ" />
            <Citation code="JIS B 0209-1" suffix="のめねじ内径の公差" />
            <Citation code="ISO 2306" suffix="の推奨ドリル径（並目）" />
            <Citation code="JIS B 1082" suffix="の有効断面積の式" />
            {coarseLimits && coarseHole !== undefined && (
              <div className="pt-2">
                <FormulaInfo>
                  <p>めねじの内径（下穴で決まる寸法）の範囲と、下穴径の考え方です（M{d} 並目の例）。</p>
                  <Formula>
                    D1 = D − {TWO_H1_PER_PITCH} × P = {d} − {TWO_H1_PER_PITCH} × {trim(coarse.p)} = {fixed(coarseLimits.min, 3)} mm
                  </Formula>
                  <Formula>
                    {SUMMARY_GRADE}H の上限 = D1 + T<sub>D1</sub> = {fixed(coarseLimits.min, 3)} +{' '}
                    {fixed(coarseLimits.max - coarseLimits.min, 3)} = {fixed(coarseLimits.max, 3)} mm
                  </Formula>
                  <Formula>
                    ひっかかり率 = (D − 下穴径) ÷ ({TWO_H1_PER_PITCH} × P) × 100 = ({d} − {trim(coarseHole)}) ÷ (
                    {TWO_H1_PER_PITCH} × {trim(coarse.p)}) × 100 = {fixed(coarse.engagement ?? 0, 1)}%
                  </Formula>
                  <Formula>
                    As = π/4 × (D − 13/12 × H)² = π/4 × ({d} − 13/12 × {fixed(h, 4)})² = {fixed(summary.stressArea, 2)} ≒{' '}
                    {stressAreaText} mm²
                  </Formula>
                  <FormulaLegend
                    items={[
                      ['D', 'ねじの呼び径'],
                      ['P', 'ピッチ'],
                      ['H', '基準山形の高さ（√3/2 × P）'],
                      [<>T<sub>D1</sub></>, `めねじ内径の公差（JIS B 0209-1、${SUMMARY_GRADE}級）`],
                    ]}
                  />
                  <p>
                    推奨下穴径は、並目で ISO 2306 の推奨ドリル径が範囲に入るときはその値、それ以外は範囲に入る径（0.1mm 刻みなど）のうち「呼び径 − ピッチ」に最も近い値です。材質や加工条件によって適した径は変わるので、目安としてお使いください。有効断面積は有効数字3桁に丸めています。
                  </p>
                </FormulaInfo>
              </div>
            )}
          </div>
        </Card>

        <Card title="六角ボルト・六角ナット" index="02" icon={Nut}>
          <dl>
            <ResultItem
              label="二面幅 s（本体 / 旧JIS）"
              value={
                <>
                  {trim(bolt.sIso)} / {trim(bolt.sJa)}
                  {isUnverified('sJa', bolt.d) && <UnverifiedMark />}
                </>
              }
              unit="mm"
              note={jaDiffers ? 'JIS本体（ISO）と旧JIS（附属書JA）で二面幅が違います' : undefined}
            />
            <ResultItem label="ボルトの頭部の高さ k（本体 / 旧JIS）" value={`${trim(bolt.kIso)} / ${trim(bolt.kJa)}`} unit="mm" />
            <ResultItem label="ナットの高さ m（本体スタイル1 最大）" value={trim(bolt.nutStyle1)} unit="mm" />
            <ResultItem label="ナットの高さ m（旧JIS 1種 / 3種）" value={`${trim(bolt.nutJa1)} / ${trim(bolt.nutJa3)}`} unit="mm" />
          </dl>
          <div className="mt-3 space-y-1">
            <Citation code="JIS B 1180" suffix="本体・附属書JA" />
            <Citation code="JIS B 1181" suffix="本体（スタイル1）・附属書JA" />
          </div>
        </Card>

        <Card title="六角穴付きボルト（キャップボルト）" index="03" icon={Hexagon}>
          <dl>
            <ResultItem label="六角レンチのサイズ（六角穴の二面幅）" value={trim(bolt.capKey)} unit="mm" />
            <ResultItem label="頭部の径 dk" value={trim(bolt.capDk)} unit="mm" />
            <ResultItem label="頭部の高さ k" value={trim(bolt.capK)} unit="mm" />
          </dl>
          {bolt.capNonJis && (
            <p className="mt-2 text-xs leading-relaxed text-orange-800">
              M{d} の六角穴付きボルトは JIS B 1176 に無いサイズです。DIN 912 などの値を載せているので、使うボルトのメーカー寸法で確かめてください。
            </p>
          )}
          <div className="mt-3 space-y-1">
            {bolt.capNonJis ? (
              <Citation code="JIS B 1176" suffix="に無いサイズ（値は DIN 912 など）" />
            ) : (
              <Citation code="JIS B 1176" />
            )}
          </div>
        </Card>

        <Card title="ボルト穴・座ぐり" index="04" icon={CircleDot}>
          <dl>
            <ResultItem label="ボルト穴径 1級 / 2級 / 3級" value={bolt.holes.slice(0, 3).map((v) => trim(v!)).join(' / ')} unit="mm" />
            <ResultItem
              label="ボルト穴径 4級"
              value={
                bolt.holes[3] === null ? undefined : (
                  <>
                    {trim(bolt.holes[3])}
                    {isUnverified('hole4', bolt.d) && <UnverifiedMark />}
                  </>
                )
              }
              unit={bolt.holes[3] === null ? undefined : 'mm'}
            />
            <ResultItem
              label="ざぐり径 D'（六角ボルト・ナット用）"
              value={
                <>
                  {trim(bolt.spotFace)}
                  {isUnverified('spotFace', bolt.d) && <UnverifiedMark />}
                </>
              }
              unit="mm"
            />
            <ResultItem
              label="キャップボルト用 座ぐり径 × 深さ"
              value={bolt.counterbore ? `φ${trim(bolt.counterbore.d)} × ${trim(bolt.counterbore.h)}` : undefined}
              unit={bolt.counterbore ? 'mm' : undefined}
              note={
                bolt.counterbore
                  ? `穴径 φ${trim(bolt.counterbore.d1)}（設計でよく使われる参考値）`
                  : 'このサイズの参考値は確認中です'
              }
            />
          </dl>
          <p className="mt-2 text-xs leading-relaxed text-zinc-600">
            1級ほど穴が小さく、穴位置の精度が必要になります。迷ったら 2級。※ は規格原文での確認が済んでいない値です。
          </p>
          <div className="mt-3 space-y-1">
            <Citation code="JIS B 1001" suffix="のボルト穴径・ざぐり径" />
          </div>
        </Card>

        {summary.flanges.length > 0 && (
          <Card title={`M${d} を使うJISフランジ`} index="05" icon={Disc3}>
            <p className="text-xs leading-relaxed text-zinc-600">
              JIS B 2220 のフランジのうち、ボルトの呼びが M{d} のサイズです（ ）はボルトの本数。タップするとボルト長さを計算できます。
            </p>
            <div className="mt-3 space-y-3">
              {summary.flanges.map((use) => {
                const table = FLANGE_TABLE_PAGES.find((page) => page.pressure === use.pressure)
                return (
                  <div key={use.pressure}>
                    <p className="text-sm font-bold text-zinc-800">
                      {table ? (
                        <Link to={table.path} className="underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600">
                          JIS {use.pressure}
                        </Link>
                      ) : (
                        `JIS ${use.pressure}`
                      )}
                    </p>
                    <ChipNav
                      label={`JIS ${use.pressure} で M${d} を使うサイズ`}
                      className="mt-1.5"
                      links={use.sizes.map((row) => ({
                        to: toolHref(FLANGE_TOOL_PATH, { pressure: use.pressure, size: row.size }),
                        label: `${row.size}${row.unverified ? '※' : ''}（${row.n}本）`,
                      }))}
                    />
                  </div>
                )
              })}
            </div>
            {flangeHasUnverified && (
              <p className="mt-2 text-xs leading-relaxed text-zinc-600">
                <span className="font-bold text-orange-700">※</span>{' '}
                の付いたサイズは、フランジの寸法（ボルトの呼び・本数を含む）を規格原文で確認できていません。
              </p>
            )}
            <div className="mt-3 space-y-1">
              <Citation code="JIS B 2220" suffix="のボルトの呼びと本数" />
            </div>
          </Card>
        )}

        <Card title="ツールで条件を変えて計算する" index={summary.flanges.length > 0 ? '06' : '05'} icon={Wrench}>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ActionLink to={toolHref('/tap-drill', { d, p: coarse.p })}>M{d} の下穴径を計算する</ActionLink>
            <ActionLink to={toolHref('/bolt-size', { d })}>M{d} の二面幅・座ぐりを見る</ActionLink>
          </div>
        </Card>
      </div>

      <section className="mt-6" aria-labelledby="screw-sizes">
        <h2 id="screw-sizes" className="text-xs font-bold tracking-wider text-zinc-500">
          ほかのサイズのまとめ
        </h2>
        <ChipNav
          label="ねじの呼びを選ぶ"
          className="mt-2"
          links={SUMMARY_SIZES.map((size) => ({ to: screwPath(size), label: `M${size}`, current: size === d }))}
        />
      </section>

      <div className="mt-6">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}
