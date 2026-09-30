import { Check, ClipboardCopy, FileDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'
import { downloadText } from '../../lib/download'

export type ExportCell = string | number | null | undefined

interface TableExportProps {
  /** 1行目に書く表題（例: JIS 10K フランジ寸法表） */
  title: string
  /** ファイル名（拡張子なし） */
  filename: string
  /** 見出し（単位を含める。例: 外径 D [mm]） */
  headers: readonly string[]
  rows: readonly (readonly ExportCell[])[]
  /** 表の下に書く典拠・注記（例: 典拠: JIS B 2220:2012） */
  note?: string
}

const cell = (value: ExportCell) => (value === null || value === undefined ? '' : String(value))

/** CSV の1項目（カンマ・改行・引用符を含むときは引用符で囲む） */
function csvCell(value: ExportCell): string {
  const text = cell(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** 表を Excel に貼れる形でコピー（タブ区切り）・CSV で保存する */
export function TableExport({ title, filename, headers, rows, note }: TableExportProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    const lines = [
      title,
      headers.join('\t'),
      ...rows.map((row) => row.map((value) => cell(value).replace(/[\t\n]/g, ' ')).join('\t')),
      ...(note ? ['', note] : []),
    ]
    if (await copyText(lines.join('\n'))) setCopied(true)
  }

  const handleCsv = () => {
    const lines = [
      csvCell(title),
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
      ...(note ? ['', csvCell(note)] : []),
    ]
    // Excel（日本語）で文字化けしないよう、BOM 付き UTF-8・CRLF にする
    downloadText(`${filename}.csv`, `﻿${lines.join('\r\n')}\r\n`, 'text/csv;charset=utf-8')
  }

  const button =
    'inline-flex h-8 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden'

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={handleCopy} className={button} title="Excel などに貼り付けられる形でコピー">
        {copied ? (
          <Check className="size-3.5 text-emerald-600" aria-hidden />
        ) : (
          <ClipboardCopy className="size-3.5" aria-hidden />
        )}
        <span aria-live="polite">{copied ? 'コピー済み' : '表をコピー'}</span>
      </button>
      <button type="button" onClick={handleCsv} className={button}>
        <FileDown className="size-3.5" aria-hidden />
        CSV
      </button>
    </div>
  )
}
