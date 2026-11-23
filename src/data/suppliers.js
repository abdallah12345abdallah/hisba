// Supplier (fish farm) accounts on the shared store: statement, pay / advance, add / edit / delete, share link.
import { MANIFESTS, SUPPLIERS, FEED } from './demo.js'
import { normalizePhone } from './traders.js'
import { addMove, methodOf } from './safe.js'

export const findSupplier = (id) => SUPPLIERS.find((s) => s.id === Number(id))
export const findByToken = (token) => SUPPLIERS.find((s) => s.token === token)
export const owesHim = (s) => s.balance > 0
export const feedOf = (s) => FEED.find((f) => f.name === s.name) || null
export const manifestsOf = (s) => MANIFESTS.filter((m) => m.supplier === s.name)
export const netOf = (m) => m.gross - m.commission

/* statement, newest first: today's approved manifests (his net), then history; an opening balance closes the gap to the live balance.
   amounts are signed for the balance: sale + , pay − , adv − */
const sign = (e) => (e.kind === 'sale' ? e.amount : -e.amount)
export function statementOf(s) {
  const today = manifestsOf(s).filter((m) => m.status === 'approved')
    .map((m) => ({ kind: 'sale', title: `بيان اليوم ${m.time}`, sub: `${m.boxes} بوكس · إجمالي ${m.gross.toLocaleString('en-US')} − عمولة ${m.rate}%`, amount: netOf(m), date: 'اليوم' }))
  const moves = [...today, ...s.history]
  const opening = s.balance - moves.reduce((a, e) => a + sign(e), 0)
  if (opening) moves.push({ kind: opening > 0 ? 'sale' : 'adv', title: 'رصيد سابق', sub: 'من قبل أول نوفمبر', amount: Math.abs(opening), date: '1 نوفمبر' })
  let after = s.balance
  return moves.map((e) => { const row = { ...e, after }; after -= sign(e); return row })
}

/* money out to the farm: a payment against what we owe, or an interest-free advance */
export function payOut(s, amount, kind = 'pay', how = 'دفعة نقدي') {
  const entry = { kind, title: kind === 'adv' ? 'سلفة' : how, sub: 'انسجّلت هلأ', amount, date: 'اليوم' }
  s.balance -= amount
  s.history.unshift(entry)
  const unsafe = addMove({ dir: 'out', src: kind === 'adv' ? 'advance' : 'supplier', party: s.name, method: kind === 'adv' ? 'cash' : methodOf(how), amount, note: kind === 'adv' ? 'سلفة' : how })
  return () => { unsafe(); s.balance += amount; const i = s.history.indexOf(entry); if (i >= 0) s.history.splice(i, 1) }
}

/* an approved manifest credits the farm with its net */
export function creditManifest(m) {
  const s = SUPPLIERS.find((x) => x.name === m.supplier)
  if (s) s.balance += netOf(m)
}

/* ---------- add / edit / delete ---------- */
const toNumber = (v) => Number(String(v ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
export function checkSupplier({ name, place, phone, rate, rating }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب اسم المزرعة'
  else if (SUPPLIERS.some((s) => s !== current && s.name === n)) errors.name = 'في مورد بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  const r = toNumber(rate)
  if (!r || r > 15) errors.rate = 'العمولة بين 1% و 15%'
  return { errors, value: { name: n, place: String(place ?? '').trim(), phone: p, rate: r, rating: Math.min(5, Math.max(1, Number(rating) || 3)) } }
}
const newToken = () => Math.random().toString(36).slice(2, 8)
export function addSupplier(v) {
  const id = Math.max(0, ...SUPPLIERS.map((s) => s.id)) + 1
  SUPPLIERS.push({ id, ...v, balance: 0, weeks: [0, 0, 0, 0], token: newToken(), history: [] })
  return SUPPLIERS[SUPPLIERS.length - 1]
}
/* a new name follows into today's manifests and the feed list */
export function updateSupplier(s, v) {
  if (v.name !== s.name) {
    MANIFESTS.forEach((m) => { if (m.supplier === s.name) m.supplier = v.name })
    FEED.forEach((f) => { if (f.name === s.name) f.name = v.name })
  }
  Object.assign(s, v)
  return s
}
export const canDelete = (s) => !s.balance && !manifestsOf(s).length && !feedOf(s)
export function removeSupplier(s) {
  const i = SUPPLIERS.indexOf(s)
  if (i < 0) return () => {}
  SUPPLIERS.splice(i, 1)
  return () => SUPPLIERS.splice(i, 0, s)
}

/* the read-only statement link the farm can open without an account */
export const shareUrl = (s) => `${location.origin}/s/${s.token}`
export function renewToken(s) { s.token = newToken(); return shareUrl(s) }
