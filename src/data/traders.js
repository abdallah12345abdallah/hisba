// Trader accounts on the shared store: the statement (today's sheet lines + earlier history) and recording a payment.
import { reactive } from 'vue'
import { MANIFESTS, TRADERS, KG_PER_BOX } from './demo.js'
import { addMove, methodOf } from './safe.js'

export const findTrader = (name) => TRADERS.find((t) => t.name === name)
export const isOver = (t) => t.due > t.limit

// age bucket of the oldest unpaid invoice: 0 = this week, 1 = this month, 2 = late, 3 = very late
export const AGE_BUCKETS = [
  { label: 'حتى 7 أيام', max: 7 },
  { label: '8 – 30 يوم', max: 30 },
  { label: '31 – 60 يوم', max: 60 },
  { label: 'أكتر من 60', max: Infinity },
]
export const bucketOf = (days) => AGE_BUCKETS.findIndex((b) => days <= b.max)

/* credit lines this trader took on today's manifests, newest first */
function todayLines(t) {
  return MANIFESTS.flatMap((m) => m.lines.filter((l) => l.trader === t.name && l.pay === 'credit').map((l) => ({
    kind: 'buy', title: m.supplier, sub: `${l.boxes} بوكس ${l.grade} · ${l.price} ج/كجم`, amount: l.boxes * KG_PER_BOX * l.price, date: 'اليوم',
  })))
}

/* full statement, newest first, with the running balance after each move; an opening balance closes the gap to the live debt */
export function statementOf(t) {
  const moves = [...todayLines(t), ...t.history]
  const net = moves.reduce((s, e) => s + (e.kind === 'buy' ? e.amount : -e.amount), 0)
  const opening = t.due - net
  if (opening) moves.push({ kind: opening > 0 ? 'buy' : 'pay', title: 'رصيد سابق', sub: 'من قبل أول نوفمبر', amount: Math.abs(opening), date: '1 نوفمبر' })
  let after = t.due
  return moves.map((e) => {
    const row = { ...e, after }
    after -= e.kind === 'buy' ? e.amount : -e.amount
    return row
  })
}

// what was collected from traders this week (and last week, to compare)
export const COLLECTED = reactive({ week: 41250, lastWeek: 36800 })

export function receivePayment(t, amount, how = 'قبض نقدي') {
  const entry = { kind: 'pay', title: how, sub: 'انسجّل هلأ', amount, date: 'اليوم' }
  const before = { due: t.due, days: t.days, lastPay: t.lastPay }
  t.due -= amount
  t.lastPay = 'اليوم'
  if (t.due <= 0) t.days = 0
  t.history.unshift(entry)
  COLLECTED.week += amount
  const unsafe = addMove({ dir: 'in', src: 'collect', party: t.name, method: methodOf(how), amount, note: how })
  return () => { // undo
    unsafe()
    Object.assign(t, before)
    COLLECTED.week -= amount
    const i = t.history.indexOf(entry)
    if (i >= 0) t.history.splice(i, 1)
  }
}

/* ---------- add / edit / delete / import ---------- */

// Egyptian mobile: 11 digits starting 01 (Arabic digits and spaces accepted); shown as "0100 234 5678"
export function normalizePhone(raw) {
  const d = String(raw ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/\D/g, '').replace(/^(20|0020)(?=1)/, '0')
  return /^01\d{9}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : null
}
const toNumber = (v) => Number(String(v ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0

/* checks a trader form; returns { errors, value } — errors keyed by field */
export function checkTrader({ name, phone, limit, opening }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب اسم التاجر'
  else if (TRADERS.some((t) => t !== current && t.name === n)) errors.name = 'في تاجر بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  const l = toNumber(limit)
  if (!l) errors.limit = 'حدّد حد الدين'
  return { errors, value: { name: n, phone: p, limit: l, opening: toNumber(opening) } }
}

export function addTrader({ name, phone, limit, opening = 0 }) {
  const t = { name, phone, limit, due: opening, days: 0, lastBuy: '—', lastPay: '—', history: [] }
  if (opening) t.history.push({ kind: 'buy', title: 'رصيد افتتاحي', sub: 'عند فتح الحساب', amount: opening, date: 'اليوم' })
  TRADERS.push(t)
  return TRADERS[TRADERS.length - 1]
}

/* edit; a new name is carried into today's sheet lines so the statement keeps them */
export function updateTrader(t, { name, phone, limit }) {
  if (name !== t.name) MANIFESTS.forEach((m) => m.lines.forEach((l) => { if (l.trader === t.name) l.trader = name }))
  Object.assign(t, { name, phone, limit })
  return t
}

// a trader can be deleted only when nothing is owed and nothing was bought on today's sheets
export const canDelete = (t) => !t.due && !MANIFESTS.some((m) => m.lines.some((l) => l.trader === t.name))
export function removeTrader(t) {
  const i = TRADERS.indexOf(t)
  if (i < 0) return () => {}
  TRADERS.splice(i, 1)
  return () => TRADERS.splice(i, 0, t)
}

/* WhatsApp: open a chat with the trader carrying a short statement */
export function whatsappStatement(t) {
  const digits = '2' + t.phone.replace(/\D/g, '')
  const last = statementOf(t).slice(0, 5).map((e) => `${e.date} · ${e.title}: ${e.kind === 'buy' ? '+' : '−'}${e.amount.toLocaleString('en-US')}`).join('\n')
  const text = `السلام عليكم ${t.name}\nكشف حسابك عندنا:\n${last}\n\nالمطلوب: ${t.due.toLocaleString('en-US')} ج\nشكراً لتعاملك معنا`
  window.open(`https://wa.me/${digits}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}

/* import rows [{ name, phone, limit, opening }] → a plan: new traders, updates to existing ones, and rejected rows with why */
export function planImport(rows) {
  const seen = new Set()
  return rows.map((r, i) => {
    const existing = TRADERS.find((t) => t.name === String(r.name ?? '').trim())
    const { errors, value } = checkTrader(r, existing)
    if (seen.has(value.name)) errors.name = 'مكرر بالملف'
    seen.add(value.name)
    const why = Object.values(errors)[0]
    return { line: i + 2, ...value, status: why ? 'bad' : existing ? 'update' : 'new', why, existing }
  })
}
export function applyImport(plan) {
  let added = 0, updated = 0
  plan.forEach((r) => {
    if (r.status === 'new') { addTrader(r); added++ }
    if (r.status === 'update') { updateTrader(r.existing, { name: r.name, phone: r.phone, limit: r.limit }); updated++ }
  })
  return { added, updated }
}
