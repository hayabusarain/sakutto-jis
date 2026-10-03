/**
 * ねじの呼びごとのまとめページ（/screw/m12 など）と一覧ページ（/screw）のパス・題名・説明文。
 */
import { formatHole } from '../../features/tap-drill/calc'
import { trim } from '../../lib/format'
import type { StandardCode } from '../../standards'
import { CATEGORY_LABELS } from '../../tools/registry'
import { HOME_CRUMB, type ContentPageMeta } from '../tables/tablePages'
import { SCREW_INDEX_PATH, screwPath } from './paths'
import { screwSummary, SUMMARY_SIZES } from './screwSummary'

export { SCREW_INDEX_PATH, screwPath } from './paths'

const FIRST = SUMMARY_SIZES[0]
const LAST = SUMMARY_SIZES[SUMMARY_SIZES.length - 1]
const INDEX_LABEL = 'ねじ寸法まとめ'

export const SCREW_INDEX_META: ContentPageMeta = {
  path: SCREW_INDEX_PATH,
  title: `ねじ寸法一覧表 M${FIRST}〜M${LAST}（下穴・二面幅・六角レンチ・ボルト穴・座ぐり）`,
  h1: `ねじの寸法まとめ（M${FIRST}〜M${LAST}）`,
  description: `メートルねじ M${FIRST}〜M${LAST} の並目ピッチ・下穴径・六角ボルトの二面幅・六角レンチのサイズ・ボルト穴径・座ぐり寸法を一覧にしました。サイズごとのページでは細目ねじの下穴やナットの高さ、そのボルトを使うJISフランジも確認できます。`,
  label: INDEX_LABEL,
  category: CATEGORY_LABELS.fastening,
  breadcrumb: [HOME_CRUMB, { label: INDEX_LABEL, path: SCREW_INDEX_PATH }],
  standards: ['JIS B 0205-2', 'JIS B 0209-1', 'ISO 2306', 'JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'],
}

export interface ScrewPageMeta extends ContentPageMeta {
  d: number
}

export const SCREW_PAGES: readonly ScrewPageMeta[] = SUMMARY_SIZES.map((d) => {
  const summary = screwSummary(d)!
  const { bolt, coarse } = summary
  const path = screwPath(d)
  const label = `M${d}`
  const drill = coarse.recommended ? `下穴径 ${formatHole(coarse.recommended.hole)} mm、` : ''
  const across = bolt.sIso === bolt.sJa ? `${trim(bolt.sIso)} mm` : `${trim(bolt.sIso)} mm（旧JIS ${trim(bolt.sJa)} mm）`
  const standards: StandardCode[] = [
    'JIS B 0205-2',
    'JIS B 0205-4',
    'JIS B 0209-1',
    'ISO 2306',
    'JIS B 1004',
    'JIS B 1082',
    'JIS B 1180',
    'JIS B 1181',
    'JIS B 1176',
    'JIS B 1001',
    ...(summary.flanges.length > 0 ? (['JIS B 2220'] as const) : []),
  ]
  return {
    d,
    path,
    title: `M${d} ねじの寸法まとめ（下穴・二面幅・ボルト穴・座ぐり）`,
    h1: `M${d} ねじの寸法まとめ`,
    description: `M${d}（並目ピッチ ${trim(coarse.p)} mm）の${drill}六角ボルト・ナットの二面幅 ${across}、六角レンチ ${trim(bolt.capKey)} mm、ボルト穴径 ${trim(bolt.holes[1])} mm（2級）、座ぐり寸法、ナットの高さなどを1ページにまとめました。`,
    label,
    category: CATEGORY_LABELS.fastening,
    breadcrumb: [HOME_CRUMB, { label: INDEX_LABEL, path: SCREW_INDEX_PATH }, { label, path }],
    standards,
  }
})
