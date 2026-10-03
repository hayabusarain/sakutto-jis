/**
 * 「オフラインでも使えるようになりました」のお知らせの状態。
 * main.tsx が、初めて Service Worker が入って使えるようになったときに markOfflineReady() を呼ぶ。
 * 一度知らせたら同じ端末では二度と出さない（localStorage に記録）。
 */
const SHOWN_KEY = 'sakutto-jis:offline-ready-shown'

let ready = false
const listeners = new Set<() => void>()

function alreadyShown(): boolean {
  try {
    return localStorage.getItem(SHOWN_KEY) === '1'
  } catch {
    return false
  }
}

export function markOfflineReady() {
  if (ready || alreadyShown()) return
  ready = true
  try {
    localStorage.setItem(SHOWN_KEY, '1')
  } catch {
    // 保存できなくても、この表示のあいだだけ出せばよい
  }
  listeners.forEach((listener) => listener())
}

export function dismissOfflineReady() {
  if (!ready) return
  ready = false
  listeners.forEach((listener) => listener())
}

export function isOfflineReady(): boolean {
  return ready
}

export function subscribeOfflineReady(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
