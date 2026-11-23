<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import DeliverDialog from '../components/feed/DeliverDialog.vue'
import SettleDialog from '../components/feed/SettleDialog.vue'
import DebitNote from '../components/feed/DebitNote.vue'
import PricesDialog from '../components/feed/PricesDialog.vue'
import { toast } from '../composables/useToast.js'
import { FEED, SUPPLIERS, FEED_TYPES, fmt } from '../data/demo.js'
import { markupOf, SETTLED } from '../data/feed.js'

// Feed on credit — table like the other pages (approved أ) with the settlement calendar (ب) as a second view.
const router = useRouter()

/* figures */
const total = computed(() => FEED.reduce((a, f) => a + f.amount, 0))
const tonsAll = computed(() => FEED.reduce((a, f) => a + f.tons, 0))
const soon = computed(() => FEED.filter((f) => f.daysLeft <= 30))
const tops = computed(() => [
  { key: 'all', label: 'علف آجل بسعر المصنع', icon: 'feed', tone: 'amber', value: fmt(total.value), unit: 'ج', share: 100, sub: `${fmt(tonsAll.value)} طن عند ${FEED.length} مزارع` },
  { key: 'soon', label: 'تسويات خلال شهر', icon: 'clock', tone: 'red', value: fmt(soon.value.reduce((a, f) => a + f.amount, 0)), unit: 'ج', share: total.value ? (soon.value.reduce((a, f) => a + f.amount, 0) / total.value) * 100 : 0, sub: soon.value.map((f) => f.name.replace('مزرعة ', '')).join('، ') || 'ولا وحدة' },
  { key: null, label: 'الزيادة المتوقعة', icon: 'share', tone: 'green', value: fmt(FEED.reduce((a, f) => a + markupOf(f, 'pct', 6), 0)), unit: 'ج', share: 6 * 8, sub: 'بنسبة 6% وقت التسوية' },
  { key: 'arch', label: 'اتسوّى هالموسم', icon: 'check', tone: 'teal', value: fmt(SETTLED.amount), unit: 'ج', share: Math.min(100, (SETTLED.amount / (SETTLED.amount + total.value)) * 100), sub: `${SETTLED.count} تسويات` },
])
function pickTop(k) { if (k === 'arch') { router.push('/feed/settlements'); return } if (k) filter.value = filter.value === k && k !== 'all' ? 'all' : k }

/* search + filter */
const q = ref('')
const filter = ref('all')
const FILTERS = computed(() => [
  { value: 'all', label: 'كل المزارع', hint: FEED.length },
  { value: 'soon', label: 'تسوية خلال شهر', hint: FEED.filter((f) => f.daysLeft <= 30).length },
  { value: 'later', label: 'تسوية بعد شهر', hint: FEED.filter((f) => f.daysLeft > 30).length },
])
const list = computed(() => FEED
  .filter((f) => !q.value || f.name.includes(q.value.trim()))
  .filter((f) => filter.value === 'all' || (filter.value === 'soon' && f.daysLeft <= 30) || (filter.value === 'later' && f.daysLeft > 30))
  .slice().sort((a, b) => a.daysLeft - b.daysLeft))

/* table (default) or calendar; small screens: calendar */
const view = ref('table')
const small = ref(false)
let mq = null
const onMq = () => { small.value = mq.matches }
const shownView = computed(() => (small.value ? 'cal' : view.value))
const VIEWS = [{ value: 'table', label: 'جدول', icon: 'rows' }, { value: 'cal', label: 'رزنامة التسويات', icon: 'calendar' }]
const vtogEl = ref(null)
const vthumb = ref({ left: '4px', width: '0px', opacity: 0 })
function placeVthumb() { const b = vtogEl.value?.querySelector('button.on'); if (b) vthumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 } }
watch([view, small], () => nextTick(placeVthumb))
onMounted(() => { mq = window.matchMedia('(max-width: 720px)'); onMq(); mq.addEventListener('change', onMq); nextTick(placeVthumb); document.fonts?.ready.then(placeVthumb); window.addEventListener('resize', placeVthumb) })
onBeforeUnmount(() => { mq?.removeEventListener('change', onMq); window.removeEventListener('resize', placeVthumb) })
const page = ref(1)
const size = ref(10)
watch([q, filter, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))


/* calendar lanes by month of settlement */
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const lanes = computed(() => {
  const map = new Map()
  list.value.forEach((f) => {
    const [, m, y] = f.due.split('/').map(Number)
    const key = y * 100 + m
    if (!map.has(key)) map.set(key, { key, label: `${MONTHS[m - 1]} ${y}`, items: [] })
    map.get(key).items.push(f)
  })
  return [...map.values()].sort((a, b) => a.key - b.key).map((l) => ({ ...l, sum: l.items.reduce((a, f) => a + f.amount, 0), tone: dayTone(Math.min(...l.items.map((f) => f.daysLeft))) }))
})
const dayTone = (d) => (d <= 14 ? 'soon' : d <= 60 ? 'mid' : 'far')
const typeCls = (t) => ['b0', 'b1', 'b2'][FEED_TYPES.findIndex((x) => x.type === t)] || 'b0'
/* what was delivered, per feed type: "3 طن بادي · 5 طن نامي" */
const mixOf = (f) => FEED_TYPES.map((t) => ({ type: t.type, short: t.type.split(' ')[0], cls: typeCls(t.type), tons: +f.deliveries.filter((d) => d.type === t.type).reduce((a, d) => a + d.tons, 0).toFixed(2) })).filter((m) => m.tons)
const balOf = (name) => SUPPLIERS.find((s) => s.name === name)?.balance ?? 0

/* actions */
const deliverOpen = ref(false)
const deliverFarm = ref('')
function newDelivery(name = '') { deliverFarm.value = name; deliverOpen.value = true }
const settleOpen = ref(false)
const settleFor = ref(null)
function openSettle(f) { settleFor.value = f; settleOpen.value = true }
/* a farm's feed account has its own page */
const openAccount = (f) => router.push(`/feed/${encodeURIComponent(f.name)}`)
/* the debit note: right after settling (with undo) or from the archive */
const noteOpen = ref(false)
const note = ref(null)
const noteUndo = ref(null)
const noteFresh = ref(false)
function onSettled({ note: n, undo }) { note.value = n; noteUndo.value = undo; noteFresh.value = true; setTimeout(() => { noteOpen.value = true }, 200) }
function showNote(n) { note.value = n; noteUndo.value = null; noteFresh.value = false; noteOpen.value = true }
const pricesOpen = ref(false)
function exportList() {
  const head = ['المزرعة', 'طن', 'بسعر المصنع', 'موعد التسوية', 'باقي (يوم)', 'عدد التوريدات']
  const rows = list.value.map((f) => [f.name, f.tons, f.amount, f.due, f.daysLeft, f.deliveries.length])
  const csv = '\uFEFF' + [head, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `العلف-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} مزرعة · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page feedp">
    <header class="dhead">
      <div class="hello">
        <h1>العلف</h1>
        <p class="num">{{ FEED.length }} مزارع عندهم علف آجل · <b>{{ fmt(total) }} ج</b> بسعر المصنع<template v-if="soon.length"> · <span class="hl warn">{{ soon.length }} تسوية خلال شهر</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="receipt" @click="router.push('/feed/settlements')">أرشيف التسويات</SoftButton>
        <SoftButton icon="feed" @click="pricesOpen = true">أسعار المصنع</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="newDelivery()">توريد علف</SoftButton>
      </div>
    </header>

    <div class="grid">
      <div class="s12 tops">
        <component :is="k.key ? 'button' : 'div'" v-for="(k, i) in tops" :key="k.label" :type="k.key ? 'button' : undefined" class="top" :class="[k.tone, { on: k.key && k.key !== 'all' && filter === k.key }]"
          :style="{ '--i': i }" @click="pickTop(k.key)">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span v-if="k.unit">{{ k.unit }}</span></b>
          <span class="share"><i :style="{ width: k.share + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </component>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على مزرعة" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر العلف" />
        <div v-if="!small" ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="feed" title="ما في علف آجل هون" text="سجّل توريد علف لمزرعة، أو غيّر الفلتر." />
        <Transition v-else name="swap" mode="out-in">
          <div v-if="shownView === 'table'" key="table" class="tbl-wrap tblcard">
            <table class="tbl">
              <thead><tr><th>المزرعة</th><th>شو استلم</th><th>الكمية</th><th>بسعر المصنع</th><th>التسوية</th><th>رصيده من البيع</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="f in paged" :key="f.name">
                  <td><button type="button" class="tname" @click="openAccount(f)"><b>{{ f.name }}</b><small class="num">{{ f.deliveries.length }} توريدات · آخرها {{ f.deliveries[f.deliveries.length - 1]?.date || '—' }}</small></button></td>
                  <td><span class="mix"><span v-for="m in mixOf(f)" :key="m.type" :class="m.cls"><b class="num">{{ m.tons }}</b> طن {{ m.short }}</span></span></td>
                  <td class="num">{{ f.tons }} طن</td>
                  <td class="num amt">{{ fmt(f.amount) }}</td>
                  <td><span class="days num" :class="dayTone(f.daysLeft)">{{ f.daysLeft >= 0 ? `بعد ${f.daysLeft} يوم` : `متأخرة ${-f.daysLeft} يوم` }}</span><small class="dd num">{{ f.due }}</small></td>
                  <td class="num bal" :class="{ adv: balOf(f.name) < 0 }">{{ fmt(Math.abs(balOf(f.name))) }} <small>{{ balOf(f.name) > 0 ? 'له' : balOf(f.name) < 0 ? 'عليه' : '' }}</small></td>
                  <td class="ops"><div class="opsin">
                    <SoftButton size="sm" @click="openAccount(f)">التفاصيل</SoftButton>
                    <SoftButton size="sm" icon="plus" @click="newDelivery(f.name)">توريد</SoftButton>
                    <SoftButton size="sm" tone="warn" icon="check" @click="openSettle(f)">تسوية</SoftButton>
                  </div></td>
                </tr>
              </TransitionGroup>
            </table>
          </div>

          <div v-else key="cal" class="feedcal">
            <section v-for="l in lanes" :key="l.key" class="mon" :class="l.tone">
              <div class="mh">
                <span><b>{{ l.label }}</b><small class="num">{{ l.items.length }} {{ l.items.length === 1 ? 'مزرعة' : 'مزارع' }}</small></span>
                <span class="mt num">{{ fmt(l.sum) }}<small>ج</small></span>
              </div>
              <article v-for="f in l.items" :key="f.name" class="due">
                <div class="h"><button type="button" class="tname" @click="openAccount(f)"><b>{{ f.name }}</b></button><span class="days num" :class="dayTone(f.daysLeft)">{{ f.daysLeft }} يوم</span></div>
                <small class="num">{{ f.tons }} طن · {{ f.deliveries.length }} توريدات · تسوية {{ f.due }}</small>
                <span class="clock" :aria-label="'باقي ' + f.daysLeft + ' يوم على التسوية'"><i :style="{ width: Math.max(4, 100 - Math.min(100, (f.daysLeft / 240) * 100)) + '%' }" /></span>
                <span class="mix"><span v-for="m in mixOf(f)" :key="m.type" :class="m.cls"><b class="num">{{ m.tons }}</b> طن {{ m.short }}</span></span>
                <dl class="money">
                  <div><dt>بسعر المصنع</dt><dd class="num">{{ fmt(f.amount) }}</dd></div>
                  <div><dt>مع زيادة 6%</dt><dd class="num">{{ fmt(Math.round(f.amount * 1.06)) }}</dd></div>
                </dl>
                <div class="go"><SoftButton size="sm" icon="plus" @click="newDelivery(f.name)">توريد</SoftButton><SoftButton size="sm" tone="warn" icon="check" @click="openSettle(f)">تسوية</SoftButton></div>
              </article>
            </section>
          </div>
        </Transition>
      </div>

      <div v-if="shownView === 'table' && list.length" class="s12">
        <PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="مزرعة" />
      </div>
    </div>

    <DeliverDialog v-model="deliverOpen" :farm="deliverFarm" />
    <SettleDialog v-model="settleOpen" :account="settleFor" @settled="onSettled" />
    <DebitNote v-model="noteOpen" :note="note" :undo="noteUndo" :fresh="noteFresh" />
    <PricesDialog v-model="pricesOpen" />
  </div>
</template>

<style scoped>
.feedp .grid > * { min-width: 0; }
.tops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.top { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border: 0; text-align: right; font: inherit; color: inherit;
  border-radius: 18px; padding: 14px 16px 16px; background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; transition: transform .2s, box-shadow .2s;
  animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
button.top { cursor: pointer; } button.top:hover { transform: translateY(-3px); } .top.on { box-shadow: inset 0 0 0 2px var(--fg); }
.top::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.top > * { position: relative; z-index: 1; }
.top.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); }
.top.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.top.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.top .th { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .top .th small { color: var(--color-muted); font-size: 12px; } .top .th :deep(svg) { width: 20px; height: 20px; }
.top b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .top b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.top .share { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.top .share i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: share-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.top .sub { font-size: 11.5px; color: var(--color-muted); }
@keyframes top-in { from { opacity: 0; transform: translateY(10px); } } @keyframes share-in { from { width: 0; } }
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; } .findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 210px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 880px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 10px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.tname { border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; line-height: 1.4; }
.tname b { font-weight: 700; font-size: 14px; } .tname:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.tname small { color: var(--color-muted); font-size: 11.5px; }
.mix { display: flex; gap: 4px; flex-wrap: wrap; }
.mix span { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 9px; border-radius: 999px; font-size: 12px; white-space: nowrap; }
.mix b { font-weight: 700; }
.mix .b0 { background: #f6e6c4; color: #6e4a07; } .mix .b1 { background: #fbefd5; color: #7a5a14; } .mix .b2 { background: #fdf6e6; color: #8a6a26; box-shadow: inset 0 0 0 1px #f0dfb7; }
.amt { font-weight: 700; color: #8a5a00; font-size: 15px; }
.days { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.days.soon { background: var(--neg-bg); color: var(--neg-ink); } .days.mid { background: var(--warn-bg); color: var(--warn-ink); } .days.far { background: var(--pos-bg); color: var(--pos-ink); }
.dd { display: block; color: var(--color-muted); font-size: 11px; margin-top: 2px; }
.bal { font-weight: 700; color: var(--color-primary-ink); } .bal small { font-size: 11px; color: var(--color-muted); font-weight: 500; } .bal.adv { color: var(--color-negative); }
.tbl .ops { width: 1%; } .opsin { display: flex; gap: 6px; justify-content: flex-end; }
.mk { color: #b4532a; font-weight: 600; }
.paytag { display: inline-flex; height: 22px; align-items: center; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
.paytag.deduct { background: var(--color-primary-pale); color: var(--color-primary-ink); } .paytag.cash { background: var(--pos-bg); color: var(--pos-ink); }
.none { text-align: center; color: var(--color-muted); font-size: 13px; padding: 12px; margin: 0; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
/* calendar: a column per settlement month */
.feedcal { display: grid; grid-template-columns: repeat(auto-fill, minmax(max(250px, calc((100% - 36px) / 4)), 1fr)); gap: 14px; align-items: start; }
.mon { --mc: var(--color-primary); --mbg: #dbeff5; border-radius: 18px; overflow: hidden; background: rgb(255 255 255 / .42); display: grid; gap: 10px; padding-bottom: 10px; }
.mon.soon { --mc: var(--color-negative); --mbg: #ffe3df; } .mon.mid { --mc: #d58f17; --mbg: #fff0d2; } .mon.far { --mc: #179e8a; --mbg: #d8f5ee; }
.mh { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; background: linear-gradient(135deg, var(--mbg), rgb(255 255 255 / .6)); }
.mh b { display: block; font-size: 15px; font-weight: 700; color: var(--mc); } .mh small { color: var(--color-muted); font-size: 11.5px; }
.mh .mt { font-size: 20px; font-weight: 700; color: var(--color-deep); } .mh .mt small { font-size: 12px; margin-inline-start: 4px; }
.due { margin-inline: 10px; background: #fff; border-radius: 14px; padding: 12px; display: grid; gap: 8px; border: 1px solid #e8efef; transition: transform .2s, box-shadow .2s; }
.due:hover { transform: translateY(-2px); box-shadow: 0 14px 26px -18px rgb(11 59 69 / .6); }
.due .h { display: flex; justify-content: space-between; align-items: center; gap: 6px; } .due > small { color: var(--color-muted); font-size: 11.5px; margin-top: -4px; }
.clock { height: 5px; border-radius: 3px; background: #eef3f3; overflow: hidden; } .clock i { display: block; height: 100%; border-radius: 3px; background: var(--mc); }
.money { margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.money div { background: #fbf7ee; border-radius: 10px; padding: 6px 10px; } .money dt { color: var(--color-muted); font-size: 11px; } .money dd { margin: 0; font-weight: 700; color: #8a5a00; }
.money div + div { background: #f5f9f9; } .money div + div dd { color: var(--color-deep); }
.go { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .go :deep(.sbt) { width: 100%; }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
