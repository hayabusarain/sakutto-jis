/**
 * 印刷用の早見表（A4 縦1枚）のパス・題名・説明文。数値は各ツールの data.ts・calc.ts から作る（sheetData.ts）。
 */
import { FLANGES } from '../../features/flange-bolt/data'
import { sizesOf } from '../../features/steel-pipe/calc'
import type { StandardCode } from '../../standards'
import { CATEGORY_LABELS, TOOLS } from '../../tools/registry'
import { SUMMARY_SIZES } from '../screws/screwSummary'
import { HOME_CRUMB, type ContentPageMeta } from '../tables/tablePages'

export const PRINT_INDEX_PATH = '/print'
const INDEX_LABEL = '印刷用 早見表'

export type SheetKey = 'screw' | 'flange-10k' | 'flange' | 'pipe'

/** 早見表に載せる QR コードの行き先（サイト内のツール） */
export interface SheetQr {
  path: string
  /** QR コードの上に出す名前（ツールの短い名前） */
  label: string
}

export interface PrintSheetMeta extends ContentPageMeta {
  key: SheetKey
  /** 一覧ページに出す、載せている項目の短い説明 */
  contents: string
  qr: readonly SheetQr[]
}

function toolQr(path: string): SheetQr {
  const tool = TOOLS.find((t) => t.path === path)
  if (!tool) throw new Error(`ツールがありません: ${path}`)
  return { path, label: tool.navLabel }
}

const range = (list: readonly string[]) => `${list[0]}〜${list[list.length - 1]}`

const SCREW_RANGE = `M${SUMMARY_SIZES[0]}〜M${SUMMARY_SIZES[SUMMARY_SIZES.length - 1]}`
const SGP_RANGE = range(sizesOf('sgp').map((size) => size.a))
const FLANGE_10K_RANGE = range(FLANGES['10K'].map((row) => row.size))

const sheet = (
  key: SheetKey,
  meta: Omit<PrintSheetMeta, 'key' | 'path' | 'breadcrumb'> & { crumb: string },
): PrintSheetMeta => {
  const path = `${PRINT_INDEX_PATH}/${key}`
  const { crumb, ...rest } = meta
  return {
    ...rest,
    key,
    path,
    breadcrumb: [HOME_CRUMB, { label: INDEX_LABEL, path: PRINT_INDEX_PATH }, { label: crumb, path }],
  }
}

export const PRINT_SHEETS: readonly PrintSheetMeta[] = [
  sheet('screw', {
    title: `ねじ早見表 ${SCREW_RANGE}（下穴・二面幅・六角レンチ・ボルト穴・座ぐり）A4印刷用`,
    h1: `ねじ早見表（メートル並目 ${SCREW_RANGE}）`,
    description: `メートル並目ねじ ${SCREW_RANGE} の並目ピッチ・下穴径・六角ボルトとナットの二面幅（JIS本体・旧JIS）・六角レンチ・ボルト穴径・ざぐり径を、A4 1枚に印刷できる早見表です。ツールを開く QR コード付き。`,
    label: 'ねじ',
    crumb: 'ねじ',
    category: CATEGORY_LABELS.fastening,
    contents: `${SCREW_RANGE} の並目ピッチ・下穴径・二面幅（JIS本体・旧JIS）・六角レンチ・ボルト穴径 2級・ざぐり径`,
    standards: ['JIS B 0205-2', 'JIS B 0209-1', 'ISO 2306', 'JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'],
    qr: [toolQr('/tap-drill'), toolQr('/bolt-size')],
  }),
  sheet('flange-10k', {
    title: 'JIS 10K フランジ早見表（外径・PCD・ボルト穴・ボルト長さ）A4印刷用',
    h1: 'JIS 10K フランジ早見表',
    description: `JIS B 2220 の呼び圧力 10K フランジ ${FLANGE_10K_RANGE} の外径・PCD・ボルト穴の数と径・ボルトの呼び・ナットの二面幅・厚さと、六角ボルト・スタッドボルトの長さの目安を、A4 1枚に印刷できる早見表です。ツールを開く QR コード付き。`,
    label: '10K フランジ',
    crumb: '10K フランジ',
    category: CATEGORY_LABELS.piping,
    contents: `10K の ${FLANGE_10K_RANGE}。外径・PCD・穴数と穴径・ボルト・二面幅・厚さ・ボルト長さの目安`,
    standards: ['JIS B 2220', 'JIS B 1180', 'JIS B 1181', 'JIS B 0205-2'],
    qr: [toolQr('/flange-bolt-length')],
  }),
  sheet('flange', {
    title: 'JISフランジ早見表 5K・10K・16K・20K（外径・PCD・ボルト穴・ボルト長さ）A4印刷用',
    h1: 'JISフランジ早見表（5K・10K・16K・20K）',
    description:
      'JIS B 2220 の呼び圧力 5K・10K・16K・20K のフランジについて、外径・PCD・ボルト穴の数と径・ボルトの呼び・厚さと六角ボルトの長さの目安を、A4 1枚にまとめて印刷できる早見表です。ツールを開く QR コード付き。',
    label: '5K〜20K フランジ',
    crumb: '5K〜20K フランジ',
    category: CATEGORY_LABELS.piping,
    contents: '5K・10K・16K・20K を1枚に。外径・PCD・穴数と穴径・ボルト・厚さ・六角ボルト長さの目安',
    standards: ['JIS B 2220', 'JIS B 1181', 'JIS B 0205-2'],
    qr: [toolQr('/flange-bolt-length')],
  }),
  sheet('pipe', {
    title: 'SGP 鋼管・管用ねじ早見表（外径・厚さ・質量・山数・G 下穴）A4印刷用',
    h1: 'SGP 鋼管・管用ねじ早見表',
    description: `配管用炭素鋼鋼管（SGP）${SGP_RANGE} の外径・厚さ・内径・単位質量と、管用ねじ（R・Rc・G）の山数・外径・G めねじの下穴径（計算値）を、A4 1枚に印刷できる早見表です。ツールを開く QR コード付き。`,
    label: 'SGP・管用ねじ',
    crumb: 'SGP・管用ねじ',
    category: CATEGORY_LABELS.piping,
    contents: `SGP ${SGP_RANGE} の外径・厚さ・内径・kg/m と、管用ねじ（R・Rc・G）の山数・ピッチ・外径・G 下穴（計算値）`,
    standards: ['JIS G 3452', 'JIS B 0203', 'JIS B 0202'],
    qr: [toolQr('/steel-pipe'), toolQr('/pipe-thread')],
  }),
]

/** 一覧ページに載せる参照規格（各早見表の規格を、重複なしで） */
const INDEX_STANDARDS: StandardCode[] = [...new Set(PRINT_SHEETS.flatMap((meta) => meta.standards))]

export const PRINT_INDEX_META: ContentPageMeta = {
  path: PRINT_INDEX_PATH,
  title: '印刷用 早見表（A4）ねじ・JISフランジ・SGP鋼管・管用ねじ',
  h1: '印刷用 早見表（A4）',
  description:
    '現場の壁や工具箱に貼れる、A4 1枚の早見表です。ねじの下穴径・二面幅・ボルト穴、JISフランジ（10K と 5K〜20K）、SGP 鋼管と管用ねじの寸法を、スマホでツールを開ける QR コード付きで印刷できます。',
  label: INDEX_LABEL,
  category: '印刷用',
  breadcrumb: [HOME_CRUMB, { label: INDEX_LABEL, path: PRINT_INDEX_PATH }],
  standards: INDEX_STANDARDS,
}

export function findSheet(key: SheetKey): PrintSheetMeta {
  const meta = PRINT_SHEETS.find((page) => page.key === key)
  if (!meta) throw new Error(`早見表がありません: ${key}`)
  return meta
}

/** ツールのページから案内する早見表（そのツールを QR コードの行き先にしている早見表） */
export function sheetsForTool(toolPath: string): readonly PrintSheetMeta[] {
  return PRINT_SHEETS.filter((meta) => meta.qr.some((qr) => qr.path === toolPath))
}
