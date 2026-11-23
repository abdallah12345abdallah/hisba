<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import AppIcon from '../AppIcon.vue'
import { ROLES, checkStaff, addStaff, updateStaff, canDelete, removeStaff } from '../../data/staff.js'
import { fmt } from '../../data/demo.js'
import { toast } from '../../composables/useToast.js'

// Add an employee (person = null) or edit one: name, job, monthly salary or day wage, phone.
// Delete only when he has no advance and no unpaid days.
const props = defineProps({ person: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved', 'deleted'])

const editing = computed(() => !!props.person)
const f = reactive({ name: '', role: 'porter', pay: 'day', rate: '', phone: '' })
const errors = ref({})
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const p = props.person
  Object.assign(f, p ? { name: p.name, role: p.role, pay: p.pay, rate: String(p.rate), phone: p.phone } : { name: '', role: 'porter', pay: 'day', rate: '250', phone: '' })
  errors.value = {}; tried.value = false
})
watch(f, () => { if (tried.value) errors.value = checkStaff(f, props.person).errors })
// picking a job suggests how he's usually paid
function pickRole(r) {
  f.role = r
  if (editing.value) return
  const day = ['porter', 'driver'].includes(r)
  f.pay = day ? 'day' : 'month'
  f.rate = String({ porter: 250, driver: 300, clerk: 7000, collector: 6000, guard: 4000, owner: 15000, partner: 12000 }[r])
}

function save() {
  tried.value = true
  const { errors: e, value } = checkStaff(f, props.person)
  errors.value = e
  if (Object.keys(e).length) return
  const p = editing.value ? updateStaff(props.person, value) : addStaff(value)
  toast(editing.value ? 'انحفظ التعديل' : 'انضاف الموظف', `${p.name} · ${p.pay === 'day' ? `يومية ${fmt(p.rate)}` : `راتب ${fmt(p.rate)}`} ج`)
  emit('saved', p)
  open.value = false
}

const askDelete = ref(false)
const deletable = computed(() => props.person && canDelete(props.person))
function doDelete() {
  const p = props.person
  const undo = removeStaff(p)
  open.value = false
  toast('انحذف الموظف', p.name, { tone: 'info', action: { label: 'تراجع', run: undo } })
  emit('deleted', p)
}
</script>

<template>
  <AppModal v-model="open" :title="editing ? `تعديل ${person.name}` : 'موظف جديد'" :width="480">
    <form class="form" novalidate @submit.prevent="save">
      <FilledInput v-model="f.name" label="الاسم" placeholder="مثلاً: رمضان علي" :error="errors.name" />
      <div>
        <span class="lbl">الشغلة</span>
        <div class="roles" role="radiogroup" aria-label="الشغلة">
          <button v-for="r in ROLES" :key="r.key" type="button" role="radio" :aria-checked="f.role === r.key" :class="{ on: f.role === r.key }" @click="pickRole(r.key)"><AppIcon :name="r.icon" />{{ r.label }}</button>
        </div>
      </div>
      <div class="paytype" role="radiogroup" aria-label="طريقة الدفع">
        <button type="button" role="radio" :aria-checked="f.pay === 'month'" :class="{ on: f.pay === 'month' }" @click="f.pay = 'month'"><b>راتب شهري</b><small>بيقبض آخر الشهر</small></button>
        <button type="button" role="radio" :aria-checked="f.pay === 'day'" :class="{ on: f.pay === 'day' }" @click="f.pay = 'day'"><b>يومية</b><small>بيقبض حسب أيام حضوره</small></button>
      </div>
      <div class="two">
        <FilledInput v-model="f.rate" :label="f.pay === 'day' ? 'اليومية (ج)' : 'الراتب الشهري (ج)'" inputmode="numeric" dir="ltr" :error="errors.rate" />
        <FilledInput v-model="f.phone" label="رقم التلفون" placeholder="01xx xxx xxxx" type="tel" dir="ltr" :error="errors.phone" />
      </div>
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts">
        <SoftButton v-if="editing" tone="danger" icon="trash" :disabled="!deletable" :title="deletable ? '' : 'ما بينفع تحذفه وعليه سلفة أو إله يوميات'" class="del" @click="askDelete = true">حذف</SoftButton>
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" @click="save">{{ editing ? 'احفظ التعديل' : 'ضيف الموظف' }}</SoftButton>
      </div>
    </template>
  </AppModal>
  <ConfirmDialog v-model="askDelete" :title="person ? `تحذف ${person.name}؟` : ''" confirm="احذف الموظف" text="ما عليه سلفة وما إله يوميات. كشفه القديم بيضل بالخزنة." @confirm="doDelete" />
</template>

<style scoped>
.form { display: grid; gap: 14px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.roles { display: flex; flex-wrap: wrap; gap: 6px; }
.roles button { display: inline-flex; align-items: center; gap: 6px; border: 0; height: 34px; padding: 0 12px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; color: var(--color-ink); }
.roles button :deep(svg) { width: 15px; height: 15px; color: var(--color-primary); }
.roles button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.paytype { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.paytype button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 12px; display: grid; gap: 2px; text-align: center; font: inherit; cursor: pointer; }
.paytype b { font-size: 14px; } .paytype small { font-size: 11.5px; color: var(--color-muted); }
.paytype button.on { border-color: var(--color-primary); background: #f0f9fb; } .paytype button.on b { color: var(--color-primary-ink); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
.acts .del { margin-inline-end: auto; }
@media (max-width: 480px) { .two, .paytype { grid-template-columns: 1fr; } }
</style>
