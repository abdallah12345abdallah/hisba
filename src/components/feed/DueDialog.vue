<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { TODAY_DATE } from '../../data/demo.js'
import { setDue } from '../../data/feed.js'
import { toast } from '../../composables/useToast.js'

// Move a feed account's settlement date: quick picks (a month or more later / earlier) or any date.
const props = defineProps({ account: Object })
const open = defineModel({ type: Boolean, default: false })
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const parse = (due) => { const [d, m, y] = due.split('/').map(Number); return new Date(y, m - 1, d) }
const fmtDue = (dt) => `${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`
const toInput = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
const picked = ref('')
watch(open, (v) => { if (v && props.account) picked.value = toInput(parse(props.account.due)) })
const pickedDate = computed(() => { const [y, m, d] = picked.value.split('-').map(Number); return y ? new Date(y, m - 1, d) : null })
const days = computed(() => (pickedDate.value ? Math.round((pickedDate.value - TODAY_DATE) / 864e5) : 0))
const QUICK = computed(() => {
  if (!props.account) return []
  const base = parse(props.account.due)
  return [-1, 1, 2, 3].map((k) => { const dt = new Date(base); dt.setMonth(dt.getMonth() + k); return { k, dt, label: k < 0 ? 'أبكر بشهر' : `تأجيل ${k === 1 ? 'شهر' : k === 2 ? 'شهرين' : '3 شهور'}` } })
})
function save() {
  if (!pickedDate.value) return
  const undo = setDue(props.account, fmtDue(pickedDate.value))
  open.value = false
  toast('اتغيّر موعد التسوية', `${props.account.name} · ${props.account.due}`, { action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" title="موعد التسوية" :text="account ? `${account.name} · الموعد هلأ ${account.due}` : ''" :width="420">
    <div class="quick">
      <button v-for="q in QUICK" :key="q.k" type="button" :class="{ on: picked === toInput(q.dt) }" @click="picked = toInput(q.dt)">
        <b>{{ q.label }}</b><small class="num">{{ q.dt.getDate() }} {{ MONTHS[q.dt.getMonth()] }}</small>
      </button>
    </div>
    <label class="date"><span>أو اختار تاريخ</span><input v-model="picked" type="date" dir="ltr" /></label>
    <p v-if="pickedDate" class="res num" :class="{ late: days < 0 }">{{ days >= 0 ? `التسوية بعد ${days} يوم` : `التاريخ فات من ${-days} يوم` }}</p>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" :disabled="!pickedDate" @click="save">احفظ الموعد</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.quick { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.quick button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px; display: grid; gap: 2px; justify-items: start; font: inherit; cursor: pointer; text-align: right; }
.quick b { font-size: 13px; } .quick small { color: var(--color-muted); font-size: 12px; }
.quick button:hover { border-color: #b9dbe0; }
.quick button.on { border-color: var(--color-primary); background: #f0f9fb; } .quick button.on b { color: var(--color-primary-ink); }
.date { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
.date input { height: 46px; border: 0; border-radius: 12px; background: var(--color-field); padding: 0 14px; font: inherit; font-size: 15px; }
.date input:focus { outline: 2px solid var(--color-primary); background: #fff; }
.res { margin: 0; background: #f6f9f9; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: var(--color-primary-ink); font-weight: 600; } .res.late { color: var(--color-negative); background: var(--neg-bg); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
