<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import { checkSupplier, addSupplier, updateSupplier, canDelete, removeSupplier } from '../../data/suppliers.js'
import { SETTINGS } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// Add a farm (supplier = null) or edit one: name, place, phone, commission %, rating. Delete only when the account is clear and unused.
const props = defineProps({ supplier: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved', 'deleted'])

const editing = computed(() => !!props.supplier)
const f = reactive({ name: '', place: '', phone: '', rate: '', rating: 3 })
const errors = ref({})
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const s = props.supplier
  Object.assign(f, s ? { name: s.name, place: s.place, phone: s.phone, rate: String(s.rate), rating: s.rating } : { name: '', place: '', phone: '', rate: String(SETTINGS.defaultRate), rating: 3 })
  errors.value = {}; tried.value = false
})
watch(f, () => { if (tried.value) errors.value = checkSupplier(f, props.supplier).errors })
const RATES = SETTINGS.rates

function save() {
  tried.value = true
  const { errors: e, value } = checkSupplier(f, props.supplier)
  errors.value = e
  if (Object.keys(e).length) return
  const s = editing.value ? updateSupplier(props.supplier, value) : addSupplier(value)
  toast(editing.value ? 'انحفظ التعديل' : 'انضاف المورد', `${s.name} · عمولة ${s.rate}%`, { big: !editing.value })
  emit('saved', s)
  open.value = false
}

const askDelete = ref(false)
const deletable = computed(() => props.supplier && canDelete(props.supplier))
function doDelete() {
  const s = props.supplier
  const undo = removeSupplier(s)
  open.value = false
  toast('انحذف المورد', s.name, { tone: 'info', action: { label: 'تراجع', run: undo } })
  emit('deleted', s)
}
</script>

<template>
  <AppModal v-model="open" :title="editing ? `تعديل ${supplier.name}` : 'مورد جديد'" :text="editing ? '' : 'المزرعة بتطلع بالبيانات الجديدة أول ما تحفظها.'" :width="460">
    <form class="form" novalidate @submit.prevent="save">
      <FilledInput v-model="f.name" label="اسم المزرعة" placeholder="مثلاً: مزرعة الحاج سامر" :error="errors.name" />
      <div class="two">
        <FilledInput v-model="f.place" label="المكان" placeholder="البلد أو المركز" />
        <FilledInput v-model="f.phone" label="رقم التلفون" placeholder="01xx xxx xxxx" type="tel" dir="ltr" :error="errors.phone" />
      </div>
      <div>
        <FilledInput v-model="f.rate" label="العمولة %" inputmode="decimal" dir="ltr" :error="errors.rate" hint="بتنخصم من إجمالي بيع كل بيان." />
        <div class="chips"><button v-for="r in RATES" :key="r" type="button" :class="{ on: Number(f.rate) === r }" @click="f.rate = String(r)">{{ r }}%</button></div>
      </div>
      <div class="rate">
        <span>التقييم</span>
        <div class="stars" role="radiogroup" aria-label="تقييم المزرعة">
          <button v-for="n in 5" :key="n" type="button" role="radio" :aria-checked="f.rating === n" :aria-label="`${n} من 5`" :class="{ on: n <= f.rating }" @click="f.rating = n">★</button>
        </div>
        <small>جودة السمك والالتزام بالمواعيد</small>
      </div>
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts">
        <SoftButton v-if="editing" tone="danger" icon="trash" :disabled="!deletable" :title="deletable ? '' : 'ما بينفع تحذفه وإله رصيد أو بيانات أو علف'" class="del" @click="askDelete = true">حذف</SoftButton>
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" @click="save">{{ editing ? 'احفظ التعديل' : 'ضيف المورد' }}</SoftButton>
      </div>
    </template>
  </AppModal>
  <ConfirmDialog v-model="askDelete" :title="supplier ? `تحذف ${supplier.name}؟` : ''" confirm="احذف المورد" text="حسابه خالص وما إله بيانات اليوم ولا علف. فيك ترجّعه بزر التراجع." @confirm="doDelete" />
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.chips { display: flex; gap: 6px; margin-top: 6px; }
.chips button { border: 0; height: 30px; padding: 0 14px; border-radius: 8px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; }
.chips button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.rate { display: grid; grid-template-columns: auto auto 1fr; align-items: center; gap: 4px 12px; font-size: 13px; }
.rate > span { font-weight: 500; }
.rate small { color: var(--color-muted); font-size: 12px; }
.stars { display: flex; gap: 2px; }
.stars button { border: 0; background: none; font-size: 24px; line-height: 1; color: #d5dede; cursor: pointer; padding: 0 1px; transition: transform .1s, color .15s; }
.stars button.on { color: #e0a33a; }
.stars button:hover { transform: scale(1.15); }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
.acts .del { margin-inline-end: auto; }
@media (max-width: 480px) { .two { grid-template-columns: 1fr; } .rate { grid-template-columns: auto 1fr; } .rate small { grid-column: 1 / -1; } }
</style>
