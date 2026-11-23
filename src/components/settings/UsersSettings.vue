<script setup>
import { ref, computed } from 'vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import UserForm from './UserForm.vue'
import { USERS, ROLES, PERMS, roleOf, me, canToggle, toggleUser, setRolePerms } from '../../data/auth.js'
import { toast } from '../../composables/useToast.js'

// Who can sign in, and what each role may open or do. The owner role always has everything; nobody can lock themselves out.
const formOpen = ref(false)
const editFor = ref(null)
function addNew() { editFor.value = null; formOpen.value = true }
function edit(u) { editFor.value = u; formOpen.value = true }
function flip(u) { toggleUser(u); toast(u.active ? `${u.name} رجع بيقدر يدخل` : `${u.name} ما عاد بيقدر يدخل`, '', { tone: 'info' }) }
const initial = (n) => n.replace(/^(الحاج|م\.|د\.)\s+/, '').trim()[0]

/* the permissions table, edited as a draft */
const snap = () => Object.fromEntries(ROLES.map((r) => [r.key, [...r.perms]]))
const draft = ref(snap())
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(snap()))
const groups = computed(() => [...new Set(PERMS.map((p) => p.group))].map((g) => ({ g, items: PERMS.filter((p) => p.group === g) })))
function toggle(role, key) {
  if (roleOf(role).fixed) return
  const a = draft.value[role]
  const i = a.indexOf(key)
  if (i >= 0) a.splice(i, 1); else a.push(key)
}
function save() {
  ROLES.filter((r) => !r.fixed).forEach((r) => { if (JSON.stringify([...r.perms].sort()) !== JSON.stringify([...draft.value[r.key]].sort())) setRolePerms(r.key, draft.value[r.key]) })
  draft.value = snap()
  toast('انحفظت الصلاحيات', 'بتنطبق من أول صفحة بيفتحوها')
}
const reset = () => { draft.value = snap() }
</script>

<template>
  <div class="wrap">
    <section class="card">
      <div class="ch"><h2>المستخدمين</h2><SoftButton icon="plus" tone="primary" size="sm" @click="addNew">مستخدم جديد</SoftButton></div>
      <ul class="ul">
        <li v-for="u in USERS" :key="u.id" :class="{ off: !u.active }">
          <span class="av">{{ initial(u.name) }}<i><AppIcon :name="roleOf(u.role).icon" /></i></span>
          <span class="t"><b>{{ u.name }}<em v-if="me && me.id === u.id">إنت</em></b><small class="num">{{ roleOf(u.role).label }} · {{ u.phone }} · آخر دخول {{ u.lastSeen }}</small></span>
          <button type="button" class="act" :class="{ on: u.active }" role="switch" :aria-checked="u.active" :disabled="!canToggle(u)" :title="canToggle(u) ? (u.active ? 'وقّف دخوله' : 'رجّع دخوله') : (me && me.id === u.id ? 'ما بتقدر توقّف حالك' : 'لازم يضل صاحب حلقة فعّال')" @click="flip(u)"><i />{{ u.active ? 'فعّال' : 'موقوف' }}</button>
          <button type="button" class="iconbtn" :aria-label="`تعديل ${u.name}`" title="تعديل المستخدم" @click="edit(u)"><AppIcon name="edit" /></button>
        </li>
      </ul>
    </section>

    <section class="card">
      <div class="ch"><h2>صلاحيات كل دور</h2><span class="meta">صاحب الحلقة إله كل شي دايماً</span></div>
      <div class="mx-wrap">
        <table class="mx">
          <thead><tr><th />
            <th v-for="r in ROLES" :key="r.key"><span class="rh"><AppIcon :name="r.icon" />{{ r.label }}</span></th></tr></thead>
          <tbody>
            <template v-for="g in groups" :key="g.g">
              <tr class="gr"><td :colspan="ROLES.length + 1">{{ g.g }}</td></tr>
              <tr v-for="p in g.items" :key="p.key">
                <td class="pl">{{ p.label }}</td>
                <td v-for="r in ROLES" :key="r.key" class="cell">
                  <button type="button" class="ck" :class="{ on: draft[r.key].includes(p.key), fixed: r.fixed }" :disabled="r.fixed" role="checkbox" :aria-checked="draft[r.key].includes(p.key)" :aria-label="`${p.label} لـ${r.label}`" @click="toggle(r.key, p.key)">
                    <AppIcon v-if="draft[r.key].includes(p.key)" name="check" />
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <SaveBar :dirty="dirty" @save="save" @reset="reset" />
    </section>

    <UserForm v-model="formOpen" :user="editFor" />
  </div>
</template>

<style scoped>
.wrap { display: grid; gap: 16px; }
.ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.ul li { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; background: #f6f9f9; border-radius: 14px; padding: 8px 12px; transition: opacity .2s; }
.ul li.off { opacity: .6; }
.av { position: relative; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--color-primary-pale); color: var(--color-primary-ink); font-weight: 700; font-size: 17px; }
.av i { position: absolute; bottom: -2px; inset-inline-start: -4px; width: 20px; height: 20px; border-radius: 50%; background: #fff; color: #b07a12; display: grid; place-items: center; } .av i :deep(svg) { width: 12px; height: 12px; }
.t { display: grid; min-width: 0; } .t b { font-size: 14px; display: flex; align-items: center; gap: 6px; } .t small { color: var(--color-muted); font-size: 11.5px; }
.t em { font-style: normal; font-size: 10.5px; background: var(--color-primary); color: #fff; border-radius: 999px; padding: 0 7px; }
.iconbtn { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #fff; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); } .iconbtn :deep(svg) { width: 16px; height: 16px; }
.mx-wrap { overflow-x: auto; }
.mx { width: 100%; min-width: 560px; border-collapse: separate; border-spacing: 0 3px; font-size: 13px; }
.mx th { font-weight: 600; font-size: 12px; color: var(--color-deep); padding: 6px; }
.rh { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; } .rh :deep(svg) { width: 18px; height: 18px; color: var(--color-primary); }
.gr td { padding: 10px 8px 4px; font-size: 11.5px; font-weight: 700; color: var(--color-muted); }
.pl { padding: 6px 10px; background: #f6f9f9; border-start-start-radius: 10px; border-end-start-radius: 10px; white-space: nowrap; }
.cell { text-align: center; background: #f6f9f9; padding: 4px; } .cell:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.ck { width: 28px; height: 28px; border: 0; border-radius: 8px; background: #fff; box-shadow: inset 0 0 0 1.5px #cfdcdd; color: #fff; display: inline-grid; place-items: center; cursor: pointer; transition: background .15s, box-shadow .15s, transform .1s; }
.ck:hover:not(:disabled) { box-shadow: inset 0 0 0 1.5px var(--color-primary); } .ck:active:not(:disabled) { transform: scale(.9); }
.ck.on { background: var(--color-primary); box-shadow: none; } .ck.fixed { background: #9fc6cf; cursor: default; } .ck.fixed:not(.on) { background: #fff; }
.ck :deep(svg) { width: 16px; height: 16px; stroke-width: 3; }
.act { display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 6px; border: 0; border-radius: 999px; background: #e9efef; color: var(--color-muted); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .2s, color .2s; }
.act i { width: 34px; height: 20px; border-radius: 999px; background: #c9d6d7; position: relative; transition: background .2s; order: 2; }
.act i::after { content: ""; position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; }
.act.on { background: var(--pos-bg); color: var(--color-positive); } .act.on i { background: var(--color-positive); } .act.on i::after { transform: translateX(-14px); }
.act:disabled { cursor: not-allowed; opacity: .55; }
@media (max-width: 560px) { .ul li { grid-template-columns: 44px minmax(0, 1fr) auto; } .act { grid-column: 2; justify-self: start; } }
</style>
