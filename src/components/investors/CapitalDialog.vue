<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { capitalOf, moveCapital, MONTH_NOW } from '../../data/investors.js'
import { toast } from '../../composables/useToast.js'

// Capital in or out for one shareholder. It counts in this year's split from this month on.
const props = defineProps({ investor: Object, dir: { type: String, default: 'in' } })
const open = defineModel({ type: Boolean, default: false })
const x = ref(null)
const d = ref('in')
const amount = ref('')
const how = ref('bank')
const METHODS = [{ value: 'bank', label: 'تحويل بنكي', icon: 'safe' }, { value: 'cash', label: 'نقدي', icon: 'cash' }, { value: 'vodafone', label: 'فودافون كاش', icon: 'phone' }]
watch(open, (v) => { if (v && props.investor) { x.value = props.investor; d.value = props.dir; amount.value = ''; how.value = 'bank' } })
const v = computed(() => Number(String(amount.value).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d]/g, '')) || 0)
const now = computed(() => (x.value ? capitalOf(x.value) : 0))
const after = computed(() => now.value + (d.value === 'in' ? v.value : -v.value))
const months = 13 - MONTH_NOW
const QUICK = [50000, 100000, 250000, 500000]
const valid = computed(() => v.value > 0 && after.value >= 0)
function save() {
  if (!valid.value) return
  const p = x.value
  moveCapital(p, { amount: v.value, dir: d.value, method: how.value })
  toast(d.value === 'in' ? 'انضاف لرأس المال' : 'انسحب من رأس المال', `${p.name} · رأس ماله هلأ ${fmt(capitalOf(p))} ج`, { amount: v.value })
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" :title="x ? `رأس مال ${x.name}` : ''" :width="460">
    <template v-if="x">
      <div class="kind" role="radiogroup" aria-label="نوع الحركة">
        <button type="button" role="radio" :aria-checked="d === 'in'" :class="{ on: d === 'in' }" @click="d = 'in'"><AppIcon name="in" />زيادة</button>
        <button type="button" role="radio" :aria-checked="d === 'out'" :class="{ on: d === 'out' }" @click="d = 'out'"><AppIcon name="out" />سحب</button>
      </div>
      <label class="amtin">
        <small>المبلغ</small>
        <span class="row"><input v-model="amount" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="save" /><em>ج</em></span>
      </label>
      <div class="quick"><button v-for="q in QUICK" :key="q" type="button" class="num" :class="{ on: v === q }" @click="amount = String(q)">{{ fmt(q) }}</button>
        <button v-if="d === 'out' && now" type="button" :class="{ on: v === now }" @click="amount = String(now)">كله</button></div>
      <div class="how" role="radiogroup" aria-label="الطريقة">
        <button v-for="m in METHODS" :key="m.value" type="button" role="radio" :aria-checked="how === m.value" :class="{ on: how === m.value }" @click="how = m.value"><AppIcon :name="m.icon" /><span>{{ m.label }}</span></button>
      </div>
      <p class="note num">بيتحسب بتوزيع السنة من نوفمبر: {{ months }} شهر من 12، يعني {{ fmt(Math.round((v * months) / 12)) }} ج من الموزون.</p>
      <p v-if="after < 0" class="warn">أكتر من رأس ماله ({{ fmt(now) }} ج).</p>
      <div class="after num"><span>رأس ماله {{ fmt(now) }}</span><AppIcon name="next" /><b>{{ fmt(Math.max(0, after)) }} ج</b></div>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton :tone="d === 'in' ? 'primary' : 'danger'" icon="check" :disabled="!valid" @click="save">{{ d === 'in' ? 'سجّل الزيادة' : 'سجّل السحب' }}</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.kind { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.kind button { border: 0; height: 36px; border-radius: 9px; background: none; font: inherit; font-size: 13px; color: var(--color-muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.kind button :deep(svg) { width: 16px; height: 16px; }
.kind button.on { background: #fff; color: var(--color-primary-ink); font-weight: 700; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; }
.amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 30px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 36px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.quick button:hover { background: var(--color-primary-pale); }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.how button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 6px; display: grid; justify-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; }
.how button :deep(svg) { width: 22px; height: 22px; }
.how button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 600; }
.note { margin: 0; color: var(--color-muted); font-size: 12.5px; }
.warn { margin: 0; color: #8a5a00; font-size: 12.5px; background: var(--warn-bg); border-radius: 10px; padding: 6px 10px; }
.after { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; background: #f6f9f9; border-radius: 12px; padding: 10px 14px; color: var(--color-muted); }
.after :deep(svg) { width: 16px; height: 16px; } .after b { font-size: 17px; color: var(--color-deep); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; }
.acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
