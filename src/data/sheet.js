// Sale-sheet actions on the shared store. Credit sales move the trader's balance; removing a line moves it back.
// Approving locks the manifest, numbers its purchase invoice and credits the farm; reopening needs a reason and is logged,
// and so is every line changed on a reopened manifest.
import { MANIFESTS, TRADERS, SUPPLIERS, CASHBOOK, KG_PER_BOX, CASH_CUSTOMER, USER, fmt } from './demo.js'
import { creditManifest, shareUrl } from './suppliers.js'
import { addMove, removeMove } from './safe.js'
import { markChange } from './sync.js'
import { log } from './audit.js'

let lineId = 1000
let invoiceSeq = 2205
// manifests approved before the sheet opened get their invoice numbers in arrival order
MANIFESTS.filter((m) => m.status === 'approved').forEach((m) => { m.invoiceNo = ++invoiceSeq; m.approvedBy = USER.name })

export const findManifest = (id) => MANIFESTS.find((m) => m.id === Number(id))
export const lineTotal = (l) => l.boxes * KG_PER_BOX * l.price
export const netOf = (m) => m.gross - m.commission
const supplierOf = (m) => SUPPLIERS.find((s) => s.name === m.supplier)
const linkOf = (m) => { const s = supplierOf(m); return s ? `/suppliers/${s.id}` : null }

export function addLine(m, { trader, grade, boxes, price, pay }) {
  const line = { id: ++lineId, trader, grade, boxes, price, pay: trader === CASH_CUSTOMER ? 'cash' : pay }
  m.lines.unshift(line)
  markChange()
  if (line.pay === 'credit') { const t = TRADERS.find((x) => x.name === trader); if (t) t.due += lineTotal(line) }
  if (m.reopened) log('edit', `سطر جديد ببيان ${m.supplier}`, `${trader} · ${boxes} بوكس ${grade} · ${fmt(lineTotal(line))} ج`, linkOf(m))
  return line
}

export function removeLine(m, id) {
  const i = m.lines.findIndex((l) => l.id === id)
  if (i < 0) return null
  const [line] = m.lines.splice(i, 1)
  markChange()
  if (line.pay === 'credit') { const t = TRADERS.find((x) => x.name === line.trader); if (t) t.due -= lineTotal(line) }
  if (m.reopened) log('edit', `حذف سطر من بيان ${m.supplier}`, `${line.trader} · ${line.boxes} بوكس ${line.grade} · ${fmt(lineTotal(line))} ج`, linkOf(m))
  return line
}

export function restoreLine(m, line) {
  m.lines.unshift(line)
  markChange()
  if (line.pay === 'credit') { const t = TRADERS.find((x) => x.name === line.trader); if (t) t.due += lineTotal(line) }
  if (m.reopened) log('edit', `رجّع سطر لبيان ${m.supplier}`, `${line.trader} · ${line.boxes} بوكس ${line.grade}`, linkOf(m))
}

const clock = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

/* العشا of a manifest is an expense under the «العشا» category, paid from the drawer */
function recordAsha(m, amount) {
  m.asha = amount
  if (!amount) return
  addMove({ dir: 'out', src: 'expense', party: `عشا بيان ${m.supplier}`, method: 'cash', amount, note: 'من اعتماد البيان' })
  m.ashaEntry = CASHBOOK.entries[CASHBOOK.entries.length - 1]
  m.ashaEntry.cat = 'asha'
}
function dropAsha(m) {
  const e = m.ashaEntry || CASHBOOK.entries.find((x) => x.cat === 'asha' && x.party === `عشا بيان ${m.supplier}`)
  if (e) removeMove(e)
  m.ashaEntry = null
}

/* approve: lock, number the invoice (kept on re-approval), credit the farm, record العشا as an expense */
export function approve(m, asha) {
  const again = !!m.reopened
  recordAsha(m, asha)
  m.status = 'approved'
  m.invoiceNo = m.invoiceNo || ++invoiceSeq
  m.approvedBy = USER.name
  m.approvedAt = clock()
  if (!again) m.time = m.time || m.approvedAt
  m.creditedNet = netOf(m)
  creditManifest(m) // the farm is now owed the manifest's net
  log('approve', again ? `اعتماد بيان ${m.supplier} بعد التعديل` : `اعتماد بيان ${m.supplier}`,
    again ? `فاتورة ${m.invoiceNo} · الصافي كان ${fmt(m.reopened.net)} وصار ${fmt(netOf(m))} ج` : `فاتورة ${m.invoiceNo} · صافي ${fmt(netOf(m))} ج`, linkOf(m))
  m.reopened = null
  return m
}

/* reopen an approved manifest for a correction: its net comes off the farm's account until it is approved again */
export const canReopen = (m) => m.status === 'approved' && m.grades.length > 0
export function reopen(m, reason) {
  if (!canReopen(m)) return
  const s = supplierOf(m)
  if (s) s.balance -= m.creditedNet ?? netOf(m)
  dropAsha(m) // re-entered on the next approval
  m.status = 'draft'
  m.reopened = { reason, by: USER.name, at: clock(), net: netOf(m) }
  log('reopen', `فتح بيان ${m.supplier} للتعديل`, `فاتورة ${m.invoiceNo} · السبب: ${reason}`, linkOf(m))
}

/* the invoice by grade: boxes, kg, average price, total */
export function invoiceRows(m) {
  const by = new Map()
  m.lines.forEach((l) => {
    const r = by.get(l.grade) || { grade: l.grade, boxes: 0, total: 0 }
    r.boxes += l.boxes; r.total += lineTotal(l)
    by.set(l.grade, r)
  })
  return [...by.values()].map((r) => ({ ...r, kg: r.boxes * KG_PER_BOX, price: r.total / (r.boxes * KG_PER_BOX) }))
}
export function invoiceText(m) {
  const rows = invoiceRows(m).map((r) => `• ${r.grade}: ${r.boxes} بوكس (${fmt(r.kg)} ك) = ${fmt(r.total)} ج`).join('\n')
  const s = supplierOf(m)
  return `السلام عليكم ${m.supplier}\nفاتورة شرا رقم ${m.invoiceNo} · بيان وصل ${m.time}\n${rows ? rows + '\n' : ''}إجمالي البيع: ${fmt(m.gross)} ج\nالعمولة ${m.rate}%: ${fmt(m.commission)} ج\nالصافي إلك: ${fmt(netOf(m))} ج${s ? `\n\nكشف حسابك وفواتيرك:\n${shareUrl(s)}` : ''}`
}
export function whatsappInvoice(m) {
  const s = supplierOf(m)
  const phone = s ? s.phone.replace(/\D/g, '').replace(/^0/, '20') : ''
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(invoiceText(m))}`, '_blank', 'noopener')
}
