<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import AppIcon from '../AppIcon.vue'
import { WALLETS, fmt } from '../../data/demo.js'
import { addMove, balances, SOURCES } from '../../data/safe.js'
import { guessCat } from '../../data/expenses.js'
import { CASHBOOK } from '../../data/demo.js'
import { toast } from '../../composables/useToast.js'

// A movement entered by hand: money in, money out, or a transfer between wallets (e.g. depositing the drawer at the bank).
const props = defineProps({ dir: { type: String, default: 'out' } })
const open = defineModel({ type: Boolean, default: false })

const DIRS = [{ value: 'in', label: 'دخل', icon: 'in' }, { value: 'out', label: 'طلع', icon: 'out' }, { value: 'move', label: 'تحويل', icon: 'safe' }]
const CATS = { in: ['income'], out: ['expense', 'salary', 'withdraw'], move: ['move'] }
const d = ref('out')
const src = ref('expense')
const method = ref('cash')
const to = ref('bank')
const amount = ref('')
const party = ref('')
const note = ref('')
const tried = ref(false)
watch(open, (v) => { if (!v) return; d.value = props.dir; src.value = CATS[props.dir][0]; method.value = 'cash'; to.value = 'bank'; amount.value = ''; party.value = ''; note.value = ''; tried.value = false })
watch(d, (x) => { src.value = CATS[x][0]; if (x === 'move' && to.value === method.value) to.value = method.value === 'bank' ? 'cash' : 'bank' })
watch(method, (m) => { if (to.value === m) to.value = WALLETS.find((w) => w.key !== m).key })

const bal = computed(() => balances())
const v = computed(() => Number(String(amount.value).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0)
const short = computed(() => d.value !== 'in' && v.value > bal.value[method.value])
const PARTY_HINT = { income: 'من مين؟ مثلاً: إيجار الثلاجة', expense: 'على شو؟ مثلاً: ثلج، بنزين، شاي', salary: 'لمين؟ اسم الموظف', withdraw: 'مين سحب؟', move: 'مثلاً: إيداع بالبنك' }
const QUICK = [100, 500, 1000, 5000]

function save() {
  tried.value = true
  if (!v.value || (d.value !== 'move' && !party.value.trim())) return
  addMove({ dir: d.value, src: src.value, party: party.value.trim() || 'تحويل', method: method.value, to: d.value === 'move' ? to.value : undefined, amount: v.value, note: note.value.trim(), manual: true })
  if (src.value === 'expense') CASHBOOK.entries[CASHBOOK.entries.length - 1].cat = guessCat(party.value) // shows under the right category in المصاريف
  open.value = false
  toast(d.value === 'move' ? 'انسجّل التحويل' : d.value === 'in' ? 'انسجّل الدخل' : 'انسجّل الصرف',
    d.value === 'move' ? `من ${WALLETS.find((w) => w.key === method.value).label} لـ${WALLETS.find((w) => w.key === to.value).label}` : `${SOURCES[src.value].label} · ${party.value}`, { amount: v.value })
}
</script>

<template>
  <AppModal v-model="open" title="حركة بالخزنة" :width="480">
    <div class="form">
      <div class="dirs" role="radiogroup" aria-label="نوع الحركة">
        <button v-for="x in DIRS" :key="x.value" type="button" role="radio" :aria-checked="d === x.value" :class="[x.value, { on: d === x.value }]" @click="d = x.value"><AppIcon :name="x.icon" />{{ x.label }}</button>
      </div>
      <div v-if="CATS[d].length > 1" class="cats" role="radiogroup" aria-label="البند">
        <button v-for="c in CATS[d]" :key="c" type="button" role="radio" :aria-checked="src === c" :class="{ on: src === c }" @click="src = c">{{ SOURCES[c].label }}</button>
      </div>

      <div>
        <span class="lbl">{{ d === 'move' ? 'من' : d === 'in' ? 'لوين' : 'من وين' }}</span>
        <div class="wallets" role="radiogroup" aria-label="المحفظة">
          <button v-for="w in WALLETS" :key="w.key" type="button" role="radio" :aria-checked="method === w.key" :class="{ on: method === w.key }" @click="method = w.key"><b>{{ w.label }}</b><small class="num">{{ fmt(bal[w.key]) }}</small></button>
        </div>
      </div>
      <div v-if="d === 'move'">
        <span class="lbl">لوين</span>
        <div class="wallets" role="radiogroup" aria-label="المحفظة المحوّل إلها">
          <button v-for="w in WALLETS" :key="w.key" type="button" role="radio" :aria-checked="to === w.key" :disabled="w.key === method" :class="{ on: to === w.key }" @click="to = w.key"><b>{{ w.label }}</b><small class="num">{{ fmt(bal[w.key]) }}</small></button>
        </div>
      </div>

      <label class="amtin" :class="{ warn: short }"><small>المبلغ</small><span class="row"><input v-model="amount" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="save" /><em>ج</em></span></label>
      <div class="quick"><button v-for="q in QUICK" :key="q" type="button" class="num" :class="{ on: v === q }" @click="amount = String(q)">{{ fmt(q) }}</button></div>
      <p v-if="short" class="warnline num">المبلغ أكبر من اللي بـ{{ WALLETS.find((w) => w.key === method).label }} ({{ fmt(bal[method]) }})</p>
      <p v-if="tried && !v" class="err">اكتب المبلغ</p>

      <FilledInput v-if="d !== 'move'" v-model="party" :label="d === 'in' ? 'من مين / شو' : 'البيان'" :placeholder="PARTY_HINT[src]" :error="tried && !party.trim() ? 'اكتب البيان' : ''" />
      <FilledInput v-model="note" label="ملاحظة (اختياري)" placeholder="رقم إيصال أو تفصيل" />
    </div>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">سجّل الحركة</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.dirs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.dirs button { border: 0; height: 40px; border-radius: 9px; background: none; font: inherit; font-size: 13.5px; color: var(--color-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.dirs button :deep(svg) { width: 17px; height: 17px; }
.dirs button.on { background: #fff; font-weight: 700; } .dirs .in.on { color: var(--color-positive); } .dirs .out.on { color: var(--color-negative); } .dirs .move.on { color: var(--color-primary-ink); }
.cats { display: flex; gap: 6px; flex-wrap: wrap; }
.cats button { border: 0; height: 32px; padding: 0 12px; border-radius: 9px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; }
.cats button.on { background: var(--color-deep); color: #fff; }
.wallets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.wallets button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 8px; display: grid; gap: 2px; justify-items: center; font: inherit; cursor: pointer; }
.wallets b { font-size: 13px; } .wallets small { color: var(--color-muted); font-size: 11.5px; }
.wallets button.on { border-color: var(--color-primary); background: #f0f9fb; } .wallets button.on b { color: var(--color-primary-ink); }
.wallets button:disabled { opacity: .35; cursor: not-allowed; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); } .amtin.warn:focus-within { box-shadow: inset 0 0 0 2px #e0a33a; }
.amtin small { color: var(--color-muted); font-size: 12px; } .amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 28px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 34px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.warnline { margin: 0; font-size: 12.5px; color: #8a5a00; background: var(--warn-bg); border-radius: 10px; padding: 6px 10px; }
.err { margin: -6px 0 0; color: var(--color-negative); font-size: 12px; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 480px) { .wallets { grid-template-columns: 1fr; } }
</style>
