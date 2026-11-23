<script setup>
import { ref, reactive, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { fmt } from '../../data/demo.js'
import { YEAR, INVESTORS, TERMS, split, distribute, profitYTD, profitProjected, daysToSplit } from '../../data/investors.js'
import { toast } from '../../composables/useToast.js'

// Close the year: the final profit, then each shareholder takes his share in cash (out of the safe) or adds it to his capital.
const open = defineModel({ type: Boolean, default: false })
const profit = ref('')
const choices = reactive({})
watch(open, (v) => {
  if (!v) return
  profit.value = String(profitProjected())
  INVESTORS.forEach((x) => { choices[x.id] = x.profits[0]?.how || 'cash' })
})
const P = computed(() => Number(String(profit.value).replace(/[^\d]/g, '')) || 0)
const s = computed(() => split(P.value))
const cashSum = computed(() => s.value.rows.filter((r) => choices[r.x.id] !== 'reinvest').reduce((a, r) => a + r.get, 0))
const early = daysToSplit()
function save() {
  if (!P.value) return
  distribute(P.value, choices)
  toast(`اتوزّعت أرباح ${YEAR}`, `${INVESTORS.length} مساهمين · ${fmt(cashSum.value)} ج نقدي من الخزنة`, { amount: P.value })
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" :title="`توزيع أرباح ${YEAR}`" :text="early > 0 ? `موعد التوزيع 1/1، يعني بعد ${early} يوم. إذا وزّعت هلأ اكتب الربح النهائي للسنة.` : ''" :width="620">
    <label class="amtin">
      <small>ربح السنة النهائي</small>
      <span class="row"><input v-model="profit" inputmode="numeric" dir="ltr" aria-label="ربح السنة" /><em>ج</em></span>
    </label>
    <div class="quick num">
      <button type="button" :class="{ on: P === profitYTD() }" @click="profit = String(profitYTD())">لحد اليوم {{ fmt(profitYTD()) }}</button>
      <button type="button" :class="{ on: P === profitProjected() }" @click="profit = String(profitProjected())">المتوقع لآخر السنة {{ fmt(profitProjected()) }}</button>
    </div>
    <ul class="rows">
      <li v-for="m in s.managers" :key="m.name" class="mg"><span class="nm"><b>{{ m.name }}</b><small class="num">إدارة {{ m.pct }}%</small></span><b class="num amt">{{ fmt(m.get) }}</b><span class="tag">نصيب الإدارة</span></li>
      <li v-for="r in s.rows" :key="r.x.id">
        <span class="nm"><b>{{ r.x.name }}</b><small class="num">{{ r.pct.toFixed(1) }}% · {{ TERMS[r.x.terms].label }}</small></span>
        <b class="num amt">{{ fmt(r.get) }}</b>
        <span class="how" role="radiogroup" :aria-label="`أرباح ${r.x.name}`">
          <button type="button" role="radio" :aria-checked="choices[r.x.id] !== 'reinvest'" :class="{ on: choices[r.x.id] !== 'reinvest' }" @click="choices[r.x.id] = 'cash'">يقبضها</button>
          <button type="button" role="radio" :aria-checked="choices[r.x.id] === 'reinvest'" :class="{ on: choices[r.x.id] === 'reinvest' }" @click="choices[r.x.id] = 'reinvest'">لرأس المال</button>
        </span>
      </li>
    </ul>
    <p class="sum num">بيطلع من الخزنة <b>{{ fmt(cashSum) }} ج</b> للمساهمين، وبينضاف لرأس المال {{ fmt(s.rows.reduce((a, r) => a + r.get, 0) - cashSum) }} ج.</p>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="ok" icon="check" :disabled="!P" @click="save">وزّع الأرباح</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; }
.amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 28px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.quick { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.quick button { border: 0; height: 34px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 340px; overflow-y: auto; }
.rows li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; background: #f7fafa; border-radius: 12px; padding: 8px 10px; }
.rows li.mg { background: #fff7e6; }
.nm { display: grid; min-width: 0; } .nm b { font-size: 13.5px; font-weight: 600; } .nm small { color: var(--color-muted); font-size: 11.5px; }
.amt { font-size: 15px; color: var(--color-deep); }
.tag { font-size: 11.5px; color: #8a5a00; font-weight: 600; padding: 0 8px; }
.how { display: inline-flex; padding: 3px; border-radius: 9px; background: #fff; box-shadow: inset 0 0 0 1px #e1eaea; }
.how button { border: 0; background: none; height: 28px; padding: 0 10px; border-radius: 7px; font: inherit; font-size: 12px; color: var(--color-muted); cursor: pointer; }
.how button.on { background: var(--color-primary); color: #fff; font-weight: 600; }
.sum { margin: 0; font-size: 13px; color: var(--color-muted); } .sum b { color: var(--color-deep); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 560px) { .rows li { grid-template-columns: minmax(0, 1fr) auto; } .how, .tag { grid-column: 1 / -1; justify-self: start; } }
</style>
