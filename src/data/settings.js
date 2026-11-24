// Settings: the agency profile, fish grades, defaults for new farms and traders, expense categories, the profit split.
// Every change here is logged. Grades and categories in use can be renamed but not deleted.
import { reactive } from 'vue'
import { AGENCY, PRICES, MANIFESTS } from './demo.js'
import { CATS, RECURRING, allExpenses } from './expenses.js'
import { SPLIT } from './investors.js'
import { log } from './audit.js'

/* defaults for new records */
export const SETTINGS = reactive({ defaultRate: 4, rates: [3, 4, 5], defaultLimit: 20000 })

/* ---------- agency ---------- */
export function saveAgency(v) {
  const changed = ['name', 'place', 'phone', 'note'].filter((k) => AGENCY[k] !== v[k]).length + (AGENCY.logo !== v.logo ? 1 : 0)
  Object.assign(AGENCY, v)
  if (changed) log('settings', 'بيانات الوكالة', `${AGENCY.name} · ${AGENCY.place}`, '/settings')
  return changed
}

/* ---------- fish grades (name + today's price, in sheet order) ---------- */
export const gradeInUse = (g) => MANIFESTS.some((m) => m.grades.some((x) => x.grade === g) || m.lines.some((l) => l.grade === g))
export function checkGrades(rows) {
  const errors = {}
  const seen = new Set()
  rows.forEach((r, i) => {
    const n = String(r.name ?? '').trim()
    if (!n) errors[i] = 'اكتب اسم الصنف'
    else if (seen.has(n)) errors[i] = 'الاسم مكرر'
    else if (!(Number(r.price) > 0)) errors[i] = 'اكتب السعر'
    seen.add(n)
  })
  return errors
}
/* rows: [{ name, price, was }] where was = the old name (null for a new grade) */
export function saveGrades(rows) {
  const out = []
  rows.forEach((r) => {
    const name = r.name.trim()
    if (r.was && r.was !== name) {
      MANIFESTS.forEach((m) => { m.grades.forEach((x) => { if (x.grade === r.was) x.grade = name }); m.lines.forEach((l) => { if (l.grade === r.was) l.grade = name }) })
      out.push(`${r.was} ← ${name}`)
    }
    if (!r.was) out.push(`صنف جديد: ${name}`)
  })
  const removed = PRICES.map((p) => p[0]).filter((g) => !rows.some((r) => r.was === g))
  removed.forEach((g) => out.push(`انحذف: ${g}`))
  PRICES.splice(0, PRICES.length, ...rows.map((r) => [r.name.trim(), Number(r.price)]))
  if (out.length) log('settings', 'أصناف السمك', out.join(' · '), '/settings')
  return out.length
}

/* ---------- defaults for farms and traders ---------- */
export function saveDefaults(v) {
  const before = `${SETTINGS.defaultRate}% · ${SETTINGS.rates.join('/')} · ${SETTINGS.defaultLimit}`
  Object.assign(SETTINGS, v)
  const after = `${SETTINGS.defaultRate}% · ${SETTINGS.rates.join('/')} · ${SETTINGS.defaultLimit}`
  if (before !== after) log('settings', 'افتراضيات الموردين والتجار', `عمولة ${v.defaultRate}% · اختيارات ${v.rates.join('، ')}% · حد التاجر ${v.defaultLimit.toLocaleString('en-US')} ج`, '/settings')
}

/* ---------- expense categories ---------- */
export const ICON_CHOICES = ['asha', 'ice', 'fuel', 'box', 'wrench', 'bolt', 'building', 'coffee', 'doc', 'truck', 'phone', 'cash', 'staff', 'dots']
export const catInUse = (key) => allExpenses().some((e) => e.cat === key) || RECURRING.some((r) => r.cat === key)
export function saveCats(rows) {
  const out = []
  rows.forEach((r) => {
    const c = CATS.find((x) => x.key === r.key)
    const words = String(r.words ?? '').split(/[،,]/).map((w) => w.trim()).filter(Boolean)
    if (c) {
      if (c.label !== r.label.trim()) out.push(`${c.label} ← ${r.label.trim()}`)
      Object.assign(c, { label: r.label.trim(), icon: r.icon, budget: Number(r.budget) || 0, words })
    } else {
      CATS.splice(CATS.length - 1, 0, { key: r.key, label: r.label.trim(), icon: r.icon, budget: Number(r.budget) || 0, words })
      out.push(`بند جديد: ${r.label.trim()}`)
    }
  })
  CATS.filter((c) => !rows.some((r) => r.key === c.key)).forEach((c) => { CATS.splice(CATS.indexOf(c), 1); out.push(`انحذف: ${c.label}`) })
  log('settings', 'بنود المصاريف', out.length ? out.join(' · ') : 'تعديل ميزانيات وكلمات', '/settings')
}

/* ---------- profit split ---------- */
const partnersText = (rows) => rows.map((p) => `${p.name} ${p.pct}%`).join('، ')
export function saveSplit({ mgmt, partners }) {
  const clean = partners.map((p) => ({ name: String(p.name).trim(), pct: Number(p.pct) }))
  const before = partnersText(SPLIT.partners), after = partnersText(clean)
  const changed = SPLIT.mgmt !== mgmt || before !== after
  if (changed) log('settings', 'توزيع الأرباح', `الإدارة ${SPLIT.mgmt}% ← ${mgmt}% · شركاء الإدارة: ${after}`, '/settings')
  SPLIT.mgmt = mgmt
  SPLIT.partners.splice(0, SPLIT.partners.length, ...clean)
  return changed
}
