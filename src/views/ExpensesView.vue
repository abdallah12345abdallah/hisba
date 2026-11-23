<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import BarChart from '../components/ui/BarChart.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import ExpenseForm from '../components/expenses/ExpenseForm.vue'
import BudgetsDialog from '../components/expenses/BudgetsDialog.vue'
import RecurringForm from '../components/expenses/RecurringForm.vue'
import RecurringDialog from '../components/expenses/RecurringDialog.vue'
import { fmt } from '../data/demo.js'
import { walletLabel } from '../data/safe.js'
import { CATS, catOf, allExpenses, removeExpense, EXPENSES, RECURRING, isPaid, dueIn, markPaid } from '../data/expenses.js'
import { toast } from '../composables/useToast.js'

// Expenses: one meter (spent vs where the budget should be today) + the one fixed expense that needs paying,
// then search, the table or the categories, and the last 14 days below. Every expense is also a move in the safe.
const all = computed(() => allExpenses())
const monthSum = computed(() => all.value.reduce((a, e) => a + e.amount, 0))
const todaySum = computed(() => all.value.filter((e) => e.day === 22).reduce((a, e) => a + e.amount, 0))
const byCat = computed(() => CATS.map((c) => {
  const items = all.value.filter((e) => e.cat === c.key)
  const spent = items.reduce((a, e) => a + e.amount, 0)
  return { ...c, spent, count: items.length, pct: c.budget ? (spent / c.budget) * 100 : 0 }
}))
const topCat = computed(() => [...byCat.value].sort((a, b) => b.spent - a.spent)[0])
const budgetAll = computed(() => CATS.reduce((a, c) => a + c.budget, 0))
const overCats = computed(() => byCat.value.filter((c) => c.pct > 100))
const unpaid = computed(() => RECURRING.filter((r) => !isPaid(r)).sort((a, b) => dueIn(a) - dueIn(b)))
/* the meter: spent so far vs where the budget says we should be today */
const DAY = 22, MONTH_DAYS = 30
const paceNow = computed(() => Math.round(budgetAll.value * (DAY / MONTH_DAYS)))
const ahead = computed(() => monthSum.value > paceNow.value * 1.05)
const urgent = computed(() => unpaid.value[0] || null)
const recListOpen = ref(false)
const vsLast = computed(() => Math.round(((monthSum.value - EXPENSES.lastMonth) / EXPENSES.lastMonth) * 100))

function pickTop(k) {
  if (k === 'today') { period.value = period.value === 'today' ? 'month' : 'today' }
  if (k === 'month') { period.value = 'month'; cat.value = 'all' }
  if (k === 'top') { cat.value = cat.value === topCat.value.key ? 'all' : topCat.value.key; view.value = 'table' }
}

/* search + filters */
const q = ref('')
const cat = ref('all')
const period = ref('month')
const CAT_OPTS = computed(() => [{ value: 'all', label: 'كل البنود', hint: all.value.length }, ...byCat.value.filter((c) => c.count).map((c) => ({ value: c.key, label: c.label, hint: c.count }))])
const PERIODS = [{ value: 'today', label: 'اليوم' }, { value: 'week', label: 'آخر 7 أيام' }, { value: 'month', label: 'هالشهر' }]
const list = computed(() => all.value
  .filter((e) => period.value === 'month' || (period.value === 'today' && e.day === 22) || (period.value === 'week' && e.day >= 16))
  .filter((e) => cat.value === 'all' || e.cat === cat.value)
  .filter((e) => !q.value || `${e.desc} ${e.note} ${catOf(e.cat).label}`.includes(q.value.trim())))
const listSum = computed(() => list.value.reduce((a, e) => a + e.amount, 0))

/* table or categories */
const view = ref('table')
const VIEWS = [{ value: 'table', label: 'جدول', icon: 'rows' }, { value: 'cats', label: 'البنود والميزانية', icon: 'target' }]
const vtogEl = ref(null)
const vthumb = ref({ left: '4px', width: '0px', opacity: 0 })
function placeVthumb() { const b = vtogEl.value?.querySelector('button.on'); if (b) vthumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 } }
watch(view, () => nextTick(placeVthumb))
onMounted(() => { nextTick(placeVthumb); document.fonts?.ready.then(placeVthumb); window.addEventListener('resize', placeVthumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeVthumb))
const page = ref(1)
const size = ref(10)
watch([q, cat, period, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))
function openCat(k) { cat.value = k; view.value = 'table' }
const tone = (c) => (c.pct > 100 ? 'over' : c.pct >= 80 ? 'near' : 'fine')

/* last 14 days */
const bars = computed(() => Array.from({ length: 14 }, (_, i) => {
  const day = 9 + i
  const closed = new Date(2026, 10, day).getDay() === 5
  return { key: day, label: `${day}/11`, value: all.value.filter((e) => e.day === day).reduce((a, e) => a + e.amount, 0), highlight: day === 22, gap: closed }
}))
const short = (v) => (v >= 1000 ? `${v / 1000}k` : String(v))

/* actions */
const formOpen = ref(false)
const editFor = ref(null)
const preset = ref(null)
let paying = null
function addNew() { editFor.value = null; preset.value = null; paying = null; formOpen.value = true }
function editExpense(e) { editFor.value = e; preset.value = null; paying = null; formOpen.value = true }
function payRecurring(r) { recListOpen.value = false; editFor.value = null; preset.value = { ...r }; paying = r; setTimeout(() => { formOpen.value = true }, 150) }
function onSaved() { if (paying) { markPaid(paying); paying = null } }
const toDelete = ref(null)
const askDelete = ref(false)
function confirmDelete(e) { toDelete.value = e; askDelete.value = true }
function doDelete() { const e = toDelete.value; const undo = removeExpense(e); toast('انحذف المصروف', `${e.desc} · ${fmt(e.amount)} ج`, { tone: 'info', action: { label: 'تراجع', run: undo } }) }
const budgetsOpen = ref(false)
const recOpen = ref(false)
const recFor = ref(null)
function editRec(r) { recListOpen.value = false; recFor.value = r; setTimeout(() => { recOpen.value = true }, 200) }
function exportList() {
  const head = ['التاريخ', 'الوقت', 'البند', 'البيان', 'المحفظة', 'المبلغ', 'ملاحظة']
  const rows = list.value.map((e) => [`${e.day}/11/2026`, e.time, catOf(e.cat).label, e.desc, walletLabel(e.method), e.amount, e.note])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `المصاريف-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} مصروف · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page expenses">
    <header class="dhead">
      <div class="hello">
        <h1>المصاريف</h1>
        <p class="num">كل مصروف بينزل من الخزنة<template v-if="overCats.length"> · <span class="hl neg">{{ overCats.length }} بند تعدّى ميزانيته</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="target" @click="budgetsOpen = true">الميزانيات</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="addNew">مصروف جديد</SoftButton>
      </div>
    </header>

    <div class="grid">
      <!-- one meter (approved 1): how much of the budget is gone, and is that ahead of where it should be today -->
      <section class="s12 meter-card">
        <div class="mtop">
          <div><small>صرفت هالشهر</small><div class="big num">{{ fmt(monthSum) }} <small>من {{ fmt(budgetAll) }} ج</small></div></div>
          <div class="state" :class="ahead ? 'bad' : 'good'"><b>{{ ahead ? 'أسرع من المفروض' : 'ماشي تمام ✓' }}</b><small class="num">المفروض لليوم {{ fmt(paceNow) }} · {{ ahead ? 'زيادة' : 'فرق' }} {{ fmt(Math.abs(monthSum - paceNow)) }}</small></div>
        </div>
        <div class="meter" role="progressbar" :aria-valuenow="Math.round((monthSum / budgetAll) * 100)" aria-valuemax="100" aria-label="الصرف من الميزانية">
          <i :class="{ bad: ahead }" :style="{ width: Math.min(100, (monthSum / budgetAll) * 100) + '%' }" /><u :style="{ insetInlineStart: (DAY / MONTH_DAYS) * 100 + '%' }"><span>المفروض لليوم</span></u>
        </div>
        <div class="facts num">
          <button type="button" @click="pickTop('today')">اليوم <b>{{ fmt(todaySum) }} ج</b></button>
          <button type="button" @click="pickTop('top')">أكتر بند <b>{{ topCat.label }}</b></button>
          <span>باقي بالشهر <b>{{ MONTH_DAYS - DAY }} أيام</b></span>
          <span>عن الشهر الماضي <b :class="vsLast > 0 ? 'up' : 'down'">{{ vsLast > 0 ? '+' : '' }}{{ vsLast }}%</b></span>
        </div>
      </section>
      <div class="s12 duerow" :class="urgent && dueIn(urgent) < 0 ? 'late' : urgent ? 'soon' : 'clear'">
        <AppIcon :name="urgent ? 'repeat' : 'check'" />
        <span class="t" v-if="urgent"><b>{{ urgent.name }} {{ dueIn(urgent) < 0 ? `متأخر ${-dueIn(urgent)} يوم` : dueIn(urgent) === 0 ? 'موعده اليوم' : `بعد ${dueIn(urgent)} يوم` }}</b><small class="num">{{ fmt(urgent.amount) }} ج · موعده يوم {{ urgent.day }} بالشهر</small></span>
        <span class="t" v-else><b>كل المصاريف الثابتة لهالشهر مدفوعة</b></span>
        <SoftButton v-if="urgent" size="sm" :tone="dueIn(urgent) < 0 ? 'danger' : 'primary'" @click="payRecurring(urgent)">ادفع هلأ</SoftButton>
        <button type="button" class="link" @click="recListOpen = true">كل الثابت ({{ RECURRING.length }})</button>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على مصروف" />
        <SelectMenu v-model="cat" :options="CAT_OPTS" class="fsel" aria-label="البند" />
        <SelectMenu v-model="period" :options="PERIODS" class="psel" aria-label="الفترة" />
        <span class="lsum num">المجموع <b>{{ fmt(listSum) }} ج</b></span>
        <div ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <Transition name="swap" mode="out-in">
          <div v-if="view === 'cats'" key="cats" class="catgrid">
            <button v-for="(c, i) in byCat" :key="c.key" type="button" class="catc" :class="tone(c)" :style="{ '--i': i }" @click="openCat(c.key)">
              <span class="ch2"><span class="ic"><AppIcon :name="c.icon" /></span><b>{{ c.label }}</b><span class="pct num">{{ Math.round(c.pct) }}%</span></span>
              <span class="amt num">{{ fmt(c.spent) }} <small>من {{ fmt(c.budget) }}</small></span>
              <span class="bar"><i :style="{ width: Math.min(100, c.pct) + '%' }" /></span>
              <span class="ft num"><span>{{ c.pct > 100 ? `تعدّى بـ ${fmt(c.spent - c.budget)} ج` : c.spent === c.budget ? 'خلصت ميزانيته' : `بيضل ${fmt(c.budget - c.spent)} ج` }}</span><span>{{ c.count }} مصروف</span></span>
            </button>
          </div>
          <div v-else key="table">
            <EmptyState v-if="!list.length" icon="receipt" title="ما في مصاريف هون" text="غيّر البند أو الفترة، أو سجّل مصروف جديد." />
            <div v-else class="tbl-wrap tblcard">
              <table class="tbl">
                <thead><tr><th>اليوم</th><th>البيان</th><th>البند</th><th>المحفظة</th><th>المبلغ</th><th><span class="sr">إجراءات</span></th></tr></thead>
                <TransitionGroup name="list" tag="tbody">
                  <tr v-for="e in paged" :key="e.id">
                    <td class="num d"><b>{{ e.day === 22 ? 'اليوم' : `${e.day}/11` }}</b><small>{{ e.time }}</small></td>
                    <td><b class="desc">{{ e.desc }}</b><small v-if="e.note" class="note">{{ e.note }}</small></td>
                    <td><span class="cattag"><AppIcon :name="catOf(e.cat).icon" />{{ catOf(e.cat).label }}</span></td>
                    <td><span class="wtag">{{ walletLabel(e.method) }}</span></td>
                    <td class="num amt">{{ fmt(e.amount) }}</td>
                    <td class="ops"><div class="opsin">
                      <button type="button" class="go" @click="editExpense(e)"><AppIcon name="edit" />تعديل</button>
                      <button type="button" class="go del" @click="confirmDelete(e)"><AppIcon name="trash" />حذف</button>
                    </div></td>
                  </tr>
                </TransitionGroup>
              </table>
            </div>
          </div>
        </Transition>
      </div>
      <div v-if="view === 'table' && list.length" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="مصروف" :sizes="[10, 20, 50]" /></div>

      <section class="s12 card chartcard">
        <div class="ch"><h2>الصرف آخر 14 يوم</h2><span class="meta num">المتوسط {{ fmt(Math.round(bars.filter((b) => !b.gap).reduce((a, b) => a + b.value, 0) / (bars.filter((b) => !b.gap).length || 1))) }} ج باليوم</span></div>
        <div class="chartbox2"><BarChart :bars="bars" :step="1000" :label-every="2" :short="short" aria-label="المصاريف آخر 14 يوم" /></div>
      </section>

    </div>

    <ExpenseForm v-model="formOpen" :expense="editFor" :preset="preset" @saved="onSaved" />
    <BudgetsDialog v-model="budgetsOpen" />
    <RecurringForm v-model="recOpen" :item="recFor" />
    <RecurringDialog v-model="recListOpen" @pay="payRecurring" @edit="editRec" @add="editRec(null)" />
    <ConfirmDialog v-model="askDelete" :title="toDelete ? `تحذف ${toDelete.desc}؟` : ''" confirm="احذف المصروف"
      :text="toDelete ? `${fmt(toDelete.amount)} ج من ${walletLabel(toDelete.method)}. ${toDelete.entry ? 'المبلغ بيرجع للخزنة.' : ''}` : ''" @confirm="doDelete" />
  </div>
</template>

<style scoped>
.expenses .grid > * { min-width: 0; }
@keyframes top-in { from { opacity: 0; transform: translateY(10px); } } @keyframes share-in { from { width: 0; } }
.meter-card { background: #fff; border-radius: 20px; padding: 18px 22px; display: grid; gap: 14px; animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; }
.mtop { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; }
.mtop small { color: var(--color-muted); font-size: 12.5px; }
.big { font-size: 34px; font-weight: 700; color: var(--color-deep); line-height: 1.15; } .big small { font-size: 15px; font-weight: 500; }
.state { text-align: left; display: grid; } .state b { font-size: 17px; } .state.good b { color: var(--color-positive); } .state.bad b { color: var(--color-negative); } .state small { font-size: 12px; }
.meter { position: relative; height: 14px; border-radius: 7px; background: #e9f0f0; margin-top: 14px; }
.meter i { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: 7px; background: linear-gradient(90deg, #2dd4bf, var(--color-primary)); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: share-in 1s cubic-bezier(.2, .9, .25, 1) .2s both; }
.meter i.bad { background: linear-gradient(90deg, #f59e8b, var(--color-negative)); }
.meter u { position: absolute; top: -6px; bottom: -6px; width: 3px; margin-inline-start: -1px; border-radius: 2px; background: var(--color-deep); }
.meter u span { position: absolute; bottom: calc(100% + 3px); left: 50%; transform: translateX(-50%); font-size: 10.5px; font-weight: 600; color: var(--color-deep); white-space: nowrap; text-decoration: none; }
.facts { display: flex; gap: 22px; flex-wrap: wrap; font-size: 13px; color: var(--color-muted); border-top: 1px dashed var(--color-line); padding-top: 10px; }
.facts button { border: 0; background: none; padding: 0; font: inherit; color: inherit; cursor: pointer; } .facts button:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.facts b { color: var(--color-ink); font-weight: 600; } .facts b.up { color: #8a5a00; } .facts b.down { color: var(--color-positive); }
.duerow { display: flex; align-items: center; gap: 12px; border-radius: 14px; padding: 10px 14px; background: var(--color-primary-pale); color: var(--color-primary-ink); }
.duerow > :deep(svg) { width: 20px; height: 20px; flex: none; }
.duerow.late { background: var(--neg-bg); color: var(--neg-ink); } .duerow.clear { background: var(--pos-bg); color: var(--pos-ink); }
.duerow .t { flex: 1; min-width: 0; } .duerow b { font-weight: 700; } .duerow small { display: block; font-size: 12px; opacity: .85; }
.duerow .link { border: 0; background: none; padding: 0; font: inherit; font-size: 12.5px; font-weight: 600; color: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; white-space: nowrap; }
.chartcard .chartbox2 :deep(svg) { width: 100%; height: auto; max-height: 260px; }
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 280px; max-width: 100%; } .findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 200px; } .psel { width: 150px; } .fsel :deep(.trig), .psel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.psel { min-width: 0; } .psel :deep(.sel) { min-width: 0; }
.lsum { color: var(--color-muted); font-size: 13px; } .lsum b { color: var(--color-deep); }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 760px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.d b { display: block; font-weight: 700; } .d small { color: var(--color-muted); font-size: 11px; }
.desc { display: block; font-weight: 600; } .note { color: var(--color-muted); font-size: 11.5px; }
.cattag { display: inline-flex; align-items: center; gap: 5px; height: 26px; padding: 0 10px; border-radius: 999px; background: #f1f6f6; font-size: 12px; font-weight: 600; }
.cattag :deep(svg) { width: 14px; height: 14px; color: var(--color-primary); }
.wtag { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: 999px; background: #f1f6f6; font-size: 11.5px; font-weight: 600; }
.amt { font-weight: 700; color: var(--color-negative); font-size: 15px; }
.ops { width: 1%; } .opsin { display: flex; gap: 6px; justify-content: flex-end; }
.go { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: 9px; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.go :deep(svg) { width: 15px; height: 15px; } .go:hover { background: #c6e5ee; }
.go.del { background: var(--neg-bg); color: var(--neg-ink); } .go.del:hover { background: var(--color-negative); color: #fff; }
/* categories against their budget: three a row, white cards, colour only where it means something */
.catgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.catc { --c: var(--color-primary); --soft: #e3f3f6; border: 1px solid #e4eeee; text-align: right; font: inherit; color: inherit; background: #fff; border-radius: 18px; padding: 14px 16px; display: grid; gap: 10px; cursor: pointer;
  transition: transform .2s, box-shadow .2s, border-color .2s; animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 40ms); }
.catc:hover { transform: translateY(-3px); border-color: transparent; box-shadow: 0 16px 30px -20px rgb(11 59 69 / .6); }
.catc.near { --c: #d58f17; --soft: #fff1d6; } .catc.over { --c: var(--color-negative); --soft: #ffe3df; }
.ch2 { display: flex; align-items: center; gap: 10px; } .ch2 b { flex: 1; font-size: 14.5px; font-weight: 700; }
.ch2 .ic { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; background: #f1f6f6; color: var(--color-primary); } .ch2 .ic :deep(svg) { width: 18px; height: 18px; }
.pct { font-weight: 700; color: var(--c); font-size: 12px; background: var(--soft); border-radius: 999px; padding: 2px 10px; }
.catc .amt { font-size: 24px; font-weight: 700; color: var(--color-deep); line-height: 1.1; } .catc .amt small { font-size: 12px; color: var(--color-muted); font-weight: 500; }
.catc .bar { height: 8px; border-radius: 4px; background: #edf2f2; overflow: hidden; } .catc .bar i { display: block; height: 100%; border-radius: 4px; background: var(--c); transition: width .6s cubic-bezier(.2, .9, .25, 1); }
.ft { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-muted); } .catc.over .ft span:first-child { color: var(--color-negative); font-weight: 600; } .catc.near .ft span:first-child { color: #8a5a00; font-weight: 600; }
@media (max-width: 1100px) { .catgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } } @media (max-width: 600px) { .catgrid { grid-template-columns: 1fr; } }
.link { border: 0; background: none; padding: 0; font: inherit; font-size: 13px; font-weight: 600; color: var(--color-primary-ink); cursor: pointer; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
