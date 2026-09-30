import { Link } from '../../router/Link'
import { SITE } from '../../site'
import { LogoMark } from './LogoMark'
import { TextSizeToggle } from './TextSizeToggle'

export function SiteHeader() {
  return (
    <header className="bg-zinc-900 text-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link to="/" className="group flex items-center gap-2.5" aria-label={`${SITE.name} トップへ`}>
          <LogoMark className="size-8 text-orange-500 transition-transform duration-300 group-hover:rotate-30" />
          <span className="flex flex-col leading-none sm:flex-row sm:items-baseline sm:gap-2.5">
            <span className="text-xl font-bold tracking-wide">{SITE.name}</span>
            <span className="mt-1 text-[11px] font-medium tracking-wider text-zinc-400 sm:mt-0 sm:text-xs">
              {SITE.tagline}
            </span>
          </span>
        </Link>
        <span className="num ml-auto hidden text-[11px] tracking-[0.2em] text-zinc-500 md:block">
          JIS CALC TOOLS
        </span>
        <div className="ml-auto md:ml-3">
          <TextSizeToggle />
        </div>
      </div>
    </header>
  )
}
