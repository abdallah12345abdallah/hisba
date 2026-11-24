// The traders' and farms' own access: each one opens his private link (or signs in with his phone + 4-digit code)
// and sees only his statement and his invoices. Kept apart from staff sign-in: no sidebar, nothing to change.
// The unlocked account is remembered on this device until he signs out.
import { reactive } from 'vue'
import { TRADERS, SUPPLIERS } from './demo.js'

const KEY = 'hisba.portal'
export const PORTAL = reactive({ kind: null, token: null }) // kind: 'trader' | 'supplier'
try { Object.assign(PORTAL, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(PORTAL)) } catch { /* private mode */ } }

const digits = (v) => String(v ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '').replace(/^(20|0020)(?=1)/, '0')
const listOf = (kind) => (kind === 'trader' ? TRADERS : SUPPLIERS)
export const pathOf = (kind, token) => `/${kind === 'trader' ? 't' : 's'}/${token}`
export const isUnlocked = (kind, token) => PORTAL.kind === kind && PORTAL.token === token

/* wrong codes lock for a short while, like the staff keypad */
const tries = reactive({ count: 0, until: 0 })
export const portalLockedFor = () => Math.max(0, Math.ceil((tries.until - Date.now()) / 1000))
function fail() {
  tries.count++
  if (tries.count >= 5) { tries.until = Date.now() + 30000; tries.count = 0; return { ok: false, locked: 30 } }
  return { ok: false, left: 5 - tries.count }
}
function pass(kind, rec) {
  tries.count = 0
  Object.assign(PORTAL, { kind, token: rec.token }); save()
  return { ok: true, kind, rec, path: pathOf(kind, rec.token) }
}

/* sign in from the login screen: phone + code → his page (a trader or a farm) */
export function portalSignIn(phone, code) {
  if (portalLockedFor()) return { ok: false, locked: portalLockedFor() }
  const p = digits(phone), c = digits(code)
  for (const kind of ['trader', 'supplier']) {
    const rec = listOf(kind).find((x) => digits(x.phone) === p)
    if (rec) return rec.code === c ? pass(kind, rec) : fail()
  }
  return fail()
}
/* unlock from his link: only the code is asked */
export function unlockWithCode(kind, rec, code) {
  if (portalLockedFor()) return { ok: false, locked: portalLockedFor() }
  return rec && rec.code === digits(code) ? pass(kind, rec) : fail()
}
/* the remembered account still exists with the same link (a renewed link or code signs him out) */
export const portalValid = () => !!PORTAL.token && listOf(PORTAL.kind).some((x) => x.token === PORTAL.token)
export function portalSignOut() { Object.assign(PORTAL, { kind: null, token: null }); save() }
