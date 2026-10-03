/**
 * 現場メモ（/notes）の記事のパス・題名・説明文。
 * 記事の数値は src/pages/notes/examples.ts で各ツールの calc.ts・data.ts から計算する（手書きしない）。
 */
import type { Crumb } from '../../lib/structuredData'
import { PAGE_UPDATED_AT, SITE } from '../../site'
import { HOME_CRUMB, type ContentPageMeta } from '../tables/tablePages'

export const NOTES_INDEX_PATH = '/notes'
export const NOTES_LABEL = '現場メモ'

const NOTES_CRUMB: Crumb = { label: NOTES_LABEL, path: NOTES_INDEX_PATH }

export const NOTES_INDEX_META: ContentPageMeta = {
  path: NOTES_INDEX_PATH,
  title: '現場メモ（フランジボルト・下穴・二面幅の疑問を規格の数値で解説）',
  h1: NOTES_LABEL,
  description:
    'フランジボルトの長さが資料と違う理由、M12 の下穴は 10.2 と 10.3 のどちらか、二面幅の JIS本体と旧JIS の違いなど、現場でよく迷う点を JIS 規格の数値と計算例で解説します。',
  label: NOTES_LABEL,
  category: NOTES_LABEL,
  breadcrumb: [HOME_CRUMB, NOTES_CRUMB],
  standards: [],
}

export interface NotePageMeta extends ContentPageMeta {
  /** 記事に関係するツールのパス（ツールのページから記事を案内する） */
  tools: readonly string[]
}

function note(
  slug: string,
  meta: Omit<NotePageMeta, 'path' | 'breadcrumb' | 'category'>,
): NotePageMeta {
  const path = `${NOTES_INDEX_PATH}/${slug}`
  return { ...meta, path, category: NOTES_LABEL, breadcrumb: [HOME_CRUMB, NOTES_CRUMB, { label: meta.label, path }] }
}

export const FLANGE_BOLT_NOTE = note('flange-bolt-length', {
  title: 'フランジボルトの長さがメーカーの表と違う理由（計算式と条件）',
  h1: 'フランジボルトの長さがメーカーの表と違う理由',
  description:
    'JISフランジのボルト長さが、メーカーや資料の表と 5 mm（1サイズ）違うことがあります。このサイトの計算式（フランジ厚さ＋ガスケット＋座金＋ナット高さ＋突き出し）と、長さが変わる条件（ガスケット厚さ・ナットの種類・座金・座の高さ・丸め方）を計算例で説明します。',
  label: 'フランジボルトの長さ',
  standards: ['JIS B 2220', 'JIS B 1181', 'JIS B 1180', 'JIS B 1256', 'JIS B 0205-2'],
  tools: ['/flange-bolt-length'],
})

export const M12_TAP_DRILL_NOTE = note('m12-tap-drill', {
  title: 'M12 の下穴は 10.2 か 10.3 か（JIS B 1004 のひっかかり率）',
  h1: 'M12 の下穴は 10.2 か 10.3 か',
  description:
    'M12（並目 1.75）の下穴径 10.2 mm と 10.3 mm は、どちらも 6H のめねじ内径の範囲に入ります。JIS B 1004 では 10.2 がひっかかり率 95 %、10.3 が 90 % の系列です。範囲の求め方と選び方、M6〜M16 の系列の値をまとめました。',
  label: 'M12 の下穴 10.2・10.3',
  standards: ['JIS B 1004', 'JIS B 0209-1', 'JIS B 0205-4', 'ISO 2306'],
  tools: ['/tap-drill'],
})

export const ACROSS_FLATS_NOTE = note('across-flats-old-jis', {
  title: '六角ボルトの二面幅 JIS本体と旧JIS（附属書JA）の違い（M10 16/17・M12 18/19）',
  h1: '六角ボルトの二面幅：JIS本体と旧JIS（附属書JA）の違い',
  description:
    '六角ボルト・ナットの二面幅は、M10・M12・M14・M22 の4サイズで JIS本体と旧JIS（附属書JA）が違います（M10 は 16 mm と 17 mm など）。違うサイズの一覧と、スパナが合わないときの見分け方をまとめました。',
  label: '二面幅 JIS本体と旧JIS',
  standards: ['JIS B 1180', 'JIS B 1181', 'JIS B 2220'],
  tools: ['/bolt-size', '/flange-bolt-length'],
})

/** 一覧に並べる順（新しい記事を先頭に足す） */
export const NOTE_PAGES: readonly NotePageMeta[] = [FLANGE_BOLT_NOTE, M12_TAP_DRILL_NOTE, ACROSS_FLATS_NOTE]

/** そのツールに関係する記事 */
export function notesForTool(toolPath: string): readonly NotePageMeta[] {
  return NOTE_PAGES.filter((page) => page.tools.includes(toolPath))
}

/**
 * 記事の更新日（YYYY-MM-DD）。ページの定義（src/routes.ts の updatedAt）と同じく、
 * PAGE_UPDATED_AT に書いてあればその日、無ければ SITE.contentUpdatedAt
 */
export function noteUpdatedAt(path: string): string {
  return PAGE_UPDATED_AT[path] ?? SITE.contentUpdatedAt
}
