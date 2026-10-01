import { ArrowRight, ClipboardList, Nut, PencilRuler, Table2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks, type RelatedLink } from '../../components/RelatedLinks'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { FormulaInfo } from '../../components/ui/FormulaInfo'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { screwPath } from '../../pages/screws/paths'
import { Link } from '../../router/Link'
import { CalloutPanel } from './Callout'
import {
  coarsePitchOf,
  DEFAULT_INPUT,
  EXPORT_HEADERS,
  EXPORT_NOTE,
  exportRows,
  findBolt,
  flangesUsingBolt,
  holeOf,
  isBoltSizeInput,
  normalizeBoltSizeInput,
  representativeFlange,
  sizeRangeLabel,
  summaryText,
  FLANGE_TOOL_PATH,
  TAP_DRILL_TOOL_PATH,
} from './calc'
import { BOLT_SIZES, HOLE_CLASSES, isUnverified, UNVERIFIED, type BoltSize } from './data'
import { Mark, MarkLegend } from './Mark'
import { ToolFinder } from './ToolFinder'

const SIZE_OPTIONS = BOLT_SIZES.map((size) => ({ value: String(size.d), label: `M${size.d}` }))
const SIZE_PICKS = ['6', '8', '10', '12', '16', '20', '24'] as const
const CLASS_OPTIONS = HOLE_CLASSES.map((c) => ({ value: c, label: c }))
const RESULT_ID = 'bolt-size-result'
const EXPORT_ROWS = exportRows()

/** 全サイズが未確認の項目は、表では列見出しに ※ を付ける */
const allUnverified = (field: 'hole4' | 'spotFace') =>
  UNVERIFIED.some((entry) => entry.field === field && entry.sizes === 'all')

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="border-b border-zinc-300 pb-1 text-xs font-bold tracking-wider text-zinc-500">
        {title}
      </h3>
      <dl>{children}</dl>
    </div>
  )
}

/** 二面幅「16（17）」。（ ）は附属書JA。M3 は附属書JA の値に ※ */
function AcrossFlats({ size }: { size: BoltSize }) {
  const jaUnverified = isUnverified('sJa', size.d)
  if (size.sIso === size.sJa && !jaUnverified) return <>{trim(size.sIso)}</>
  return (
    <>
      {trim(size.sIso)}（{trim(size.sJa)}
      <Mark show={jaUnverified} />）
    </>
  )
}

/** このボルトを使う JIS フランジ（呼び圧力ごとの範囲。タップでフランジのツールへ） */
function FlangeUses({ d }: { d: number }) {
  const uses = flangesUsingBolt(d)
  return (
    <div className="mt-4">
      <h3 className="border-b border-zinc-300 pb-1 text-xs font-bold tracking-wider text-zinc-500">
        このボルトを使う JIS フランジ（JIS B 2220）
      </h3>
      {uses.length === 0 ? (
        <p className="py-2.5 text-sm text-zinc-500">
          このサイトのフランジ表（5K〜20K・10A〜300A）には、M{d} を使うサイズはありません。
        </p>
      ) : (
        <ul>
          {uses.map((use) => (
            <li key={use.pressure} className="border-b border-zinc-100 last:border-b-0">
              <Link
                to={toolHref(FLANGE_TOOL_PATH, { pressure: use.pressure, size: use.sizes[0] })}
                className="flex min-h-11 items-center gap-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                <span className="num w-10 shrink-0 font-bold text-zinc-900">{use.pressure}</span>
                <span className="num min-w-0 flex-1 text-zinc-800">
                  {sizeRangeLabel(use.sizes)}
                  <span className="ml-1.5 font-sans text-xs text-zinc-500">{use.sizes.length}サイズ</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-orange-600" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function BoltSizeTool() {
  const [input, setInput] = useToolState('bolt-size', DEFAULT_INPUT, isBoltSizeInput, normalizeBoltSizeInput)
  const size = findBolt(input.d) ?? BOLT_SIZES[0]
  const { holeClass } = input
  const classIndex = HOLE_CLASSES.indexOf(holeClass)
  const hole = holeOf(size, holeClass)
  const holeUnverified = holeClass === '4級' && isUnverified('hole4', size.d)
  const jaUnverified = isUnverified('sJa', size.d)
  const jaDiffers = size.sIso !== size.sJa
  const selectSize = (d: number) => setInput({ ...input, d })

  const hasFlanges = flangesUsingBolt(size.d).length > 0
  const pitch = coarsePitchOf(size.d)
  const flange = representativeFlange(size.d)
  const links: RelatedLink[] = [
    { to: screwPath(size.d), label: `M${size.d} の寸法まとめ（下穴・ナット高さ・フランジ）` },
    ...(pitch === null
      ? []
      : [{ to: toolHref(TAP_DRILL_TOOL_PATH, { d: size.d, p: pitch }), label: `M${size.d} のねじ下穴（並目）` }]),
    ...(flange === null
      ? []
      : [
          {
            to: toolHref(FLANGE_TOOL_PATH, { pressure: flange.pressure, size: flange.size }),
            label: `${flange.pressure} ${flange.size} フランジのボルト長さ`,
          },
        ]),
  ]

  const holeHeaderMark = holeClass === '4級' && allUnverified('hole4')
  const columns: Column<BoltSize>[] = [
    { key: 'd', header: 'ねじ', cell: (row) => `M${row.d}` },
    { key: 's', header: '二面幅', cell: (row) => <AcrossFlats size={row} /> },
    { key: 'key', header: '六角レンチ', cell: (row) => trim(row.capKey) },
    {
      key: 'hole',
      header: (
        <>
          穴 {holeClass}
          <Mark show={holeHeaderMark} />
        </>
      ),
      cell: (row) => {
        const value = row.holes[classIndex]
        if (value === null) return '—'
        return (
          <>
            {trim(value)}
            <Mark show={!holeHeaderMark && holeClass === '4級' && isUnverified('hole4', row.d)} />
          </>
        )
      },
    },
    {
      key: 'spot',
      header: (
        <>
          ざぐり径
          <Mark show={allUnverified('spotFace')} />
        </>
      ),
      cell: (row) => (
        <>
          {trim(row.spotFace)}
          <Mark show={!allUnverified('spotFace') && isUnverified('spotFace', row.d)} />
        </>
      ),
    },
    { key: 'cbd', header: 'CAP座ぐり径', cell: (row) => (row.counterbore ? trim(row.counterbore.d) : '—') },
    { key: 'cbh', header: 'CAP深さ', cell: (row) => (row.counterbore ? trim(row.counterbore.h) : '—') },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び"
            value={String(size.d)}
            options={SIZE_OPTIONS}
            onChange={(value) => selectSize(Number(value))}
            stepper
            quickPicks={SIZE_PICKS}
          />
          <ToolFinder selected={size.d} onSelect={selectSize} />
          <SegmentedControl
            label="ボルト穴の等級（JIS B 1001）"
            value={holeClass}
            options={CLASS_OPTIONS}
            onChange={(next) => setInput({ ...input, holeClass: next })}
            hint="1級ほど穴が小さく、穴位置の精度が必要になります。迷ったら 2級。"
          />
        </div>
      </Card>

      <Card
        id={RESULT_ID}
        title="結果"
        index="02"
        icon={Nut}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
        aside={<CopyButton text={summaryText(size, holeClass)} />}
      >
        <PrimaryResult label={`二面幅（スパナサイズ）・M${size.d}`} value={trim(size.sIso)} unit="mm">
          {jaDiffers ? (
            <>
              旧JIS（附属書JA）の六角ボルト・ナットは{' '}
              <span className="num font-semibold text-white">{trim(size.sJa)} mm</span>
              。旧JIS品も広く流通しているので、両方のサイズを用意しておくと安心です。
            </>
          ) : jaUnverified ? (
            <>
              JIS本体（ISO）の値です。旧JIS（附属書JA）は{' '}
              <span className="num font-semibold text-white">{trim(size.sJa)} mm</span>
              <Mark dark />
              としていますが、規格原文で確認できていません（資料により値が違います）。
            </>
          ) : (
            <>JIS本体（ISO）と旧JIS（附属書JA）で同じ二面幅です。</>
          )}
        </PrimaryResult>

        <div className="mt-4">
          <Group title="六角ボルト（JIS B 1180）">
            <ResultItem
              label="二面幅 s（本体 / 附属書JA）"
              value={
                <>
                  {trim(size.sIso)} / {trim(size.sJa)}
                  <Mark show={jaUnverified} />
                </>
              }
              unit="mm"
            />
            <ResultItem label="頭部の高さ k（本体 / 附属書JA）" value={`${trim(size.kIso)} / ${trim(size.kJa)}`} unit="mm" />
          </Group>
          <Group title="六角ナット（JIS B 1181）">
            <ResultItem label="高さ m（本体スタイル1 最大）" value={trim(size.nutStyle1)} unit="mm" />
            <ResultItem label="高さ m（附属書JA 1種 / 3種）" value={`${trim(size.nutJa1)} / ${trim(size.nutJa3)}`} unit="mm" />
          </Group>
          <Group title="六角穴付きボルト（JIS B 1176）">
            <ResultItem label="六角レンチ（六角穴の二面幅）" value={trim(size.capKey)} unit="mm" />
            <ResultItem
              label="頭部径 dk / 頭部の高さ k"
              value={`${trim(size.capDk)} / ${trim(size.capK)}`}
              unit="mm"
              note={size.capNonJis ? `M${size.d} は JIS B 1176 に無いサイズです（DIN 912 などの値）` : undefined}
            />
          </Group>
          <Group title="ボルト穴・座ぐり">
            <ResultItem
              label={`ボルト穴径（${holeClass}）`}
              value={
                hole === null ? undefined : (
                  <>
                    {trim(hole)}
                    <Mark show={holeUnverified} />
                  </>
                )
              }
              unit="mm"
              note={hole === null ? `M${size.d} の ${holeClass} は表にありません` : undefined}
            />
            <ResultItem
              label="ざぐり径 D'（六角ボルト用）"
              value={
                <>
                  {trim(size.spotFace)}
                  <Mark show={isUnverified('spotFace', size.d)} />
                </>
              }
              unit="mm"
            />
            <ResultItem
              label="CAP用座ぐり 径 × 深さ"
              value={size.counterbore ? `φ${trim(size.counterbore.d)} × ${trim(size.counterbore.h)}` : undefined}
              unit="mm"
              note={
                size.counterbore
                  ? `下穴 φ${trim(size.counterbore.d1)}（設計でよく使われる参考値）`
                  : 'このサイズの参考値は確認中です'
              }
            />
          </Group>
          <FlangeUses d={size.d} />
        </div>

        <MarkLegend className="mt-3" />

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 1180" suffix="本体・附属書JA" />
          <Citation code="JIS B 1181" suffix="本体（スタイル1）・附属書JA" />
          <Citation code="JIS B 1176" />
          <Citation code="JIS B 1001" suffix="のボルト穴径・ざぐり径" />
          {hasFlanges && <Citation code="JIS B 2220" suffix="のフランジのボルト" />}
        </div>

        <RelatedLinks links={links} />

        <div className="mt-4">
          <FormulaInfo title="データの見方">
            <p>
              JIS B 1180・B 1181 には、ISOに合わせた<strong>本体</strong>と、従来のJISの寸法を残した
              <strong>附属書JA</strong>（いわゆる旧JIS）があります。二面幅が違うのは{' '}
              {BOLT_SIZES.filter((s) => s.sIso !== s.sJa)
                .map((s) => `M${s.d}`)
                .join('・')}{' '}
              です（例: M12 は本体 {trim(findBolt(12)!.sIso)} mm、附属書JA {trim(findBolt(12)!.sJa)} mm）。
            </p>
            <p>ナットの高さは、本体スタイル1は最大値、附属書JAは呼び寸法です。3種は薄いナット（いわゆる薄ナット）です。</p>
            <p>
              六角穴付きボルト用の座ぐり（径・深さ）は規格本体の規定ではなく、頭部が面から出ないように設計でよく使われている参考値です。頭部径・頭部の高さに余裕を持たせています。
            </p>
            <p>
              「工具のサイズからボルトを探す」は、この表の二面幅（本体・附属書JA）と六角レンチの値を逆に引いています。表に無いサイズ（M3 未満・M36 超）は出てきません。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card title="図面指示の例（参考）" index="03" icon={PencilRuler} className="lg:col-start-1">
        <CalloutPanel size={size} holeClass={holeClass} />
      </Card>

      <Card
        title="寸法一覧"
        index="04"
        icon={Table2}
        className="lg:col-span-2"
        flush
        aside={
          <TableExport
            title="ボルト・ナット寸法一覧（M3〜M36）"
            filename="bolt-size"
            headers={EXPORT_HEADERS}
            rows={EXPORT_ROWS}
            note={EXPORT_NOTE}
          />
        }
      >
        <p className="px-4 pt-3 text-xs text-zinc-500">
          単位: mm。二面幅の（ ）は附属書JA（旧JIS）。行をタップするとそのサイズを選べます。
        </p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={BOLT_SIZES}
            rowKey={(row) => String(row.d)}
            isHighlighted={(row) => row.d === size.d}
            onRowClick={(row) => selectSize(row.d)}
            caption="ボルト・ナット寸法一覧"
          />
        </div>
        <MarkLegend className="px-4 pt-2 pb-3" />
      </Card>

      <StickyResult
        targetId={RESULT_ID}
        label={`M${size.d} の二面幅（スパナ）・六角レンチ ${trim(size.capKey)}`}
        value={trim(size.sIso)}
        unit={jaDiffers ? `mm（旧JIS ${trim(size.sJa)}）` : 'mm'}
      />
    </div>
  )
}
