/** 六角ナットをかたどったロゴマーク */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <polygon
        points="16,3 27.3,9.5 27.3,22.5 16,29 4.7,22.5 4.7,9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  )
}
