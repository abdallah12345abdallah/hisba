<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { dueOf, unpaidDays, daysLabel, paySalary, giveAdvance, MONTH, TODAY } from '../../data/staff.js'
import { toast } from '../../composables/useToast.js'

// Money to an employee: kind 'pay' (the salary, or the day wages counted from attendance, minus what he chooses to take back
// from his advance) or 'adv' (an advance, taken back later from his pay).
const props = defineProps({ person: Object, kind: { type: String, default: 'pay' } })
const open = defineModel({ type: Boolean, default: false })

const e = ref(null)
const k = ref('pay')
const gross = ref('')
const advAmount = ref('')
const deduct = ref(0)
const METHODS = [{ value: 'cash', label: 'نقدي', icon: 'cash' }, { value: 'vodafone', label: 'فودافون كاش', icon: 'phone' }, { value: 'bank', label: 'تحويل بنكي', icon: 'safe' }]
const how = ref('cash')
const num = (s) => Number(String(s).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d]/g, '')) || 0

watch(open, (v) => {
  if (!v || !props.person) return
  const p = props.person
  e.value = p; k.value = props.kind; how.value = 'cash'
  gross.value = String(dueOf(p) || '')
  advAmount.value = String(p.pay === 'day' ? 500 : 1000)
  // by default take back the whole advance if the pay covers it, otherwise half the pay
  deduct.value = p.adv <= dueOf(p) ? p.adv : Math.floor(dueOf(p) / 2 / 50) * 50
})
const isPay = computed(() => k.value === 'pay')
const monthly = computed(() => e.value?.pay === 'month')
const g = computed(() => num(gross.value))
const due = computed(() => (e.value ? dueOf(e.value) : 0))
const maxDeduct = computed(() => (e.value ? Math.min(e.value.adv, g.value) : 0))
const d = computed(() => Math.min(deduct.value, maxDeduct.value))
const net = computed(() => g.value - d.value)
const a = computed(() => num(advAmount.value))
const DEDUCTS = computed(() => {
  const m = maxDeduct.value
  return [{ v: 0, label: 'ولا شي' }, { v: Math.round(m / 2 / 50) * 50, label: 'نصها' }, { v: m, label: m < (e.value?.adv || 0) ? 'قد الراتب' : 'كلها' }].filter((x, i, arr) => arr.findIndex((y) => y.v === x.v) === i)
})
const ADV_QUICK = computed(() => (monthly.value ? [500, 1000, 2000, 3000] : [100, 200, 500, 1000]))
const overAdv = computed(() => !isPay.value && e.value && e.value.adv + a.value > (monthly.value ? e.value.rate : e.value.rate * 10))
const methodLabel = () => METHODS.find((m) => m.value === how.value).label
const valid = computed(() => (isPay.value ? g.value > 0 && (!monthly.value || g.value <= due.value) : a.value > 0))

function save() {
  if (!valid.value) return
  const x = e.value
  if (isPay.value) {
    const paid = paySalary(x, { gross: g.value, deduct: d.value, method: how.value, methodLabel: methodLabel() })
    toast(monthly.value ? 'انصرف الراتب' : 'انصرفت اليوميات', `${x.name}${d.value ? ` · انخصم ${fmt(d.value)} من سلفته` : ''}`, { amount: paid })
  } else {
    giveAdvance(x, { amount: a.value, method: how.value, methodLabel: methodLabel() })
    toast('انسجّلت السلفة', `${x.name} · عليه هلأ ${fmt(x.adv)} ج`, { amount: a.value })
  }
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" :title="e ? `${isPay ? (monthly ? 'راتب ' : 'يوميات ') : 'سلفة لـ'}${e.name}` : ''" :width="460">
    <template v-if="e">
      <div class="kind" role="radiogroup" aria-label="نوع الصرف">
        <button type="button" role="radio" :aria-checked="isPay" :class="{ on: isPay }" @click="k = 'pay'">{{ monthly ? 'الراتب' : 'اليوميات' }}</button>
        <button type="button" role="radio" :aria-checked="!isPay" :class="{ on: !isPay }" @click="k = 'adv'">سلفة</button>
      </div>

      <template v-if="isPay">
        <div class="basis num">
          <template v-if="monthly"><span>راتب {{ MONTH }}</span><b>{{ fmt(e.rate) }} ج</b><small v-if="e.paidThisMonth">قبض منه {{ fmt(e.paidThisMonth) }} · باقي {{ fmt(due) }}</small></template>
          <template v-else><span>من {{ e.paidThrough + 1 }} لـ {{ TODAY }}/11</span><b>{{ daysLabel(unpaidDays(e)) }} × {{ fmt(e.rate) }}</b><small>= {{ fmt(due) }} ج حسب الحضور</small></template>
        </div>
        <p v-if="!due" class="note">{{ monthly ? 'قبض راتب الشهر كله.' : 'ما إله يوميات مش مدفوعة.' }}</p>
        <label v-else class="amtin">
          <small>{{ monthly ? 'قديش بدك تصرف من الراتب' : 'اليوميات' }}</small>
          <span class="row"><input v-model="gross" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="save" /><em>ج</em></span>
        </label>
        <p v-if="monthly && g > due" class="warn">أكتر من الباقي من راتبه ({{ fmt(due) }}). الزيادة سجّلها سلفة.</p>

        <div v-if="e.adv && due" class="adv">
          <div class="ah"><span>عليه سلفة <b class="num">{{ fmt(e.adv) }} ج</b></span><span>بتخصم منها؟</span></div>
          <div class="quick"><button v-for="q in DEDUCTS" :key="q.label" type="button" class="num" :class="{ on: d === q.v }" @click="deduct = q.v">{{ q.label }}<small v-if="q.v">{{ fmt(q.v) }}</small></button></div>
        </div>
      </template>

      <template v-else>
        <label class="amtin">
          <small>مبلغ السلفة</small>
          <span class="row"><input v-model="advAmount" inputmode="numeric" dir="ltr" aria-label="مبلغ السلفة" @keydown.enter="save" /><em>ج</em></span>
        </label>
        <div class="quick"><button v-for="q in ADV_QUICK" :key="q" type="button" class="num" :class="{ on: a === q }" @click="advAmount = String(q)">{{ fmt(q) }}</button></div>
        <p class="note num">عليه هلأ {{ fmt(e.adv) }} ج، بتصير {{ fmt(e.adv + a) }} ج. بتنخصم من {{ monthly ? 'راتبه' : 'يومياته' }} الجاية.</p>
        <p v-if="overAdv" class="warn">السلف صارت أكبر من {{ monthly ? 'راتب شهر كامل' : 'يوميات أسبوعين' }}.</p>
      </template>

      <div v-if="(isPay && due) || !isPay" class="how" role="radiogroup" aria-label="طريقة الصرف">
        <button v-for="m in METHODS" :key="m.value" type="button" role="radio" :aria-checked="how === m.value" :class="{ on: how === m.value }" @click="how = m.value"><AppIcon :name="m.icon" /><span>{{ m.label }}</span></button>
      </div>
      <div v-if="isPay && due" class="after"><span>بيقبض بإيده</span><b class="num">{{ fmt(net) }} ج</b></div>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton :tone="isPay ? 'ok' : 'primary'" icon="check" :disabled="!valid" @click="save">{{ isPay ? `اصرف ${fmt(net)} ج` : 'اعطيه السلفة' }}</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.kind { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.kind button { border: 0; height: 36px; border-radius: 9px; background: none; font: inherit; font-size: 13px; color: var(--color-muted); cursor: pointer; }
.kind button.on { background: #fff; color: var(--color-primary-ink); font-weight: 700; }
.basis { display: grid; grid-template-columns: 1fr auto; gap: 0 10px; background: #f3f9fa; border-radius: 14px; padding: 10px 14px; font-size: 13px; }
.basis span { color: var(--color-muted); } .basis b { color: var(--color-deep); font-size: 15px; } .basis small { grid-column: 1 / -1; color: var(--color-primary-ink); font-size: 12px; font-weight: 600; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; }
.amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 30px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.adv { display: grid; gap: 8px; background: #fff8ec; border-radius: 14px; padding: 10px 12px; }
.ah { display: flex; justify-content: space-between; font-size: 13px; color: #8a5a00; } .ah b { color: #8a5a00; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; min-height: 36px; padding: 4px 6px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: grid; place-items: center; line-height: 1.3; }
.adv .quick button { background: #fff; }
.quick button small { font-size: 11px; color: var(--color-muted); font-weight: 500; }
.quick button:hover { background: var(--color-primary-pale); }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.how button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 6px; display: grid; justify-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; }
.how button :deep(svg) { width: 22px; height: 22px; }
.how button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 600; }
.note { margin: 0; color: var(--color-muted); font-size: 12.5px; }
.warn { margin: 0; color: #8a5a00; font-size: 12.5px; background: var(--warn-bg); border-radius: 10px; padding: 6px 10px; }
.after { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; background: #e9f6ee; border-radius: 12px; padding: 10px 14px; }
.after b { font-size: 20px; color: var(--color-positive); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; }
.acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
