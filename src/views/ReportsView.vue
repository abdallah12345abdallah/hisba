<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import WaterfallChart from '../components/reports/WaterfallChart.vue'
import DonutChart from '../components/reports/DonutChart.vue'
import AreaChart from '../components/reports/AreaChart.vue'
import SparkLine from '../components/reports/SparkLine.vue'
import { fmt, MONTH as NOV_DAYS, SUPPLIERS, WALLETS, CASHBOOK, AGING } from '../data/demo.js'
import { MONTHS, NOW, PERIODS, periodLabel, pnl, prevOf, monthPnl, yearNets, bySupplier, byGrade, debtRows, expensesByCat, staffByRole } from '../data/reports.js'
import { bucketOf, COLLECTED } from '../data/traders.js'
import { allMoves, balances, todayIn, todayOut, SOURCES } from '../data/safe.js'
import { STAFF } from '../data/staff.js'
import { toast } from '../composables/useToast.js'

// Reports — five reports behind the glass tab track of the sale sheet (title + a live line under it; only the content swaps).
// Each report puts its answer first, then modern charts: waterfall, ring, area line, a sales calendar, ranked lists.
const router = useRouter()
const pct = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : 0)
const short = (v) => (Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))
const series = (k) => Array.from({ length: NOW + 1 }, (_, i) => monthPnl(i)[k])

const debts = computed(() => debtRows())
const debtSum = computed(() => debts.value.reduce((a, t) => a + t.due, 0))
const cats = computed(() => expensesByCat())
const roles = computed(() => staffByRole())
const expSum = computed(() => cats.value.reduce((a, c) => a + c.spent, 0))
const staffSum = computed(() => roles.value.reduce((a, r) => a + r.cost, 0))
const TABS = computed(() => [
  { value: 'pnl', label: 'الأرباح', sub: `صافي ${short(monthPnl(NOW).net)} هالشهر` },
  { value: 'sales', label: 'المبيعات', sub: `${short(monthPnl(NOW).gross)} بيع هالشهر` },
  { value: 'debts', label: 'الديون', sub: `${short(debtSum.value)} على ${debts.value.length} تجار` },
  { value: 'safe', label: 'الخزنة', sub: `صافي اليوم ${todayIn() - todayOut() >= 0 ? '+' : '−'}${short(Math.abs(todayIn() - todayOut()))}` },
  { value: 'costs', label: 'المصاريف والرواتب', sub: `${short(expSum.value + staffSum.value)} هالشهر` },
])
const tab = ref('pnl')
const period = ref('month')
const usesPeriod = computed(() => tab.value === 'pnl' || tab.value === 'sales')
const tabsEl = ref(null)
const thumb = ref({ left: '0px', width: '0px', opacity: 0 })
function placeThumb() { const b = tabsEl.value?.querySelector('button.on'); if (b) thumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 } }
watch(tab, () => nextTick(placeThumb))
onMounted(() => { nextTick(placeThumb); document.fonts?.ready.then(placeThumb); window.addEventListener('resize', placeThumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeThumb))

/* ---- profit ---- */
const P = computed(() => pnl(period.value))
const prev = computed(() => prevOf(period.value))
const income = computed(() => P.value.commission + P.value.feed)
const margin = computed(() => (income.value ? Math.round((P.value.net / income.value) * 100) : 0))
const steps = computed(() => [
  { label: 'العمولة', value: P.value.commission, kind: 'up' },
  ...(P.value.feed ? [{ label: 'زيادة العلف', value: P.value.feed, kind: 'up' }] : []),
  { label: 'المصاريف', value: P.value.exp, kind: 'down' },
  { label: 'الرواتب', value: P.value.sal, kind: 'down' },
  { label: 'الصافي', value: P.value.net, kind: 'total' },
])
const minis = computed(() => [
  { label: 'العمولة', value: P.value.commission, prev: prev.value?.commission, spark: series('commission'), good: 1, color: '#7fe3d2' },
  { label: 'المصاريف', value: P.value.exp, prev: prev.value?.exp, spark: series('exp'), good: -1, color: '#ffb4a6' },
  { label: 'الرواتب', value: P.value.sal, prev: prev.value?.sal, spark: series('sal'), good: -1, color: '#ffd28a' },
])
const where = computed(() => [
  { label: 'صافي ربح', value: Math.max(0, P.value.net), color: 'var(--color-positive)' },
  { label: 'رواتب ويوميات', value: P.value.sal, color: '#f5a53a' },
  { label: 'مصاريف', value: P.value.exp, color: '#f08a7c' },
])
const netPoints = computed(() => yearNets().map((v, i) => ({ label: MONTHS[i].slice(0, 3), value: v })))
const bestMonth = computed(() => { const n = yearNets(); const i = n.indexOf(Math.max(...n)); return { name: MONTHS[i], value: n[i] } })

/* ---- sales ---- */
const kgPrice = computed(() => (P.value.boxes ? P.value.gross / (P.value.boxes * 25) : 0))
const salesCards = computed(() => [
  { label: 'إجمالي البيع', value: fmt(P.value.gross), unit: 'ج', d: prev.value && pct(P.value.gross, prev.value.gross), spark: series('gross') },
  { label: 'البوكسات', value: fmt(P.value.boxes), unit: `${short(P.value.boxes * 25)} كيلو`, d: prev.value && pct(P.value.boxes, prev.value.boxes), spark: series('boxes') },
  { label: 'العمولة', value: fmt(P.value.commission), unit: 'ج', d: prev.value && pct(P.value.commission, prev.value.commission), spark: series('commission') },
  { label: 'سعر الكيلو', value: kgPrice.value.toFixed(1), unit: 'ج متوسط', d: null, spark: series('gross').map((g, i) => g / (series('boxes')[i] || 1)) },
])
/* the month as a calendar, weeks start on Saturday; colour follows the day's sales */
const HEAD = ['سبت', 'أحد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة']
const calCells = computed(() => {
  const lead = (new Date(2026, 10, 1).getDay() + 1) % 7
  const byDay = Object.fromEntries(NOV_DAYS.map((d) => [d.date.getDate(), d]))
  const max = Math.max(1, ...NOV_DAYS.map((d) => d.gross))
  return [...Array(lead).fill(null), ...Array.from({ length: 30 }, (_, i) => {
    const n = i + 1, d = byDay[n]
    return { n, gross: d?.gross || 0, closed: d?.closed || new Date(2026, 10, n).getDay() === 5, future: !d, today: d?.today, lvl: d && !d.closed ? Math.min(4, Math.ceil((d.gross / max) * 4)) : 0 }
  })]
})
const bestDay = computed(() => NOV_DAYS.filter((d) => !d.closed).reduce((a, d) => (d.gross > a.gross ? d : a), { gross: 0 }))
const monthsSales = computed(() => Array.from({ length: NOW + 1 }, (_, i) => ({ label: MONTHS[i].slice(0, 3), value: monthPnl(i).gross })))
const sup = computed(() => bySupplier(period.value))
const GRADE_TONES = ['#0b5870', '#0e7490', '#22b8cf', '#5cc8d8', '#9fdde6', '#c9e7ec', '#f97362', '#f5a35c']
const grades = computed(() => byGrade(period.value).map((g, i) => ({ label: g.grade, value: g.gross, color: GRADE_TONES[i % GRADE_TONES.length], boxes: g.boxes, price: g.price })))

/* ---- debts ---- */
const overLimit = computed(() => debts.value.filter((t) => t.due > t.limit))
const old = computed(() => debts.value.filter((t) => t.days > 30))
const supOwe = computed(() => SUPPLIERS.filter((s) => s.balance > 0).reduce((a, s) => a + s.balance, 0))
const supAdv = computed(() => SUPPLIERS.filter((s) => s.balance < 0).reduce((a, s) => a - s.balance, 0))
const BUCKET_TONE = ['ok', 'warn', 'bad', 'bad']
const usage = (t) => Math.round((t.due / t.limit) * 100)

/* ---- safe ---- */
const moves = computed(() => allMoves())
const bySource = computed(() => Object.entries(SOURCES).filter(([k]) => k !== 'move').map(([k, s]) => {
  const m = moves.value.filter((e) => e.src === k)
  return { key: k, ...s, count: m.length, in: m.filter((e) => e.dir === 'in').reduce((a, e) => a + e.amount, 0), out: m.filter((e) => e.dir === 'out').reduce((a, e) => a + e.amount, 0) }
}).filter((r) => r.count).sort((a, b) => b.in + b.out - (a.in + a.out)))
const flowMax = computed(() => Math.max(1, ...bySource.value.map((r) => Math.max(r.in, r.out))))
const wal = computed(() => balances())
const walTotal = computed(() => WALLETS.reduce((a, w) => a + wal.value[w.key], 0))
const WAL_ICON = { cash: 'cash', vodafone: 'phone', bank: 'building' }

/* ---- costs ---- */
const budgetSum = computed(() => cats.value.reduce((a, c) => a + c.budget, 0))
const advSum = computed(() => STAFF.reduce((a, e) => a + e.adv, 0))
const COST_COLORS = ['#0e7490', '#1b8aa6', '#3aa3b9', '#61b9c9', '#8ccdd8', '#b3dfe6']
const costParts = computed(() => {
  const top = cats.value.filter((c) => c.spent).slice(0, 4)
  const rest = expSum.value - top.reduce((a, c) => a + c.spent, 0)
  return [{ label: 'رواتب ويوميات', value: staffSum.value, color: '#f5a53a' }, ...top.map((c, i) => ({ label: c.label, value: c.spent, color: COST_COLORS[i] })), ...(rest ? [{ label: 'باقي المصاريف', value: rest, color: '#cfe3e6' }] : [])]
})

/* export + print */
function rowsFor() {
  if (tab.value === 'pnl') return [['البند', periodLabel(period.value)], ['العمولة', P.value.commission], ['زيادة العلف', P.value.feed], ['المصاريف', -P.value.exp], ['الرواتب', -P.value.sal], ['صافي الربح', P.value.net], [], ['الشهر', 'صافي الربح'], ...yearNets().map((v, i) => [MONTHS[i], v])]
  if (tab.value === 'sales') return [['المورد', 'إجمالي البيع', 'بوكس', 'العمولة %', 'العمولة'], ...sup.value.map((s) => [s.name, s.gross, s.boxes, s.rate, s.commission]), [], ['الصنف', 'إجمالي البيع', 'بوكس', 'سعر الكيلو'], ...grades.value.map((g) => [g.label, g.value, g.boxes, g.price])]
  if (tab.value === 'debts') return [['التاجر', 'عليه', 'الحد', 'عمر الدين (يوم)', 'آخر قبض'], ...debts.value.map((t) => [t.name, t.due, t.limit, t.days, t.lastPay])]
  if (tab.value === 'safe') return [['المصدر', 'عدد', 'داخل', 'طالع'], ...bySource.value.map((r) => [r.label, r.count, r.in, r.out]), [], ['المحفظة', 'الرصيد'], ...WALLETS.map((w) => [w.label, wal.value[w.key]])]
  return [['البند', 'المصروف', 'الميزانية'], ...cats.value.map((c) => [c.label, c.spent, c.budget]), [], ['الشغلة', 'عدد', 'التكلفة لحد اليوم', 'سلف'], ...roles.value.map((r) => [r.label, r.people, r.cost, r.adv])]
}
function exportIt() {
  const csv = '﻿' + rowsFor().map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const name = TABS.value.find((t) => t.value === tab.value).label
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `تقرير ${name}-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر التقرير', `${name} · بيفتح بالإكسل`)
}
const printIt = () => window.print()
</script>

<template>
  <div class="page reports">
    <header class="dhead">
      <div class="hello">
        <h1>التقارير</h1>
        <p class="num">صافي ربح {{ MONTHS[NOW] }} لحد اليوم <b>{{ fmt(monthPnl(NOW).net) }} ج</b> · من أول السنة {{ fmt(pnl('ytd').net) }} ج</p>
      </div>
      <div class="actions">
        <SelectMenu v-if="usesPeriod" v-model="period" :options="PERIODS" class="psel" aria-label="الفترة" />
        <SoftButton icon="clock" @click="router.push('/audit')">سجل التعديلات</SoftButton>
        <SoftButton icon="print" @click="printIt">طباعة</SoftButton>
        <SoftButton icon="excel" tone="primary" @click="exportIt">تصدير التقرير</SoftButton>
      </div>
    </header>

    <nav ref="tabsEl" class="mtabs" role="tablist" aria-label="التقارير">
      <span class="thumb" :style="thumb" aria-hidden="true" />
      <button v-for="t in TABS" :key="t.value" type="button" role="tab" :aria-selected="tab === t.value" :class="{ on: tab === t.value }" @click="tab = t.value">
        <b>{{ t.label }}</b><small class="num">{{ t.sub }}</small>
      </button>
    </nav>

    <Transition name="swap" mode="out-in">
      <!-- ============ profit ============ -->
      <div v-if="tab === 'pnl'" key="pnl" class="grid">
        <section class="s12 hero">
          <div class="hmain">
            <small>صافي الربح · {{ periodLabel(period) }}</small>
            <b class="num">{{ fmt(P.net) }}<span>ج</span></b>
            <p class="num">من كل 100 ج دخلت، ضل <strong>{{ margin }} ج</strong> ربح.
              <span v-if="prev" class="chip" :class="pct(P.net, prev.net) >= 0 ? 'up' : 'down'">{{ pct(P.net, prev.net) >= 0 ? '▲' : '▼' }} {{ Math.abs(pct(P.net, prev.net)) }}% {{ period === 'month' ? 'عن نفس الأيام الشهر الماضي' : 'عن الشهر اللي قبله' }}</span></p>
          </div>
          <div class="hminis">
            <div v-for="m in minis" :key="m.label" class="hm">
              <span class="hl"><small>{{ m.label }}</small><em v-if="m.prev" class="num" :class="(pct(m.value, m.prev) >= 0) === (m.good > 0) ? 'up' : 'down'">{{ pct(m.value, m.prev) >= 0 ? '+' : '' }}{{ pct(m.value, m.prev) }}%</em></span>
              <b class="num">{{ fmt(m.value) }}</b>
              <SparkLine :values="m.spark" :color="m.color" />
            </div>
          </div>
        </section>
        <section class="s8 card">
          <div class="ch"><h2>من العمولة للصافي</h2><span class="meta">{{ periodLabel(period) }}</span></div>
          <div class="fill"><WaterfallChart :steps="steps" aria-label="من العمولة لصافي الربح" /></div>
        </section>
        <section class="s4 card">
          <div class="ch"><h2>وين راحت الفلوس</h2><span class="meta num">من {{ fmt(income) }} ج دخل</span></div>
          <div class="dwrap"><DonutChart :parts="where" :center="`${margin}%`" sub="ربح صافي" aria-label="توزيع الدخل" /></div>
          <ul class="dleg num">
            <li v-for="w in where" :key="w.label"><i :style="{ background: w.color }" /><span>{{ w.label }}</span><b>{{ fmt(w.value) }}</b><small>{{ Math.round((w.value / (income || 1)) * 100) }}%</small></li>
          </ul>
        </section>
        <section class="s12 card">
          <div class="ch"><h2>صافي الربح شهر بشهر</h2><span class="meta num">أحسن شهر {{ bestMonth.name }} · {{ fmt(bestMonth.value) }} ج</span></div>
          <AreaChart :points="netPoints" :highlight="NOW" :short="short" aria-label="صافي الربح كل شهر" />
        </section>
      </div>

      <!-- ============ sales ============ -->
      <div v-else-if="tab === 'sales'" key="sales" class="grid">
        <div class="s12 kpis">
          <div v-for="(k, i) in salesCards" :key="k.label" class="kpi" :style="{ '--i': i }">
            <span class="kh"><small>{{ k.label }}</small><em v-if="k.d !== null && k.d !== undefined" class="num" :class="k.d >= 0 ? 'up' : 'down'">{{ k.d >= 0 ? '▲' : '▼' }} {{ Math.abs(k.d) }}%</em></span>
            <b class="num">{{ k.value }}<span>{{ k.unit }}</span></b>
            <SparkLine :values="k.spark" />
          </div>
        </div>
        <section class="s12 card">
          <template v-if="period === 'month'">
            <div class="ch"><h2>رزنامة البيع</h2><span class="meta num">أحسن يوم {{ bestDay.label }} · {{ fmt(bestDay.gross) }} ج</span></div>
            <div class="heat">
              <span v-for="h in HEAD" :key="h" class="hd">{{ h }}</span>
              <template v-for="(c, i) in calCells" :key="i">
                <span v-if="!c" />
                <span v-else class="hc num" :class="[c.closed ? 'closed' : c.future ? 'future' : `l${c.lvl}`, { today: c.today }]" :title="c.closed ? `${c.n}/11 · الحلقة مسكّرة` : c.future ? '' : `${c.n}/11 · ${fmt(c.gross)} ج`">
                  <b>{{ c.n }}</b><small v-if="!c.closed && !c.future">{{ short(c.gross) }}</small>
                </span>
              </template>
            </div>
            <div class="hleg"><span>أقل</span><i class="l1" /><i class="l2" /><i class="l3" /><i class="l4" /><span>أكتر</span><i class="closed" /><span>جمعة</span></div>
          </template>
          <template v-else>
            <div class="ch"><h2>البيع شهر بشهر</h2><span class="meta">{{ periodLabel(period) }}</span></div>
            <AreaChart :points="monthsSales" :highlight="period === 'last' ? NOW - 1 : NOW" :short="short" aria-label="البيع كل شهر" />
          </template>
        </section>
        <section class="s7 card">
          <div class="ch"><h2>أكتر الموردين بيع</h2><span class="meta">{{ periodLabel(period) }}</span></div>
          <ol class="rank num">
            <li v-for="(s, i) in sup" :key="s.id" :style="{ '--i': i }">
              <span class="rk" :class="{ gold: i === 0 }">{{ i + 1 }}</span>
              <span class="rn"><RouterLink :to="`/suppliers/${s.id}`">{{ s.name }}</RouterLink><small>{{ fmt(s.boxes) }} بوكس · عمولة {{ s.rate }}% = {{ fmt(s.commission) }}</small>
                <span class="rb"><i :style="{ width: (s.gross / (sup[0]?.gross || 1)) * 100 + '%' }" /></span></span>
              <span class="rv"><b>{{ short(s.gross) }}</b><small>{{ Math.round((s.gross / (P.gross || 1)) * 100) }}%</small></span>
            </li>
          </ol>
        </section>
        <section class="s5 card">
          <div class="ch"><h2>حسب الصنف</h2></div>
          <div class="dwrap"><DonutChart :parts="grades" :center="short(P.gross)" sub="إجمالي البيع" :size="170" aria-label="البيع حسب الصنف" /></div>
          <ul class="dleg two num">
            <li v-for="g in grades" :key="g.label"><i :style="{ background: g.color }" /><span>{{ g.label }}</span><b>{{ Math.round((g.value / (P.gross || 1)) * 100) }}%</b></li>
          </ul>
        </section>
      </div>

      <!-- ============ debts ============ -->
      <div v-else-if="tab === 'debts'" key="debts" class="grid">
        <section class="s12 hero light">
          <div class="hmain">
            <small>ديون التجار هلأ</small>
            <b class="num">{{ fmt(debtSum) }}<span>ج</span></b>
            <p class="num">على {{ debts.length }} تجار · اتحصّل هالأسبوع <strong>{{ fmt(COLLECTED.week) }} ج</strong>
              <span class="chip" :class="COLLECTED.week >= COLLECTED.lastWeek ? 'up' : 'down'">{{ pct(COLLECTED.week, COLLECTED.lastWeek) >= 0 ? '▲' : '▼' }} {{ Math.abs(pct(COLLECTED.week, COLLECTED.lastWeek)) }}% عن الأسبوع الماضي</span></p>
          </div>
          <div class="flags">
            <div class="flag bad"><b class="num">{{ overLimit.length }}</b><small>فوق حدّهم</small></div>
            <div class="flag warn"><b class="num">{{ old.length }}</b><small>دينهم أقدم من شهر</small></div>
            <div class="flag"><b class="num">{{ short(supOwe) }}</b><small>للموردين علينا</small></div>
          </div>
        </section>
        <section class="s12 card">
          <div class="ch"><h2>عمر الدين</h2><span class="meta">كل ما الدين أقدم صعب تحصيله</span></div>
          <div class="aging">
            <div v-for="b in AGING.buckets" :key="b.label" class="ag" :style="{ flex: b.value || 0.001, '--c': b.color }">
              <b class="num">{{ short(b.value) }}</b><small>{{ b.label }}</small>
            </div>
          </div>
        </section>
        <section class="s12 card">
          <div class="ch"><h2>مين عليه</h2><span class="meta">من الأكبر · الدايرة = قديش استعمل من حدّه</span></div>
          <div class="debtors">
            <article v-for="t in debts" :key="t.name" class="dt" :class="{ over: t.due > t.limit }">
              <span class="limring num" :style="{ '--p': Math.min(100, usage(t)) }"><b>{{ usage(t) }}%</b></span>
              <span class="dn"><b>{{ t.name }}</b><small class="num">من حدّ {{ fmt(t.limit) }} · آخر قبض {{ t.lastPay }}</small></span>
              <span class="dv"><b class="num">{{ fmt(t.due) }}</b><span class="btag num" :class="BUCKET_TONE[bucketOf(t.days)]">{{ t.days }} يوم</span></span>
              <RouterLink :to="`/traders/${encodeURIComponent(t.name)}`" class="go">كشف الحساب</RouterLink>
            </article>
          </div>
        </section>
      </div>

      <!-- ============ safe ============ -->
      <div v-else-if="tab === 'safe'" key="safe" class="grid">
        <div class="s12 kpis">
          <div v-for="(w, i) in WALLETS" :key="w.key" class="kpi" :style="{ '--i': i }">
            <span class="kh"><small>{{ w.label }}</small><AppIcon :name="WAL_ICON[w.key]" /></span>
            <b class="num">{{ fmt(wal[w.key]) }}<span>ج</span></b>
            <span class="wbar"><i :style="{ width: (wal[w.key] / (walTotal || 1)) * 100 + '%' }" /></span>
            <small class="num ks">{{ Math.round((wal[w.key] / (walTotal || 1)) * 100) }}% من الفلوس</small>
          </div>
          <div class="kpi net" :style="{ '--i': 3 }">
            <span class="kh"><small>صافي اليوم</small><AppIcon name="safe" /></span>
            <b class="num" :class="todayIn() - todayOut() >= 0 ? 'up' : 'down'">{{ todayIn() - todayOut() >= 0 ? '+' : '−' }}{{ fmt(Math.abs(todayIn() - todayOut())) }}</b>
            <small class="num ks">داخل {{ fmt(todayIn()) }} · طالع {{ fmt(todayOut()) }}</small>
          </div>
        </div>
        <section class="s8 card">
          <div class="ch"><h2>من وين دخلت ولوين طلعت</h2><RouterLink to="/safe" class="meta lnk">فتح الخزنة</RouterLink></div>
          <div class="flow num">
            <div class="fh"><span>طالع</span><span /><span>داخل</span></div>
            <div v-for="(r, i) in bySource" :key="r.key" class="fr" :style="{ '--i': i }">
              <span class="fo"><small v-if="r.out">{{ short(r.out) }}</small><i v-if="r.out" :style="{ width: (r.out / flowMax) * 100 + '%' }" /></span>
              <span class="fl"><AppIcon :name="r.icon" /><b>{{ r.label }}</b><small>{{ r.count }} حركة</small></span>
              <span class="fi"><i v-if="r.in" :style="{ width: (r.in / flowMax) * 100 + '%' }" /><small v-if="r.in">{{ short(r.in) }}</small></span>
            </div>
          </div>
        </section>
        <section class="s4 card">
          <div class="ch"><h2>تسكير الأيام</h2><RouterLink to="/safe/closes" class="meta lnk">الأرشيف</RouterLink></div>
          <ol v-if="CASHBOOK.closes.length" class="tl num">
            <li v-for="(c, i) in CASHBOOK.closes.slice(0, 6)" :key="i" :class="c.diff ? (c.diff > 0 ? 'more' : 'less') : 'ok'">
              <span class="dot"><AppIcon :name="c.diff ? 'alert' : 'check'" /></span>
              <span class="tt"><b>{{ c.date.slice(0, 5) }}</b><small>عدّ {{ fmt(c.counted) }} ج · {{ c.by }}</small></span>
              <em>{{ c.diff ? `${c.diff > 0 ? '+' : '−'}${fmt(Math.abs(c.diff))}` : 'مظبوط' }}</em>
            </li>
          </ol>
          <p v-else class="muted">ما في أيام مسكّرة لسا.</p>
        </section>
      </div>

      <!-- ============ costs ============ -->
      <div v-else key="costs" class="grid">
        <section class="s5 card">
          <div class="ch"><h2>تكاليف {{ MONTHS[NOW] }}</h2><span class="meta">لحد اليوم</span></div>
          <div class="dwrap"><DonutChart :parts="costParts" :center="short(expSum + staffSum)" sub="ج تكاليف" aria-label="التكاليف" /></div>
          <ul class="dleg num">
            <li v-for="c in costParts" :key="c.label"><i :style="{ background: c.color }" /><span>{{ c.label }}</span><b>{{ fmt(c.value) }}</b><small>{{ Math.round((c.value / (expSum + staffSum || 1)) * 100) }}%</small></li>
          </ul>
        </section>
        <section class="s7 card">
          <div class="ch"><h2>المصاريف مقابل الميزانية</h2><span class="meta num">{{ fmt(expSum) }} من {{ fmt(budgetSum) }}</span></div>
          <div class="budgets">
            <RouterLink v-for="(c, i) in cats" :key="c.key" to="/expenses" class="bg" :class="c.pct > 100 ? 'over' : c.pct >= 80 ? 'near' : ''" :style="{ '--i': i }">
              <span class="bi"><AppIcon :name="c.icon" /></span>
              <span class="bt"><b>{{ c.label }}</b><span class="bb"><i :style="{ width: Math.min(100, c.pct) + '%' }" /></span></span>
              <span class="bv num"><b>{{ Math.round(c.pct) }}%</b><small>{{ fmt(c.spent) }} / {{ short(c.budget) }}</small></span>
            </RouterLink>
          </div>
        </section>
        <section class="s12 card">
          <div class="ch"><h2>الموظفين حسب الشغلة</h2><RouterLink to="/staff" class="meta lnk">فتح الموظفين · سلف {{ fmt(advSum) }} ج</RouterLink></div>
          <div class="roles">
            <div v-for="r in roles" :key="r.label" class="rl">
              <span class="bi"><AppIcon :name="r.icon" /></span>
              <span class="rt2"><b>{{ r.label }}</b><small class="num">{{ r.people }} {{ r.people === 1 ? 'شخص' : 'أشخاص' }}<template v-if="r.adv"> · سلف {{ fmt(r.adv) }}</template></small></span>
              <b class="num rc">{{ fmt(r.cost) }}</b>
              <span class="rsh"><i :style="{ width: (r.cost / (staffSum || 1)) * 100 + '%' }" /></span>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reports .grid { align-items: stretch; }
.reports .grid > * { min-width: 0; }
/* cards side by side share one height; the chart or list inside fills it */
.reports .card { display: flex; flex-direction: column; }
.fill { flex: 1; display: grid; align-content: center; }
.psel { width: 170px; } .psel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.mtabs { margin-top: 0; }
.mtabs button b { white-space: nowrap; }
.up { color: var(--color-positive) !important; } .down { color: var(--color-negative) !important; }
@keyframes rin { from { opacity: 0; transform: translateY(10px); } }

/* hero: the answer, big, on the deep teal of the dashboard */
.hero { position: relative; overflow: hidden; border-radius: 22px; padding: 22px 26px; color: #fff; display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr); gap: 22px; align-items: center;
  background: radial-gradient(90% 140% at 0% 100%, #0f7f95 0%, #0b5c70 60%, #0a4b5c 100%); animation: rin .5s cubic-bezier(.2, .9, .25, 1) both; }
.hero::after { content: ""; position: absolute; width: 340px; height: 340px; border-radius: 50%; inset-inline-end: -120px; top: -170px; background: radial-gradient(circle, rgb(45 212 191 / .35), transparent 70%); pointer-events: none; }
.hmain small { color: rgb(255 255 255 / .7); font-size: 13px; }
.hmain > b { display: block; font-size: 46px; font-weight: 700; line-height: 1.1; letter-spacing: -.5px; } .hmain > b span { font-size: 17px; font-weight: 500; margin-inline-start: 6px; opacity: .8; }
.hmain p { margin: 8px 0 0; font-size: 14px; line-height: 2; color: rgb(255 255 255 / .85); } .hmain strong { color: #fff; }
.chip { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgb(255 255 255 / .14); white-space: nowrap; }
.hero .chip.up { color: #8ff0c0 !important; } .hero .chip.down { color: #ffb4a6 !important; }
.hminis { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.hm { background: rgb(255 255 255 / .1); border: 1px solid rgb(255 255 255 / .14); border-radius: 16px; padding: 12px 14px 10px; display: grid; gap: 4px; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.hl { display: flex; justify-content: space-between; align-items: center; } .hl small { color: rgb(255 255 255 / .7); font-size: 12px; }
.hl em { font-style: normal; font-size: 11px; font-weight: 700; } .hero .hl em.up { color: #8ff0c0 !important; } .hero .hl em.down { color: #ffb4a6 !important; }
.hm > b { font-size: 19px; }
.hero.light { background: #fff; color: var(--color-ink); } .hero.light::after { background: radial-gradient(circle, rgb(45 212 191 / .18), transparent 70%); }
.hero.light .hmain small, .hero.light .hmain p { color: var(--color-muted); } .hero.light .hmain > b, .hero.light strong { color: var(--color-deep); }
.hero.light .chip { background: #f1f6f6; } .hero.light .chip.up { color: var(--color-positive) !important; } .hero.light .chip.down { color: var(--color-negative) !important; }
.flags { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.flag { border-radius: 16px; padding: 14px; background: #f1f7f8; display: grid; gap: 2px; } .flag b { font-size: 28px; color: var(--color-deep); line-height: 1.1; } .flag small { color: var(--color-muted); font-size: 12px; }
.flag.bad { background: #fff0ee; } .flag.bad b { color: var(--color-negative); } .flag.warn { background: #fff6e3; } .flag.warn b { color: #b07a12; }

/* ring + legend */
.dwrap { flex: 1; display: grid; place-items: center; padding: 4px 0 10px; }
.dleg { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.dleg li { display: grid; grid-template-columns: 10px minmax(0, 1fr) auto 40px; gap: 8px; align-items: center; font-size: 13px; padding: 6px 4px; border-bottom: 1px dashed var(--color-line); }
.dleg li:last-child { border: 0; } .dleg i { width: 10px; height: 10px; border-radius: 3px; } .dleg span { color: var(--color-muted); } .dleg b { color: var(--color-deep); } .dleg small { color: var(--color-muted); text-align: left; font-size: 11.5px; }
.dleg.two { grid-template-columns: 1fr 1fr; column-gap: 14px; } .dleg.two li { grid-template-columns: 10px minmax(0, 1fr) auto; }

/* kpi cards with a sparkline */
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.kpi { background: #fff; border-radius: 18px; padding: 14px 16px 12px; display: grid; gap: 6px; align-content: start; animation: rin .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.kh { display: flex; justify-content: space-between; align-items: center; color: var(--color-primary); } .kh small { color: var(--color-muted); font-size: 12px; } .kh :deep(svg) { width: 19px; height: 19px; }
.kh em { font-style: normal; font-size: 11.5px; font-weight: 700; border-radius: 999px; padding: 1px 8px; background: #f1f6f6; }
.kpi > b { font-size: 24px; color: var(--color-deep); line-height: 1.2; } .kpi > b span { font-size: 12px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.kpi.net { background: linear-gradient(150deg, #dcf5e6, #fff 80%); }
.ks { color: var(--color-muted); font-size: 11.5px; }
.wbar { height: 6px; border-radius: 3px; background: #edf2f2; overflow: hidden; } .wbar i { display: block; height: 100%; border-radius: 3px; background: var(--color-primary); }

/* sales calendar */
.heat { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.hd { text-align: center; font-size: 11px; color: var(--color-muted); }
.hc { border-radius: 12px; min-height: 58px; padding: 7px 9px; display: grid; align-content: space-between; transition: transform .15s; }
.hc:hover { transform: translateY(-2px); }
.hc b { font-size: 12px; font-weight: 600; } .hc small { font-size: 12.5px; font-weight: 700; }
.hc.l1 { background: #e3f3f6; color: var(--color-primary-ink); } .hc.l2 { background: #b9e2ea; color: var(--color-primary-ink); }
.hc.l3 { background: #5fb6c8; color: #fff; } .hc.l4 { background: var(--color-primary); color: #fff; }
.hc.closed { background: repeating-linear-gradient(135deg, #eef3f3 0 5px, #f8fbfb 5px 10px); color: #b5c4c5; }
.hc.future { background: transparent; color: #c2d0d1; box-shadow: inset 0 0 0 1px #e6eeee; }
.hc.today { box-shadow: 0 0 0 2.5px #f5a53a; }
.hleg { display: flex; align-items: center; gap: 5px; justify-content: flex-end; margin-top: 10px; font-size: 11.5px; color: var(--color-muted); }
.hleg i { width: 16px; height: 12px; border-radius: 3px; } .hleg i.l1 { background: #e3f3f6; } .hleg i.l2 { background: #b9e2ea; } .hleg i.l3 { background: #5fb6c8; } .hleg i.l4 { background: var(--color-primary); }
.hleg i.closed { background: repeating-linear-gradient(135deg, #dfe8e8 0 3px, #f8fbfb 3px 6px); margin-inline-start: 10px; }

/* ranked list */
.rank { flex: 1; list-style: none; margin: 0; padding: 0; display: grid; grid-auto-rows: 1fr; gap: 8px; }
.rank li { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 8px 10px; border-radius: 14px; background: #f7fafa; animation: rin .45s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 50ms); }
.rk { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; font-weight: 700; background: #fff; color: var(--color-muted); box-shadow: inset 0 0 0 1px #e1eaea; }
.rk.gold { background: linear-gradient(140deg, #ffd88a, #f5a53a); color: #5c3b00; box-shadow: none; }
.rn { display: grid; gap: 3px; min-width: 0; } .rn a { font-weight: 700; color: var(--color-ink); text-decoration: none; } .rn a:hover { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.rn small { color: var(--color-muted); font-size: 11.5px; }
.rb { height: 6px; border-radius: 3px; background: #e6eeee; overflow: hidden; } .rb i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #3aa3b9, var(--color-primary)); }
.rv { display: grid; text-align: left; } .rv b { font-size: 16px; color: var(--color-deep); } .rv small { color: var(--color-muted); font-size: 11.5px; }

/* aging */
.aging { display: flex; gap: 6px; }
.ag { min-width: 86px; border-radius: 14px; padding: 12px 14px; background: color-mix(in srgb, var(--c) 18%, #fff); box-shadow: inset 0 -5px 0 var(--c); display: grid; gap: 2px; transition: flex .5s; }
.ag b { font-size: 20px; color: var(--color-deep); } .ag small { color: var(--color-muted); font-size: 12px; white-space: nowrap; }

/* debtors */
.debtors { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr)); gap: 8px; }
.dt { display: grid; grid-template-columns: 52px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; background: #f7fafa; border-radius: 14px; padding: 9px 12px; border: 1px solid transparent; }
.dt.over { background: #fff6f5; border-color: #f6d1cc; }
.limring { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--color-primary) calc(var(--p) * 1%), #e3ecec 0); position: relative; }
.dt.over .limring { background: conic-gradient(var(--color-negative) calc(var(--p) * 1%), #f3dcd9 0); }
.limring::before { content: ""; position: absolute; inset: 6px; border-radius: 50%; background: #fff; }
.limring b { position: relative; font-size: 11.5px; color: var(--color-deep); }
.dn { display: grid; min-width: 0; } .dn b { font-size: 14px; } .dn small { color: var(--color-muted); font-size: 11.5px; }
.dv { display: grid; justify-items: end; gap: 3px; } .dv > b { font-size: 16px; color: var(--color-deep); } .dt.over .dv > b { color: var(--color-negative); }
.btag { display: inline-flex; height: 20px; align-items: center; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.btag.ok { background: var(--color-primary-pale); color: var(--color-primary-ink); } .btag.warn { background: #fff4dc; color: #8a5a00; } .btag.bad { background: var(--neg-bg); color: var(--neg-ink); }
.go { display: inline-flex; align-items: center; height: 34px; padding: 0 12px; border-radius: 10px; background: var(--color-primary-pale); color: var(--color-primary-ink); font-size: 12.5px; font-weight: 600; text-decoration: none; white-space: nowrap; }
.go:hover { background: #c6e5ee; }

/* safe: in / out butterfly */
.flow { flex: 1; display: grid; gap: 6px; align-content: space-around; }
.fh, .fr { display: grid; grid-template-columns: minmax(0, 1fr) 170px minmax(0, 1fr); gap: 10px; align-items: center; }
.fh { font-size: 11.5px; color: var(--color-muted); } .fh span:last-child { text-align: left; }
.fr { animation: rin .45s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 50ms); }
.fo, .fi { display: flex; align-items: center; gap: 6px; height: 30px; }
.fo { justify-content: flex-end; }
.fo i, .fi i { display: block; height: 18px; border-radius: 6px; min-width: 4px; animation: grow-x .7s cubic-bezier(.2, .9, .25, 1) both; }
.fo i { background: linear-gradient(90deg, #f08a7c, #f6b2a8); transform-origin: left; } .fi i { background: linear-gradient(90deg, #22a06b, #7fd4a8); transform-origin: right; }
@keyframes grow-x { from { transform: scaleX(0); } }
.fo small, .fi small { font-size: 11.5px; font-weight: 700; color: var(--color-deep); }
.fl { display: grid; grid-template-columns: auto 1fr; column-gap: 7px; align-items: center; background: #f4f8f8; border-radius: 10px; padding: 5px 10px; }
.fl :deep(svg) { grid-row: span 2; width: 17px; height: 17px; color: var(--color-primary); } .fl b { font-size: 12.5px; } .fl small { font-size: 10.5px; color: var(--color-muted); }
.lnk { color: var(--color-primary-ink); font-weight: 600; text-decoration: none; } .lnk:hover { text-decoration: underline; text-underline-offset: 3px; }
.tl { list-style: none; margin: 0; padding: 0; display: grid; position: relative; }
.tl::before { content: ""; position: absolute; inset-inline-start: 15px; top: 14px; bottom: 14px; width: 2px; background: #e3ecec; }
.tl li { position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 7px 0; }
.dot { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--pos-bg); color: var(--color-positive); box-shadow: 0 0 0 4px #fff; } .dot :deep(svg) { width: 15px; height: 15px; }
.tl li.less .dot { background: var(--neg-bg); color: var(--color-negative); } .tl li.more .dot { background: #fff4dc; color: #b07a12; }
.tt { display: grid; } .tt b { font-size: 13px; } .tt small { color: var(--color-muted); font-size: 11.5px; }
.tl em { font-style: normal; font-size: 12px; font-weight: 700; color: var(--color-positive); } .tl li.less em { color: var(--color-negative); } .tl li.more em { color: #b07a12; }
.muted { color: var(--color-muted); font-size: 13px; margin: 0; }

/* costs */
.budgets { flex: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 1fr; gap: 8px; }
.bg { --c: var(--color-primary); display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 10px; border-radius: 14px; background: #f7fafa; color: inherit; text-decoration: none; transition: background .15s, transform .15s; animation: rin .45s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 40ms); }
.bg:hover { background: #eef6f7; transform: translateY(-2px); }
.bg.near { --c: #d58f17; } .bg.over { --c: var(--color-negative); background: #fff6f5; }
.bi { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: #fff; color: var(--color-primary); } .bi :deep(svg) { width: 18px; height: 18px; }
.bt { display: grid; gap: 5px; min-width: 0; } .bt b { font-size: 13px; }
.bb { height: 6px; border-radius: 3px; background: #e3ecec; overflow: hidden; } .bb i { display: block; height: 100%; border-radius: 3px; background: var(--c); }
.bv { display: grid; text-align: left; } .bv b { font-size: 14px; color: var(--c); } .bv small { color: var(--color-muted); font-size: 11px; }
.roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
.rl { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; background: #f7fafa; border-radius: 14px; padding: 10px 12px; }
.rt2 { display: grid; } .rt2 b { font-size: 13.5px; } .rt2 small { color: var(--color-muted); font-size: 11.5px; }
.rc { font-size: 15px; color: var(--color-deep); }
.rsh { grid-column: 1 / -1; height: 5px; border-radius: 3px; background: #e3ecec; overflow: hidden; } .rsh i { display: block; height: 100%; border-radius: 3px; background: #f5a53a; }

@media (max-width: 1100px) { .hero { grid-template-columns: 1fr; } .budgets { grid-template-columns: 1fr; } }
@media (max-width: 900px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hminis, .flags { grid-template-columns: 1fr 1fr; } .fh, .fr { grid-template-columns: minmax(0, 1fr) 120px minmax(0, 1fr); } }
@media (max-width: 560px) { .dt { grid-template-columns: 48px minmax(0, 1fr) auto; } .dt .go { grid-column: 1 / -1; justify-content: center; } .hc small { display: none; } .hc { min-height: 42px; } }
@media print { .actions, .mtabs { display: none; } .hero { background: #fff !important; color: var(--color-ink); } }
@media (prefers-reduced-motion: reduce) { .hero, .kpi, .rank li, .fr, .bg { animation: none; } }
</style>
