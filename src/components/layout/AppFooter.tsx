import { TriangleAlert } from 'lucide-react'

const currentYear = new Date().getFullYear()

export function AppFooter() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-slate-500">
        <p className="flex gap-2">
          <TriangleAlert className="size-4 shrink-0 text-amber-500" aria-hidden />
          <span>
            計算結果は設計・作業の目安です。重要な用途では、必ず最新のJIS規格原本やメーカー資料で確認してください。
          </span>
        </p>
        <p className="mt-3">© {currentYear} サクッとJIS</p>
      </div>
    </footer>
  )
}
