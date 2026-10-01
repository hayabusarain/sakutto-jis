import { createContext, useContext } from 'react'

export interface RouterState {
  pathname: string
  /** 同じページのまま ? 以降の条件が変わった回数。ツール画面の作り直しに使う */
  revision: number
  navigate: (to: string) => void
}

export const RouterContext = createContext<RouterState>({
  pathname: '/',
  revision: 0,
  navigate: () => {},
})

export function useRouter() {
  return useContext(RouterContext)
}

/** `/tap-drill/` や `/tap-drill.html` を `/tap-drill` にそろえる */
export function normalizePath(pathname: string): string {
  const path = pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '')
  return path === '' ? '/' : path
}
