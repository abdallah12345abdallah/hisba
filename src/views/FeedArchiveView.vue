<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import DebitNote from '../components/feed/DebitNote.vue'
import { fmt } from '../data/demo.js'
import { SETTLED } from '../data/feed.js'
import { toast } from '../composables/useToast.js'

// Archive of feed settlements: every debit note issued, searchable, each one opens as its document (print / WhatsApp).
const q = ref('')
const pay = ref('all')
const PAYS = computed(() => [
  { value: 'all', label: 'كل التسويات', hint: SETTLED.list.length },
  { value: 'deduct', label: 'خصم من البيع', hint: SETTLED.list.filter((s) => s.pay === 'deduct').length },
  { value: 'cash', label: 'نقدي', hint: SETTLED.list.filter((s) => s.pay === 'cash').length },
])
const list = computed(() => SETTLED.list.filter((s) => (!q.value || s.name.includes(q.value.trim()) || String(s.no).includes(q.value.trim())) && (pay.value === 'all' || s.pay === pay.value)))
const page = ref(1)
const size = ref(10)
watch([q, pay, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))
const sums = computed(() => ({ factory: list.value.reduce((a, s) => a + s.factory, 0), markup: list.value.reduce((a, s) => a + s.markup, 0), total: list.value.reduce((a, s) => a + s.total, 0) }))

const noteOpen = ref(false)
const note = ref(null)
function showNote(n) { note.value = n; noteOpen.value = true }
function exportList() {
  const head = ['رقم الإشعار', 'التاريخ', 'المزرعة', 'طن', 'بسعر المصنع', 'الزيادة', 'المطلوب', 'الدفع', 'جزئية']
  const rows = list.value.map((s) => [s.no, s.date, s.name, s.tons, s.factory, s.markup, s.total, s.pay === 'deduct' ? 'خصم من البيع' : 'نقدي', s.partial ? 'نعم' : ''])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `تسويات-العلف-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} تسوية · بيفتح بالإكسل`)
}
/* three figure cards, same look as every page */
const cards = computed(() => {
  const s = sums.value, t = s.total || 1
  return [
    { label: 'بسعر المصنع', icon: 'feed', tone: 'amber', value: fmt(s.factory), unit: 'ج', bar: (s.factory / t) * 100, sub: `${list.value.length} تسوية · ${list.value.reduce((a, x) => a + x.tons, 0).toFixed(1)} طن` },
    { label: 'الزيادة (ربح الوكالة)', icon: 'share', tone: 'green', value: fmt(s.markup), unit: 'ج', bar: (s.markup / t) * 100 * 8, sub: s.factory ? `متوسطها ${((s.markup / s.factory) * 100).toFixed(1)}% فوق سعر المصنع` : '—' },
    { label: 'المجموع', icon: 'receipt', tone: 'teal', value: fmt(s.total), unit: 'ج', bar: 100, sub: `${list.value.filter((x) => x.pay === 'deduct').length} خصم من البيع · ${list.value.filter((x) => x.pay === 'cash').length} نقدي` },
  ]
})
</script>

<template>
  <div class="page feedarch">
    <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/feed">العلف</RouterLink><AppIcon name="next" /><span>أرشيف التسويات</span></nav>
    <header class="dhead">
      <div class="hello">
        <h1>أرشيف التسويات</h1>
        <p class="num">{{ SETTLED.count }} إشعار إضافة · <b>{{ fmt(SETTLED.amount) }} ج</b> هالموسم</p>
      </div>
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
      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر بالمزرعة أو رقم الإشعار" />
        <SelectMenu v-model="pay" :options="PAYS" class="fsel" aria-label="فلتر الدفع" />
      </div>
      <div class="s12">
        <EmptyState v-if="!list.length" icon="receipt" title="ما في تسويات هون" text="جرّب اسم تاني أو فلتر تاني." />
        <div v-else class="tbl-wrap tblcard">
          <table class="tbl">
            <thead><tr><th>الإشعار</th><th>المزرعة</th><th>الكمية</th><th>بسعر المصنع</th><th>الزيادة</th><th>المطلوب</th><th>الدفع</th><th><span class="sr">عرض</span></th></tr></thead>
            <TransitionGroup name="list" tag="tbody">
              <tr v-for="s in paged" :key="s.no">
                <td><b class="num">#{{ s.no }}</b><small class="dd num">{{ s.date }}{{ s.partial ? ' · جزئية' : '' }}</small></td>
                <td><RouterLink :to="`/feed/${encodeURIComponent(s.name)}`" class="farm">{{ s.name }}</RouterLink></td>
                <td class="num">{{ s.tons }} طن</td>
                <td class="num">{{ fmt(s.factory) }}</td>
                <td class="num mkv">+ {{ fmt(s.markup) }}</td>
                <td class="num amt">{{ fmt(s.total) }}</td>
                <td><span class="paytag" :class="s.pay">{{ s.pay === 'deduct' ? 'خصم من البيع' : 'نقدي' }}</span></td>
                <td class="ops"><SoftButton size="sm" icon="receipt" @click="showNote(s)">الإشعار</SoftButton></td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
      </div>
      <div v-if="list.length" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="تسوية" /></div>
    </div>
    <DebitNote v-model="noteOpen" :note="note" />
  </div>
</template>

<style scoped>
.feedarch .grid > * { min-width: 0; }
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
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; } .findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 210px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 860px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 10px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.dd { display: block; color: var(--color-muted); font-size: 11px; }
.farm { color: var(--color-ink); font-weight: 700; text-decoration: none; } .farm:hover { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.mkv { color: #b4532a; font-weight: 600; } .amt { font-weight: 700; color: #8a5a00; font-size: 15px; }
.paytag { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.paytag.deduct { background: var(--color-primary-pale); color: var(--color-primary-ink); } .paytag.cash { background: var(--pos-bg); color: var(--pos-ink); }
.ops { width: 1%; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 700px) { .sums { grid-template-columns: 1fr; } }
</style>
