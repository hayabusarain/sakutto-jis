import { Box, FileDown, PenTool } from 'lucide-react'
import { Badge } from './ui/Badge'
import { Card } from './ui/Card'

interface CadDownloadCardProps {
  /** 何のCADデータか（例: 「フランジ・ボルト」） */
  subject: string
  className?: string
}

/** 将来のCADデータダウンロード用の枠。現在はボタンを無効にしている。 */
export function CadDownloadCard({ subject, className }: CadDownloadCardProps) {
  return (
    <Card
      title="CADデータ"
      icon={FileDown}
      aside={<Badge tone="warning">準備中</Badge>}
      className={className}
    >
      <p className="text-sm text-slate-600">
        入力した条件に合う{subject}のCADデータを、ここからダウンロードできるようにする予定です。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400"
        >
          <PenTool className="size-4" aria-hidden />
          DXF（2D図面）
        </button>
        <button
          type="button"
          disabled
          className="flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400"
        >
          <Box className="size-4" aria-hidden />
          STEP（3Dモデル）
        </button>
      </div>
    </Card>
  )
}
