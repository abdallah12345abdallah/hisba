// The change log: who did what and when, for everything that touches money after the fact —
// approving and reopening manifests, lines changed on a reopened manifest, price changes, deleted safe moves.
import { reactive } from 'vue'
import { USER } from './demo.js'

export const KINDS = {
  approve: { label: 'اعتماد', icon: 'check', tone: 'ok' },
  reopen: { label: 'فتح للتعديل', icon: 'lock', tone: 'warn' },
  edit: { label: 'تعديل سطر', icon: 'edit', tone: 'warn' },
  delete: { label: 'حذف', icon: 'trash', tone: 'bad' },
  price: { label: 'أسعار', icon: 'cash', tone: 'info' },
  settings: { label: 'إعدادات', icon: 'gear', tone: 'info' },
}
const pad = (n) => String(n).padStart(2, '0')
const now = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
let id = 500

export const AUDIT = reactive([
  { id: 8, day: 'اليوم', time: '07:50', user: 'أحمد', kind: 'approve', title: 'اعتماد بيان مزرعة النجار', detail: 'فاتورة 2208 · صافي 32,592 ج', link: '/suppliers/3' },
  { id: 1, day: 'اليوم', time: '07:05', user: 'أحمد', kind: 'approve', title: 'اعتماد بيان مزرعة أبو خليل', detail: 'فاتورة 2207 · صافي 44,928 ج', link: '/suppliers/2' },
  { id: 2, day: 'اليوم', time: '06:40', user: 'أحمد', kind: 'approve', title: 'اعتماد بيان مزرعة الحاج سامر', detail: 'فاتورة 2206 · صافي 66,500 ج', link: '/suppliers/1' },
  { id: 3, day: 'اليوم', time: '05:40', user: 'أحمد', kind: 'price', title: 'أسعار اليوم', detail: 'بلطي 1: 31 ← 32 · بوري: 44 ← 45', link: null },
  { id: 4, day: 'امبارح', time: '13:20', user: 'الحاج محمود', kind: 'reopen', title: 'فتح بيان مزرعة النجار للتعديل', detail: 'السبب: التاجر رجّع 3 بوكس بلطي 2', link: '/suppliers/3' },
  { id: 5, day: 'امبارح', time: '13:24', user: 'أحمد', kind: 'edit', title: 'حذف سطر من بيان مزرعة النجار', detail: 'سوبر ماركت الأمانة · 3 بوكس بلطي 2 · 2,100 ج', link: '/suppliers/3' },
  { id: 6, day: 'امبارح', time: '13:26', user: 'أحمد', kind: 'approve', title: 'اعتماد بيان مزرعة النجار بعد التعديل', detail: 'فاتورة 2203 · الصافي كان 33,690 وصار 31,653 ج', link: '/suppliers/3' },
  { id: 7, day: 'امبارح', time: '16:02', user: 'أحمد', kind: 'delete', title: 'حذف حركة خزنة', detail: 'مصروف · شاي وقهوة · 120 ج من الدرج', link: '/safe' },
])

export function log(kind, title, detail = '', link = null) {
  AUDIT.unshift({ id: ++id, day: 'اليوم', time: now(), user: USER.name, kind, title, detail, link })
}
