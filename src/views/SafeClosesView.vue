<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import { CASHBOOK, fmt } from '../data/demo.js'
import { toast } from '../composables/useToast.js'

// Every day's close: what the drawer should have held, what was counted, and the difference with its reason.
const filter = ref('all')
const FILTERS = computed(() => [
  { value: 'all', label: 'كل الأيام', hint: CASHBOOK.closes.length },
  { value: 'match', label: 'مطابق', hint: CASHBOOK.closes.filter((c) => !c.diff).length },
  { value: 'short', label: 'عجز', hint: CASHBOOK.closes.filter((c) => c.diff < 0).length },
  { value: 'over', label: 'زيادة', hint: CASHBOOK.closes.filter((c) => c.diff > 0).length },
])
const list = computed(() => CASHBOOK.closes.filter((c) => filter.value === 'all' || (filter.value === 'match' && !c.diff) || (filter.value === 'short' && c.diff < 0) || (filter.value === 'over' && c.diff > 0)))
const page = ref(1)
const size = ref(10)
watch([filter, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))
const short = computed(() => CASHBOOK.closes.filter((c) => c.diff < 0).reduce((a, c) => a + c.diff, 0))
const over = computed(() => CASHBOOK.closes.filter((c) => c.diff > 0).reduce((a, c) => a + c.diff, 0))
const matched = computed(() => CASHBOOK.closes.filter((c) => !c.diff).length)
function exportList() {
  const head = ['التاريخ', 'الساعة', 'دخل', 'طلع', 'لازم بالدرج', 'العد', 'الفرق', 'السبب', 'قفل']
  const rows = list.value.map((c) => [c.date, c.time, c.inSum, c.outSum, c.expected, c.counted, c.diff, c.note, c.by])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'سجل-قفل-الخزنة.csv' })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} يوم · بيفتح بالإكسل`)
}
/* three figure cards, same look as every page */
const cards = computed(() => {
  const n = CASHBOOK.closes.length || 1
  const shortDays = CASHBOOK.closes.filter((c) => c.diff < 0).length, overDays = CASHBOOK.closes.filter((c) => c.diff > 0).length
  const worst = CASHBOOK.closes.filter((c) => c.diff < 0).sort((a, b) => a.diff - b.diff)[0]
  return [
    { label: 'أيام مطابقة', icon: 'check', tone: 'green', value: matched.value, unit: `من ${CASHBOOK.closes.length} يوم`, bar: (matched.value / n) * 100, sub: matched.value === CASHBOOK.closes.length ? 'كل الأيام مطابقة' : 'الدرج طلع بالزبط بهالأيام' },
    { label: 'مجموع العجز', icon: 'alert', tone: 'red', value: fmt(Math.abs(short.value)), unit: 'ج', bar: (shortDays / n) * 100, sub: worst ? `${shortDays} أيام · أكبره ${fmt(-worst.diff)} يوم ${worst.date.slice(0, 5)}` : 'ما في عجز' },
    { label: 'مجموع الزيادة', icon: 'in', tone: 'amber', value: fmt(over.value), unit: 'ج', bar: (overDays / n) * 100, sub: overDays ? `${overDays} أيام فيها زيادة` : 'ما في زيادة' },
  ]
})
</script>

<template>
  <div class="page closes">
    <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/safe">الخزنة</RouterLink><AppIcon name="next" /><span>سجل القفل</span></nav>
    <header class="dhead">
      <div class="hello"><h1>سجل قفل الخزنة</h1><p class="num">{{ CASHBOOK.closes.length }} يوم · {{ matched }} مطابق</p></div>
      <div class="actions"><SoftButton icon="out" @click="exportList">تصدير</SoftButton></div>
    </header>
    <div class="grid">
      <div class="s12 sums">
        <div v-for="(k, i) in cards" :key="k.label" class="sum" :class="k.tone" :style="{ '--i': i }">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span v-if="k.unit">{{ k.unit }}</span></b>
          <span class="bar"><i :style="{ width: k.bar + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </div>
      </div>
      <div class="s12 findbar"><SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر الأيام" /></div>
      <div class="s12 tbl-wrap tblcard">
        <table class="tbl">
          <thead><tr><th>اليوم</th><th>دخل</th><th>طلع</th><th>لازم بالدرج</th><th>العد</th><th>الفرق</th><th>السبب</th></tr></thead>
          <tbody>
            <tr v-for="c in paged" :key="c.date + c.time">
              <td><b class="num">{{ c.date }}</b><small class="dd num">قفل {{ c.time }} · {{ c.by }}</small></td>
              <td class="num inc">{{ fmt(c.inSum) }}</td>
              <td class="num outc">{{ fmt(c.outSum) }}</td>
              <td class="num">{{ fmt(c.expected) }}</td>
              <td class="num cnt">{{ fmt(c.counted) }}</td>
              <td><span class="diff num" :class="!c.diff ? 'ok' : c.diff < 0 ? 'bad' : 'warn'">{{ !c.diff ? 'مطابق' : (c.diff > 0 ? '+' : '−') + fmt(Math.abs(c.diff)) }}</span></td>
              <td class="why">{{ c.note || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="list.length" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="يوم" /></div>
    </div>
  </div>
</template>

<style scoped>
.closes .grid > * { min-width: 0; }
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; } .crumb a:hover { text-decoration: underline; text-underline-offset: 3px; } .crumb :deep(svg) { width: 15px; height: 15px; }
.sums { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.sum { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px 16px;
  background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; animation: sum-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.sum::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.sum > * { position: relative; z-index: 1; }
.sum.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); } .sum.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); } .sum.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.sum .th { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .sum .th small { color: var(--color-muted); font-size: 12px; } .sum .th :deep(svg) { width: 20px; height: 20px; }
.sum b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .sum b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.sum .bar { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; } .sum .bar i { display: block; height: 100%; border-radius: 3px; background: var(--fg); animation: bar-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.sum .sub { font-size: 11.5px; color: var(--color-muted); }
@keyframes sum-in { from { opacity: 0; transform: translateY(10px); } } @keyframes bar-in { from { width: 0; } }
.findbar { position: relative; z-index: 5; } .fsel { width: 210px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 760px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 10px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.dd { display: block; color: var(--color-muted); font-size: 11px; }
.inc { color: var(--color-positive); font-weight: 600; } .outc { color: var(--color-negative); font-weight: 600; } .cnt { font-weight: 700; color: var(--color-deep); }
.diff { display: inline-flex; height: 24px; align-items: center; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.diff.ok { background: var(--pos-bg); color: var(--pos-ink); } .diff.bad { background: var(--neg-bg); color: var(--neg-ink); } .diff.warn { background: var(--warn-bg); color: var(--warn-ink); }
.why { white-space: normal; color: var(--color-muted); font-size: 12.5px; }
@media (max-width: 700px) { .sums { grid-template-columns: 1fr; } }
</style>
