<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import { USER, CASH, fmt } from '../../data/demo.js'
import { DENOMS, closeDay, todayIn, todayOut } from '../../data/safe.js'
import { toast } from '../../composables/useToast.js'

// Close the day in two clear steps: 1) count the drawer — note by note, or type the total if it's already counted;
// 2) compare with what the drawer should hold, give a reason for any difference, and lock the day.
const open = defineModel({ type: Boolean, default: false })
const how = ref('notes')
const counts = ref({})
const direct = ref('')
const note = ref('')
const tried = ref(false)
watch(open, (v) => { if (v) { how.value = 'notes'; counts.value = Object.fromEntries(DENOMS.map((d) => [d, ''])); direct.value = ''; note.value = ''; tried.value = false } })
const num = (x) => Number(String(x).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const byNotes = computed(() => DENOMS.reduce((a, d) => a + d * num(counts.value[d]), 0))
const counted = computed(() => (how.value === 'notes' ? byNotes.value : num(direct.value)))
const expected = computed(() => CASH.drawer)
const diff = computed(() => counted.value - expected.value)
const pct = computed(() => (expected.value ? Math.min(100, (counted.value / expected.value) * 100) : 0))
const step = (d, k) => { counts.value[d] = String(Math.max(0, num(counts.value[d]) + k)) }
const nameOf = (d) => (d < 1 ? 'نص جنيه' : d === 1 ? 'جنيه' : `${d} جنيه`)

function save() {
  tried.value = true
  if (!counted.value || (diff.value && !note.value.trim())) return
  const rec = closeDay({ counted: counted.value, note: note.value.trim(), by: USER.name })
  open.value = false
  toast('انقفل اليوم', rec.diff ? `${rec.diff > 0 ? 'زيادة' : 'عجز'} ${fmt(Math.abs(rec.diff))} ج · ${rec.note}` : 'الدرج مطابق بالزبط', { amount: rec.counted })
}
</script>

<template>
  <AppModal v-model="open" title="قفل اليوم" :width="540">
    <div class="sum3 num">
      <div><small>دخل اليوم</small><b class="in">{{ fmt(todayIn()) }}</b></div>
      <div><small>طلع اليوم</small><b class="out">{{ fmt(todayOut()) }}</b></div>
      <div class="exp"><small>لازم يكون بالدرج</small><b>{{ fmt(expected) }} ج</b></div>
    </div>

    <section class="stepbox">
      <h4><span class="no">1</span>عدّ الفلوس اللي بالدرج</h4>
      <div class="seg" role="radiogroup" aria-label="طريقة العد">
        <button type="button" role="radio" :aria-checked="how === 'notes'" :class="{ on: how === 'notes' }" @click="how = 'notes'">فئة فئة</button>
        <button type="button" role="radio" :aria-checked="how === 'total'" :class="{ on: how === 'total' }" @click="how = 'total'">عدّيته، بكتب المجموع</button>
      </div>

      <div v-if="how === 'notes'" class="rows">
        <div class="rh"><span>الفئة</span><span>كم ورقة</span><span>المبلغ</span></div>
        <div v-for="d in DENOMS" :key="d" class="row" :class="{ has: num(counts[d]) }">
          <span class="note num" :class="'n' + String(d).replace('.', '')">{{ d < 1 ? '½' : d }}<small>{{ nameOf(d) }}</small></span>
          <span class="stepper">
            <button type="button" :aria-label="`نقّص ${nameOf(d)}`" @click="step(d, -1)">−</button>
            <input v-model="counts[d]" inputmode="numeric" dir="ltr" placeholder="0" :aria-label="`كم ورقة ${nameOf(d)}`" />
            <button type="button" :aria-label="`زيد ${nameOf(d)}`" @click="step(d, 1)">+</button>
          </span>
          <b class="line num">{{ num(counts[d]) ? fmt(d * num(counts[d])) : '—' }}</b>
        </div>
      </div>
      <label v-else class="amtin"><small>المبلغ اللي عدّيته</small><span class="r"><input v-model="direct" inputmode="numeric" dir="ltr" aria-label="المبلغ المعدود" /><em>ج</em></span></label>
    </section>

    <section class="stepbox">
      <h4><span class="no">2</span>قارن مع اللي لازم يكون</h4>
      <div class="cmp" :class="!counted ? '' : diff === 0 ? 'ok' : diff > 0 ? 'more' : 'less'">
        <div class="pair num">
          <span><small>عدّيت</small><b>{{ fmt(counted) }}</b></span>
          <span class="vs">من</span>
          <span><small>لازم</small><b>{{ fmt(expected) }}</b></span>
        </div>
        <div class="bar"><i :style="{ width: pct + '%' }" /></div>
        <p class="verdict num">{{ !counted ? 'لسا ما عدّيت' : diff === 0 ? '✓ الدرج مطابق بالزبط' : diff > 0 ? `زيادة ${fmt(diff)} ج عن المفروض` : `ناقص ${fmt(-diff)} ج عن المفروض` }}</p>
      </div>
      <p v-if="tried && !counted" class="err">عدّ الدرج قبل القفل</p>
      <FilledInput v-if="counted && diff" v-model="note" label="ليش في فرق؟" placeholder="مثلاً: مصروف ما انسجّل، فكة ناقصة" :error="tried && !note.trim() ? 'اكتب سبب الفرق' : ''" />
    </section>

    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="lock" @click="save">اقفل اليوم</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.sum3 { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 8px; }
.sum3 div { background: #f6f9f9; border-radius: 12px; padding: 8px 12px; } .sum3 small { display: block; color: var(--color-muted); font-size: 11.5px; }
.sum3 b { font-size: 17px; color: var(--color-deep); } .sum3 .in { color: var(--color-positive); } .sum3 .out { color: var(--color-negative); }
.sum3 .exp { background: var(--color-primary-pale); } .sum3 .exp b { color: var(--color-primary-ink); font-size: 19px; }
.stepbox { display: grid; gap: 10px; }
h4 { margin: 0; font-size: 14.5px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.no { width: 24px; height: 24px; border-radius: 50%; background: var(--color-deep); color: #fff; display: grid; place-items: center; font-size: 12px; }
.seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.seg button { border: 0; height: 34px; border-radius: 9px; background: none; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; }
.seg button.on { background: #fff; color: var(--color-primary-ink); font-weight: 700; }
.rows { display: grid; gap: 5px; max-height: 300px; overflow-y: auto; padding: 2px; }
.rh { display: grid; grid-template-columns: 110px 1fr 90px; gap: 10px; font-size: 11.5px; color: var(--color-muted); padding: 0 8px; }
.rh span:last-child { text-align: left; }
.row { display: grid; grid-template-columns: 110px 1fr 90px; gap: 10px; align-items: center; background: #f7fafa; border-radius: 12px; padding: 6px 8px; transition: background .15s; }
.row.has { background: #fff; box-shadow: inset 0 0 0 1.5px #d6e8eb; }
.note { height: 38px; border-radius: 7px; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 800; font-size: 16px; color: #1f2e2b; box-shadow: inset 0 -3px 0 rgb(0 0 0 / .08); }
.note small { font-size: 10.5px; font-weight: 600; opacity: .7; }
.n200 { background: #d9c9f0; } .n100 { background: #f3d6a4; } .n50 { background: #c7e3f5; } .n20 { background: #d4ecc4; } .n10 { background: #f3c9c4; } .n5 { background: #e8e0c4; }
.n1, .n05 { background: #e4e8ea; border-radius: 19px; }
.stepper { display: flex; align-items: center; background: var(--color-field); border-radius: 10px; justify-self: center; }
.stepper button { width: 38px; height: 38px; border: 0; background: none; font-size: 20px; color: var(--color-primary-ink); cursor: pointer; border-radius: 10px; }
.stepper button:hover { background: var(--color-primary-pale); }
.stepper input { width: 56px; height: 38px; border: 0; background: transparent; text-align: center; font: inherit; font-size: 16px; font-weight: 700; outline: 0; }
.stepper:focus-within { box-shadow: inset 0 0 0 2px var(--color-primary); background: #fff; }
.line { text-align: left; font-size: 14px; color: var(--color-deep); }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; } .amtin .r { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 28px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.cmp { --c: var(--color-muted); --bg: #f6f9f9; background: var(--bg); border-radius: 14px; padding: 12px 16px; display: grid; gap: 8px; transition: background .2s; }
.cmp.ok { --c: var(--color-positive); --bg: var(--pos-bg); } .cmp.more { --c: #b07a12; --bg: var(--warn-bg); } .cmp.less { --c: var(--color-negative); --bg: var(--neg-bg); }
.pair { display: flex; align-items: flex-end; gap: 12px; }
.pair small { display: block; color: var(--color-muted); font-size: 11.5px; } .pair b { font-size: 24px; color: var(--color-deep); line-height: 1.2; }
.pair span:first-child b { color: var(--c); } .vs { color: var(--color-muted); padding-bottom: 4px; }
.bar { height: 8px; border-radius: 4px; background: rgb(11 59 69 / .1); overflow: hidden; } .bar i { display: block; height: 100%; border-radius: 4px; background: var(--c); transition: width .4s; }
.verdict { margin: 0; font-weight: 700; color: var(--c); font-size: 14px; }
.err { margin: 0; color: var(--color-negative); font-size: 12px; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
@media (max-width: 480px) { .rh, .row { grid-template-columns: 90px 1fr 70px; } .sum3 { grid-template-columns: 1fr 1fr; } .sum3 .exp { grid-column: 1 / -1; } }
</style>
