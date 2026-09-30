import { Hexagon } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="bg-blue-700 text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Hexagon className="size-6" strokeWidth={2.5} aria-hidden />
        </div>
        <h1 className="flex flex-col leading-tight sm:flex-row sm:items-baseline sm:gap-2">
          <span className="text-xl font-bold tracking-wide sm:text-2xl">サクッとJIS</span>
          <span className="hidden text-blue-200 sm:inline" aria-hidden>
            -
          </span>
          <span className="text-xs font-medium text-blue-100 sm:text-sm">
            機械設計・配管計算ツール
          </span>
        </h1>
      </div>
    </header>
  )
}
