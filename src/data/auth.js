// Users, roles and permissions, and the signed-in session. Sign-in is a name + a 4-digit PIN (fast on the market tablet).
// The session survives a refresh (this browser only). Every page and the sensitive actions check can().
import { reactive, computed } from 'vue'
import { USER } from './demo.js'
import { normalizePhone } from './traders.js'
import { log } from './audit.js'

/* what can be allowed, grouped for the permissions table */
export const PERMS = [
  { key: 'home', label: 'الرئيسية', group: 'الصفحات' },
  { key: 'sheet', label: 'شيت البيع', group: 'الصفحات' },
  { key: 'traders', label: 'التجار', group: 'الصفحات' },
  { key: 'suppliers', label: 'الموردين', group: 'الصفحات' },
  { key: 'feed', label: 'العلف', group: 'الصفحات' },
  { key: 'safe', label: 'الخزنة', group: 'الصفحات' },
  { key: 'expenses', label: 'المصاريف', group: 'الصفحات' },
  { key: 'staff', label: 'الموظفين', group: 'الصفحات' },
  { key: 'investors', label: 'المساهمين', group: 'الصفحات' },
  { key: 'reports', label: 'التقارير', group: 'الصفحات' },
  { key: 'audit', label: 'سجل التعديلات', group: 'الصفحات' },
  { key: 'settings', label: 'الإعدادات', group: 'الصفحات' },
  { key: 'approve', label: 'اعتماد البيان', group: 'إجراءات' },
  { key: 'reopen', label: 'فتح بيان معتمد للتعديل', group: 'إجراءات' },
  { key: 'users', label: 'إدارة المستخدمين', group: 'إجراءات' },
]
const ALL = PERMS.map((p) => p.key)
export const ROLES = reactive([
  { key: 'owner', label: 'صاحب الحلقة', icon: 'crown', perms: [...ALL], fixed: true },
  { key: 'partner', label: 'شريك', icon: 'handshake', perms: ALL.filter((k) => k !== 'users' && k !== 'settings') },
  { key: 'accountant', label: 'محاسب', icon: 'cash', perms: ['home', 'sheet', 'traders', 'suppliers', 'feed', 'safe', 'expenses', 'staff', 'reports', 'audit', 'approve'] },
  { key: 'clerk', label: 'كاتب الميزان', icon: 'scale', perms: ['sheet'] },
])
export const roleOf = (k) => ROLES.find((r) => r.key === k) || ROLES[ROLES.length - 1]

export const USERS = reactive([
  { id: 1, name: 'الحاج محمود عبد الغني', phone: '01001234567', role: 'owner', pin: '1111', active: true, lastSeen: 'امبارح 19:40' },
  { id: 2, name: 'الحاج سعيد الدسوقي', phone: '01112345678', role: 'partner', pin: '2222', active: true, lastSeen: 'من 3 أيام' },
  { id: 3, name: 'أحمد', phone: '01099001122', role: 'accountant', pin: '1234', active: true, lastSeen: 'اليوم 05:31' },
  { id: 4, name: 'مصطفى كمال', phone: '01223456789', role: 'clerk', pin: '5555', active: true, lastSeen: 'اليوم 05:52' },
])

/* ---------- session ---------- */
const KEY = 'hisba.session'
export const SESSION = reactive({ userId: null })
try { const id = Number(localStorage.getItem(KEY)); if (USERS.some((u) => u.id === id && u.active)) SESSION.userId = id } catch { /* storage blocked */ }
export const me = computed(() => USERS.find((u) => u.id === SESSION.userId) || null)
function applyMe() {
  const u = me.value
  if (u) Object.assign(USER, { name: u.name.split(' ').slice(0, 2).join(' '), role: roleOf(u.role).label })
}
applyMe()

export const can = (perm) => !!me.value && roleOf(me.value.role).perms.includes(perm)

/* wrong PINs lock the keypad for a short while */
const tries = reactive({ count: 0, until: 0 })
export const lockedFor = () => Math.max(0, Math.ceil((tries.until - Date.now()) / 1000))
export function signIn(userId, pin) {
  if (lockedFor()) return { ok: false, locked: lockedFor() }
  const u = USERS.find((x) => x.id === userId && x.active)
  if (!u || u.pin !== pin) {
    tries.count++
    if (tries.count >= 5) { tries.until = Date.now() + 30000; tries.count = 0; return { ok: false, locked: 30 } }
    return { ok: false, left: 5 - tries.count }
  }
  tries.count = 0
  SESSION.userId = u.id
  const d = new Date()
  u.lastSeen = `اليوم ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  try { localStorage.setItem(KEY, String(u.id)) } catch { /* private mode: session lasts until refresh */ }
  applyMe()
  return { ok: true, user: u }
}
export function signOut() {
  SESSION.userId = null
  try { localStorage.removeItem(KEY) } catch { /* nothing stored */ }
}
/* the first page this user may open */
const ORDER = [['home', '/'], ['sheet', '/sheet'], ['traders', '/traders'], ['suppliers', '/suppliers'], ['feed', '/feed'], ['safe', '/safe'], ['expenses', '/expenses'], ['staff', '/staff'], ['investors', '/investors'], ['reports', '/reports'], ['settings', '/settings']]
export const homeFor = () => (ORDER.find(([p]) => can(p)) || [null, '/login'])[1]

/* ---------- managing users ---------- */
const owners = () => USERS.filter((u) => u.role === 'owner' && u.active)
export function checkUser({ name, phone, role, pin }, current = null) {
  const errors = {}
  const n = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!n) errors.name = 'اكتب الاسم'
  else if (USERS.some((u) => u !== current && u.name === n)) errors.name = 'في مستخدم بنفس الاسم'
  const p = normalizePhone(phone)
  if (!String(phone ?? '').trim()) errors.phone = 'اكتب رقم التلفون'
  else if (!p) errors.phone = 'الرقم لازم يكون 11 رقم ويبلّش بـ 01'
  if (!current || pin) { if (!/^\d{4}$/.test(String(pin ?? ''))) errors.pin = 'الرقم السري 4 أرقام' }
  if (current && current.role === 'owner' && role !== 'owner' && owners().length === 1) errors.role = 'لازم يضل صاحب حلقة واحد على الأقل'
  return { errors, value: { name: n, phone: p, role, pin: String(pin ?? '') } }
}
export function addUser(v) {
  const id = Math.max(0, ...USERS.map((u) => u.id)) + 1
  USERS.push({ id, name: v.name, phone: v.phone, role: v.role, pin: v.pin, active: true, lastSeen: 'لسا ما دخل' })
  log('settings', 'مستخدم جديد', `${v.name} · ${roleOf(v.role).label}`, '/settings')
  return USERS[USERS.length - 1]
}
export function updateUser(u, v) {
  const parts = []
  if (u.role !== v.role) parts.push(`${roleOf(u.role).label} ← ${roleOf(v.role).label}`)
  if (v.pin) parts.push('غيّر الرقم السري')
  Object.assign(u, { name: v.name, phone: v.phone, role: v.role }, v.pin ? { pin: v.pin } : {})
  log('settings', `تعديل المستخدم ${u.name}`, parts.join(' · ') || 'الاسم أو التلفون', '/settings')
  if (u.id === SESSION.userId) applyMe()
  return u
}
/* who can't be switched off: yourself, and the last active owner */
export const canToggle = (u) => u.id !== SESSION.userId && !(u.role === 'owner' && u.active && owners().length === 1)
export function toggleUser(u) {
  if (!canToggle(u)) return
  u.active = !u.active
  log('settings', u.active ? `تفعيل ${u.name}` : `إيقاف ${u.name}`, u.active ? 'بيقدر يدخل' : 'ما بيقدر يدخل لحد ما ينرجع', '/settings')
}
export function setRolePerms(roleKey, perms) {
  const r = roleOf(roleKey)
  if (r.fixed) return
  const added = perms.filter((p) => !r.perms.includes(p)), removed = r.perms.filter((p) => !perms.includes(p))
  r.perms.splice(0, r.perms.length, ...perms)
  const lab = (k) => PERMS.find((p) => p.key === k)?.label
  log('settings', `صلاحيات ${r.label}`, [...added.map((k) => `+ ${lab(k)}`), ...removed.map((k) => `− ${lab(k)}`)].join(' · '), '/settings')
}
