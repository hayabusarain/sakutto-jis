/** 行を選べる表（DataTable）のキーボード操作の決まりごと。画面に依存しない部分だけを置く */

/** 行を移るキー */
export type RowMoveKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'

export function isRowMoveKey(key: string): key is RowMoveKey {
  return key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End'
}

/** いまの行（index）からキーで移る先の行。端では止まる（先頭で上、末尾で下を押しても動かない） */
export function nextRowIndex(index: number, count: number, key: RowMoveKey): number {
  if (count <= 0) return -1
  switch (key) {
    case 'ArrowDown':
      return Math.min(index + 1, count - 1)
    case 'ArrowUp':
      return Math.max(index - 1, 0)
    case 'Home':
      return 0
    case 'End':
      return count - 1
  }
}

/**
 * Tab で表に入ったときに止まる行（表の中で Tab が止まるのは1行だけ）。
 * キーボードで今いる行 → 選択中の行 → 先頭の行 の順に、表にある行を選ぶ
 */
export function rowTabStop(
  keys: readonly string[],
  focusedKey: string | null,
  highlightedKey: string | null,
): string | undefined {
  if (focusedKey !== null && keys.includes(focusedKey)) return focusedKey
  if (highlightedKey !== null && keys.includes(highlightedKey)) return highlightedKey
  return keys[0]
}
