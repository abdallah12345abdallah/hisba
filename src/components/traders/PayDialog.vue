<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { receivePayment } from '../../data/traders.js'
import { toast } from '../../composables/useToast.js'

// Receive a payment from a trader: how much (with quick picks), how it was paid, and a bar showing the debt before → after;
// then the big success card with undo.
const props = defineProps({ trader: Object })
const open = defineModel({ type: Boolean, default: false })

const t = ref(null) // keep the trader while the dialog animates out
const amount = ref('')
const METHODS = [
  { value: 'قبض نقدي', label: 'نقدي', icon: 'cash' },
  { value: 'تحويل فودافون كاش', label: 'فودافون كاش', icon: 'phone' },
  { value: 'تحويل بنكي', label: 'تحويل بنكي', icon: 'safe' },
]
const how = ref(METHODS[0].value)
watch(open, (v) => { if (v && props.trader) { t.value = props.trader; amount.value = String(Math.min(props.trader.due, 10000)); how.value = METHODS[0].value } })

const amountNum = computed(() => Number(String(amount.value).replace(/[^\d]/g, '')) || 0)
const paid = computed(() => (t.value ? Math.min(t.value.due, amountNum.value) : 0))
const after = computed(() => (t.value ? t.value.due - paid.value : 0))
const tooMuch = computed(() => t.value && amountNum.value > t.value.due)
const quick = computed(() => (t.value ? [5000, 10000, 20000].filter((v) => v < t.value.due).map((v) => ({ v, label: fmt(v) })).concat({ v: t.value.due, label: 'كل الحساب' }) : []))
const scale = computed(() => (t.value ? Math.max(t.value.due, t.value.limit) : 1))

function pay() {
  const tr = t.value
  const v = paid.value
  if (!v) return
  const undo = receivePayment(tr, v, how.value)
  open.value = false
  toast('انسجّل القبض', `من ${tr.name} · باقي عليه ${fmt(tr.due)} ج`, { amount: v, big: true, action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" :title="t ? `قبض من ${t.name}` : ''" :width="440">
    <template v-if="t">
      <div class="owe"><span>عليه هلأ</span><b class="num">{{ fmt(t.due) }} ج</b></div>

      <label class="amtin" :class="{ warn: tooMuch }">
        <small>المبلغ</small>
        <span class="row"><input v-model="amount" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="pay" /><em>ج</em></span>
      </label>
      <p v-if="tooMuch" class="note">المبلغ أكبر من اللي عليه، رح ينسجّل {{ fmt(t.due) }} بس.</p>

      <div class="quick" role="group" aria-label="مبالغ سريعة">
        <button v-for="q in quick" :key="q.label" type="button" class="num" :class="{ on: amountNum === q.v }" @click="amount = String(q.v)">{{ q.label }}</button>
      </div>

      <div class="how" role="radiogroup" aria-label="طريقة الدفع">
        <button v-for="m in METHODS" :key="m.value" type="button" role="radio" :aria-checked="how === m.value" :class="{ on: how === m.value }" @click="how = m.value">
          <AppIcon :name="m.icon" /><span>{{ m.label }}</span>
        </button>
      </div>

      <div class="after">
        <div class="lbls"><span>بعد القبض بيصير عليه</span><b class="num">{{ fmt(after) }} ج</b></div>
        <div class="bar" aria-hidden="true">
          <i class="left" :style="{ width: (after / scale) * 100 + '%' }" />
          <i class="gone" :style="{ width: (paid / scale) * 100 + '%' }" />
          <u :style="{ insetInlineStart: (t.limit / scale) * 100 + '%' }" />
        </div>
        <div class="lbls small"><span class="num">انشال {{ fmt(paid) }}</span><span class="num">الحد {{ fmt(t.limit) }}</span></div>
      </div>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton tone="primary" icon="check" :disabled="!paid" @click="pay">سجّل القبض</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.owe { display: flex; justify-content: space-between; align-items: baseline; margin-top: -6px; color: var(--color-muted); font-size: 13px; }
.owe b { color: var(--color-deep); font-size: 15px; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; transition: background .15s, box-shadow .15s; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin.warn:focus-within { box-shadow: inset 0 0 0 2px #e0a33a; }
.amtin small { color: var(--color-muted); font-size: 12px; }
.amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 30px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.note { margin: -8px 0 0; color: #8a5a00; font-size: 12px; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 36px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 13px; font-weight: 600; color: var(--color-ink); cursor: pointer; transition: background .15s; }
.quick button:hover { background: var(--color-primary-pale); }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.how button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 6px; display: grid; justify-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
.how button :deep(svg) { width: 22px; height: 22px; }
.how button:hover { border-color: #b9dbe0; }
.how button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 600; }
.after { background: #f6f9f9; border-radius: 12px; padding: 10px 14px; display: grid; gap: 8px; }
.lbls { display: flex; justify-content: space-between; font-size: 13px; }
.lbls b { font-weight: 700; font-size: 16px; color: var(--color-deep); }
.lbls.small { font-size: 11.5px; color: var(--color-muted); }
.bar { position: relative; display: flex; height: 10px; border-radius: 5px; background: #e5eded; overflow: visible; }
.bar i { display: block; height: 100%; transition: width .35s cubic-bezier(.2, .9, .25, 1); }
.bar .left { background: linear-gradient(90deg, #2dd4bf, var(--color-primary)); border-radius: 5px 0 0 5px; border-start-start-radius: 5px; border-end-start-radius: 5px; }
.bar .gone { background: repeating-linear-gradient(135deg, #7fd3a6 0 5px, #a8e3c3 5px 10px); }
.bar u { position: absolute; top: -4px; bottom: -4px; width: 2px; border-radius: 1px; background: var(--color-deep); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; }
.acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
