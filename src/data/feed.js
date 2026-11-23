// Feed on credit: deliveries (add / edit / delete), settlement date, full or partial settlement with a debit note,
// the archive of settlements, and the factory price list.
import { reactive } from 'vue'
import { FEED, FEED_TYPES, SUPPLIERS, newFeedAccount, newDelivery } from './demo.js'
import { addMove } from './safe.js'

export const feedOfName = (name) => FEED.find((f) => f.name === name)
// markup on a factory value: a % of it, or an amount per ton (tons in proportion to the value settled)
export const markupFor = (f, base, mode, value) => (mode === 'pct' ? (base * value) / 100 : (f.delivered ? f.tonsAll * (base / f.delivered) : 0) * value)
export const markupOf = (f, mode, value) => markupFor(f, f.amount, mode, value)

/* ---------- deliveries ---------- */
export function deliver({ name, type, tons, price, due }) {
  let f = feedOfName(name)
  const created = !f
  if (created) { FEED.push(newFeedAccount(name, due, [])); f = FEED[FEED.length - 1] }
  const d = { ...newDelivery('اليوم', type, tons), price }
  f.deliveries.push(d)
  return () => {
    const i = f.deliveries.indexOf(d)
    if (i >= 0) f.deliveries.splice(i, 1)
    if (created && !f.deliveries.length) FEED.splice(FEED.indexOf(f), 1)
  }
}
export function updateDelivery(d, { type, tons, price }) {
  const before = { type: d.type, tons: d.tons, price: d.price }
  Object.assign(d, { type, tons, price })
  return () => Object.assign(d, before)
}
export function removeDelivery(f, d) {
  const i = f.deliveries.indexOf(d)
  f.deliveries.splice(i, 1)
  return () => f.deliveries.splice(i, 0, d)
}
export function setDue(f, due) {
  const before = f.due
  f.due = due
  return () => { f.due = before }
}
// 'YYYY-MM-DD' ↔ 'D/M/YYYY'
export const toInputDate = (due) => { const [d, m, y] = due.split('/'); return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }
export const fromInputDate = (v) => { const [y, m, d] = v.split('-').map(Number); return `${d}/${m}/${y}` }

/* ---------- settlement + debit notes ---------- */
let noteNo = 1043
const NOW = () => '22/11/2026'
export const SETTLED = reactive({
  list: [
    { no: 1042, date: '15/11/2026', name: 'مزرعة الحاج سامر', tons: 5.5, factory: 113200, markup: 6792, total: 119992, pay: 'deduct', partial: false, lines: [{ date: '2 سبتمبر', type: 'بادي 32%', tons: 2.5, price: 21500 }, { date: '1 أكتوبر', type: 'نامي 28%', tons: 3, price: 19800 }] },
    { no: 1041, date: '1/11/2026', name: 'مزرعة النجار', tons: 4.8, factory: 92700, markup: 5562, total: 98262, pay: 'cash', partial: false, lines: [{ date: '20 أغسطس', type: 'بادي 32%', tons: 2, price: 21500 }, { date: '25 سبتمبر', type: 'نامي 28%', tons: 2.8, price: 19800 }] },
    { no: 1040, date: '1/10/2026', name: 'مزرعة أبو خليل', tons: 4.4, factory: 94600, markup: 5676, total: 100276, pay: 'deduct', partial: false, lines: [{ date: '10 يوليو', type: 'بادي 32%', tons: 4.4, price: 21500 }] },
  ],
  get count() { return this.list.length },
  get amount() { return this.list.reduce((a, s) => a + s.total, 0) },
})

/* settle all of the open amount, or a part of it (part = factory value settled now) */
export function settle(f, { mode, value, pay, part }) {
  const base = Math.min(f.amount, part ?? f.amount)
  const partial = base < f.amount
  const markup = Math.round(markupFor(f, base, mode, value))
  const total = Math.round(base) + markup
  const tons = f.delivered ? +(f.tonsAll * (base / f.delivered)).toFixed(2) : 0
  const s = SUPPLIERS.find((x) => x.name === f.name)
  const note = { no: noteNo++, date: NOW(), name: f.name, tons, factory: Math.round(base), markup, total, pay, partial,
    mode, value, lines: f.deliveries.map((d) => ({ date: d.date, type: d.type, tons: d.tons, price: d.price })) }
  SETTLED.list.unshift(note)
  const i = FEED.indexOf(f)
  if (partial) f.paid += base
  else FEED.splice(i, 1)
  let entry = null
  if (pay === 'deduct' && s) {
    entry = { kind: 'feed', title: `إشعار إضافة ${note.no}${partial ? ' (جزئي)' : ''}`, sub: `${tons} طن علف · زيادة ${markup.toLocaleString('en-US')}`, amount: total, date: 'اليوم' }
    s.balance -= total
    s.history.unshift(entry)
  }
  const unsafe = entry ? null : addMove({ dir: 'in', src: 'feed', party: f.name, method: 'cash', amount: total, note: `إشعار إضافة ${note.no}` })
  return { note, undo: () => {
    if (partial) f.paid -= base
    else FEED.splice(i, 0, f)
    SETTLED.list.splice(SETTLED.list.indexOf(note), 1)
    noteNo--
    if (entry) { s.balance += total; s.history.splice(s.history.indexOf(entry), 1) } else unsafe()
  } }
}

/* ---------- factory prices ---------- */
export function setPrices(prices) {
  const before = FEED_TYPES.map((t) => t.price)
  FEED_TYPES.forEach((t, i) => { t.price = prices[i] })
  return () => FEED_TYPES.forEach((t, i) => { t.price = before[i] })
}

/* WhatsApp the debit note to the farm */
export function whatsappNote(note) {
  const s = SUPPLIERS.find((x) => x.name === note.name)
  const f = (n) => Math.round(n).toLocaleString('en-US')
  const text = `السلام عليكم ${note.name}\nإشعار إضافة رقم ${note.no} بتاريخ ${note.date}\nتسوية علف${note.partial ? ' (جزئية)' : ''}: ${note.tons} طن\nبسعر المصنع: ${f(note.factory)} ج\nالزيادة: ${f(note.markup)} ج\nالمطلوب: ${f(note.total)} ج\n${note.pay === 'deduct' ? 'انخصمت من حساب بيعكم.' : 'دُفعت نقداً.'}`
  const phone = s ? '2' + s.phone.replace(/\D/g, '') : ''
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
