import { createContext, useContext } from 'react'

export interface SearchActions {
  /** 候補・関連の呼びを押したときに、その呼びで検索し直す */
  search: (query: string) => void
  /** 結果のリンクでツールへ移るとき（ヘッダーの検索画面を閉じる） */
  navigate: () => void
}

export const SearchActionsContext = createContext<SearchActions>({
  search: () => {},
  navigate: () => {},
})

export function useSearchActions() {
  return useContext(SearchActionsContext)
}
