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

/**
 * サイト内リンクの移動先。いま表示しているのと同じなら null（履歴を増やさず、スクロールだけにする）。
 * 同じページへの条件（? 以降）の無いリンク（ヘッダーのロゴ・ツールの切り替えなど）は、今の条件のまま扱う。
 * ツールの入力は端末に覚えていて、条件の無い URL を開くと同じ条件に戻るので、条件を消しても同じ画面の履歴が増えるだけになるため。
 */
export function resolveLink(current: URL, next: URL): URL | null {
  let destination = next
  if (
    next.origin === current.origin &&
    next.search === '' &&
    normalizePath(next.pathname) === normalizePath(current.pathname)
  ) {
    destination = new URL(`${current.pathname}${current.search}${next.hash}`, current)
  }
  return destination.href === current.href ? null : destination
}
