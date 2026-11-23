<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import AppIcon from '../AppIcon.vue'
import { WALLETS, fmt } from '../../data/demo.js'
import { balances } from '../../data/safe.js'
import { CATS, guessCat, catOf, addExpense, updateExpense, allExpenses } from '../../data/expenses.js'
import { toast } from '../../composables/useToast.js'

// Add an expense (or edit one). Typing what it was picks the category by itself ("ثلج" → ثلج, "بنزين" → نقل),
// shows how much of that category's monthly budget is left, and takes the money from the chosen wallet.
const props = defineProps({ expense: { type: Object, default: null }, preset: { type: Object, default: null } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved'])

const desc = ref('')
const cat = ref('other')
const touchedCat = ref(false)
const amount = ref('')
const method = ref('cash')
const note = ref('')
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  const x = props.expense || props.preset
  desc.value = x?.desc || x?.name || ''; cat.value = x?.cat || 'other'; amount.value = x?.amount ? String(x.amount) : ''
  method.value = x?.method || 'cash'; note.value = x?.note || ''; touchedCat.value = !!x; tried.value = false
})
watch(desc, (t) => { if (!touchedCat.value) cat.value = guessCat(t) })
function pickCat(k) { cat.value = k; touchedCat.value = true }

const num = (x) => Number(String(x).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const v = computed(() => num(amount.value))
const bal = computed(() => balances())
const c = computed(() => catOf(cat.value))
const spent = computed(() => allExpenses().filter((e) => e.cat === cat.value && e.id !== props.expense?.id).reduce((a, e) => a + e.amount, 0))
const after = computed(() => spent.value + v.value)
const left = computed(() => c.value.budget - after.value)
const RECENT = computed(() => [...new Set(allExpenses().map((e) => e.desc))].slice(0, 6))
const QUICK = [100, 250, 500, 1000]

function save() {
  tried.value = true
  if (!desc.value.trim() || !v.value) return
  const data = { cat: cat.value, desc: desc.value.trim(), amount: v.value, method: method.value, note: note.value.trim() }
  if (props.expense) { updateExpense(props.expense, data); toast('انحفظ التعديل', `${data.desc} · ${catOf(data.cat).label}`) }
  else { addExpense(data); toast('انسجّل المصروف', `${data.desc} · ${catOf(data.cat).label} · من ${WALLETS.find((w) => w.key === data.method).label}`, { amount: data.amount }) }
  open.value = false
  emit('saved', data)
}
</script>

<template>
  <AppModal v-model="open" :title="expense ? 'تعديل مصروف' : preset ? `دفع ${preset.name}` : 'مصروف جديد'" :width="500">
    <div class="form">
      <FilledInput v-model="desc" label="على شو صرفت؟" placeholder="مثلاً: ثلج للبيان، بنزين التروسيكل" :error="tried && !desc.trim() ? 'اكتب على شو صرفت' : ''" />
      <div v-if="!expense && !preset && RECENT.length && !desc" class="recent">
        <small>من آخر مصاريفك:</small>
        <button v-for="r in RECENT" :key="r" type="button" @click="desc = r">{{ r }}</button>
      </div>

      <div>
        <span class="lbl">البند <small v-if="!touchedCat && desc">· اخترناه من الكلام، فيك تغيّره</small></span>
        <div class="cats" role="radiogroup" aria-label="البند">
          <button v-for="x in CATS" :key="x.key" type="button" role="radio" :aria-checked="cat === x.key" :class="{ on: cat === x.key }" @click="pickCat(x.key)"><AppIcon :name="x.icon" /><span>{{ x.label }}</span></button>
        </div>
      </div>

      <label class="amtin"><small>المبلغ</small><span class="r"><input v-model="amount" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="save" /><em>ج</em></span></label>
      <div class="quick"><button v-for="q in QUICK" :key="q" type="button" class="num" :class="{ on: v === q }" @click="amount = String(q)">{{ fmt(q) }}</button></div>
      <p v-if="tried && !v" class="err">اكتب المبلغ</p>

      <div class="budget" :class="left < 0 ? 'over' : left < c.budget * 0.2 ? 'near' : ''">
        <div class="bh num"><span>ميزانية {{ c.label }} هالشهر</span><b>{{ fmt(after) }} من {{ fmt(c.budget) }}</b></div>
        <div class="bar"><i class="was" :style="{ width: Math.min(100, (spent / c.budget) * 100) + '%' }" /><i class="now" :style="{ width: Math.max(0, Math.min(100 - (spent / c.budget) * 100, (v / c.budget) * 100)) + '%' }" /></div>
        <small class="num">{{ left >= 0 ? `بيضل ${fmt(left)} ج` : `بتعدّى الميزانية بـ ${fmt(-left)} ج` }}</small>
      </div>

      <div>
        <span class="lbl">من وين</span>
        <div class="wallets" role="radiogroup" aria-label="المحفظة">
          <button v-for="w in WALLETS" :key="w.key" type="button" role="radio" :aria-checked="method === w.key" :class="{ on: method === w.key }" @click="method = w.key"><b>{{ w.label }}</b><small class="num">{{ fmt(bal[w.key]) }}</small></button>
        </div>
      </div>
      <FilledInput v-model="note" label="ملاحظة (اختياري)" placeholder="رقم فاتورة أو تفصيل" />
    </div>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">{{ expense ? 'احفظ التعديل' : 'سجّل المصروف' }}</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; } .lbl small { color: var(--color-muted); font-weight: 400; }
.recent { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: -4px; } .recent small { color: var(--color-muted); font-size: 12px; }
.recent button { border: 0; background: #f1f6f6; border-radius: 8px; padding: 3px 10px; font: inherit; font-size: 12px; cursor: pointer; } .recent button:hover { background: var(--color-primary-pale); }
.cats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.cats button { border: 1.5px solid #e6eeee; background: #fff; border-radius: 11px; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
.cats button :deep(svg) { width: 16px; height: 16px; }
.cats button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 700; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; } .amtin .r { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 28px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 34px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.err { margin: -6px 0 0; color: var(--color-negative); font-size: 12px; }
.budget { --c: var(--color-primary); background: #f6f9f9; border-radius: 12px; padding: 10px 12px; display: grid; gap: 6px; }
.budget.near { --c: #d58f17; background: var(--warn-bg); } .budget.over { --c: var(--color-negative); background: var(--neg-bg); }
.bh { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--color-muted); } .bh b { color: var(--color-ink); }
.bar { display: flex; height: 8px; border-radius: 4px; background: rgb(11 59 69 / .1); overflow: hidden; }
.bar .was { background: color-mix(in srgb, var(--c) 55%, #fff); } .bar .now { background: var(--c); transition: width .3s; }
.budget small { color: var(--c); font-weight: 600; font-size: 12px; }
.wallets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.wallets button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 8px; display: grid; gap: 2px; justify-items: center; font: inherit; cursor: pointer; }
.wallets b { font-size: 13px; } .wallets small { color: var(--color-muted); font-size: 11.5px; }
.wallets button.on { border-color: var(--color-primary); background: #f0f9fb; } .wallets button.on b { color: var(--color-primary-ink); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 480px) { .cats, .wallets { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
