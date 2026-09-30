import type { ReactNode } from 'react'

const tones = {
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  dark: 'bg-zinc-800 text-zinc-100 ring-zinc-800',
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-orange-50 text-orange-800 ring-orange-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
} as const

export type BadgeTone = keyof typeof tones

interface BadgeProps {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
