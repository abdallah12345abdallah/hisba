// Sample data, held in one reactive store so the sale sheet and the dashboard always agree.
// Every total is computed from the rows (getters), never typed in. Replace with real data once the backend exists.
import { reactive } from 'vue'

export const TODAY = 'الأحد 22 نوفمبر 2026'
// the agency using the app (editable in Settings): shown in the sidebar, on invoices and on the shared statements
export const AGENCY = reactive({ name: 'وكالة الحاج سامي', place: 'كفر الشيخ', phone: '01001234567', note: 'شكراً لتعاملكم معنا', logo: null })
// the signed-in user (filled from the session in data/auth.js)
export const USER = reactive({ name: 'أحمد', role: 'محاسب' })
export const KG_PER_BOX = 25

export const PRICES = reactive([
  ['بلطي سوبر', 36], ['بلطي 1', 32], ['بلطي 2', 28], ['بلطي 3', 24],
  ['بلطي 4', 20], ['شر', 15], ['بوري', 45], ['طبار', 40],
])
export const priceOf = (grade) => (PRICES.find((p) => p[0] === grade) || [0, 0])[1]

// days = age of the oldest unpaid invoice. history = earlier moves (newest first); today's sheet lines are added live in data/traders.js
const buy = (title, sub, amount, date) => ({ kind: 'buy', title, sub, amount, date })
const pay = (title, sub, amount, date) => ({ kind: 'pay', title, sub, amount, date })
export const TRADERS = reactive([
  { name: 'الحاج محمود', phone: '0100 234 5678', due: 58400, limit: 50000, days: 19, lastBuy: 'اليوم', lastPay: 'من 9 أيام',
    history: [pay('قبض نقدي', 'إيصال 1207', 15000, '13 نوفمبر'), buy('مزرعة أبو خليل', '18 بوكس بلطي سوبر', 16200, '12 نوفمبر'), buy('مزرعة النجار', '20 بوكس بلطي 1', 16000, '8 نوفمبر')] },
  { name: 'أبو يوسف', phone: '0109 552 1200', due: 31200, limit: 40000, days: 6, lastBuy: 'اليوم', lastPay: 'من 5 أيام',
    history: [pay('تحويل فودافون كاش', 'إيصال 1214', 9000, '17 نوفمبر'), buy('مزرعة الحاج سامر', '12 بوكس بلطي 1', 9600, '16 نوفمبر')] },
  { name: 'سوبر ماركت الأمانة', phone: '0122 330 9081', due: 24900, limit: 30000, days: 34, lastBuy: 'اليوم', lastPay: 'من 18 يوم',
    history: [pay('قبض نقدي', 'إيصال 1188', 6000, '4 نوفمبر'), buy('مزرعة النجار', '15 بوكس بلطي 2', 10500, '19 أكتوبر')] },
  { name: 'مطعم البحر', phone: '0120 777 4321', due: 12750, limit: 20000, days: 3, lastBuy: 'اليوم', lastPay: 'أمس',
    history: [pay('قبض نقدي', 'إيصال 1220', 5000, '21 نوفمبر'), buy('مزرعة أبو خليل', '6 بوكس بوري', 6750, '19 نوفمبر')] },
  { name: 'أبو حسن العطار', phone: '0111 876 4410', due: 9300, limit: 15000, days: 1, lastBuy: 'اليوم', lastPay: 'من 40 يوم',
    history: [pay('قبض نقدي', 'إيصال 1150', 4000, '13 أكتوبر')] },
  { name: 'محمد الصياد', phone: '0155 901 2234', due: 18400, limit: 20000, days: 21, lastBuy: 'من 3 أيام', lastPay: 'من 11 يوم',
    history: [buy('مزرعة الحاج سامر', '10 بوكس بلطي سوبر', 9000, '19 نوفمبر'), pay('قبض نقدي', 'إيصال 1201', 7000, '11 نوفمبر'), buy('مزرعة النجار', '14 بوكس بلطي 1', 11200, '1 نوفمبر')] },
  { name: 'كافتيريا النيل', phone: '0112 600 7788', due: 6200, limit: 10000, days: 2, lastBuy: 'أمس', lastPay: 'من يومين',
    history: [buy('مزرعة أبو خليل', '4 بوكس طبار', 4000, '21 نوفمبر'), pay('قبض نقدي', 'إيصال 1218', 3000, '20 نوفمبر')] },
  { name: 'أبو سامي', phone: '0106 448 1190', due: 0, limit: 15000, days: 0, lastBuy: 'من 6 أيام', lastPay: 'من 6 أيام',
    history: [pay('قبض نقدي', 'سدّد كل الحساب', 8200, '16 نوفمبر'), buy('مزرعة النجار', '8 بوكس بلطي 1', 6400, '16 نوفمبر')] },
])
export const CASH_CUSTOMER = 'عميل نقدي'

const sum = (rows, f) => rows.reduce((s, r) => s + (typeof f === 'function' ? f(r) : r[f]), 0)
let nextId = 1

/* a manifest that was fully sold and approved earlier today: only its totals are kept */
function approved(supplier, boxes, gross, rate, asha, time) {
  return { id: nextId++, supplier, rate, asha, time, status: 'approved', grades: [], lines: [], boxes, sold: boxes, gross,
    get commission() { return Math.round((this.gross * this.rate) / 100) } }
}

/* a draft manifest that is still being sold: everything is computed from its grades and lines */
function draft(supplier, rate, asha, time, grades, lines) {
  return {
    id: nextId++, supplier, rate, asha, time, status: 'draft',
    grades: grades.map(([grade, boxes]) => ({ grade, boxes })),
    lines: lines.map(([trader, grade, boxes, pay = 'credit']) => ({ id: nextId++, trader, grade, boxes, price: priceOf(grade), pay })),
    get boxes() { return sum(this.grades, 'boxes') },
    get sold() { return sum(this.lines, 'boxes') },
    get gross() { return sum(this.lines, (l) => l.boxes * KG_PER_BOX * l.price) },
    get commission() { return Math.round((this.gross * this.rate) / 100) },
    soldOf(grade) { return sum(this.lines.filter((l) => l.grade === grade), 'boxes') },
  }
}

export const MANIFESTS = reactive([
  approved('مزرعة الحاج سامر', 84, 70000, 5, 3, '05:42'),
  approved('مزرعة أبو خليل', 60, 46800, 4, 2, '06:15'),
  draft('مزرعة الشيخ عيد', 5, 4, '06:50',
    [['بلطي سوبر', 30], ['بلطي 1', 30], ['بلطي 2', 25], ['بلطي 3', 15], ['بوري', 12], ['طبار', 8]],
    [['أبو يوسف', 'بلطي سوبر', 12], ['الحاج محمود', 'بلطي سوبر', 10], ['مطعم البحر', 'بلطي سوبر', 8],
      ['الحاج محمود', 'بلطي 1', 14], [CASH_CUSTOMER, 'بلطي 1', 12, 'cash'], ['أبو حسن العطار', 'بلطي 2', 20],
      ['سوبر ماركت الأمانة', 'بلطي 3', 12], ['مطعم البحر', 'بوري', 6], ['أبو يوسف', 'طبار', 4]]),
  approved('مزرعة النجار', 45, 33600, 3, 0, '07:20'),
  draft('مزرعة الحاج رمضان', 4, 1, '08:05',
    [['بلطي سوبر', 20], ['بلطي 1', 20], ['بلطي 2', 15], ['بوري', 10], ['طبار', 5]],
    [['الحاج محمود', 'بلطي سوبر', 15], ['أبو يوسف', 'بلطي 1', 10], [CASH_CUSTOMER, 'بلطي 2', 6, 'cash']]),
])

export const TOTALS = reactive({
  get boxes() { return sum(MANIFESTS, 'boxes') },
  get sold() { return sum(MANIFESTS, 'sold') },
  get gross() { return sum(MANIFESTS, 'gross') },
  get commission() { return sum(MANIFESTS, 'commission') },
  get asha() { return sum(MANIFESTS, 'asha') },
  get drafts() { return MANIFESTS.filter((m) => m.status === 'draft') },
  get unsold() { return this.boxes - this.sold },
})

// the safe: three wallets (the drawer, Vodafone Cash, the bank), today's opening balances and every money movement.
// Cash sales on today's sheets join the drawer live. dir: in | out | move (between wallets)
export const WALLETS = [
  { key: 'cash', label: 'الدرج', long: 'الدرج (نقدي)' },
  { key: 'vodafone', label: 'فودافون كاش', long: 'فودافون كاش' },
  { key: 'bank', label: 'البنك', long: 'حساب البنك' },
]
const cashMove = (time, dir, src, party, method, amount, note = '', manual = false) => ({ id: nextId++, time, dir, src, party, method, amount, note, manual })
export const CASHBOOK = reactive({
  opening: { cash: 21400, vodafone: 6200, bank: 85000 },
  closedAt: null, // set when today is closed
  entries: [
    cashMove('06:30', 'out', 'expense', 'فطور العمال', 'cash', 350, '', true),
    cashMove('07:05', 'out', 'expense', 'بنزين التروسيكل', 'cash', 600, '', true),
    cashMove('07:40', 'in', 'collect', 'مطعم البحر', 'cash', 5000, 'إيصال 1221'),
    cashMove('08:15', 'in', 'collect', 'كافتيريا النيل', 'vodafone', 3000, 'تحويل'),
    cashMove('09:20', 'out', 'supplier', 'مزرعة أبو خليل', 'bank', 10000, 'تحويل بنكي'),
    { ...cashMove('09:45', 'move', 'move', 'إيداع بالبنك', 'cash', 20000, '', true), to: 'bank' },
  ],
  closes: [
    { date: '21/11/2026', time: '19:10', expected: 61240, counted: 61200, diff: -40, inSum: 98400, outSum: 58560, by: 'أحمد', note: 'فكة ناقصة' },
    { date: '20/11/2026', time: '19:02', expected: 48310, counted: 48310, diff: 0, inSum: 76200, outSum: 49290, by: 'أحمد', note: '' },
    { date: '19/11/2026', time: '18:55', expected: 52900, counted: 53000, diff: 100, inSum: 81300, outSum: 47800, by: 'أحمد', note: 'زيادة من عميل نقدي' },
    { date: '18/11/2026', time: '19:20', expected: 39750, counted: 39750, diff: 0, inSum: 64100, outSum: 51650, by: 'أحمد', note: '' },
    { date: '17/11/2026', time: '19:05', expected: 44600, counted: 44400, diff: -200, inSum: 70500, outSum: 56900, by: 'أحمد', note: 'مصروف ما انسجّل' },
  ],
})
/* cash sales from today's sheets, as drawer movements (one per line) */
export const sheetCashMoves = () => MANIFESTS.flatMap((m) => m.lines.filter((l) => l.pay === 'cash')
  .map((l) => ({ id: 'L' + l.id, time: m.time, dir: 'in', src: 'sale', party: l.trader, method: 'cash', amount: l.boxes * KG_PER_BOX * l.price, note: `${l.boxes} بوكس ${l.grade} · ${m.supplier}`, manual: false })))
export const walletBalance = (w) => {
  let b = CASHBOOK.opening[w]
  CASHBOOK.entries.forEach((e) => {
    if (e.dir === 'in' && e.method === w) b += e.amount
    if (e.dir === 'out' && e.method === w) b -= e.amount
    if (e.dir === 'move') { if (e.method === w) b -= e.amount; if (e.to === w) b += e.amount }
  })
  if (w === 'cash') b += sum(sheetCashMoves(), 'amount')
  return b
}
export const CASH = reactive({ get drawer() { return walletBalance('cash') } })

export const RECEIVABLE = reactive({ get total() { return sum(TRADERS, 'due') } })
export const AGING = reactive({
  get buckets() {
    return [
      { label: 'حتى 7 أيام', value: sum(TRADERS.filter((t) => t.days <= 7), 'due'), color: '#7cc4d6' },
      { label: '8 – 30 يوم', value: sum(TRADERS.filter((t) => t.days > 7 && t.days <= 30), 'due'), color: '#e0a33a' },
      { label: 'أكتر من 30 يوم', value: sum(TRADERS.filter((t) => t.days > 30), 'due'), color: '#c4242a' },
    ]
  },
})

// suppliers (fish farms). balance: + = we owe the farm the net of its sales ("له"), − = advances exceed its sales ("عليه").
// history = earlier moves (newest first): sale (an approved manifest's net), pay (we paid him), adv (cash advance, no interest)
const mv = (kind, title, sub, amount, date) => ({ kind, title, sub, amount, date })
export const SUPPLIERS = reactive([
  { id: 1, name: 'مزرعة الحاج سامر', place: 'كفر الشيخ', phone: '0100 551 2030', rate: 5, rating: 5, balance: 60550, weeks: [52, 61, 58, 70], token: 'k7q2sm',
    history: [mv('pay', 'دفعة نقدي', 'إيصال صرف 88', 40000, '20 نوفمبر'), mv('sale', 'بيان 19 نوفمبر', '78 بوكس', 51300, '19 نوفمبر')] },
  { id: 2, name: 'مزرعة أبو خليل', place: 'بيلا', phone: '0111 220 9087', rate: 4, rating: 4, balance: 44928, weeks: [40, 44, 39, 47], token: 'p3x9ak',
    history: [mv('adv', 'سلفة', 'لشرا زريعة', 10000, '15 نوفمبر'), mv('sale', 'بيان 14 نوفمبر', '55 بوكس', 38400, '14 نوفمبر')] },
  { id: 3, name: 'مزرعة النجار', place: 'سيدي سالم', phone: '0122 778 4410', rate: 3, rating: 4, balance: 32592, weeks: [30, 28, 35, 34], token: 'm8d4nr',
    history: [mv('pay', 'تحويل بنكي', 'إيصال صرف 85', 25000, '18 نوفمبر')] },
  { id: 4, name: 'مزرعة الشيخ عيد', place: 'البرلس', phone: '0109 300 1122', rate: 5, rating: 3, balance: -35000, weeks: [70, 82, 76, 79], token: 'h2v6se',
    history: [mv('adv', 'سلفة', 'تحت الحساب', 35000, '21 نوفمبر'), mv('pay', 'دفعة نقدي', 'إيصال صرف 87', 60000, '17 نوفمبر'), mv('sale', 'بيان 16 نوفمبر', '110 بوكس', 60000, '16 نوفمبر')] },
  { id: 5, name: 'مزرعة الحاج رمضان', place: 'الحامول', phone: '0155 662 9001', rate: 4, rating: 4, balance: 24672, weeks: [22, 26, 24, 25], token: 'r5t1hr',
    history: [mv('sale', 'بيان 15 نوفمبر', '40 بوكس', 24672, '15 نوفمبر')] },
  { id: 6, name: 'مزرعة المنصورة', place: 'مطوبس', phone: '0120 440 7765', rate: 4, rating: 2, balance: -8000, weeks: [12, 9, 14, 8], token: 'z9w3mn',
    history: [mv('adv', 'سلفة', 'لعلاج السمك', 8000, '12 نوفمبر')] },
])
// the dashboard's short list, always from the same suppliers
export const SUPPLIER_BALANCES = reactive({
  get rows() { return SUPPLIERS.filter((s) => s.balance).slice().sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)).slice(0, 4)
    .map((s) => ({ name: s.name, amount: Math.abs(s.balance), side: s.balance > 0 ? 'له' : 'عليه', note: s.balance < 0 ? 'سلفة تحت الحساب' : '' })) },
})

// feed delivered to farms on credit at the factory price; settled on a set date with a markup (debit note)
export const TODAY_DATE = new Date(2026, 10, 22)
// factory price per ton for each feed type (editable from the feed page; new deliveries take the current price)
export const FEED_TYPES = reactive([
  { type: 'بادي 32%', price: 21500 },
  { type: 'نامي 28%', price: 19800 },
  { type: 'ناهي 25%', price: 18400 },
])
const delivery = (date, type, tons) => ({ id: nextId++, date, type, tons, price: FEED_TYPES.find((t) => t.type === type).price })
// paid = factory value already settled in part; amount/tons = what is still open
const feedAccount = (name, due, deliveries, paid = 0) => ({
  name, due, deliveries, paid,
  get delivered() { return sum(this.deliveries, (d) => d.tons * d.price) },
  get tonsAll() { return sum(this.deliveries, 'tons') },
  get amount() { return Math.max(0, this.delivered - this.paid) },
  get tons() { return this.delivered ? +(this.tonsAll * (this.amount / this.delivered)).toFixed(2) : 0 },
  get daysLeft() { const [d, m, y] = this.due.split('/').map(Number); return Math.round((new Date(y, m - 1, d) - TODAY_DATE) / 864e5) },
})
export const FEED = reactive([
  feedAccount('مزرعة أبو خليل', '1/12/2026', [delivery('5 سبتمبر', 'بادي 32%', 3), delivery('2 أكتوبر', 'نامي 28%', 5), delivery('30 أكتوبر', 'ناهي 25%', 1.25)]),
  feedAccount('مزرعة الشيخ عيد', '1/1/2027', [delivery('10 سبتمبر', 'بادي 32%', 6), delivery('8 أكتوبر', 'نامي 28%', 10), delivery('3 نوفمبر', 'ناهي 25%', 4.6)]),
  feedAccount('مزرعة الحاج رمضان', '1/7/2027', [delivery('12 نوفمبر', 'بادي 32%', 4.4)]),
])
export const FEED_TOTAL = reactive({ get value() { return sum(FEED, 'amount') } })
export const newFeedAccount = feedAccount
export const newDelivery = delivery

// last 30 days, 24/10 → 22/11; Fridays the market is closed; today follows the live totals
const SEED = [8.1, 9.4, 7.6, 10.2, 11.3, 9.9, 0, 8.8, 9.6, 12.4, 10.7, 9.2, 11.8, 0, 10.4, 8.9, 12.9, 11.1, 9.7, 10.6, 0, 11.6, 12.2, 9.4, 13.1, 10.9, 11.7, 0, 12.6, 0]
export const DAYS = SEED.map((k, i) => {
  const d = new Date(2026, 9, 24 + i)
  const closed = d.getDay() === 5
  const commission = closed ? 0 : Math.round(k * 1000)
  const gross = closed ? 0 : Math.round(commission / 0.0444)
  return { date: d, label: `${d.getDate()}/${d.getMonth() + 1}`, closed, commission, gross, boxes: closed ? 0 : Math.round(gross / 770), today: false }
})
Object.defineProperties(DAYS[29], {
  today: { value: true },
  commission: { get: () => TOTALS.commission },
  gross: { get: () => TOTALS.gross },
  boxes: { get: () => TOTALS.sold },
})
export const MONTH = DAYS.filter((d) => d.date.getMonth() === 10)

export function buildAlerts() {
  const m = TRADERS[0], late = TRADERS[2]
  return [
    m.due > m.limit && { tone: 'neg', icon: 'alert', title: `${m.name} تخطى حد الدين`, text: `عليه ${fmt(m.due)} والحد ${fmt(m.limit)}`, action: 'كشف الحساب', to: '/traders' },
    TOTALS.drafts.length && { tone: 'warn', icon: 'clock', title: `${TOTALS.drafts.length} بيانات مسودة`, text: `باقي ${TOTALS.unsold} بوكس ما انباعوا`, action: 'افتحهم', to: '/sheet' },
    { tone: 'warn', icon: 'feed', title: 'تسوية علف أبو خليل بعد 9 أيام', text: `${fmt(FEED[0].amount)} ج بتاريخ ${FEED[0].due}`, action: 'جهّز' },
    { tone: 'neg', icon: 'alert', title: `${late.name} متأخر ${late.days} يوم`, text: `عليه ${fmt(late.due)} ج`, action: 'تواصل', to: '/traders' },
  ].filter(Boolean)
}

export function fmt(n) {
  return Number(n).toLocaleString('en-US')
}
