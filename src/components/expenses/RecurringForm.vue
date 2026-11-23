<script setup>
import { ref, watch, computed } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import AppIcon from '../AppIcon.vue'
import { CATS, saveRecurring, removeRecurring, guessCat } from '../../data/expenses.js'
import { toast } from '../../composables/useToast.js'

// A fixed monthly expense: name, category, amount, the day it falls due. Edit mode can also delete it.
const props = defineProps({ item: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const name = ref(''), cat = ref('other'), amount = ref(''), day = ref('1'), tried = ref(false)
watch(open, (v) => { if (!v) return; const r = props.item; name.value = r?.name || ''; cat.value = r?.cat || 'other'; amount.value = r ? String(r.amount) : ''; day.value = String(r?.day || 1); tried.value = false })
watch(name, (t) => { if (!props.item) cat.value = guessCat(t) })
const num = (x) => Number(String(x).replace(/[^\d]/g, '')) || 0
const err = computed(() => (tried.value ? { name: name.value.trim() ? '' : 'اكتب الاسم', amount: num(amount.value) ? '' : 'اكتب المبلغ', day: num(day.value) >= 1 && num(day.value) <= 31 ? '' : 'يوم بين 1 و 31' } : {}))
function save() {
  tried.value = true
  if (err.value.name || err.value.amount || err.value.day) return
  const r = saveRecurring(props.item, { name: name.value.trim(), cat: cat.value, amount: num(amount.value), day: num(day.value), method: props.item?.method || 'cash' })
  open.value = false
  toast(props.item ? 'انحفظ التعديل' : 'انضاف المصروف الثابت', `${r.name} · كل شهر يوم ${r.day}`)
}
const askDelete = ref(false)
function doDelete() { const r = props.item; const undo = removeRecurring(r); open.value = false; toast('انحذف المصروف الثابت', r.name, { tone: 'info', action: { label: 'تراجع', run: undo } }) }
</script>

<template>
  <AppModal v-model="open" :title="item ? `تعديل ${item.name}` : 'مصروف ثابت جديد'" text="مصروف بيتكرر كل شهر، بنذكّرك فيه قبل موعده." :width="460">
    <div class="form">
      <FilledInput v-model="name" label="الاسم" placeholder="مثلاً: إيجار المحل" :error="err.name" />
      <div class="cats" role="radiogroup" aria-label="البند">
        <button v-for="x in CATS" :key="x.key" type="button" role="radio" :aria-checked="cat === x.key" :class="{ on: cat === x.key }" @click="cat = x.key"><AppIcon :name="x.icon" /><span>{{ x.label }}</span></button>
      </div>
      <div class="two">
        <FilledInput v-model="amount" label="المبلغ (ج)" inputmode="numeric" dir="ltr" :error="err.amount" />
        <FilledInput v-model="day" label="يوم الدفع بالشهر" inputmode="numeric" dir="ltr" :error="err.day" />
      </div>
    </div>
    <template #actions>
      <div class="acts">
        <SoftButton v-if="item" tone="danger" icon="trash" class="del" @click="askDelete = true">حذف</SoftButton>
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" @click="save">{{ item ? 'احفظ' : 'ضيف' }}</SoftButton>
      </div>
    </template>
  </AppModal>
  <ConfirmDialog v-model="askDelete" :title="item ? `تحذف ${item.name}؟` : ''" confirm="احذف" text="ما رح ينحذف شي من المصاريف اللي اندفعت قبل." @confirm="doDelete" />
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.cats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cats button { border: 1.5px solid #e6eeee; background: #fff; border-radius: 11px; height: 38px; display: flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; }
.cats button :deep(svg) { width: 15px; height: 15px; } .cats button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 700; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; } .acts .del { margin-inline-end: auto; }
</style>
