// The safe: every movement of money across the three wallets, manual entries, transfers, and closing the day.
import { CASHBOOK, WALLETS, walletBalance, sheetCashMoves } from './demo.js'
import { markChange } from './sync.js'

export const SOURCES = {
  sale: { label: 'بيع نقدي', icon: 'sheet' },
  collect: { label: 'قبض من تاجر', icon: 'traders' },
  feed: { label: 'تسوية علف', icon: 'feed' },
  income: { label: 'إيراد تاني', icon: 'in' },
  supplier: { label: 'دفعة لمورد', icon: 'farm' },
  advance: { label: 'سلفة لمورد', icon: 'farm' },
  expense: { label: 'مصروف', icon: 'receipt' },
  salary: { label: 'رواتب وسلف موظفين', icon: 'staff' },
  withdraw: { label: 'سحب للبيت', icon: 'out' },
  capital: { label: 'رأس مال مساهم', icon: 'share' },
  capitalOut: { label: 'سحب رأس مال', icon: 'share' },
  profit: { label: 'أرباح مساهمين', icon: 'share' },
  move: { label: 'تحويل بين المحافظ', icon: 'safe' },
}
export const walletLabel = (k) => WALLETS.find((w) => w.key === k)?.label || k
export const methodOf = (how = '') => (how.includes('فودافون') ? 'vodafone' : how.includes('بنك') ? 'bank' : 'cash')
const pad = (n) => String(n).padStart(2, '0')
export const nowTime = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
let seq = 9000

/* every movement today, newest first (sheet cash sales included) */
export const allMoves = () => [...CASHBOOK.entries, ...sheetCashMoves()].sort((a, b) => b.time.localeCompare(a.time) || String(b.id).localeCompare(String(a.id)))
export const todayIn = () => allMoves().filter((e) => e.dir === 'in').reduce((a, e) => a + e.amount, 0)
export const todayOut = () => allMoves().filter((e) => e.dir === 'out').reduce((a, e) => a + e.amount, 0)
export const balances = () => Object.fromEntries(WALLETS.map((w) => [w.key, walletBalance(w.key)]))

/* add a movement; returns undo */
export function addMove({ dir, src, party, method = 'cash', amount, note = '', to, manual = false }) {
  const e = { id: ++seq, time: nowTime(), dir, src, party, method, amount, note, manual }
  if (dir === 'move') e.to = to
  CASHBOOK.entries.push(e)
  markChange()
  return () => removeMove(e)
}
export function removeMove(e) {
  const i = CASHBOOK.entries.indexOf(e)
  if (i < 0) return () => {}
  CASHBOOK.entries.splice(i, 1)
  return () => CASHBOOK.entries.splice(i, 0, e)
}

/* close the day: what the drawer should hold vs. what was counted */
export function closeDay({ counted, note, by }) {
  const expected = walletBalance('cash')
  const rec = { date: '22/11/2026', time: nowTime(), expected, counted, diff: counted - expected, inSum: todayIn(), outSum: todayOut(), by, note }
  CASHBOOK.closes.unshift(rec)
  CASHBOOK.closedAt = rec.time
  return rec
}
export function reopenDay() {
  if (!CASHBOOK.closedAt) return
  CASHBOOK.closes.shift()
  CASHBOOK.closedAt = null
}
// Egyptian notes and coins, for counting the drawer
export const DENOMS = [200, 100, 50, 20, 10, 5, 1, 0.5]
