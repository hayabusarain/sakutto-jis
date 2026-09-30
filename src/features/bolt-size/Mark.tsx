import { UNVERIFIED, UNVERIFIED_LEGEND } from './data'

/** 規格原文で未確認の値に付ける ※（上付き）。show が false なら何も出さない */
export function Mark({ show = true, dark = false }: { show?: boolean; dark?: boolean }) {
  if (!show) return null
  return (
    <sup className={`ml-0.5 font-sans text-[0.65em] font-bold ${dark ? 'text-orange-400' : 'text-orange-700'}`}>
      <span aria-hidden>※</span>
      <span className="sr-only">（規格原文で未確認）</span>
    </sup>
  )
}

/** ※ の凡例と、どの値が未確認か（UNVERIFIED から作る） */
export function MarkLegend({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-zinc-500 ${className}`}>
      <span className="font-semibold text-orange-800">{UNVERIFIED_LEGEND}</span>
      ：{UNVERIFIED.map((entry) => entry.note).join('、')}。図面や発注に使う前に規格書で確かめてください。
    </p>
  )
}
