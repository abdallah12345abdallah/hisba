<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import ConfirmDialog from '../ui/ConfirmDialog.vue'
import { fmt } from '../../data/demo.js'
import { checkTrader, addTrader, updateTrader, canDelete, removeTrader, CYCLES } from '../../data/traders.js'
import { SETTINGS } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// Add a trader (trader = null) or edit one: name, phone, debt limit, and an opening balance for a new account.
// Editing also offers delete, only for a trader who owes nothing and bought nothing today.
const props = defineProps({ trader: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved', 'deleted'])

const editing = computed(() => !!props.trader)
const f = reactive({ name: '', phone: '', limit: '', opening: '', cycle: 'weekly' })
const errors = ref({})
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const t = props.trader
  Object.assign(f, t ? { name: t.name, phone: t.phone, limit: String(t.limit), opening: '', cycle: t.cycle || 'weekly' } : { name: '', phone: '', limit: String(SETTINGS.defaultLimit), opening: '', cycle: 'weekly' })
  errors.value = {}
  tried.value = false
})
watch(f, () => { if (tried.value) errors.value = checkTrader(f, props.trader).errors })

const LIMITS = [10000, 20000, 30000, 50000]
function save() {
  tried.value = true
  const { errors: e, value } = checkTrader(f, props.trader)
  errors.value = e
  if (Object.keys(e).length) return
  if (editing.value) {
    const t = updateTrader(props.trader, value)
    toast('انحفظ التعديل', `${t.name} · الحد ${fmt(t.limit)} ج`)
    emit('saved', t)
  } else {
    const t = addTrader(value)
    toast('انضاف التاجر', `${t.name}${t.due ? ` · رصيد افتتاحي ${fmt(t.due)} ج` : ''}`, { big: true })
    emit('saved', t)
  }
  open.value = false
}

const askDelete = ref(false)
const deletable = computed(() => props.trader && canDelete(props.trader))
function doDelete() {
  const t = props.trader
  const undo = removeTrader(t)
  open.value = false
  toast('انحذف التاجر', t.name, { tone: 'info', action: { label: 'تراجع', run: undo } })
  emit('deleted', t)
}
</script>

<template>
  <AppModal v-model="open" :title="editing ? `تعديل ${trader.name}` : 'تاجر جديد'" :text="editing ? '' : 'بيطلع بشيت البيع والتقارير أول ما تحفظه.'" :width="460">
    <form class="form" novalidate @submit.prevent="save">
      <FilledInput v-model="f.name" label="اسم التاجر" placeholder="مثلاً: الحاج محمود" :error="errors.name" />
      <FilledInput v-model="f.phone" label="رقم التلفون" placeholder="01xx xxx xxxx" type="tel" dir="ltr" :error="errors.phone" hint="بنستعمله لإرسال كشف الحساب على الواتساب." />
      <div>
        <FilledInput v-model="f.limit" label="حد الدين (ج)" inputmode="numeric" dir="ltr" :error="errors.limit" />
        <div class="chips">
          <button v-for="l in LIMITS" :key="l" type="button" class="num" :class="{ on: Number(f.limit) === l }" @click="f.limit = String(l)">{{ fmt(l) }}</button>
        </div>
      </div>
      <div class="cyc">
        <span class="cl">التحصيل منه</span>
        <div class="chips" role="radiogroup" aria-label="موعد التحصيل">
          <button v-for="(c, k) in CYCLES" :key="k" type="button" role="radio" :aria-checked="f.cycle === k" :class="{ on: f.cycle === k }" @click="f.cycle = k">{{ c.label }}</button>
        </div>
        <small class="ch2">{{ CYCLES[f.cycle].long }}. إذا عدّى الموعد وما دفع، بيطلع «متأخر» وبيوصلك تنبيه بالرئيسية.</small>
      </div>
      <FilledInput v-if="!editing" v-model="f.opening" label="رصيد افتتاحي (اختياري)" inputmode="numeric" dir="ltr" hint="إذا عليه دين من قبل ما تبلّش بحِسبة." />
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts">
        <SoftButton v-if="editing" tone="danger" icon="trash" :disabled="!deletable" :title="deletable ? '' : 'ما بينفع تحذفه وعليه دين أو اشترى اليوم'" class="del" @click="askDelete = true">حذف</SoftButton>
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" @click="save">{{ editing ? 'احفظ التعديل' : 'ضيف التاجر' }}</SoftButton>
      </div>
    </template>
  </AppModal>

  <ConfirmDialog v-model="askDelete" :title="trader ? `تحذف ${trader.name}؟` : ''" confirm="احذف التاجر"
    text="حسابه خالص، فما رح يروح شي من الأرقام. فيك ترجّعه بزر التراجع بعد الحذف." @confirm="doDelete" />
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.chips button { border: 0; height: 30px; padding: 0 12px; border-radius: 8px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; }
.chips button:hover { background: var(--color-primary-pale); }
.chips button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.cyc { display: grid; gap: 4px; } .cl { font-size: 13px; color: var(--color-muted); } .ch2 { font-size: 11.5px; color: var(--color-muted); }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; }
.acts .del { margin-inline-end: auto; }
</style>
