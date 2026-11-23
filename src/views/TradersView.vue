<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PayDialog from '../components/traders/PayDialog.vue'
import TraderForm from '../components/traders/TraderForm.vue'
import ImportDialog from '../components/traders/ImportDialog.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import { TRADERS, fmt } from '../data/demo.js'
import { isOver, COLLECTED } from '../data/traders.js'
import { toast } from '../composables/useToast.js'

// Traders — "بطاقات" (approved ج): the key figures on top, then a card per trader with its debt, last buy, last payment,
// and two actions: open the trader's own account page, or receive a payment.
const router = useRouter()

/* top figures */
const total = computed(() => TRADERS.reduce((s, t) => s + t.due, 0))
const overCount = computed(() => TRADERS.filter(isOver).length)
const lateSum = computed(() => TRADERS.filter((t) => t.days > 30).reduce((s, t) => s + t.due, 0))
const collectedWeek = computed(() => COLLECTED.week)
const LAST_WEEK = COLLECTED.lastWeek

/* the four figures — "حقول ألوان ناعمة" (approved 3): each card filters the list to what it counts */
const tops = computed(() => {
  const owing = TRADERS.filter((t) => t.due).length
  const firstOver = TRADERS.filter(isOver).sort((a, b) => (b.due - b.limit) - (a.due - a.limit))[0]
  const share = (v) => (total.value ? Math.min(100, (v / total.value) * 100) : 0)
  const overSum = TRADERS.filter(isOver).reduce((s, t) => s + t.due, 0)
  const growth = Math.round(((collectedWeek.value - LAST_WEEK) / LAST_WEEK) * 100)
  return [
    { key: 'all', label: 'عليهم كلهم', icon: 'traders', tone: 'teal', value: fmt(total.value), unit: 'ج', share: 100, sub: `على ${owing} من ${TRADERS.length} تجار` },
    { key: 'over', label: 'فوق الحد', icon: 'alert', tone: 'red', value: overCount.value === 1 ? 'تاجر واحد' : `${overCount.value} تجار`, share: share(overSum),
      sub: firstOver ? `${firstOver.name} · فوقه بـ ${fmt(firstOver.due - firstOver.limit)}` : 'ولا حدا فوق الحد' },
    { key: 'late', label: 'متأخر أكتر من شهر', icon: 'clock', tone: 'amber', value: fmt(lateSum.value), unit: 'ج', share: share(lateSum.value), sub: `${Math.round(share(lateSum.value))}% من كل الدين` },
    { key: null, label: 'انقبض هالأسبوع', icon: 'cash', tone: 'green', value: fmt(collectedWeek.value), unit: 'ج', share: Math.min(100, (collectedWeek.value / (collectedWeek.value + total.value)) * 100),
      sub: `${growth >= 0 ? '+' : ''}${growth}% عن الأسبوع الماضي` },
  ]
})
function pickTop(k) { if (k) filter.value = filter.value === k && k !== 'all' ? 'all' : k }

/* search + filter */
const q = ref('')
const filter = ref('all')
const FILTERS = computed(() => [
  { value: 'all', label: 'كل التجار', hint: TRADERS.length },
  { value: 'over', label: 'فوق الحد', hint: TRADERS.filter(isOver).length },
  { value: 'late', label: 'متأخرين أكتر من شهر', hint: TRADERS.filter((t) => t.days > 30).length },
  { value: 'clear', label: 'خالصين', hint: TRADERS.filter((t) => !t.due).length },
])
const list = computed(() => TRADERS
  .filter((t) => !q.value || t.name.includes(q.value.trim()))
  .filter((t) => filter.value === 'all' || (filter.value === 'over' && isOver(t)) || (filter.value === 'late' && t.days > 30) || (filter.value === 'clear' && !t.due))
  .slice().sort((a, b) => b.due - a.due))
/* cards or table (small screens: always cards), and pages */
const view = ref('table')
const small = ref(false)
let mq = null
const onMq = () => { small.value = mq.matches }
onMounted(() => { mq = window.matchMedia('(max-width: 720px)'); onMq(); mq.addEventListener('change', onMq) })
onBeforeUnmount(() => mq?.removeEventListener('change', onMq))
const shownView = computed(() => (small.value ? 'cards' : view.value))
/* the white thumb is measured from the active button, the same way as the manifest tabs */
const vtogEl = ref(null)
const vthumb = ref({ left: '4px', width: '0px', opacity: 0 })
function placeVthumb() {
  const b = vtogEl.value?.querySelector('button.on')
  if (b) vthumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 }
}
watch([view, small], () => nextTick(placeVthumb))
onMounted(() => { nextTick(placeVthumb); document.fonts?.ready.then(placeVthumb); window.addEventListener('resize', placeVthumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeVthumb))
const VIEWS = [{ value: 'cards', label: 'بطاقات', icon: 'grid' }, { value: 'table', label: 'جدول', icon: 'rows' }]
const page = ref(1)
const size = ref(10)
watch([q, filter, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))
const pct = (t) => Math.min(100, (t.due / t.limit) * 100)
const stateOf = (t) => (!t.due ? 'clear' : isOver(t) ? 'over' : t.days > 30 ? 'late' : 'fine')

/* open the trader's account page, or receive a payment here */
const openTrader = (t) => router.push(`/traders/${encodeURIComponent(t.name)}`)
const payFor = ref(null)
const payOpen = ref(false)
function askPay(t) { payFor.value = t; payOpen.value = true }

/* add a trader, import from Excel, export the list shown */
const formOpen = ref(false)
const editFor = ref(null) // null = adding a new trader
function addNew() { editFor.value = null; formOpen.value = true }
function editTrader(t) { editFor.value = t; formOpen.value = true }
const importOpen = ref(false)
function onAdded() { q.value = ''; filter.value = 'all' }
function exportList() {
  const head = ['الاسم', 'التلفون', 'عليه', 'الحد', 'عمر الدين (يوم)', 'آخر شرا', 'آخر دفعة']
  const rows = list.value.map((t) => [t.name, t.phone, t.due, t.limit, t.days, t.lastBuy, t.lastPay])
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `التجار-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} تاجر · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page traders">
    <header class="dhead">
      <div class="hello">
        <h1>التجار</h1>
        <p class="num">{{ TRADERS.length }} تاجر · عليهم <b>{{ fmt(total) }} ج</b><template v-if="overCount"> · <span class="hl neg">{{ overCount }} فوق الحد</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="excel" @click="importOpen = true">استيراد إكسل</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="addNew">تاجر جديد</SoftButton>
      </div>
    </header>

    <div class="grid">
      <div class="s12 tops">
        <component :is="k.key ? 'button' : 'div'" v-for="(k, i) in tops" :key="k.label" :type="k.key ? 'button' : undefined" class="top" :class="[k.tone, { on: k.key && k.key !== 'all' && filter === k.key }]"
          :style="{ '--i': i }" :aria-pressed="k.key ? filter === k.key : undefined" @click="pickTop(k.key)">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span v-if="k.unit">{{ k.unit }}</span></b>
          <span class="share"><i :style="{ width: k.share + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </component>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على تاجر" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر التجار" />
        <div v-if="!small" ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value">
            <AppIcon :name="v.icon" />
          </button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="search" title="ما في تجار هون" text="جرّب اسم تاني أو فلتر تاني." />
        <Transition v-else name="swap" mode="out-in">
        <TransitionGroup v-if="shownView === 'cards'" key="cards" name="list" tag="div" class="cards">
          <article v-for="t in paged" :key="t.name" class="tc" :class="stateOf(t)">
            <div class="h">
              <span><b>{{ t.name }}</b><small class="num"><AppIcon name="phone" />{{ t.phone }}</small></span>
              <span class="hr">
                <StatusPill v-if="!t.due" tone="ok">خالص</StatusPill>
                <StatusPill v-else-if="isOver(t)" tone="bad">فوق الحد</StatusPill>
                <StatusPill v-else-if="t.days > 30" tone="draft">متأخر {{ t.days }} يوم</StatusPill>
                <button type="button" class="iconbtn" :aria-label="`تعديل ${t.name}`" title="تعديل بيانات التاجر" @click="editTrader(t)"><AppIcon name="edit" /></button>
              </span>
            </div>
            <div class="due"><b class="num">{{ fmt(t.due) }}<span>ج</span></b><small class="num">الحد {{ fmt(t.limit) }}</small></div>
            <div class="debt" :class="{ bad: isOver(t) }" role="progressbar" :aria-label="`الدين من الحد`" :aria-valuenow="Math.round((t.due / t.limit) * 100)" aria-valuemax="100"><i :style="{ width: pct(t) + '%' }" /></div>
            <dl class="facts">
              <div><dt>آخر شرا</dt><dd>{{ t.lastBuy }}</dd></div>
              <div><dt>آخر دفعة</dt><dd>{{ t.lastPay }}</dd></div>
            </dl>
            <div class="go">
              <SoftButton size="sm" @click="openTrader(t)">كشف الحساب</SoftButton>
              <SoftButton size="sm" tone="ok" icon="cash" :disabled="!t.due" @click="askPay(t)">قبض</SoftButton>
            </div>
          </article>
        </TransitionGroup>

        <div v-else key="table" class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr><th>التاجر</th><th>عليه</th><th class="wbar">من الحد</th><th>آخر شرا</th><th>آخر دفعة</th><th>الحالة</th><th><span class="sr">إجراءات</span></th></tr>
            </thead>
            <TransitionGroup name="list" tag="tbody">
              <tr v-for="t in paged" :key="t.name" :class="stateOf(t)">
                <td><button type="button" class="tname" @click="openTrader(t)"><b>{{ t.name }}</b><small class="num">{{ t.phone }}</small></button></td>
                <td class="num amt">{{ fmt(t.due) }}</td>
                <td class="wbar"><span class="mini"><span class="debt" :class="{ bad: isOver(t) }"><i :style="{ width: pct(t) + '%' }" /></span><small class="num">{{ fmt(t.limit) }}</small></span></td>
                <td>{{ t.lastBuy }}</td>
                <td>{{ t.lastPay }}</td>
                <td>
                  <StatusPill v-if="!t.due" tone="ok">خالص</StatusPill>
                  <StatusPill v-else-if="isOver(t)" tone="bad">فوق الحد</StatusPill>
                  <StatusPill v-else-if="t.days > 30" tone="draft">متأخر {{ t.days }} يوم</StatusPill>
                  <span v-else class="muted">عادي</span>
                </td>
                <td class="ops"><div class="opsin">
                  <SoftButton size="sm" @click="openTrader(t)">كشف الحساب</SoftButton>
                  <SoftButton size="sm" tone="ok" icon="cash" :disabled="!t.due" @click="askPay(t)">قبض</SoftButton>
                  <button type="button" class="iconbtn" :aria-label="`تعديل ${t.name}`" title="تعديل بيانات التاجر" @click="editTrader(t)"><AppIcon name="edit" /></button>
                </div></td>
              </tr>
            </TransitionGroup>
          </table>
        </div>
        </Transition>
      </div>

      <div v-if="list.length" class="s12">
        <PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="تاجر" :sizes="[10, 20, 50]" />
      </div>
    </div>

    <PayDialog v-model="payOpen" :trader="payFor" />
    <TraderForm v-model="formOpen" :trader="editFor" @saved="onAdded" />
    <ImportDialog v-model="importOpen" />
  </div>
</template>

<style scoped>
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; }
.findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 210px; }
.fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff;
  transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; flex: 1; border: 0; background: none; font: inherit; font-size: 13px; color: var(--color-muted); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0; width: 44px; min-width: 0; transition: color .2s; }
.vtog button.on { color: var(--color-primary-ink); font-weight: 700; }
.vtog button :deep(svg) { width: 21px; height: 21px; }
/* table view */
.tbl-wrap { background: rgb(255 255 255 / .42); border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 780px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 10px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; }
.tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.tname { border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; line-height: 1.4; }
.tname b { font-weight: 700; font-size: 14px; } .tname:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.tname small { color: var(--color-muted); font-size: 11.5px; }
.tbl .amt { font-weight: 700; font-size: 15px; color: var(--color-deep); }
.tbl tr.over .amt { color: var(--color-negative); } .tbl tr.clear .amt { color: var(--color-positive); }
.wbar { width: 170px; }
.mini { display: grid; gap: 4px; } .mini .debt { margin: 0; } .mini small { color: var(--color-muted); font-size: 11px; }
.tbl .ops { width: 1%; }
.opsin { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.iconbtn { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f1f6f6; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; flex: none; transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); }
.iconbtn :deep(svg) { width: 16px; height: 16px; }
.hr { display: flex; align-items: center; gap: 6px; }
.hr .iconbtn { width: 30px; height: 30px; }
.traders .grid > * { min-width: 0; }
.vtog button:focus-visible { outline: 0; }
.vtog button.on :deep(svg) { color: var(--color-primary); }
.muted { color: var(--color-muted); font-size: 12px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.findbar .count { margin-inline-start: auto; color: var(--color-muted); font-size: 13px; }
.tops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.top { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border: 0; text-align: right; font: inherit; color: inherit;
  border-radius: 18px; padding: 14px 16px 16px; background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; transition: transform .2s, box-shadow .2s;
  animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
button.top { cursor: pointer; }
button.top:hover { transform: translateY(-3px); }
.top.on { box-shadow: inset 0 0 0 2px var(--fg); }
.top::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.top > * { position: relative; z-index: 1; }
.top.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); }
.top.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.top.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.top .th { display: flex; justify-content: space-between; align-items: center; color: var(--fg); }
.top .th small { color: var(--color-muted); font-size: 12px; }
.top .th :deep(svg) { width: 20px; height: 20px; }
.top b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; }
.top b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.top .share { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.top .share i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: share-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.top .sub { font-size: 11.5px; color: var(--color-muted); }
@keyframes top-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes share-in { from { width: 0; } }
/* at most four cards a row */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(max(240px, calc((100% - 36px) / 4)), 1fr)); gap: 12px; }
.tc { --sc: var(--color-primary); position: relative; overflow: hidden; background: #fff; border-radius: 18px; padding: 18px 16px 14px; display: grid; gap: 12px; align-content: start;
  border: 1px solid #e4eeee; transition: transform .2s, box-shadow .2s, border-color .2s; }
.tc.over { --sc: var(--color-negative); }
.tc.late { --sc: #e0a33a; }
.tc.clear { --sc: var(--color-positive); }
.tc:hover { transform: translateY(-3px); border-color: transparent; box-shadow: 0 16px 30px -20px rgb(11 59 69 / .6); }
.h { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.h b { font-weight: 700; font-size: 15px; display: block; line-height: 1.4; }
.h small { display: flex; align-items: center; gap: 5px; color: var(--color-muted); font-size: 12px; margin-top: 2px; }
.h small :deep(svg) { width: 13px; height: 13px; }
.due { display: grid; gap: 0; }
.due b { font-size: 28px; font-weight: 700; color: var(--color-deep); line-height: 1.2; letter-spacing: -.01em; }
.due b span { font-size: 13px; font-weight: 500; color: var(--color-muted); margin-inline-start: 5px; }
.tc.over .due b { color: var(--color-negative); }
.tc.clear .due b { color: var(--color-positive); }
.due small { color: var(--color-muted); font-size: 12px; }
.debt { height: 6px; border-radius: 3px; background: #edf2f2; overflow: hidden; margin-top: -4px; }
.debt i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #2dd4bf, var(--color-primary)); transition: width .5s; }
.debt.bad i { background: var(--color-negative); }
.tc.late .debt i { background: linear-gradient(90deg, #f5c66b, #e0a33a); }
.facts { margin: 0; display: grid; grid-template-columns: 1fr 1fr; border-block: 1px dashed #e3ebea; padding: 8px 0; }
.facts div { display: grid; line-height: 1.4; }
.facts div + div { border-inline-start: 1px dashed #e3ebea; padding-inline-start: 10px; }
.facts dt { color: var(--color-muted); font-size: 11px; }
.facts dd { margin: 0; font-weight: 600; font-size: 12.5px; }
.go { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.go :deep(.sbt) { width: 100%; }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
