// Expenses: categories with a monthly budget, every expense (today's live in the safe, earlier days kept here),
// a guess of the category from what was typed, and the fixed monthly expenses (rent, power…).
import { reactive } from 'vue'
import { CASHBOOK } from './demo.js'
import { addMove, removeMove } from './safe.js'

export const CATS = reactive([
  { key: 'ice', label: 'ثلج', icon: 'ice', budget: 9000, words: ['ثلج'] },
  { key: 'fuel', label: 'نقل وبنزين', icon: 'fuel', budget: 7000, words: ['بنزين', 'سولار', 'نقل', 'تروسيكل', 'عربية', 'نولون', 'توصيل'] },
  { key: 'pack', label: 'أكياس وتغليف', icon: 'box', budget: 4500, words: ['أكياس', 'اكياس', 'كرتون', 'تغليف', 'شكاير', 'فلين', 'صناديق'] },
  { key: 'repair', label: 'صيانة', icon: 'wrench', budget: 6000, words: ['صيانة', 'تصليح', 'ميزان', 'تلاجة', 'ثلاجة'] },
  { key: 'util', label: 'كهربا ومياه', icon: 'bolt', budget: 3500, words: ['كهربا', 'كهرباء', 'مياه', 'ماي', 'نور'] },
  { key: 'rent', label: 'إيجار', icon: 'building', budget: 8000, words: ['إيجار', 'ايجار', 'المحل'] },
  // العشا: the agency's share given out on each manifest, entered when the manifest is approved
  { key: 'asha', label: 'العشا', icon: 'asha', budget: 12000, words: ['عشا', 'العشا'] },
  { key: 'food', label: 'أكل وضيافة', icon: 'coffee', budget: 3000, words: ['فطور', 'أكل', 'اكل', 'شاي', 'قهوة', 'غدا', 'ضيافة'] },
  { key: 'fees', label: 'رسوم وتصاريح', icon: 'doc', budget: 2000, words: ['رسوم', 'تصريح', 'كارتة', 'بلدية', 'سجل', 'ضريبة'] },
  { key: 'other', label: 'أخرى', icon: 'dots', budget: 2000, words: [] },
])
export const catOf = (key) => CATS.find((c) => c.key === key) || CATS[CATS.length - 1]
export const guessCat = (text = '') => (CATS.find((c) => c.words.some((w) => text.includes(w))) || CATS[CATS.length - 1]).key

/* earlier this month (1–21 Nov) — fixed seed so the numbers stay the same */
const SEEDS = [['ice', 'ثلج للبيان', 420], ['food', 'فطور العمال', 300], ['fuel', 'بنزين التروسيكل', 550], ['ice', 'ثلج إضافي', 280], ['pack', 'أكياس نايلون', 640], ['fuel', 'نولون عربية', 900], ['repair', 'تصليح الميزان', 750], ['food', 'شاي وقهوة', 120], ['fees', 'كارتة الطريق', 60], ['asha', 'عشا البيانات', 450]]
let rid = 50000
const past = []
for (let day = 1; day <= 21; day++) {
  if (new Date(2026, 10, day).getDay() === 5) continue // the market is closed on Fridays
  const n = 2 + (day % 3)
  for (let k = 0; k < n; k++) {
    const [cat, desc, base] = SEEDS[(day * 3 + k) % SEEDS.length]
    past.push({ id: ++rid, day, time: `0${6 + k}:${String((day * 7 + k * 13) % 60).padStart(2, '0')}`.slice(-5), cat, desc, amount: Math.round((base * (0.8 + ((day + k) % 5) * 0.1)) / 10) * 10, method: 'cash', note: '' })
  }
}
past.push({ id: ++rid, day: 1, time: '10:00', cat: 'rent', desc: 'إيجار المحل', amount: 8000, method: 'bank', note: 'شهر نوفمبر' })
past.push({ id: ++rid, day: 5, time: '11:30', cat: 'util', desc: 'فاتورة الكهربا', amount: 2650, method: 'cash', note: '' })
export const EXPENSES = reactive({ past, lastMonth: 41800 })

/* today's expenses are the safe's expense moves */
const fromEntry = (e) => ({ id: e.id, day: 22, time: e.time, cat: e.cat || guessCat(e.party), desc: e.party, amount: e.amount, method: e.method, note: e.note, entry: e })
export const allExpenses = () => [...CASHBOOK.entries.filter((e) => e.src === 'expense').map(fromEntry), ...EXPENSES.past]
  .sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))

export function addExpense({ cat, desc, amount, method, note }) {
  const undo = addMove({ dir: 'out', src: 'expense', party: desc, method, amount, note, manual: true })
  CASHBOOK.entries[CASHBOOK.entries.length - 1].cat = cat
  return undo
}
export function updateExpense(x, { cat, desc, amount, method, note }) {
  if (x.entry) Object.assign(x.entry, { cat, party: desc, amount, method, note })
  else Object.assign(EXPENSES.past.find((p) => p.id === x.id), { cat, desc, amount, method, note })
}
export function removeExpense(x) {
  if (x.entry) return removeMove(x.entry)
  const i = EXPENSES.past.findIndex((p) => p.id === x.id)
  const [rec] = EXPENSES.past.splice(i, 1)
  return () => EXPENSES.past.splice(i, 0, rec)
}
export function setBudgets(values) { CATS.forEach((c) => { if (values[c.key] != null) c.budget = values[c.key] }) }

/* fixed monthly expenses: due on a day of the month; paying one records the expense */
export const RECURRING = reactive([
  { id: 1, name: 'إيجار المحل', cat: 'rent', amount: 8000, day: 1, paidMonth: 11, method: 'bank' },
  { id: 2, name: 'فاتورة الكهربا', cat: 'util', amount: 2650, day: 5, paidMonth: 11, method: 'cash' },
  { id: 3, name: 'اشتراك الثلاجة', cat: 'ice', amount: 3000, day: 20, paidMonth: 10, method: 'cash' },
  { id: 4, name: 'صيانة الميزان الشهرية', cat: 'repair', amount: 500, day: 25, paidMonth: 10, method: 'cash' },
  { id: 5, name: 'رسوم البلدية', cat: 'fees', amount: 400, day: 28, paidMonth: 10, method: 'cash' },
])
const TODAY = 22, MONTH = 11
export const isPaid = (r) => r.paidMonth === MONTH
export const dueIn = (r) => r.day - TODAY // < 0 late
export function markPaid(r) { const before = r.paidMonth; r.paidMonth = MONTH; return () => { r.paidMonth = before } }
let recId = 100
export function saveRecurring(r, v) {
  if (r) { Object.assign(r, v); return r }
  RECURRING.push({ id: ++recId, paidMonth: MONTH - 1, ...v })
  return RECURRING[RECURRING.length - 1]
}
export function removeRecurring(r) { const i = RECURRING.indexOf(r); RECURRING.splice(i, 1); return () => RECURRING.splice(i, 0, r) }
