import { reactive } from 'vue'

// Toasts, one at a time:
//  - every success (tone ok) → the centred success card ("علامة الصح بترسم حالها"), no undo button — the user's rule
//  - other notices (info / neg) → "الجزيرة": a dark capsule drops from the top and widens, and may carry an action
// amount: optional big figure on the success card
export const toasts = reactive([])
let id = 0
let timer = null

// quiet: true keeps a success as the small island (for frequent, routine actions like each sale on the sheet)
export function toast(title, text = '', { duration, tone = 'ok', action, amount, big = false, quiet = false } = {}) {
  clearTimeout(timer)
  const success = tone === 'ok'
  const isBig = (success && !quiet) || big
  const d = duration ?? (isBig ? 3800 : 3000)
  toasts.splice(0, toasts.length, { id: ++id, title, text, tone, duration: d, action: success ? null : action, amount, big: isBig })
  const tid = id
  timer = setTimeout(() => dismiss(tid), d)
  return tid
}

export function dismiss(tid) {
  const i = toasts.findIndex((t) => t.id === tid)
  if (i > -1) toasts.splice(i, 1)
}
