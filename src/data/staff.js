// Staff: monthly salaries (owner and partner included) and day workers paid by attendance, advances taken back
// from the next pay, and the attendance of each market day. Every payment and advance is also a move in the safe.
import { reactive } from 'vue'
import { normalizePhone } from './traders.js'
import { addMove } from './safe.js'

export const TODAY = 22
export const MONTH = 'نوفمبر'
export const ROLES = [
  { key: 'owner', label: 'صاحب الحلقة', icon: 'crown' },
  { key: 'partner', label: 'شريك', icon: 'handshake' },
  { key: 'clerk', label: 'كاتب الميزان', icon: 'scale' },
  { key: 'collector', label: 'محصّل', icon: 'wallet' },
  { key: 'porter', label: 'شيّال', icon: 'box' },
  { key: 'driver', label: 'سوّاق', icon: 'truck' },
  { key: 'guard', label: 'حارس', icon: 'shield' },
]
export const roleOf = (k) => ROLES.find((r) => r.key === k) || ROLES[2]
/* the owner and the partner take a salary but don't sign in */
export const tracked = (e) => e.role !== 'owner' && e.role !== 'partner'

/* market days this month up to today (closed on Fridays) */
export const DAYS = Array.from({ length: TODAY }, (_, i) => i + 1).filter((d) => new Date(2026, 10, d).getDay() !== 5)
export const weekday = (d) => ['الأحد', 'الاتنين', 'التلات', 'الأربع', 'الخميس', 'الجمعة', 'السبت'][new Date(2026, 10, d).getDay()]
export const ATT = { p: { label: 'حاضر', short: 'حاضر', unit: 1 }, h: { label: 'نص يوم', short: 'نص', unit: 0.5 }, a: { label: 'غايب', short: 'غايب', unit: 0 } }
const NEXT = { undefined: 'p', null: 'p', p: 'h', h: 'a', a: 'p' }

function seedAtt(id, today) {
  const att = {}
  DAYS.forEach((d) => { att[d] = (id * 7 + d) % 11 === 0 ? 'a' : (id * 5 + d) % 13 === 0 ? 'h' : 'p' })
  att[TODAY] = today
  return att
}
const P = (id, name, role, pay, rate, phone, since, extra = {}) => ({ id, name, role, pay, rate, phone, since, adv: 0, paidThisMonth: 0, paidThrough: 14, history: [], ...extra })

export const STAFF = reactive([
  P(1, 'الحاج محمود عبد الغني', 'owner', 'month', 15000, '01001234567', '2009', { history: [{ kind: 'pay', title: 'راتب أكتوبر', sub: 'نقدي', amount: 15000, date: '1 نوفمبر' }] }),
  P(2, 'الحاج سعيد الدسوقي', 'partner', 'month', 12000, '01112345678', '2015', { history: [{ kind: 'pay', title: 'راتب أكتوبر', sub: 'تحويل بنكي', amount: 12000, date: '1 نوفمبر' }] }),
  P(3, 'مصطفى كمال', 'clerk', 'month', 7000, '01223456789', '2019', { adv: 2000, att: seedAtt(3, 'p'),
    history: [{ kind: 'adv', title: 'سلفة', sub: 'نقدي', amount: 2000, date: '10 نوفمبر' }, { kind: 'pay', title: 'راتب أكتوبر', sub: '7,000 − سلفة 1,000', amount: 6000, deduct: 1000, date: '1 نوفمبر' }] }),
  P(4, 'عادل فتحي', 'collector', 'month', 6000, '01098765432', '2021', { adv: 3500, att: seedAtt(4, 'p'),
    history: [{ kind: 'adv', title: 'سلفة', sub: 'فودافون كاش', amount: 1500, date: '17 نوفمبر' }, { kind: 'adv', title: 'سلفة', sub: 'نقدي', amount: 2000, date: '4 نوفمبر' }, { kind: 'pay', title: 'راتب أكتوبر', sub: 'نقدي', amount: 6000, date: '1 نوفمبر' }] }),
  P(5, 'رمضان علي', 'porter', 'day', 250, '01556677889', '2022', { adv: 600, att: seedAtt(5, 'p'),
    history: [{ kind: 'pay', title: 'يوميات 8–14/11', sub: '6 أيام', amount: 1500, date: '14 نوفمبر' }, { kind: 'adv', title: 'سلفة', sub: 'نقدي', amount: 600, date: '11 نوفمبر' }, { kind: 'pay', title: 'يوميات 1–7/11', sub: '6 أيام', amount: 1500, date: '7 نوفمبر' }] }),
  P(6, 'سيد عبد الله', 'porter', 'day', 250, '01015566778', '2023', { att: seedAtt(6, 'p'),
    history: [{ kind: 'pay', title: 'يوميات 8–14/11', sub: '5 أيام ونص', amount: 1375, date: '14 نوفمبر' }, { kind: 'pay', title: 'يوميات 1–7/11', sub: '6 أيام', amount: 1500, date: '7 نوفمبر' }] }),
  P(7, 'حمادة سمير', 'porter', 'day', 220, '01287766554', '2024', { adv: 300, att: seedAtt(7, null),
    history: [{ kind: 'pay', title: 'يوميات 8–14/11', sub: '6 أيام', amount: 1320, date: '14 نوفمبر' }, { kind: 'adv', title: 'سلفة', sub: 'نقدي', amount: 300, date: '12 نوفمبر' }] }),
  P(8, 'كريم جمال', 'driver', 'day', 300, '01144433221', '2020', { att: seedAtt(8, null),
    history: [{ kind: 'pay', title: 'يوميات 8–14/11', sub: '6 أيام', amount: 1800, date: '14 نوفمبر' }, { kind: 'pay', title: 'يوميات 1–7/11', sub: '5 أيام', amount: 1500, date: '7 نوفمبر' }] }),
  P(9, 'عم صابر', 'guard', 'month', 4000, '01066655443', '2012', { paidThisMonth: 2000, att: seedAtt(9, 'p'),
    history: [{ kind: 'pay', title: 'نص راتب نوفمبر', sub: 'طلبه بدري', amount: 2000, date: '15 نوفمبر' }, { kind: 'pay', title: 'راتب أكتوبر', sub: 'نقدي', amount: 4000, date: '1 نوفمبر' }] }),
])
STAFF.forEach((e) => { if (!e.att) e.att = {} })

export const findStaff = (id) => STAFF.find((e) => e.id === Number(id))

/* attendance */
export const stateOn = (e, d) => e.att[d] ?? null
export function mark(e, d, state) { e.att[d] = state }
export function cycle(e, d) { e.att[d] = NEXT[e.att[d]] }
export const daysWorked = (e, from = 1, to = TODAY) => DAYS.filter((d) => d >= from && d <= to).reduce((a, d) => a + (ATT[e.att[d]]?.unit || 0), 0)
export const absences = (e) => DAYS.filter((d) => e.att[d] === 'a').length
export const unmarkedToday = () => STAFF.filter((e) => tracked(e) && !e.att[TODAY])

/* what we owe each one right now */
export const dueOf = (e) => (e.pay === 'month' ? Math.max(0, e.rate - e.paidThisMonth) : daysWorked(e, e.paidThrough + 1) * e.rate)
export const unpaidDays = (e) => (e.pay === 'day' ? daysWorked(e, e.paidThrough + 1) : 0)
const dayWord = (n) => (n === Math.floor(n) ? `${n} ${n === 1 ? 'يوم' : n <= 10 ? 'أيام' : 'يوم'}` : `${Math.floor(n)} أيام ونص`)
export const daysLabel = (n) => (n ? dayWord(n) : 'ولا يوم')

/* pay the salary (or part of it) or the accrued day wages, taking back some of the advance */
export function paySalary(e, { gross, deduct = 0, method = 'cash', methodLabel = 'نقدي' }) {
  const net = gross - deduct
  const monthly = e.pay === 'month'
  const from = e.paidThrough + 1
  const title = monthly ? (gross >= e.rate - e.paidThisMonth ? `راتب ${MONTH}` : `جزء من راتب ${MONTH}`) : `يوميات ${from}–${TODAY}/11`
  const sub = deduct ? `${gross.toLocaleString('en-US')} − سلفة ${deduct.toLocaleString('en-US')} · ${methodLabel}` : monthly ? methodLabel : `${daysLabel(unpaidDays(e))} · ${methodLabel}`
  if (monthly) e.paidThisMonth += gross
  else e.paidThrough = TODAY
  e.adv -= deduct
  e.history.unshift({ kind: 'pay', title, sub, amount: net, deduct, date: 'اليوم' })
  if (net > 0) addMove({ dir: 'out', src: 'salary', party: e.name, method, amount: net, note: title })
  return net
}
export function giveAdvance(e, { amount, method = 'cash', methodLabel = 'نقدي' }) {
  e.adv += amount
  e.history.unshift({ kind: 'adv', title: 'سلفة', sub: methodLabel, amount, date: 'اليوم' })
  addMove({ dir: 'out', src: 'salary', party: e.name, method, amount, note: 'سلفة' })
}

/* statement, newest first, with the advance balance after each line */
export function statementOf(e) {
  const rows = e.history.map((h) => ({ ...h }))
  const advOf = (h) => (h.kind === 'adv' ? h.amount : -(h.deduct || 0))
  const opening = e.adv - rows.reduce((a, h) => a + advOf(h), 0)
  if (opening > 0) rows.push({ kind: 'adv', title: 'سلف قديمة', sub: 'من قبل أول نوفمبر', amount: opening, date: '1 نوفمبر' })
  let after = e.adv
  return rows.map((h) => { const r = { ...h, after }; after -= advOf(h); return r })
}
export const paidThisMonth = (e) => e.history.filter((h) => h.kind === 'pay' && h.date !== '1 نوفمبر').reduce((a, h) => a + h.amount, 0)

/* ---------- add / edit / delete ---------- */
const toNumber = (v) => Number(String(v ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
export function checkStaff({ name, role, pay, rate, phone }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب اسم الموظف'
  else if (STAFF.some((e) => e !== current && e.name === n)) errors.name = 'في موظف بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  const r = toNumber(rate)
  if (!r) errors.rate = pay === 'day' ? 'اكتب اليومية' : 'اكتب الراتب'
  else if (pay === 'day' && r > 3000) errors.rate = 'اليومية كبيرة، يمكن قصدك راتب شهري؟'
  else if (pay === 'month' && r < 500) errors.rate = 'الراتب صغير، يمكن قصدك يومية؟'
  return { errors, value: { name: n, role, pay, rate: r, phone: p } }
}
export function addStaff(v) {
  const id = Math.max(0, ...STAFF.map((e) => e.id)) + 1
  STAFF.push({ id, ...v, since: '2026', adv: 0, paidThisMonth: 0, paidThrough: TODAY - 1, history: [], att: {} })
  return STAFF[STAFF.length - 1]
}
export function updateStaff(e, v) {
  // switching to day pay starts counting from today, so the old days aren't paid twice
  if (v.pay === 'day' && e.pay !== 'day') e.paidThrough = TODAY - 1
  Object.assign(e, v)
  return e
}
export const canDelete = (e) => !e.adv && !(e.pay === 'day' && dueOf(e))
export function removeStaff(e) {
  const i = STAFF.indexOf(e)
  if (i < 0) return () => {}
  STAFF.splice(i, 1)
  return () => STAFF.splice(i, 0, e)
}
