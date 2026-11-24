// Trader accounts on the shared store: the statement (today's sheet lines + earlier history) and recording a payment.
import { reactive } from 'vue'
import { MANIFESTS, TRADERS, PRICES, KG_PER_BOX, CASH_CUSTOMER, AGENCY, priceOf, fmt } from './demo.js'
import { addMove, methodOf } from './safe.js'
import { log } from './audit.js'

export const findTrader = (name) => TRADERS.find((t) => t.name === name)
export const isOver = (t) => t.due > t.limit

/* how often a trader's credit is collected; late = he owes and his oldest unpaid invoice is older than his cycle */
export const CYCLES = {
  daily: { label: 'يومي', long: 'بيدفع كل يوم', days: 1 },
  weekly: { label: 'أسبوعي', long: 'بيدفع كل أسبوع', days: 7 },
  biweekly: { label: 'كل أسبوعين', long: 'بيدفع كل 15 يوم', days: 15 },
  monthly: { label: 'شهري', long: 'بيدفع آخر كل شهر', days: 30 },
}
export const cycleOf = (t) => CYCLES[t.cycle] || CYCLES.weekly
export const isLate = (t) => t.due > 0 && t.days > cycleOf(t).days
export const lateBy = (t) => (isLate(t) ? t.days - cycleOf(t).days : 0)

/* ---------- his prices: a special price per kilo for some grades, the rest follow the day's price ---------- */
export const ownPrices = (t) => PRICES.map(([grade, day]) => ({ grade, day, own: t.prices?.[grade] || null }))
export function setTraderPrice(t, grade, price) {
  const before = t.prices?.[grade] || priceOf(grade)
  if (!t.prices) t.prices = {}
  t.prices[grade] = price
  log('price', `سعر ${t.name}`, `${grade}: ${before} ← ${price} ج/كجم`, `/traders/${encodeURIComponent(t.name)}`)
}
/* values: { grade: price | '' } — empty means back to the day's price */
export function setTraderPrices(t, values) {
  const out = []
  const next = {}
  PRICES.forEach(([grade]) => {
    const v = Number(values[grade]) || 0
    const was = t.prices?.[grade] || 0
    if (v > 0) next[grade] = v
    if (v !== was) out.push(v ? `${grade}: ${was || 'سعر اليوم'} ← ${v}` : `${grade}: رجع لسعر اليوم`)
  })
  t.prices = next
  if (out.length) log('price', `أسعار ${t.name}`, out.join(' · '), `/traders/${encodeURIComponent(t.name)}`)
  return out.length
}

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
export function checkTrader({ name, phone, limit, opening, cycle }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب اسم التاجر'
  else if (TRADERS.some((t) => t !== current && t.name === n)) errors.name = 'في تاجر بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  const l = toNumber(limit)
  if (!l) errors.limit = 'حدّد حد الدين'
  return { errors, value: { name: n, phone: p, limit: l, opening: toNumber(opening), cycle: CYCLES[cycle] ? cycle : 'weekly' } }
}

const newToken = () => Math.random().toString(36).slice(2, 8)
export function addTrader({ name, phone, limit, opening = 0, cycle = 'weekly' }) {
  const t = { name, phone, limit, due: opening, days: 0, lastBuy: '—', lastPay: '—', history: [], prices: {}, cycle, token: newToken(), code: phone.replace(/D/g, '').slice(-4) }
  if (opening) t.history.push({ kind: 'buy', title: 'رصيد افتتاحي', sub: 'عند فتح الحساب', amount: opening, date: 'اليوم' })
  TRADERS.push(t)
  return TRADERS[TRADERS.length - 1]
}

/* edit; a new name is carried into today's sheet lines so the statement keeps them */
export function updateTrader(t, { name, phone, limit, cycle }) {
  if (name !== t.name) MANIFESTS.forEach((m) => m.lines.forEach((l) => { if (l.trader === t.name) l.trader = name }))
  Object.assign(t, { name, phone, limit }, cycle ? { cycle } : {})
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

/* ---------- the trader's sales invoice: everything he bought today, from every manifest ---------- */
let saleSeq = 5400
const SALE_NOS = {} // trader name → today's invoice number (kept once given)
export const saleNoOf = (name) => (SALE_NOS[name] ||= ++saleSeq)
export const boughtToday = (name) => MANIFESTS.some((m) => m.lines.some((l) => l.trader === name))
/* who has an invoice today: traders (and the cash customer) with at least one line, biggest first */
export const buyersToday = () => {
  const names = [...new Set(MANIFESTS.flatMap((m) => m.lines.map((l) => l.trader)))]
  return names.map((n) => ({ name: n, ...saleInvoice(n) })).sort((a, b) => b.total - a.total)
}
export function saleInvoice(name) {
  const rows = MANIFESTS.flatMap((m) => m.lines.filter((l) => l.trader === name).map((l) => ({
    id: l.id, supplier: m.supplier, grade: l.grade, boxes: l.boxes, kg: l.boxes * KG_PER_BOX, price: l.price, total: l.boxes * KG_PER_BOX * l.price, pay: l.pay,
  }))).reverse()
  const total = rows.reduce((a, r) => a + r.total, 0)
  const cash = rows.filter((r) => r.pay === 'cash').reduce((a, r) => a + r.total, 0)
  const credit = total - cash
  const t = findTrader(name)
  const after = t ? t.due : 0
  return { no: rows.length ? saleNoOf(name) : null, rows, total, cash, credit, before: after - credit, after, trader: t, cashCustomer: name === CASH_CUSTOMER }
}
export function saleInvoiceText(name) {
  const x = saleInvoice(name)
  const rows = x.rows.map((r) => `• ${r.grade} (${r.supplier}): ${r.boxes} بوكس · ${fmt(r.kg)} ك × ${r.price} = ${fmt(r.total)} ج${r.pay === 'cash' ? ' (نقدي)' : ''}`).join('\n')
  const bal = x.trader ? `\nحسابك قبل: ${fmt(x.before)} ج\nحسابك بعد فاتورة اليوم: ${fmt(x.after)} ج` : ''
  return `السلام عليكم ${name}\nفاتورة بيع رقم ${x.no} من ${AGENCY.name}\n${rows}\nالإجمالي: ${fmt(x.total)} ج${x.cash ? `\nمدفوع نقدي: ${fmt(x.cash)} ج` : ''}${x.credit ? `\nآجل على الحساب: ${fmt(x.credit)} ج` : ''}${bal}${x.trader ? `\n\nكشف حسابك وفواتيرك:\n${traderShareUrl(x.trader)}` : ''}`
}
export function whatsappSaleInvoice(name) {
  const t = findTrader(name)
  const phone = t ? '2' + t.phone.replace(/\D/g, '') : ''
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(saleInvoiceText(name))}`, '_blank', 'noopener')
}

/* ---------- his own account: a private link + a 4-digit code (he sees only his statement and invoices) ---------- */
export const findTraderByToken = (token) => TRADERS.find((t) => t.token === token)
export const traderShareUrl = (t) => `${location.origin}/t/${t.token}`
export function renewTraderToken(t) { t.token = newToken(); return traderShareUrl(t) }
export function resetTraderCode(t) {
  t.code = String(Math.floor(1000 + Math.random() * 9000))
  log('settings', `كود دخول ${t.name}`, 'انعمل كود جديد', `/traders/${encodeURIComponent(t.name)}`)
  return t.code
}
