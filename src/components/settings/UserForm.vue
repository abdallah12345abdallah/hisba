<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import AppIcon from '../AppIcon.vue'
import { ROLES, checkUser, addUser, updateUser } from '../../data/auth.js'
import { toast } from '../../composables/useToast.js'

// Add a user (with a PIN) or edit one: name, phone, role; the PIN changes only if a new one is typed.
const props = defineProps({ user: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const editing = computed(() => !!props.user)
const f = reactive({ name: '', phone: '', role: 'clerk', pin: '' })
const errors = ref({})
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const u = props.user
  Object.assign(f, u ? { name: u.name, phone: u.phone, role: u.role, pin: '' } : { name: '', phone: '', role: 'clerk', pin: '' })
  errors.value = {}; tried.value = false
})
watch(f, () => { if (tried.value) errors.value = checkUser(f, props.user).errors })
function randomPin() { f.pin = String(Math.floor(1000 + Math.random() * 9000)) }
function save() {
  tried.value = true
  const r = checkUser(f, props.user)
  errors.value = r.errors
  if (Object.keys(r.errors).length) return
  const u = editing.value ? updateUser(props.user, r.value) : addUser(r.value)
  toast(editing.value ? 'انحفظ المستخدم' : 'انضاف المستخدم', r.value.pin ? `${u.name} · رقمه السري ${r.value.pin}، قلّه ياه` : u.name)
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" :title="editing ? `تعديل ${user.name}` : 'مستخدم جديد'" :text="editing ? '' : 'بيدخل باسمه ورقم سري من 4 أرقام.'" :width="480">
    <form class="form" novalidate @submit.prevent="save">
      <div class="two">
        <FilledInput v-model="f.name" label="الاسم" :error="errors.name" />
        <FilledInput v-model="f.phone" label="رقم التلفون" type="tel" dir="ltr" placeholder="01xx xxx xxxx" :error="errors.phone" />
      </div>
      <div>
        <span class="lbl">الدور</span>
        <div class="roles" role="radiogroup" aria-label="الدور">
          <button v-for="r in ROLES" :key="r.key" type="button" role="radio" :aria-checked="f.role === r.key" :class="{ on: f.role === r.key }" @click="f.role = r.key">
            <AppIcon :name="r.icon" /><b>{{ r.label }}</b><small class="num">{{ r.perms.length }} صلاحيات</small>
          </button>
        </div>
        <small v-if="errors.role" class="e">{{ errors.role }}</small>
      </div>
      <div class="pinrow">
        <FilledInput v-model="f.pin" :label="editing ? 'رقم سري جديد (اتركه فاضي ليضل متل ما هو)' : 'الرقم السري'" inputmode="numeric" dir="ltr" maxlength="4" :error="errors.pin" />
        <SoftButton type="button" icon="repeat" @click="randomPin">رقم عشوائي</SoftButton>
      </div>
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">{{ editing ? 'احفظ' : 'ضيف المستخدم' }}</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: grid; gap: 14px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.roles button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 12px; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 8px; text-align: right; font: inherit; cursor: pointer; }
.roles button :deep(svg) { grid-row: span 2; width: 20px; height: 20px; color: var(--color-primary); align-self: center; }
.roles b { font-size: 13.5px; } .roles small { font-size: 11px; color: var(--color-muted); }
.roles button.on { border-color: var(--color-primary); background: #f0f9fb; } .roles button.on b { color: var(--color-primary-ink); }
.e { color: var(--color-negative); font-size: 12px; }
.pinrow { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
.pinrow :deep(.sbt) { height: 46px; margin-bottom: 1px; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 480px) { .two, .roles { grid-template-columns: 1fr; } }
</style>
