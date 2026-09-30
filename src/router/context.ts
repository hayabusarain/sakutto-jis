import { createContext, useContext } from 'react'

export interface RouterState {
  pathname: string
  navigate: (to: string) => void
}

export const RouterContext = createContext<RouterState>({
  pathname: '/',
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
