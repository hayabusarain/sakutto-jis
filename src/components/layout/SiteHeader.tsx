import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { SearchDialog } from '../search/SearchDialog'
import { LogoMark } from './LogoMark'
import { TextSizeToggle } from './TextSizeToggle'

export function SiteHeader() {
  return (
    <header className="bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-3">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5" aria-label={`${SITE.name} トップへ`}>
          <LogoMark className="size-8 shrink-0 text-orange-500 transition-transform duration-300 group-hover:rotate-30" />
          {/* 幅 320px で文字を大きくしても、右の検索・文字サイズのボタンと重ならないようにする */}
          <span className="flex min-w-0 flex-col leading-none sm:flex-row sm:items-baseline sm:gap-2.5">
            <span className="text-lg font-bold tracking-wide min-[360px]:text-xl">{SITE.name}</span>
            <span className="mt-1 truncate text-[11px] font-medium tracking-wider text-zinc-400 sm:mt-0 sm:text-xs">
              {SITE.tagline}
            </span>
          </span>
        </Link>
        <span className="num ml-auto hidden text-[11px] tracking-[0.2em] text-zinc-500 md:block">
          JIS CALC TOOLS
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-3">
          <SearchDialog />
          <TextSizeToggle />
        </div>
      </div>
    </header>
  )
}
