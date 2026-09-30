import type { AnchorHTMLAttributes, MouseEvent, Ref } from 'react'
import { useRouter } from './context'

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  ref?: Ref<HTMLAnchorElement>
}

/** サイト内リンク。通常のクリックだけページ遷移せずに画面を切り替える */
export function Link({ to, onClick, target, ...props }: LinkProps) {
  const { navigate } = useRouter()

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    const isPlainClick =
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      (!target || target === '_self')
    if (event.defaultPrevented || !isPlainClick) return
    event.preventDefault()
    navigate(to)
  }

  return <a href={to} target={target} onClick={handleClick} {...props} />
}
