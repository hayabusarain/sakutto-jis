import { Citation } from '../../components/Citation'
import { BOLT_JA_TABLE, JA_FUTURE_NOTE, NUT_JA_TABLE, sizeRangeLabel, type FlangeUse } from '../../features/bolt-size/calc'
import type { BoltSize } from '../../features/bolt-size/data'
import { ALL_FLANGE_TABLES } from '../../features/flange-bolt/data'
import { trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { Link } from '../../router/Link'
import { screwPath } from '../screws/paths'
import {
  BOLT_RANGE,
  boltSizeHref,
  FLANGE_TOOL_PATH,
  FLATS_DIFFER,
  FLATS_DIFFER_IN_FLANGES,
  FLATS_SAME_COUNT,
  ISO_ONLY_FLATS,
  JA_ONLY_FLATS,
  M12_BOLT,
} from './examples'
import { NoteLayout, NoteSection, NoteTable } from './NoteLayout'
import { ACROSS_FLATS_NOTE } from './notePages'

const list = (values: readonly number[]) => values.map((value) => trim(value)).join('・')
const signed = (value: number) => (value > 0 ? `+${trim(value)}` : `−${trim(-value)}`)

/** 旧JIS のほうが大きいサイズ・小さいサイズ */
const JA_LARGER = FLATS_DIFFER.filter((size) => size.sJa > size.sIso)
const JA_SMALLER = FLATS_DIFFER.filter((size) => size.sJa < size.sIso)

/** 「5K 32A〜65A、10K・16K・20K 10A〜20A」のように、同じ呼び径の範囲の圧力をまとめる */
function flangeUseText(uses: readonly FlangeUse[]): string {
  const groups = new Map<string, string[]>()
  for (const use of uses) {
    const label = sizeRangeLabel(use.sizes)
    groups.set(label, [...(groups.get(label) ?? []), use.pressure])
  }
  return [...groups].map(([label, pressures]) => `${pressures.join('・')} ${label}`).join('、')
}

/** 二面幅が違うサイズのうち、例に使うもの（最初の M10） */
const FIRST = FLATS_DIFFER[0]
/** フランジに使う例（M22 があれば 10K の M22、無ければ最初のもの） */
const FLANGE_EXAMPLE = FLATS_DIFFER_IN_FLANGES.find((entry) => entry.size.d === 22) ?? FLATS_DIFFER_IN_FLANGES[0]
const FLANGE_EXAMPLE_USE = FLANGE_EXAMPLE?.uses[0]

export function AcrossFlatsNote() {
  return (
    <NoteLayout
      meta={ACROSS_FLATS_NOTE}
      lead={
        <p>
          同じ M{FIRST.d} の六角ボルトでも、二面幅（スパナのサイズ）が {trim(FIRST.sIso)} mm のものと {trim(FIRST.sJa)} mm
          のものがあります。JIS B 1180（六角ボルト）・JIS B 1181（六角ナット）の本体と、附属書JA（いわゆる旧JIS）で寸法が違うためです。
        </p>
      }
      actions={[
        { to: boltSizeHref(FIRST.d), label: `M${FIRST.d} の二面幅・座ぐりを見る` },
        { to: screwPath(M12_BOLT.d), label: `M${M12_BOLT.d} の寸法まとめ` },
      ]}
    >
      <NoteSection id="sizes" title={`二面幅が違うのは ${FLATS_DIFFER.length} サイズ`}>
        <NoteTable
          caption="六角ボルト・ナットの二面幅（JIS本体と旧JIS が違うサイズ）"
          columns={[
            { header: 'ねじ', cell: (size: BoltSize) => `M${size.d}`, left: true },
            { header: 'JIS本体', cell: (size: BoltSize) => trim(size.sIso) },
            { header: '旧JIS', cell: (size: BoltSize) => trim(size.sJa) },
            { header: '旧JIS − 本体', cell: (size: BoltSize) => signed(size.sJa - size.sIso) },
          ]}
          rows={FLATS_DIFFER}
          rowKey={(size) => String(size.d)}
        />
        <p className="text-xs text-zinc-600">単位 mm。六角ボルトの頭と六角ナットは同じ二面幅です。</p>
        <p>
          {BOLT_RANGE} のほかの {FLATS_SAME_COUNT} サイズは、本体と旧JIS で二面幅が同じです。
          {JA_SMALLER.length > 0 &&
            `${JA_LARGER.map((size) => `M${size.d}`).join('・')} は旧JIS のほうが大きく、${JA_SMALLER.map((size) => `M${size.d}`).join('・')} だけは旧JIS のほうが小さくなります。`}
        </p>
        <p>
          二面幅のほかに、高さも少し違います。M{M12_BOLT.d} なら、ボルトの頭部の高さが本体 {trim(M12_BOLT.kIso)} mm・旧JIS{' '}
          {trim(M12_BOLT.kJa)} mm、ナットの高さが本体（スタイル1 の最大）{trim(M12_BOLT.nutStyle1)} mm・旧JIS 1種{' '}
          {trim(M12_BOLT.nutJa1)} mm です。
        </p>
        <div className="space-y-1">
          <Citation code="JIS B 1180" detail={`表3・表4、附属書JA ${BOLT_JA_TABLE}`} />
          <Citation code="JIS B 1181" detail={`表3・表4 六角ナット・スタイル1、附属書JA ${NUT_JA_TABLE}`} />
        </div>
      </NoteSection>

      <NoteSection id="why" title="本体と旧JIS の関係">
        <p>
          JIS B 1180・B 1181 の本体は ISO と同じ寸法で、附属書JA は ISO によらない寸法です。{JA_FUTURE_NOTE}
        </p>
        <p>
          そのため、新しく設計するものは本体の寸法が基本です。一方で、既存の設備や手持ちの部品には旧JIS の寸法のボルト・ナットが使われていることがあり、本体の寸法で用意したスパナが合わない原因になります。
        </p>
      </NoteSection>

      <NoteSection id="spanner" title="スパナが合わないときは">
        <ul>
          {JA_LARGER.length > 0 && (
            <li>
              {JA_LARGER.map((size) => `M${size.d}`).join('・')} は旧JIS のほうが大きいので、本体のスパナ（
              {list(JA_LARGER.map((size) => size.sIso))} mm）は旧JIS のボルト・ナットに入りません。逆に旧JIS のスパナを本体のものに使うとすき間ができ、角をつぶすおそれがあります。
            </li>
          )}
          {JA_SMALLER.map((size) => (
            <li key={size.d}>
              M{size.d} は逆で、旧JIS の {trim(size.sJa)} mm が入らなければ、本体（{trim(size.sIso)} mm）の可能性があります。
            </li>
          ))}
          <li>頭が旧JIS、ナットが本体という組み合わせもあり得るので、これらのサイズでは両方のスパナを用意しておくと確実です。</li>
        </ul>
      </NoteSection>

      <NoteSection id="identify" title="見分け方">
        <p>
          ノギスで二面幅を測ると、この {FLATS_DIFFER.length} サイズは二面幅だけで本体か旧JIS かがわかります。{BOLT_RANGE}{' '}
          の範囲では、<span className="num">{list(ISO_ONLY_FLATS)}</span> mm は本体、
          <span className="num">{list(JA_ONLY_FLATS)}</span> mm は旧JIS の二面幅で、ほかのサイズと重なりません。
        </p>
        <p>
          スパナのサイズからボルトを探すには、<Link to={boltSizeHref(FIRST.d)}>二面幅・座ぐりのツール</Link>
          の「工具のサイズからボルトを探す」を使えます。ねじの太さがわからないときは、
          <Link to="/thread-identify">ねじの判別</Link>で外径とピッチから確かめられます。
        </p>
      </NoteSection>

      {FLATS_DIFFER_IN_FLANGES.length > 0 && (
        <NoteSection id="flange" title="フランジのボルトでは">
          <p>JIS フランジ（JIS B 2220）では、次のサイズがこれに当たります。</p>
          <ul>
            {FLATS_DIFFER_IN_FLANGES.map(({ size, uses }) => (
              <li key={size.d}>
                <span className="num font-semibold text-zinc-900">M{size.d}</span>（本体 {trim(size.sIso)}・旧JIS{' '}
                {trim(size.sJa)} mm）: {flangeUseText(uses)}
              </li>
            ))}
          </ul>
          <p>
            フランジ＆ボルト長さのツールは、選んだナット（JIS本体・旧JIS 1種）の二面幅と、もう一方の二面幅を並べて表示します。
            {FLANGE_EXAMPLE && FLANGE_EXAMPLE_USE && (
              <>
                {' '}
                例:{' '}
                <Link
                  to={toolHref(FLANGE_TOOL_PATH, {
                    pressure: FLANGE_EXAMPLE_USE.pressure,
                    size: FLANGE_EXAMPLE_USE.sizes[0],
                    nut: 'ja1',
                  })}
                >
                  JIS {FLANGE_EXAMPLE_USE.pressure} {FLANGE_EXAMPLE_USE.sizes[0]}（M{FLANGE_EXAMPLE.size.d}）を旧JIS のナットで計算する
                </Link>
              </>
            )}
          </p>
          <div className="space-y-1">
            <Citation code="JIS B 2220" detail={ALL_FLANGE_TABLES} suffix="のボルトの呼び" />
          </div>
        </NoteSection>
      )}
    </NoteLayout>
  )
}
