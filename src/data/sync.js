// Working without internet (the market's connection drops): the app keeps working on the device, every change made
// while offline is counted as waiting, and when the connection is back they are sent (here: marked as sent, since there
// is no backend yet — the backend team replaces flush() with a real queue to the API, e.g. IndexedDB + retry).
import { reactive } from 'vue'

export const SYNC = reactive({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0, // changes made while offline, not sent yet
  sending: false,
  justSent: 0, // how many went out on the last reconnect (shown for a moment)
  lastSync: null,
})

/* every change on the store calls this; it only counts while offline */
export function markChange() { if (!SYNC.online) SYNC.pending++ }

const clock = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
let hide = 0
function flush() {
  if (!SYNC.pending) { SYNC.lastSync = clock(); return }
  SYNC.sending = true
  setTimeout(() => {
    SYNC.justSent = SYNC.pending
    SYNC.pending = 0
    SYNC.sending = false
    SYNC.lastSync = clock()
    clearTimeout(hide)
    hide = setTimeout(() => { SYNC.justSent = 0 }, 4000)
  }, 1200)
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { SYNC.online = true; flush() })
  window.addEventListener('offline', () => { SYNC.online = false })
}
