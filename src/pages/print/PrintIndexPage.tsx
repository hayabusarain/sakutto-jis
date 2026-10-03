import { ArrowRight, Printer, QrCode as QrCodeIcon } from 'lucide-react'
import { SourceNote } from '../../components/SourceNote'
import { Link } from '../../router/Link'
import { standardLabel } from '../../standards'
import { PageHeader } from '../content/PageHeader'
import { PRINT_INDEX_META, PRINT_SHEETS } from './printPages'

/** 印刷用の早見表の一覧ページ（/print） */
export function PrintIndexPage() {
  const meta = PRINT_INDEX_META
  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        lead={
          <>
            <p>
              現場の壁や工具箱に貼っておける、A4
              縦1枚の早見表です。数値はこのサイトのツール・寸法表と同じデータから作っていて、典拠の規格と表番号、データの確認日も印刷されます。
            </p>
            <p>右下の QR コードをスマホで読み取ると、細かい条件を変えて計算できるツールが開きます。</p>
          </>
        }
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {PRINT_SHEETS.map((sheet) => (
          <li key={sheet.path}>
            <Link
              to={sheet.path}
              className="group flex h-full flex-col rounded-md border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-900"
            >
              <span className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-zinc-900 text-white">
                  <Printer className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold tracking-wider text-orange-700">
                    {sheet.category}
                  </span>
                  <span className="block leading-snug font-bold text-zinc-900">{sheet.h1}</span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600"
                  aria-hidden
                />
              </span>
              <span className="mt-2 text-xs leading-relaxed text-zinc-600">{sheet.contents}</span>
              <span className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-600">
                <QrCodeIcon className="mt-0.5 size-3.5 shrink-0 text-zinc-500" aria-hidden />
                <span>QR コード: {sheet.qr.map((qr) => qr.label).join('・')}</span>
              </span>
              <span className="num mt-auto pt-3 text-[11px] text-zinc-500">
                {sheet.standards.map(standardLabel).join(' / ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-md border border-zinc-200 bg-white p-4" aria-labelledby="print-howto">
        <h2 id="print-howto" className="text-sm font-bold text-zinc-900">
          きれいに印刷するには
        </h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-zinc-700 [&>li]:ml-5 [&>li]:list-disc">
          <li>
            早見表を開いて「印刷する」を押し、用紙サイズ A4・縦・倍率
            100%（既定）で印刷してください。1枚に収まるように作っています。
          </li>
          <li>
            スマホでも「印刷する」から印刷や PDF への保存ができます（画面の表示は機種・ブラウザによって違います）。
          </li>
          <li>油や水がかかる場所では、ラミネートやクリアファイルに入れておくと長持ちします。</li>
          <li>
            数値は印刷した日の内容です。データを見直したときは早見表の「データ確認日」が変わるので、ときどき新しいものに刷り直してください。
          </li>
        </ul>
      </section>

      <div className="mt-6">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}
