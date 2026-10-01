/**
 * いま表示している URL の ? 以降（最後にこのサイトが書き換えた・移動した時点の値）。
 * 「戻る」（popstate）のときには URL がもう変わっているので、移動前の条件をここで覚えておく。
 */
let knownSearch: string | null = null

export function getKnownSearch(): string {
  return knownSearch ?? window.location.search
}

export function setKnownSearch(search: string) {
  knownSearch = search
}

/** 履歴を増やさずに URL を書き換える（入力の条件を URL に残すとき） */
export function replaceUrl(next: string) {
  window.history.replaceState(window.history.state, '', next)
  knownSearch = window.location.search
}
