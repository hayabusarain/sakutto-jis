import { Link } from '../router/Link'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="num text-5xl font-bold text-zinc-300">404</p>
      <h1 className="mt-3 text-xl font-bold text-zinc-900">ページが見つかりません</h1>
      <p className="mt-2 text-sm text-zinc-600">
        URLが変わったか、削除された可能性があります。上のメニューからツールを選んでください。
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex h-11 items-center rounded-sm bg-zinc-900 px-5 text-sm font-semibold text-white hover:bg-zinc-700"
      >
        トップページへ
      </Link>
    </div>
  )
}
