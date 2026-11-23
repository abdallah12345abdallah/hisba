<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { SUPPLIERS, fmt } from '../../data/demo.js'
import { markupFor, settle } from '../../data/feed.js'

// Settlement calculator: all of the open feed or a part of it, at factory price + the markup (a % or an amount per ton);
// taken from the farm's sales balance or as cash. Emits the debit note it issued.
const props = defineProps({ account: Object })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['settled'])

const f = ref(null)
const scope = ref('all')
const part = ref('')
const mode = ref('pct')
const value = ref('6')
const pay = ref('deduct')
watch(open, (v) => { if (v && props.account) { f.value = props.account; scope.value = 'all'; part.value = String(Math.round(props.account.amount / 2)); mode.value = 'pct'; value.value = '6'; pay.value = 'deduct' } })
watch(mode, (m) => { value.value = m === 'pct' ? '6' : '1200' })

const n = (x) => Number(String(x).replace(/[^\d.]/g, '')) || 0
const base = computed(() => (f.value ? (scope.value === 'all' ? f.value.amount : Math.min(f.value.amount, n(part.value))) : 0))
const markup = computed(() => (f.value ? Math.round(markupFor(f.value, base.value, mode.value, n(value.value))) : 0))
const total = computed(() => Math.round(base.value) + markup.value)
const farm = computed(() => f.value && SUPPLIERS.find((s) => s.name === f.value.name))
const after = computed(() => (farm.value ? farm.value.balance - total.value : 0))
const side = (b) => (b > 0 ? 'له' : b < 0 ? 'عليه' : 'خالص')
const QUICK = computed(() => (mode.value === 'pct' ? [4, 5, 6, 8] : [800, 1000, 1200, 1500]))
const PARTS = computed(() => (f.value ? [0.25, 0.5, 0.75].map((k) => Math.round((f.value.amount * k) / 1000) * 1000) : []))

function doSettle() {
  if (!base.value) return
  const result = settle(f.value, { mode: mode.value, value: n(value.value), pay: pay.value, part: scope.value === 'part' ? base.value : undefined })
  open.value = false
  emit('settled', result)
}
</script>

<template>
  <AppModal v-model="open" :title="f ? `تسوية علف ${f.name}` : ''" :width="470">
    <template v-if="f">
      <p class="meta num">مفتوح {{ fmt(f.amount) }} ج · {{ f.tons }} طن · التسوية {{ f.due }} ({{ f.daysLeft >= 0 ? `بعد ${f.daysLeft} يوم` : `متأخرة ${-f.daysLeft} يوم` }})</p>

      <div class="seg" role="radiogroup" aria-label="قديش بدك تسوّي">
        <button type="button" role="radio" :aria-checked="scope === 'all'" :class="{ on: scope === 'all' }" @click="scope = 'all'">كل العلف</button>
        <button type="button" role="radio" :aria-checked="scope === 'part'" :class="{ on: scope === 'part' }" @click="scope = 'part'">جزء منه</button>
      </div>
      <template v-if="scope === 'part'">
        <label class="amtin"><small>قديش من العلف (بسعر المصنع)</small><span class="row"><input v-model="part" inputmode="numeric" dir="ltr" aria-label="الجزء" /><em>ج</em></span></label>
        <div class="quick"><button v-for="p in PARTS" :key="p" type="button" class="num" :class="{ on: n(part) === p }" @click="part = String(p)">{{ fmt(p) }}</button></div>
      </template>

      <div class="seg" role="radiogroup" aria-label="طريقة حساب الزيادة">
        <button type="button" role="radio" :aria-checked="mode === 'pct'" :class="{ on: mode === 'pct' }" @click="mode = 'pct'">زيادة بنسبة %</button>
        <button type="button" role="radio" :aria-checked="mode === 'ton'" :class="{ on: mode === 'ton' }" @click="mode = 'ton'">زيادة على الطن</button>
      </div>
      <div class="vrow">
        <label class="amtin sm"><span class="row"><input v-model="value" inputmode="decimal" dir="ltr" aria-label="الزيادة" /><em>{{ mode === 'pct' ? '%' : 'ج/طن' }}</em></span></label>
        <div class="quick"><button v-for="q in QUICK" :key="q" type="button" class="num" :class="{ on: n(value) === q }" @click="value = String(q)">{{ mode === 'pct' ? q + '%' : fmt(q) }}</button></div>
      </div>

      <div class="bill">
        <div><span>العلف بسعر المصنع</span><b class="num">{{ fmt(Math.round(base)) }}</b></div>
        <div class="add"><span>إشعار إضافة</span><b class="num">+ {{ fmt(markup) }}</b></div>
        <div class="tot"><span>المطلوب من المزرعة</span><b class="num">{{ fmt(total) }} ج</b></div>
        <div v-if="scope === 'part'" class="rest num"><span>بيضل مفتوح</span><span>{{ fmt(f.amount - base) }} ج لموعده</span></div>
      </div>

      <div class="seg" role="radiogroup" aria-label="طريقة الدفع">
        <button type="button" role="radio" :aria-checked="pay === 'deduct'" :class="{ on: pay === 'deduct' }" :disabled="!farm" @click="pay = 'deduct'">خصم من بيعه</button>
        <button type="button" role="radio" :aria-checked="pay === 'cash'" :class="{ on: pay === 'cash' }" @click="pay = 'cash'">نقدي للخزنة</button>
      </div>
      <p v-if="pay === 'deduct' && farm" class="after num">رصيده من البيع {{ fmt(Math.abs(farm.balance)) }} {{ side(farm.balance) }} ← بعد الخصم <b :class="{ adv: after < 0 }">{{ fmt(Math.abs(after)) }} {{ side(after) }}</b></p>
      <p v-else class="after">بيدفع المبلغ نقدي، وبينضاف للخزنة.</p>
    </template>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" :disabled="!base" @click="doSettle">سوّي وأصدر الإشعار</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.meta { margin: -6px 0 0; color: var(--color-muted); font-size: 12.5px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.seg button { border: 0; height: 36px; border-radius: 9px; background: none; font: inherit; font-size: 13px; color: var(--color-muted); cursor: pointer; }
.seg button.on { background: #fff; color: var(--color-primary-ink); font-weight: 700; } .seg button:disabled { opacity: .4; cursor: not-allowed; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin.sm { padding: 6px 12px; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; } .amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 26px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin.sm input { font-size: 20px; }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; white-space: nowrap; }
.vrow { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px; align-items: center; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 34px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.bill { background: #fbf7ee; border-radius: 12px; padding: 10px 14px; display: grid; gap: 6px; font-size: 13px; }
.bill div { display: flex; justify-content: space-between; } .bill .add b { color: #b4532a; }
.bill .tot { border-top: 1.5px dashed #e6d7b4; padding-top: 8px; font-size: 14px; } .bill .tot b { font-size: 20px; color: #8a5a00; }
.bill .rest { color: var(--color-muted); font-size: 12px; }
.after { margin: 0; font-size: 12.5px; color: var(--color-muted); } .after b { color: var(--color-primary-ink); } .after b.adv { color: var(--color-negative); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 480px) { .vrow { grid-template-columns: 1fr; } }
</style>
