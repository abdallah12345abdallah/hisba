// Shareholders: capital in and out by month, the yearly profit split on 1/1 (management share to the owner and the partner,
// the rest over the capital weighted by the months it stayed in), per-person terms (100% or 50/50 with management),
// a read-only link, and the year's distribution (paid in cash or added to capital). Money moves go to the safe.
import { reactive } from 'vue'
import { normalizePhone } from './traders.js'
import { addMove } from './safe.js'
import { STAFF } from './staff.js'
import { yearNets } from './reports.js'

export const YEAR = 2026
export const MONTH_NOW = 11 // November
export const DAY_NOW = 22
export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
export const daysToSplit = () => Math.round((new Date(YEAR + 1, 0, 1) - new Date(YEAR, MONTH_NOW - 1, DAY_NOW)) / 86400000)

/* the business's net profit by month this year comes from the reports (November live) */
export const profitYTD = () => yearNets().reduce((a, v) => a + v, 0)
export const profitProjected = () => Math.round(profitYTD() / (MONTH_NOW - 1 + DAY_NOW / 30) * 12 / 1000) * 1000

/* split settings (Admin) */
export const SPLIT = reactive({ mgmt: 25, owner: 60 })
export const managers = () => {
  const o = STAFF.find((e) => e.role === 'owner')?.name || 'صاحب الحلقة'
  const p = STAFF.find((e) => e.role === 'partner')?.name || 'الشريك'
  return [{ name: o, pct: SPLIT.owner }, { name: p, pct: 100 - SPLIT.owner }]
}

/* past years, already split */
export const YEARS = reactive([
  { year: 2025, profit: 1018000, date: '1/1/2026' },
  { year: 2024, profit: 864000, date: '1/1/2025' },
])
export const DONE = reactive({ [YEAR]: null }) // set when this year's split is recorded

const tok = () => Math.random().toString(36).slice(2, 8)
const cap = (month, amount, title, date) => ({ kind: amount > 0 ? 'in' : 'out', month, amount, title, date })
const prof = (year, amount, how) => ({ kind: 'profit', year, amount, how, title: `أرباح ${year}`, date: `1/1/${year + 1}` })
export const INVESTORS = reactive([
  { id: 1, name: 'الحاج محمود عبد الغني', phone: '01001234567', terms: 'full', token: tok(), since: 2009,
    moves: [cap(0, 1500000, 'رأس مال من قبل', 'قبل 2026')], profits: [prof(2025, 288000, 'cash'), prof(2024, 251000, 'cash')] },
  { id: 2, name: 'الحاج سعيد الدسوقي', phone: '01112345678', terms: 'full', token: tok(), since: 2015,
    moves: [cap(0, 1000000, 'رأس مال من قبل', 'قبل 2026')], profits: [prof(2025, 192000, 'reinvest'), prof(2024, 160000, 'cash')] },
  { id: 3, name: 'د. هاني رزق', phone: '01223344556', terms: 'half', token: tok(), since: 2023,
    moves: [cap(0, 300000, 'رأس مال من قبل', 'قبل 2026'), cap(6, 200000, 'زيادة رأس مال', '3 يونيو')], profits: [prof(2025, 29000, 'cash'), prof(2024, 24000, 'cash')] },
  { id: 4, name: 'سميرة فؤاد', phone: '01099887766', terms: 'full', token: tok(), since: 2026,
    moves: [cap(3, 200000, 'دخلت بالشراكة', '1 مارس')], profits: [] },
  { id: 5, name: 'م. وليد شاكر', phone: '01155443322', terms: 'half', token: tok(), since: 2024,
    moves: [cap(0, 500000, 'رأس مال من قبل', 'قبل 2026'), cap(9, -100000, 'سحب من رأس المال', '12 سبتمبر')], profits: [prof(2025, 47000, 'reinvest')] },
  { id: 6, name: 'حسن الدسوقي', phone: '01277665544', terms: 'full', token: tok(), since: 2026,
    moves: [cap(8, 250000, 'دخل بالشراكة', '1 أغسطس')], profits: [] },
])
export const findInvestor = (id) => INVESTORS.find((x) => x.id === Number(id))
export const findByToken = (t) => INVESTORS.find((x) => x.token === t)
export const shareUrl = (x) => `${location.origin}/i/${x.token}`
export const TERMS = { full: { label: '100%', long: 'بياخد ربح رأس ماله كامل' }, half: { label: '50 / 50', long: 'نص ربح رأس ماله إله ونص للإدارة' } }

/* capital now, and capital weighted by the months it stayed in this year (money in month m counts 13 − m months) */
export const capitalOf = (x) => x.moves.reduce((a, m) => a + m.amount, 0)
export const monthsIn = (m) => (m.month === 0 ? 12 : 13 - m.month)
export const weightedOf = (x) => Math.round(x.moves.reduce((a, m) => a + (m.amount * monthsIn(m)) / 12, 0))
export const capitalByMonth = (x) => MONTHS.map((_, i) => x.moves.filter((m) => m.month <= i + 1).reduce((a, m) => a + m.amount, 0))
export const totalCapital = () => INVESTORS.reduce((a, x) => a + capitalOf(x), 0)
export const totalWeighted = () => INVESTORS.reduce((a, x) => a + weightedOf(x), 0)
export const profitsTaken = (x) => x.profits.reduce((a, p) => a + p.amount, 0)

/* the split for a given year profit */
export function split(P) {
  const W = totalWeighted() || 1
  const base = (P * SPLIT.mgmt) / 100
  const pool = P - base
  let extra = 0
  const rows = INVESTORS.map((x) => {
    const raw = (pool * weightedOf(x)) / W
    const get = x.terms === 'half' ? raw / 2 : raw
    extra += raw - get
    return { x, pct: (weightedOf(x) / W) * 100, raw: Math.round(raw), get: Math.round(get) }
  })
  const mgmt = base + extra
  return { P, pool: Math.round(pool), base: Math.round(base), extra: Math.round(extra), mgmt: Math.round(mgmt), rows, managers: managers().map((m) => ({ ...m, get: Math.round((mgmt * m.pct) / 100) })) }
}

/* capital in / out now (this month) */
const label = { cash: 'نقدي', vodafone: 'فودافون كاش', bank: 'تحويل بنكي' }
export function moveCapital(x, { amount, dir, method = 'bank' }) {
  const a = dir === 'in' ? amount : -amount
  x.moves.push(cap(MONTH_NOW, a, dir === 'in' ? 'زيادة رأس مال' : 'سحب من رأس المال', `${DAY_NOW} نوفمبر · ${label[method]}`))
  addMove({ dir: dir === 'in' ? 'in' : 'out', src: dir === 'in' ? 'capital' : 'capitalOut', party: x.name, method, amount, note: dir === 'in' ? 'زيادة رأس مال' : 'سحب رأس مال' })
}

/* record this year's split: each one in cash (out of the safe) or added to his capital from January */
export function distribute(P, choices, method = 'bank') {
  const s = split(P)
  s.rows.forEach(({ x, get }) => {
    const how = choices[x.id] || 'cash'
    x.profits.unshift(prof(YEAR, get, how))
    if (how === 'reinvest') x.moves.push({ kind: 'in', month: 13, amount: get, title: `أرباح ${YEAR} انضافت لرأس المال`, date: `1/1/${YEAR + 1}` })
    else addMove({ dir: 'out', src: 'profit', party: x.name, method, amount: get, note: `أرباح ${YEAR}` })
  })
  YEARS.unshift({ year: YEAR, profit: P, date: `${DAY_NOW}/${MONTH_NOW}/${YEAR}` })
  DONE[YEAR] = { P, mgmt: s.mgmt }
  return s
}

/* statement: capital moves and profits, newest first, with the capital after each line */
export function statementOf(x) {
  const lines = [
    ...x.moves.map((m) => ({ ...m, sort: m.month * 100 })),
    ...x.profits.map((p) => ({ ...p, sort: p.year === YEAR ? 1300 : -(YEAR - p.year - 1) * 100 + 50 })),
  ].sort((a, b) => b.sort - a.sort)
  let after = capitalOf(x)
  return lines.map((l) => { const r = { ...l, after }; if (l.kind !== 'profit') after -= l.amount; return r })
}

/* ---------- add / edit / delete ---------- */
const toNumber = (v) => Number(String(v ?? '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d]/g, '')) || 0
export function checkInvestor({ name, phone, terms, capital }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب اسم المساهم'
  else if (INVESTORS.some((x) => x !== current && x.name === n)) errors.name = 'في مساهم بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  const c = toNumber(capital)
  if (!current && c < 1000) errors.capital = 'اكتب رأس المال اللي دخل فيه'
  return { errors, value: { name: n, phone: p, terms }, capital: c }
}
export function addInvestor(v, capital, method = 'bank') {
  const id = Math.max(0, ...INVESTORS.map((x) => x.id)) + 1
  INVESTORS.push({ id, ...v, token: tok(), since: YEAR, moves: [], profits: [] })
  const x = INVESTORS[INVESTORS.length - 1]
  x.moves.push(cap(MONTH_NOW, capital, 'دخل بالشراكة', `${DAY_NOW} نوفمبر · ${label[method]}`))
  addMove({ dir: 'in', src: 'capital', party: x.name, method, amount: capital, note: 'رأس مال مساهم جديد' })
  return x
}
export function updateInvestor(x, v) { Object.assign(x, v); return x }
export const canDelete = (x) => !capitalOf(x)
export function removeInvestor(x) {
  const i = INVESTORS.indexOf(x)
  if (i < 0) return () => {}
  INVESTORS.splice(i, 1)
  return () => INVESTORS.splice(i, 0, x)
}
export function renewToken(x) { x.token = tok(); return shareUrl(x) }
export function whatsappText(x, P) {
  const s = split(P).rows.find((r) => r.x === x)
  return `السلام عليكم ${x.name}\nرأس مالك معنا: ${capitalOf(x).toLocaleString('en-US')} ج\nحصتك من ربح ${YEAR}: ${s.pct.toFixed(1)}%\nالمتوقع لك آخر السنة: حوالي ${s.get.toLocaleString('en-US')} ج\nالتفاصيل على الرابط:\n${shareUrl(x)}`
}
