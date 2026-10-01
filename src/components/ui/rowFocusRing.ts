/**
 * 行を選べる表で、キーボードで行に移ったときの枠（DataTable と鋼管の比較表で共通）。
 * 行（tr）に枠を描くと固定表示の1列目に隠れるので、各セルの内側に線を引いて、行全体を囲んで見せる。
 * index は行の中で何番目のセルか、count はセルの数
 */
export function rowFocusRingClass(index: number, count: number): string {
  const first = index === 0
  const last = index === count - 1
  if (first && last) {
    return '[tr:focus-visible>&]:shadow-[inset_0_0_0_2px_var(--color-orange-600)]'
  }
  if (first) {
    return '[tr:focus-visible>&]:shadow-[inset_3px_0_0_var(--color-orange-600),inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
  }
  if (last) {
    return '[tr:focus-visible>&]:shadow-[inset_-2px_0_0_var(--color-orange-600),inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
  }
  return '[tr:focus-visible>&]:shadow-[inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
}
