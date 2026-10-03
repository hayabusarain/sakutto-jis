import { trackEvent } from './analytics'

/** 文字列をファイルとして保存させる */
export function downloadText(filename: string, text: string, mimeType: string) {
  const extension = filename.split('.').pop()?.toLowerCase()
  if (extension === 'csv') trackEvent('download_csv', { file: filename })
  else if (extension === 'dxf') trackEvent('download_dxf', { file: filename })
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Safari などでダウンロード開始前に消さないよう、少し待ってから解放する
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
