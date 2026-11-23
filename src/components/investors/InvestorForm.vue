<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import { TERMS, checkInvestor, addInvestor, updateInvestor, canDelete, removeInvestor } from '../../data/investors.js'
import { fmt } from '../../data/demo.js'
import { toast } from '../../composables/useToast.js'

// Add a shareholder (with the capital he comes in with) or edit one: name, phone, profit terms.
// Delete only once all his capital is withdrawn.
const props = defineProps({ investor: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved', 'deleted'])
const editing = computed(() => !!props.investor)
const f = reactive({ name: '', phone: '', terms: 'full', capital: '', method: 'bank' })
const errors = ref({})
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const x = props.investor
  Object.assign(f, x ? { name: x.name, phone: x.phone, terms: x.terms, capital: '', method: 'bank' } : { name: '', phone: '', terms: 'full', capital: '', method: 'bank' })
  errors.value = {}; tried.value = false
})
watch(f, () => { if (tried.value) errors.value = checkInvestor(f, props.investor).errors })
function save() {
  tried.value = true
  const r = checkInvestor(f, props.investor)
  errors.value = r.errors
  if (Object.keys(r.errors).length) return
  const x = editing.value ? updateInvestor(props.investor, r.value) : addInvestor(r.value, r.capital, f.method)
  toast(editing.value ? 'انحفظ التعديل' : 'انضاف المساهم', editing.value ? x.name : `${x.name} · رأس مال ${fmt(r.capital)} ج`, { amount: editing.value ? undefined : r.capital })
  emit('saved', x)
  open.value = false
}
const askDelete = ref(false)
const deletable = computed(() => props.investor && canDelete(props.investor))
function doDelete() {
  const x = props.investor
  const undo = removeInvestor(x)
  open.value = false
  toast('انحذف المساهم', x.name, { tone: 'info', action: { label: 'تراجع', run: undo } })
  emit('deleted', x)
}
</script>

<template>
  <AppModal v-model="open" :title="editing ? `تعديل ${investor.name}` : 'مساهم جديد'" :width="480">
    <form class="form" novalidate @submit.prevent="save">
      <div class="two">
        <FilledInput v-model="f.name" label="الاسم" placeholder="مثلاً: د. هاني رزق" :error="errors.name" />
        <FilledInput v-model="f.phone" label="رقم التلفون" placeholder="01xx xxx xxxx" type="tel" dir="ltr" :error="errors.phone" />
      </div>
      <div>
        <span class="lbl">شروط الربح</span>
        <div class="terms" role="radiogroup" aria-label="شروط الربح">
          <button v-for="(t, k) in TERMS" :key="k" type="button" role="radio" :aria-checked="f.terms === k" :class="{ on: f.terms === k }" @click="f.terms = k"><b class="num">{{ t.label }}</b><small>{{ t.long }}</small></button>
        </div>
      </div>
      <template v-if="!editing">
        <FilledInput v-model="f.capital" label="رأس المال اللي داخل فيه (ج)" inputmode="numeric" dir="ltr" :error="errors.capital" hint="بينزل بالخزنة وبيتحسب بالتوزيع من هالشهر." />
        <div class="meth">
          <button v-for="m in [['bank', 'تحويل بنكي'], ['cash', 'نقدي'], ['vodafone', 'فودافون كاش']]" :key="m[0]" type="button" :class="{ on: f.method === m[0] }" @click="f.method = m[0]">{{ m[1] }}</button>
        </div>
      </template>
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts">
        <SoftButton v-if="editing" tone="danger" icon="trash" :disabled="!deletable" :title="deletable ? '' : 'اسحب رأس ماله كله أول'" class="del" @click="askDelete = true">حذف</SoftButton>
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" @click="save">{{ editing ? 'احفظ التعديل' : 'ضيف المساهم' }}</SoftButton>
      </div>
    </template>
  </AppModal>
  <ConfirmDialog v-model="askDelete" :title="investor ? `تحذف ${investor.name}؟` : ''" confirm="احذف المساهم" text="رأس ماله صفر. أرباحه القديمة بتضل بالخزنة." @confirm="doDelete" />
</template>

<style scoped>
.form { display: grid; gap: 14px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.terms { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.terms button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 12px; display: grid; gap: 2px; text-align: center; font: inherit; cursor: pointer; }
.terms b { font-size: 17px; } .terms small { font-size: 11.5px; color: var(--color-muted); }
.terms button.on { border-color: var(--color-primary); background: #f0f9fb; } .terms button.on b { color: var(--color-primary-ink); }
.meth { display: flex; gap: 6px; margin-top: -4px; }
.meth button { border: 0; height: 32px; padding: 0 14px; border-radius: 9px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; }
.meth button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
.acts .del { margin-inline-end: auto; }
@media (max-width: 480px) { .two, .terms { grid-template-columns: 1fr; } }
</style>
