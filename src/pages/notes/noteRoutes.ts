/**
 * 現場メモ（/notes）のページと、その画面。src/routes.ts から登録する。
 */
import type { ComponentType } from 'react'
import type { ContentPageMeta } from '../tables/tablePages'
import { AcrossFlatsNote } from './AcrossFlatsNote'
import { FlangeBoltLengthNote } from './FlangeBoltLengthNote'
import { M12TapDrillNote } from './M12TapDrillNote'
import { ACROSS_FLATS_NOTE, FLANGE_BOLT_NOTE, M12_TAP_DRILL_NOTE, NOTE_PAGES, NOTES_INDEX_META } from './notePages'
import { NotesIndexPage } from './NotesIndexPage'

const NOTE_COMPONENTS: ReadonlyMap<string, ComponentType> = new Map([
  [FLANGE_BOLT_NOTE.path, FlangeBoltLengthNote],
  [M12_TAP_DRILL_NOTE.path, M12TapDrillNote],
  [ACROSS_FLATS_NOTE.path, AcrossFlatsNote],
])

/** 一覧 → 記事（NOTE_PAGES の順）。記事の画面が無ければ（登録漏れ）ビルドを止める */
export const NOTE_ROUTES: readonly { meta: ContentPageMeta; component: ComponentType }[] = [
  { meta: NOTES_INDEX_META, component: NotesIndexPage },
  ...NOTE_PAGES.map((meta) => {
    const component = NOTE_COMPONENTS.get(meta.path)
    if (!component) throw new Error(`現場メモの画面がありません: ${meta.path}`)
    return { meta, component }
  }),
]
