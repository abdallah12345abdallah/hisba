<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import MoveDialog from '../components/safe/MoveDialog.vue'
import CloseDayDialog from '../components/safe/CloseDayDialog.vue'
import { WALLETS, CASHBOOK, TRADERS, SUPPLIERS, MANIFESTS, TODAY, fmt } from '../data/demo.js'
import { allMoves, balances, todayIn, todayOut, SOURCES, walletLabel, removeMove, reopenDay } from '../data/safe.js'
import { STAFF } from '../data/staff.js'
import { INVESTORS } from '../data/investors.js'
import { log } from '../data/audit.js'
import { toast } from '../composables/useToast.js'

// The safe — same pattern as the other pages: the three wallets as figure cards (each filters the list), search + filter,
// a table or a running "day book", and every action in a dialog: a movement, a transfer, closing the day with a cash count.
const router = useRouter()
const bal = computed(() => balances())
const inSum = computed(() => todayIn())
const outSum = computed(() => todayOut())
const moves = computed(() => allMoves())
const closed = computed(() => !!CASHBOOK.closedAt)

const ICON = { cash: 'cash', vodafone: 'phone', bank: 'safe' }
const tops = computed(() => {
  const all = Object.values(bal.value).reduce((a, b) => a + Math.max(0, b), 0) || 1
  const w = WALLETS.map((x, i) => {
    const mv = moves.value.filter((e) => e.method === x.key || e.to === x.key)
    return { key: x.key, label: x.long, icon: ICON[x.key], tone: ['teal', 'amber', 'green'][i], value: fmt(bal.value[x.key]), unit: 'ج', share: (Math.max(0, bal.value[x.key]) / all) * 100,
      sub: `${mv.length} حركة اليوم · بدأ بـ ${fmt(CASHBOOK.opening[x.key])}` }
  })
  const net = inSum.value - outSum.value
  return [...w, { key: null, label: 'صافي اليوم', icon: net >= 0 ? 'in' : 'out', tone: net >= 0 ? 'green' : 'red', value: `${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}`, unit: 'ج', share: inSum.value + outSum.value ? (inSum.value / (inSum.value + outSum.value)) * 100 : 0, sub: `دخل ${fmt(inSum.value)} · طلع ${fmt(outSum.value)}` }]
})

/* search + filter (+ a wallet chosen from the cards) */
const q = ref('')
const filter = ref('all')
const wallet = ref(null)
function pickTop(k) { if (k) wallet.value = wallet.value === k ? null : k }
const FILTERS = computed(() => [
  { value: 'all', label: 'كل الحركات', hint: moves.value.length },
  { value: 'in', label: 'الدخل', hint: moves.value.filter((e) => e.dir === 'in').length },
  { value: 'out', label: 'الصرف', hint: moves.value.filter((e) => e.dir === 'out').length },
  { value: 'move', label: 'التحويلات', hint: moves.value.filter((e) => e.dir === 'move').length },
  ...Object.entries(SOURCES).filter(([k]) => k !== 'move').map(([k, s]) => ({ value: 'src:' + k, label: s.label, hint: moves.value.filter((e) => e.src === k).length })).filter((o) => o.hint),
])
const list = computed(() => moves.value
  .filter((e) => !wallet.value || e.method === wallet.value || e.to === wallet.value)
  .filter((e) => filter.value === 'all' || e.dir === filter.value || (filter.value.startsWith('src:') && e.src === filter.value.slice(4)))
  .filter((e) => !q.value || `${e.party} ${e.note} ${SOURCES[e.src]?.label}`.includes(q.value.trim())))

/* table or day book */
const view = ref('table')
const VIEWS = [{ value: 'table', label: 'جدول', icon: 'rows' }, { value: 'book', label: 'يومية الدرج', icon: 'clock' }]
const vtogEl = ref(null)
const vthumb = ref({ left: '4px', width: '0px', opacity: 0 })
function placeVthumb() { const b = vtogEl.value?.querySelector('button.on'); if (b) vthumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 } }
watch(view, () => nextTick(placeVthumb))
onMounted(() => { nextTick(placeVthumb); document.fonts?.ready.then(placeVthumb); window.addEventListener('resize', placeVthumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeVthumb))
const page = ref(1)
const size = ref(10)
watch([q, filter, wallet, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))

/* day book: oldest first with the drawer after each cash move */
const book = computed(() => {
  let run = CASHBOOK.opening.cash
  return [...list.value].reverse().map((e) => {
    if (e.method === 'cash') run += e.dir === 'in' ? e.amount : -e.amount
    if (e.dir === 'move' && e.to === 'cash') run += e.amount
    return { ...e, run }
  })
})
const signed = (e) => (e.dir === 'in' ? e.amount : e.dir === 'out' ? -e.amount : 0)

/* where a movement came from */
const GO_LABEL = { collect: 'حساب التاجر', supplier: 'حساب المورد', advance: 'حساب المورد', feed: 'حساب العلف', sale: 'شيت البيع', salary: 'حساب الموظف', capital: 'حساب المساهم', capitalOut: 'حساب المساهم', profit: 'حساب المساهم' }
function sourceLink(e) {
  if (e.src === 'collect') { const t = TRADERS.find((x) => x.name === e.party); return t && `/traders/${encodeURIComponent(t.name)}` }
  if (e.src === 'supplier' || e.src === 'advance') { const s = SUPPLIERS.find((x) => x.name === e.party); return s && `/suppliers/${s.id}` }
  if (e.src === 'salary') { const s = STAFF.find((x) => x.name === e.party); return s && `/staff/${s.id}` }
  if (['capital', 'capitalOut', 'profit'].includes(e.src)) { const x = INVESTORS.find((i) => i.name === e.party); return x && `/investors/${x.id}` }
  if (e.src === 'feed') return `/feed/${encodeURIComponent(e.party)}`
  if (e.src === 'sale') { const m = MANIFESTS.find((x) => e.note.includes(x.supplier)); return m && m.status === 'draft' ? `/sheet/${m.id}` : null }
  return null
}

/* actions */
const moveOpen = ref(false)
const moveDir = ref('out')
function newMove(d) { moveDir.value = d; moveOpen.value = true }
const closeOpen = ref(false)
const toDelete = ref(null)
const askDelete = ref(false)
function confirmDelete(e) { toDelete.value = e; askDelete.value = true }
function doDelete() {
  const e = toDelete.value
  const gone = removeMove(e)
  const what = `${SOURCES[e.src].label} · ${e.party} · ${fmt(e.amount)} ج من ${walletLabel(e.method)}`
  log('delete', 'حذف حركة خزنة', what, '/safe')
  const undo = () => { gone(); log('edit', 'رجّع حركة خزنة انحذفت', what, '/safe') }
  toast('انحذفت الحركة', `${SOURCES[e.src].label} · ${e.party} · ${fmt(e.amount)} ج`, { tone: 'info', action: { label: 'تراجع', run: undo } }) }
const askReopen = ref(false)
function doReopen() { reopenDay(); toast('انفتح اليوم من جديد', 'فيك تسجّل حركات وتقفله مرة تانية.', { tone: 'info' }) }
function exportList() {
  const head = ['الوقت', 'البند', 'البيان', 'المحفظة', 'دخل', 'طلع', 'ملاحظة']
  const rows = list.value.map((e) => [e.time, SOURCES[e.src].label, e.party, e.dir === 'move' ? `${walletLabel(e.method)} ← ${walletLabel(e.to)}` : walletLabel(e.method), e.dir === 'in' ? e.amount : '', e.dir === 'out' ? e.amount : '', e.note])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `الخزنة-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} حركة · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page safe">
    <header class="dhead">
      <div class="hello">
        <h1>الخزنة</h1>
        <p class="num">{{ TODAY }} · بالدرج <b>{{ fmt(bal.cash) }} ج</b><template v-if="closed"> · <span class="hl ok">مقفول الساعة {{ CASHBOOK.closedAt }}</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="calendar" @click="router.push('/safe/closes')">سجل القفل</SoftButton>
        <SoftButton icon="plus" :disabled="closed" @click="newMove('in')">حركة جديدة</SoftButton>
        <SoftButton v-if="!closed" icon="lock" tone="primary" @click="closeOpen = true">قفل اليوم</SoftButton>
        <SoftButton v-else icon="lock" @click="askReopen = true">فتح اليوم</SoftButton>
      </div>
    </header>

    <div class="grid">
      <div v-if="closed" class="s12 lockbar"><AppIcon name="lock" /><span><b>اليوم مقفول.</b> العد {{ fmt(CASHBOOK.closes[0].counted) }} ج{{ CASHBOOK.closes[0].diff ? ` · ${CASHBOOK.closes[0].diff > 0 ? 'زيادة' : 'عجز'} ${fmt(Math.abs(CASHBOOK.closes[0].diff))}` : ' · مطابق' }}. الحركات اليدوية موقفة لحد ما تفتحه.</span></div>

      <div class="s12 tops">
        <component :is="k.key ? 'button' : 'div'" v-for="(k, i) in tops" :key="k.label" :type="k.key ? 'button' : undefined" class="top" :class="[k.tone, { on: k.key && wallet === k.key }]"
          :style="{ '--i': i }" :aria-pressed="k.key ? wallet === k.key : undefined" @click="pickTop(k.key)">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span>{{ k.unit }}</span></b>
          <span class="share"><i :style="{ width: k.share + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </component>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر بالبيان أو الملاحظة" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر الحركات" />
        <div ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="safe" title="ما في حركات هون" text="غيّر الفلتر أو المحفظة، أو سجّل حركة جديدة." />
        <Transition v-else name="swap" mode="out-in">
          <div v-if="view === 'table'" key="table" class="tbl-wrap tblcard">
            <table class="tbl">
              <thead><tr><th>الوقت</th><th>البيان</th><th>المحفظة</th><th>دخل</th><th>طلع</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="e in paged" :key="e.id" :class="e.dir">
                  <td class="num t">{{ e.time }}</td>
                  <td><span class="what"><span class="k" :class="e.dir"><AppIcon :name="SOURCES[e.src].icon" /></span><span><b>{{ e.party }}</b><small>{{ SOURCES[e.src].label }}{{ e.note ? ' · ' + e.note : '' }}</small></span></span></td>
                  <td><span class="wtag">{{ walletLabel(e.method) }}</span><template v-if="e.dir === 'move'"><AppIcon name="next" class="arr" /><span class="wtag">{{ walletLabel(e.to) }}</span></template></td>
                  <td class="num inc">{{ e.dir === 'in' ? fmt(e.amount) : e.dir === 'move' ? fmt(e.amount) : '' }}</td>
                  <td class="num outc">{{ e.dir === 'out' ? fmt(e.amount) : e.dir === 'move' ? fmt(e.amount) : '' }}</td>
                  <td class="ops"><div class="opsin">
                    <RouterLink v-if="sourceLink(e)" :to="sourceLink(e)" class="go"><AppIcon :name="SOURCES[e.src].icon" />{{ GO_LABEL[e.src] }}</RouterLink>
                    <button v-if="e.manual && !closed" type="button" class="go del" @click="confirmDelete(e)"><AppIcon name="trash" />حذف</button>
                  </div></td>
                </tr>
              </TransitionGroup>
            </table>
          </div>

          <div v-else key="book" class="book tblcard">
            <ol class="tree">
              <li class="cap start">
                <span class="time num">بداية</span><span class="rail"><i class="node" /></span>
                <span class="card"><span class="body"><b>بداية اليوم بالدرج</b><small>الرصيد اللي انفتح فيه اليوم</small></span><span class="run num"><small>الدرج</small>{{ fmt(CASHBOOK.opening.cash) }}</span></span>
              </li>
              <li v-for="e in book" :key="e.id" :class="[e.dir, { other: e.method !== 'cash' && e.to !== 'cash' }]">
                <span class="time num">{{ e.time }}</span>
                <span class="rail"><i class="node"><AppIcon :name="SOURCES[e.src].icon" /></i></span>
                <span class="card">
                  <span class="body"><b>{{ e.party }}</b><small>{{ SOURCES[e.src].label }} · {{ e.dir === 'move' ? `${walletLabel(e.method)} ← ${walletLabel(e.to)}` : walletLabel(e.method) }}{{ e.note ? ' · ' + e.note : '' }}</small></span>
                  <span class="amt num">{{ e.dir === 'move' ? '⇄' : signed(e) > 0 ? '+' : '−' }} {{ fmt(e.amount) }}</span>
                  <span class="run num"><small>{{ e.method !== 'cash' && e.to !== 'cash' ? 'ما أثّر بالدرج' : 'الدرج بعدها' }}</small>{{ fmt(e.run) }}</span>
                </span>
              </li>
              <li class="cap end">
                <span class="time num">هلأ</span><span class="rail"><i class="node" /></span>
                <span class="card"><span class="body"><b>بالدرج هلأ</b><small>لازم تلاقي هالمبلغ وقت العد</small></span><span class="run num"><small>الدرج</small>{{ fmt(book.length ? book[book.length - 1].run : CASHBOOK.opening.cash) }}</span></span>
              </li>
            </ol>
          </div>
        </Transition>
      </div>

      <div v-if="list.length && view === 'table'" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="حركة" :sizes="[10, 20, 50]" /></div>
    </div>

    <MoveDialog v-model="moveOpen" :dir="moveDir" />
    <CloseDayDialog v-model="closeOpen" />
    <ConfirmDialog v-model="askDelete" :title="toDelete ? `تحذف حركة ${toDelete.party}؟` : ''" confirm="احذف الحركة"
      :text="toDelete ? `${SOURCES[toDelete.src].label} بـ ${fmt(toDelete.amount)} ج. الرصيد بيرجع متل ما كان.` : ''" @confirm="doDelete" />
    <ConfirmDialog v-model="askReopen" title="تفتح اليوم من جديد؟" confirm="افتح اليوم" text="العد الأخير بينشال من سجل القفل، وبتقدر تسجّل حركات وتقفل مرة تانية." @confirm="doReopen" />
  </div>
</template>

<style scoped>
.safe .grid > * { min-width: 0; }
.lockbar { display: flex; align-items: center; gap: 10px; background: var(--pos-bg); color: #0d3b22; border-radius: 14px; padding: 10px 14px; font-size: 13px; }
.lockbar :deep(svg) { width: 18px; height: 18px; flex: none; }
.tops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.top { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border: 0; text-align: right; font: inherit; color: inherit;
  border-radius: 18px; padding: 14px 16px 16px; background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; transition: transform .2s, box-shadow .2s;
  animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
button.top { cursor: pointer; } button.top:hover { transform: translateY(-3px); } .top.on { box-shadow: inset 0 0 0 2px var(--fg); }
.top::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.top > * { position: relative; z-index: 1; }
.top.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); } .top.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.top.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.top .th { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .top .th small { color: var(--color-muted); font-size: 12px; } .top .th :deep(svg) { width: 20px; height: 20px; }
.top b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .top b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.top .share { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.top .share i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: share-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.top .sub { font-size: 11.5px; color: var(--color-muted); }
@keyframes top-in { from { opacity: 0; transform: translateY(10px); } } @keyframes share-in { from { width: 0; } }
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 300px; max-width: 100%; } .findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 210px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { margin-inline-start: auto; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 760px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.t { color: var(--color-muted); width: 1%; }
.what { display: flex; align-items: center; gap: 10px; }
.what b { display: block; font-weight: 600; } .what small { color: var(--color-muted); font-size: 11.5px; }
.k { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none; } .k :deep(svg) { width: 16px; height: 16px; }
.k.in { background: var(--pos-bg); color: var(--color-positive); } .k.out { background: var(--neg-bg); color: var(--color-negative); } .k.move { background: var(--color-primary-pale); color: var(--color-primary-ink); }
.wtag { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: 999px; background: #f1f6f6; font-size: 11.5px; font-weight: 600; }
.arr { width: 14px; height: 14px; vertical-align: middle; margin: 0 3px; color: var(--color-muted); }
.inc { color: var(--color-positive); font-weight: 700; } .outc { color: var(--color-negative); font-weight: 700; }
tr.move .inc, tr.move .outc { color: var(--color-primary-ink); font-weight: 500; }
.ops { width: 1%; } .opsin { display: flex; gap: 6px; justify-content: flex-end; }
.go { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border: 0; border-radius: 9px; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-size: 12.5px; font-weight: 600; text-decoration: none; white-space: nowrap; cursor: pointer; transition: background .15s, color .15s; }
.go :deep(svg) { width: 15px; height: 15px; } .go:hover { background: #c6e5ee; }
.go.del { background: var(--neg-bg); color: var(--neg-ink); } .go.del:hover { background: var(--color-negative); color: #fff; }
.iconbtn { width: 32px; height: 32px; border: 0; border-radius: 9px; background: #f1f6f6; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); } .iconbtn.del:hover { background: var(--neg-bg); color: var(--color-negative); } .iconbtn :deep(svg) { width: 15px; height: 15px; }
/* day book: a tree from the start of the day to now, the drawer after every move */
.book { border-radius: 16px; padding: 12px 14px; }
.tree { list-style: none; margin: 0; padding: 0; display: grid; }
.tree li { display: grid; grid-template-columns: 52px 36px minmax(0, 1fr); gap: 0 10px; align-items: stretch; }
.tree .time { align-self: center; text-align: center; color: var(--color-muted); font-size: 12.5px; font-weight: 600; }
.tree .rail { position: relative; display: grid; place-items: center; }
.tree .rail::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; width: 2px; margin-left: -1px; background: #cfdfe0; }
.tree .start .rail::before { top: 50%; } .tree .end .rail::before { bottom: 50%; }
.tree .node { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: var(--color-primary); box-shadow: 0 0 0 4px rgb(255 255 255 / .6), inset 0 0 0 2px currentColor; }
.tree .node :deep(svg) { width: 15px; height: 15px; }
.tree .in .node { color: var(--color-positive); } .tree .out .node { color: var(--color-negative); } .tree .move .node { color: var(--color-primary); }
.tree .cap .node { width: 14px; height: 14px; background: var(--color-deep); box-shadow: 0 0 0 4px #fff; }
.tree .card { margin: 5px 0; background: #fff; border-radius: 12px; padding: 9px 12px; display: grid; grid-template-columns: minmax(0, 1fr) auto 120px; gap: 12px; align-items: center; transition: transform .15s, box-shadow .15s; }
.tree li:not(.cap) .card:hover { transform: translateX(-3px); box-shadow: 0 10px 20px -16px rgb(11 59 69 / .6); }
.tree .cap .card { background: var(--color-primary-pale); } .tree .end .card { background: #0e7490; color: #fff; } .tree .end .card small, .tree .end .run small { color: #cdebf1; } .tree .end .run { background: rgb(255 255 255 / .14); color: #fff; }
.tree .body { min-width: 0; } .tree .body b { display: block; font-weight: 600; font-size: 13.5px; } .tree .body small { color: var(--color-muted); font-size: 11.5px; }
.tree .amt { font-weight: 700; font-size: 15px; white-space: nowrap; } .tree .in .amt { color: var(--color-positive); } .tree .out .amt { color: var(--color-negative); } .tree .move .amt { color: var(--color-primary-ink); }
.tree .run { text-align: left; font-weight: 700; font-size: 15px; color: var(--color-deep); background: #f4f9f9; border-radius: 10px; padding: 4px 10px; }
.tree .run small { display: block; font-size: 10.5px; color: var(--color-muted); font-weight: 500; }
.tree .cap .card { grid-template-columns: minmax(0, 1fr) 120px; }
.tree li.other .card { opacity: .6; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .tree li { grid-template-columns: 42px 32px minmax(0, 1fr); } .tree .card { grid-template-columns: minmax(0, 1fr) auto; } .tree .run { grid-column: 1 / -1; justify-self: start; } }
</style>
