/** 「2026-09-30」を「2026年9月30日」にする（形式が違うときはそのまま返す） */
export function formatJaDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!match) return isoDate
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`
}
