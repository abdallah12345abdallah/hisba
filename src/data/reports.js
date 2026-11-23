// Reports: the year's income statement month by month (Jan–Oct kept, November live from the sheet, expenses and staff),
// sales by day / supplier / grade, debts, the safe and costs. One source for the year's profit (the shareholders read it too).
import { MONTH as NOV_DAYS, SUPPLIERS, PRICES, TRADERS, KG_PER_BOX } from './demo.js'
import { allExpenses, CATS } from './expenses.js'
import { STAFF, daysWorked, TODAY, roleOf } from './staff.js'

export const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
export const NOW = 10 // November (index)
const RATE = 0.0444 // average commission on gross sales
const KG_BOX_PRICE = 770 // average sale per box

/* January–October, closed: net profit, expenses, salaries, feed markup (settlements on 1/1 and 1/7) */
const PAST = [
  [78400, 41200, 69800, 38400], [71200, 38900, 68400, 0], [83900, 43800, 71200, 0], [92600, 40100, 70500, 0],
  [88100, 44600, 71900, 0], [69800, 39700, 69100, 0], [74300, 42300, 70800, 47600], [96500, 45100, 72300, 0],
  [101200, 43900, 71600, 0], [94700, 41800, 70900, 0],
].map(([net, exp, sal, feed]) => {
  const commission = net + exp + sal - feed
  const gross = Math.round(commission / RATE)
  return { net, exp, sal, feed, commission, gross, boxes: Math.round(gross / KG_BOX_PRICE) }
})

/* November so far, live */
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)
export const staffCostNow = () => Math.round(sum(STAFF, (e) => (e.pay === 'month' ? (e.rate * TODAY) / 30 : daysWorked(e) * e.rate)))
function november() {
  const commission = sum(NOV_DAYS, (d) => d.commission)
  const gross = sum(NOV_DAYS, (d) => d.gross)
  const boxes = sum(NOV_DAYS, (d) => d.boxes)
  const exp = sum(allExpenses(), (e) => e.amount)
  const sal = staffCostNow()
  return { commission, gross, boxes, exp, sal, feed: 0, net: commission - exp - sal, live: true }
}
export const monthPnl = (i) => (i === NOW ? november() : PAST[i])
export const yearNets = () => [...PAST.map((m) => m.net), november().net]

/* a period: this month, last month, or the year so far */
export const PERIODS = [{ value: 'month', label: 'هالشهر' }, { value: 'last', label: 'الشهر الماضي' }, { value: 'ytd', label: 'من أول السنة' }]
export const periodLabel = (p) => ({ month: `${MONTHS[NOW]} لحد اليوم`, last: MONTHS[NOW - 1], ytd: `يناير – ${MONTHS[NOW]}` }[p])
export const monthsOf = (p) => (p === 'month' ? [NOW] : p === 'last' ? [NOW - 1] : Array.from({ length: NOW + 1 }, (_, i) => i))
export function pnl(p) {
  const ms = monthsOf(p).map(monthPnl)
  const t = (k) => sum(ms, (m) => m[k])
  return { commission: t('commission'), feed: t('feed'), exp: t('exp'), sal: t('sal'), net: t('net'), gross: t('gross'), boxes: t('boxes') }
}
/* the same length of time just before, for the comparison */
export function prevOf(p) {
  if (p === 'month') { const m = PAST[NOW - 1]; const k = TODAY / 30; return { net: m.net * k, commission: m.commission * k, gross: m.gross * k, exp: m.exp * k, sal: m.sal * k, boxes: m.boxes * k } }
  if (p === 'last') return PAST[NOW - 2]
  return null
}

/* sales split by supplier (by their weekly volume) and by grade (typical mix of boxes × price) */
export function bySupplier(p) {
  const g = pnl(p).gross
  const w = SUPPLIERS.map((s) => ({ s, w: s.weeks.reduce((a, b) => a + b, 0) }))
  const W = sum(w, (x) => x.w) || 1
  return w.map(({ s, w: v }) => { const gross = Math.round((g * v) / W); return { name: s.name, id: s.id, rate: s.rate, gross, commission: Math.round((gross * s.rate) / 100), boxes: Math.round(gross / KG_BOX_PRICE) } }).sort((a, b) => b.gross - a.gross)
}
const MIX = { 'بلطي سوبر': 24, 'بلطي 1': 22, 'بلطي 2': 18, 'بلطي 3': 10, 'بلطي 4': 6, 'شر': 4, 'بوري': 10, 'طبار': 6 }
export function byGrade(p) {
  const g = pnl(p).gross
  const vals = PRICES.map(([grade, price]) => ({ grade, price, v: (MIX[grade] || 0) * price }))
  const V = sum(vals, (x) => x.v) || 1
  return vals.map((x) => { const gross = Math.round((g * x.v) / V); return { grade: x.grade, price: x.price, gross, boxes: Math.round(gross / (x.price * KG_PER_BOX)) } })
}

/* who owes and for how long */
export const debtRows = () => TRADERS.filter((t) => t.due).slice().sort((a, b) => b.due - a.due)

/* costs this month: expenses by category vs budget, staff by job */
export const expensesByCat = () => {
  const all = allExpenses()
  return CATS.map((c) => { const spent = sum(all.filter((e) => e.cat === c.key), (e) => e.amount); return { ...c, spent, pct: c.budget ? (spent / c.budget) * 100 : 0 } }).sort((a, b) => b.spent - a.spent)
}
export const staffByRole = () => {
  const m = new Map()
  STAFF.forEach((e) => {
    const r = roleOf(e.role)
    const cost = e.pay === 'month' ? (e.rate * TODAY) / 30 : daysWorked(e) * e.rate
    const x = m.get(r.key) || { label: r.label, icon: r.icon, people: 0, cost: 0, adv: 0 }
    x.people++; x.cost += cost; x.adv += e.adv
    m.set(r.key, x)
  })
  return [...m.values()].map((x) => ({ ...x, cost: Math.round(x.cost) })).sort((a, b) => b.cost - a.cost)
}
