import type { ReactNode } from 'react'
import { UNVERIFIED_LEGEND } from './data'

/** 規格原文で未確認の値に付ける ※（docs/data-verification.md の △） */
export function UnverifiedMark({ dark = false, large = false }: { dark?: boolean; large?: boolean }) {
  return (
    <sup
      className={`ml-0.5 font-bold ${large ? 'text-[0.4em]' : 'text-[0.7em]'} ${dark ? 'text-orange-400' : 'text-orange-700'}`}
      title="規格原文で未確認の値"
    >
      <span aria-hidden>※</span>
      <span className="sr-only">（規格原文で未確認）</span>
    </sup>
  )
}

/** 値に、未確認なら ※ を付けて表示する */
export function Marked({
  value,
  unverified,
  dark = false,
  large = false,
}: {
  value: ReactNode
  unverified: boolean
  dark?: boolean
  /** 大きな数字（主結果）に付けるときは ※ を小さめにする */
  large?: boolean
}) {
  return (
    <>
      {value}
      {unverified && <UnverifiedMark dark={dark} large={large} />}
    </>
  )
}

/** ※ の凡例 */
export function UnverifiedLegend({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-zinc-500 ${className}`}>
      <span className="font-bold text-orange-700">※</span> {UNVERIFIED_LEGEND.replace(/^※\s*/, '')}
      {children}
    </p>
  )
}
