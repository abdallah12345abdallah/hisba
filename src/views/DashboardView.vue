<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import CountNum from '../components/ui/CountNum.vue'
import MoveDialog from '../components/safe/MoveDialog.vue'
import CloseDayDialog from '../components/safe/CloseDayDialog.vue'
import FishPricesDialog from '../components/dashboard/FishPricesDialog.vue'
import { TODAY, TOTALS, TRADERS, USER, MANIFESTS, PRICES, CASH, CASHBOOK, FEED, RECEIVABLE, MONTH as NOV_DAYS, fmt } from '../data/demo.js'
import { todayIn, todayOut, allMoves } from '../data/safe.js'
import { RECURRING, isPaid, dueIn } from '../data/expenses.js'
import { TODAY as DAY, unmarkedToday } from '../data/staff.js'
import { monthPnl, NOW, MONTHS } from '../data/reports.js'

// Home — "خط اليوم" (approved 2): one sentence, the day as a line from dawn to now with each truck where it arrived,
// four numbers, and what needs you + today's prices.
const router = useRouter()
const greeting = new Date().getHours() < 12 ? 'صباح الخير' : 'مساء الخير'
const short = (v) => (Math.abs(v) >= 1e6 ? `${+(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))
const pct = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : 0)

/* the day line: dawn 04:00 → afternoon 15:00 */
const START = 4 * 60, END = 15 * 60
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const at = (m) => Math.min(100, Math.max(0, ((m - START) / (END - START)) * 100))
const clock = ref(new Date())
let tick = 0
onMounted(() => { tick = setInterval(() => { clock.value = new Date() }, 30000) })
onBeforeUnmount(() => clearInterval(tick))
const lastArrival = computed(() => Math.max(...MANIFESTS.map((m) => mins(m.time))))
// "now" on the line: the real clock while the market is open, never before the last truck
const nowMin = computed(() => Math.min(END, Math.max(lastArrival.value + 20, clock.value.getHours() * 60 + clock.value.getMinutes())))
const nowLabel = computed(() => `${String(Math.floor(nowMin.value / 60)).padStart(2, '0')}:${String(nowMin.value % 60).padStart(2, '0')}`)
const trucks = computed(() => MANIFESTS.map((m, i) => ({ ...m, pos: at(mins(m.time)), i, low: i % 2 === 1 })))
const unsoldDrafts = computed(() => TOTALS.drafts.length)

/* four numbers */
const soldPct = computed(() => (TOTALS.boxes ? Math.round((TOTALS.sold / TOTALS.boxes) * 100) : 0))
const collectedToday = computed(() => allMoves().filter((e) => e.src === 'collect').reduce((a, e) => a + e.amount, 0))
const netToday = computed(() => todayIn() - todayOut())
const monthNet = computed(() => monthPnl(NOW).net)
const lastNetSame = computed(() => (monthPnl(NOW - 1).net * DAY) / 30)
const yesterday = computed(() => NOV_DAYS.filter((d) => !d.closed && !d.today).slice(-1)[0])
const vsYesterday = computed(() => pct(TOTALS.commission, yesterday.value?.commission))

/* what needs you today — gathered from every page */
const todo = computed(() => {
  const list = []
  TRADERS.filter((t) => t.due > t.limit).forEach((t) => list.push({ key: 't' + t.name, tone: 'bad', title: `${t.name} فوق حدّه`, sub: `عليه ${fmt(t.due)} من ${fmt(t.limit)}`, to: `/traders/${encodeURIComponent(t.name)}`, act: 'الكشف' }))
  RECURRING.filter((r) => !isPaid(r) && dueIn(r) <= 3).forEach((r) => list.push({ key: 'r' + r.id, tone: dueIn(r) < 0 ? 'bad' : 'warn', title: `${r.name} ${dueIn(r) < 0 ? `متأخر ${-dueIn(r)} يوم` : dueIn(r) === 0 ? 'موعده اليوم' : `بعد ${dueIn(r)} يوم`}`, sub: `${fmt(r.amount)} ج`, to: '/expenses', act: 'ادفع' }))
  TOTALS.drafts.forEach((m) => list.push({ key: 'm' + m.id, tone: 'warn', title: `بيان ${m.supplier.replace('مزرعة ', '')} مفتوح`, sub: `باقي ${m.boxes - m.sold} بوكس`, to: `/sheet/${m.id}`, act: 'كمّل' }))
  if (unmarkedToday().length) list.push({ key: 'att', tone: 'info', title: `حضور ${unmarkedToday().length} عمال ما انسجّل`, sub: unmarkedToday().map((e) => e.name).join('، '), to: '/staff', act: 'سجّل' })
  FEED.filter((f) => f.amount && f.daysLeft <= 30).forEach((f) => list.push({ key: 'f' + f.name, tone: 'info', title: `تسوية علف ${f.name.replace('مزرعة ', '')} بعد ${f.daysLeft} يوم`, sub: `${fmt(f.amount)} ج`, to: `/feed/${encodeURIComponent(f.name)}`, act: 'التفاصيل' }))
  if (!CASHBOOK.closedAt) list.push({ key: 'close', tone: 'info', title: 'الخزنة لسا ما تسكّرت', sub: `بالدرج ${fmt(CASH.drawer)} ج`, action: 'close', act: 'سكّر' })
  return list
})
function doTodo(t) { if (t.action === 'close') closeOpen.value = true; else router.push(t.to) }

/* prices */
const pricesAt = ref('05:40')

/* dialogs */
const moveOpen = ref(false)
const moveDir = ref('in')
function move(d) { moveDir.value = d; moveOpen.value = true }
const closeOpen = ref(false)
const pricesOpen = ref(false)
</script>

<template>
  <div class="page home">
    <header class="dhead">
      <div class="hello">
        <span class="datechip"><AppIcon name="calendar" />{{ TODAY }}</span>
        <h1>{{ greeting }} يا {{ USER.name }}</h1>
      </div>
      <div class="actions">
        <SoftButton icon="in" @click="move('in')">سند قبض</SoftButton>
        <SoftButton icon="out" @click="move('out')">سند صرف</SoftButton>
        <SoftButton icon="lock" :disabled="!!CASHBOOK.closedAt" @click="closeOpen = true">{{ CASHBOOK.closedAt ? 'اليوم مسكّر' : 'تسكير اليوم' }}</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="router.push('/sheet')">بيان جديد</SoftButton>
      </div>
    </header>

    <div class="day">
      <!-- the sentence + the day line -->
      <section class="dtop rise">
        <p class="sent">لحد هلأ عملنا <b class="num"><CountNum :value="TOTALS.commission" /> ج</b> عمولة من <b class="num"><CountNum :value="TOTALS.gross" :delay="120" /> ج</b> بيع
          <span v-if="unsoldDrafts" class="pill warn num">باقي {{ TOTALS.unsold }} بوكس {{ unsoldDrafts === 1 ? 'ببيان' : `بـ${unsoldDrafts} بيانات` }}</span>
          <span v-else class="pill ok">كل البيانات معتمدة</span>
          <span v-if="vsYesterday" class="pill num" :class="vsYesterday >= 0 ? 'ok' : 'bad'">{{ vsYesterday >= 0 ? '▲' : '▼' }} {{ Math.abs(vsYesterday) }}% عن امبارح</span>
        </p>
        <div class="timeline" role="img" :aria-label="`${MANIFESTS.length} سيارات وصلت من ${MANIFESTS[0].time} لـ ${nowLabel}`">
          <div class="track"><i :style="{ width: at(nowMin) + '%' }" /></div>
          <span class="now" :style="{ right: at(nowMin) + '%' }"><em class="num">هلأ {{ nowLabel }}</em></span>
          <component :is="t.status === 'draft' ? RouterLink : 'span'" v-for="t in trucks" :key="t.id" :to="t.status === 'draft' ? `/sheet/${t.id}` : undefined"
            class="truck" :class="[t.status, { low: t.low }]" :style="{ right: t.pos + '%', '--i': t.i }"
            :title="`${t.supplier} · وصل ${t.time} · ${t.status === 'draft' ? `باقي ${t.boxes - t.sold} بوكس` : `${t.boxes} بوكس · عمولة ${fmt(t.commission)}`}`">
            <span class="tdot"><AppIcon name="truck" /></span>
            <span class="tl"><b>{{ t.supplier.replace('مزرعة ', '') }}</b><small class="num">{{ t.time }}<template v-if="t.status === 'draft'"> · باقي {{ t.boxes - t.sold }}</template></small></span>
          </component>
        </div>
        <div class="ends num"><span>الفجر 04:00</span><span>العصر 15:00</span></div>
      </section>

      <!-- four numbers -->
      <div class="nums">
        <div class="n rise" style="--i:1"><small>البوكسات</small><b class="num"><CountNum :value="TOTALS.sold" :delay="200" /><span>من {{ fmt(TOTALS.boxes) }}</span></b>
          <span class="nbar"><i :style="{ width: soldPct + '%' }" /></span><em class="num">{{ soldPct }}% انباع</em></div>
        <div class="n rise" style="--i:2"><small>بالدرج هلأ</small><b class="num"><CountNum :value="CASH.drawer" :delay="260" /><span>ج</span></b>
          <em class="num" :class="netToday >= 0 ? 'up' : 'down'">{{ netToday >= 0 ? '+' : '−' }}{{ short(Math.abs(netToday)) }} اليوم</em></div>
        <div class="n rise" style="--i:3"><small>اتحصّل من التجار</small><b class="num"><CountNum :value="collectedToday" :delay="320" /><span>ج</span></b>
          <em class="num down">عليهم {{ short(RECEIVABLE.total) }}</em></div>
        <div class="n rise" style="--i:4"><small>صافي {{ MONTHS[NOW] }}</small><b class="num"><CountNum :value="monthNet" :delay="380" /><span>ج</span></b>
          <em class="num" :class="monthNet >= lastNetSame ? 'up' : 'down'">{{ monthNet >= lastNetSame ? '▲' : '▼' }} {{ Math.abs(pct(monthNet, lastNetSame)) }}% عن {{ MONTHS[NOW - 1] }}</em></div>
      </div>

      <!-- what needs you + prices -->
      <div class="split">
        <section class="panel rise" style="--i:5">
          <h3>بدها منك <span class="cnt num" :class="{ zero: !todo.length }">{{ todo.length }}</span></h3>
          <TransitionGroup v-if="todo.length" name="list" tag="div" class="rows">
            <button v-for="(t, i) in todo" :key="t.key" type="button" class="r" :class="t.tone" :style="{ '--i': i }" @click="doTodo(t)">
              <i class="dot" /><span class="rt"><b>{{ t.title }}</b><small class="num">{{ t.sub }}</small></span><span class="go">{{ t.act }}<AppIcon name="next" /></span>
            </button>
          </TransitionGroup>
          <div v-else class="done"><AppIcon name="check" />كله تمام، ما في شي مستعجل اليوم.</div>
        </section>
        <section class="panel rise" style="--i:6">
          <h3>أسعار اليوم <button type="button" class="edit" @click="pricesOpen = true"><AppIcon name="edit" />عدّل</button></h3>
          <div class="prices">
            <div v-for="([g, p], i) in PRICES" :key="g" class="pr" :style="{ '--i': i }"><span>{{ g }}</span><b class="num">{{ p }}<small>ج/ك</small></b></div>
          </div>
          <p class="note num">آخر تعديل {{ pricesAt }} · الشيت بيعبّيها لحاله</p>
        </section>
      </div>

    </div>

    <MoveDialog v-model="moveOpen" :dir="moveDir" />
    <CloseDayDialog v-model="closeOpen" />
    <FishPricesDialog v-model="pricesOpen" @saved="(t) => (pricesAt = t)" />
  </div>
</template>

<style scoped>
.datechip { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-primary-ink); background: rgb(255 255 255 / .6); border-radius: 999px; padding: 4px 12px; margin-bottom: 6px; }
.datechip :deep(svg) { width: 15px; height: 15px; }
.day { display: grid; gap: 14px; }
.up { color: var(--color-positive) !important; } .down { color: var(--color-negative) !important; }
.rise { animation: rise .6s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i, 0) * 70ms); }
@keyframes rise { from { opacity: .001; transform: translateY(12px); } }
@keyframes grow { from { transform: scaleX(0); } }

/* sentence + day line */
.dtop { background: #fff; border-radius: 24px; padding: 20px 24px 14px; display: grid; gap: 8px; }
.sent { margin: 0; font-size: 19px; line-height: 2.1; color: var(--color-muted); }
.sent b { color: var(--color-deep); font-size: 26px; }
.pill { display: inline-flex; align-items: center; height: 26px; padding: 0 11px; border-radius: 999px; font-size: 12.5px; font-weight: 600; vertical-align: 4px; margin-inline-start: 4px; }
.pill.warn { background: #fff3d9; color: #a86b00; } .pill.ok { background: var(--pos-bg); color: var(--color-positive); } .pill.bad { background: var(--neg-bg); color: var(--color-negative); }
.timeline { position: relative; height: 118px; margin: 0 26px; }
.track { position: absolute; inset-inline: 0; top: 54px; height: 8px; border-radius: 4px; background: #e8f0f0; }
.track i { position: absolute; inset-block: 0; right: 0; border-radius: 4px; background: linear-gradient(270deg, #2dd4bf, var(--color-primary)); transform-origin: right; animation: grow 1.4s cubic-bezier(.2, .9, .25, 1) .2s both; transition: width .6s; }
.now { position: absolute; top: 42px; width: 3px; height: 32px; border-radius: 2px; background: var(--color-deep); transform: translateX(50%); animation: rise .5s ease 1.2s both; }
.now em { position: absolute; bottom: -22px; left: 50%; transform: translateX(-50%); font-style: normal; font-size: 11px; font-weight: 700; color: var(--color-deep); white-space: nowrap; background: #fff; padding: 0 4px; }
.now::before { content: ""; position: absolute; top: -5px; left: 50%; width: 11px; height: 11px; border-radius: 50%; background: var(--color-deep); transform: translateX(-50%); box-shadow: 0 0 0 0 rgb(11 59 69 / .4); animation: ping 2s ease-out infinite; }
@keyframes ping { 70%, 100% { box-shadow: 0 0 0 10px rgb(11 59 69 / 0); } }
.truck { position: absolute; top: 44px; transform: translateX(50%); display: grid; justify-items: center; color: inherit; text-decoration: none; animation: pop .5s cubic-bezier(.3, 1.6, .5, 1) both; animation-delay: calc(.6s + var(--i) * 120ms); }
@keyframes pop { from { transform: translateX(50%) scale(0); opacity: 0; } }
.tdot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; background: #fff; color: var(--color-primary); box-shadow: 0 0 0 2.5px var(--color-primary), 0 6px 12px -6px rgb(11 59 69 / .5); transition: transform .2s; }
.tdot :deep(svg) { width: 15px; height: 15px; }
.truck.draft .tdot { color: #c27f0e; box-shadow: 0 0 0 2.5px #e0a33a, 0 6px 12px -6px rgb(11 59 69 / .5); }
.truck.draft .tdot :deep(svg) { animation: idle 2.4s ease-in-out infinite; }
@keyframes idle { 50% { transform: translateX(-2px); } }
a.truck:hover .tdot { transform: scale(1.15); }
.tl { position: absolute; bottom: calc(100% + 6px); display: grid; justify-items: center; line-height: 1.3; white-space: nowrap; }
.truck.low .tl { bottom: auto; top: calc(100% + 6px); }
.tl b { font-size: 12px; font-weight: 600; color: var(--color-ink); } .tl small { font-size: 10.5px; color: var(--color-muted); }
.truck.draft .tl small { color: #a86b00; font-weight: 600; }
.ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--color-muted); }

/* four numbers */
.nums { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.n { background: #fff; border-radius: 20px; padding: 14px 18px; display: grid; gap: 3px; align-content: start; transition: transform .2s, box-shadow .2s; }
.n:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -24px rgb(11 59 69 / .6); }
.n small { color: var(--color-muted); font-size: 12px; }
.n b { font-size: 27px; color: var(--color-deep); line-height: 1.2; } .n b span:last-child { font-size: 12px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.n em { font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--color-muted); }
.nbar { height: 5px; border-radius: 3px; background: #edf3f3; overflow: hidden; margin: 3px 0 1px; }
.nbar i { display: block; height: 100%; border-radius: 3px; background: var(--color-primary); transform-origin: right; animation: grow 1s cubic-bezier(.2, .9, .25, 1) .5s both; transition: width .6s; }

/* to-do + prices */
.split { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 12px; align-items: stretch; }
.panel { background: #fff; border-radius: 22px; padding: 16px 18px; display: flex; flex-direction: column; gap: 10px; }
.panel h3 { margin: 0; font-size: 15px; display: flex; justify-content: space-between; align-items: center; }
.cnt { min-width: 24px; height: 24px; padding: 0 7px; border-radius: 999px; background: var(--color-negative); color: #fff; font-size: 12px; display: grid; place-items: center; animation: pop2 .5s cubic-bezier(.3, 1.6, .5, 1) .6s both; }
.cnt.zero { background: var(--color-positive); }
@keyframes pop2 { from { transform: scale(0); } }
.rows { display: grid; gap: 6px; }
.r { --c: var(--color-primary); display: flex; align-items: center; gap: 10px; width: 100%; border: 0; padding: 8px 12px; border-radius: 12px; background: #f5f9f9; font: inherit; color: inherit; text-align: right; cursor: pointer; transition: background .15s, transform .15s;
  animation: rise .45s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(.35s + var(--i) * 50ms); }
.r:hover { background: #eef6f7; transform: translateX(-2px); }
.r.bad { --c: var(--color-negative); background: #fff4f2; } .r.bad:hover { background: #ffeae6; }
.r.warn { --c: #c27f0e; background: #fff8ea; } .r.warn:hover { background: #fff1d6; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); flex: none; }
.r.bad .dot { animation: blink 1.6s ease-in-out infinite; } @keyframes blink { 50% { opacity: .35; } }
.rt { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.rt b { font-size: 13px; font-weight: 600; } .rt small { font-size: 11.5px; color: var(--color-muted); }
.go { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; font-weight: 700; color: var(--c); white-space: nowrap; }
.go :deep(svg) { width: 14px; height: 14px; transition: transform .2s; } .r:hover .go :deep(svg) { transform: translateX(-3px); }
.done { display: flex; align-items: center; gap: 8px; color: var(--color-positive); font-weight: 600; font-size: 13.5px; background: var(--pos-bg); border-radius: 12px; padding: 12px 14px; }
.done :deep(svg) { width: 18px; height: 18px; }
.edit { display: inline-flex; align-items: center; gap: 5px; border: 0; background: none; font: inherit; font-size: 12.5px; font-weight: 600; color: var(--color-primary-ink); cursor: pointer; }
.edit :deep(svg) { width: 14px; height: 14px; } .edit:hover { text-decoration: underline; text-underline-offset: 3px; }
.prices { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-content: start; }
.pr { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; background: #f5f9f9; border-radius: 11px; padding: 8px 12px; font-size: 13px; animation: rise .4s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(.4s + var(--i) * 40ms); }
.pr span { color: var(--color-muted); } .pr b { font-size: 16px; color: var(--color-deep); } .pr b small { font-size: 10.5px; color: var(--color-muted); font-weight: 500; margin-inline-start: 3px; }
.note { margin: 0; font-size: 11.5px; color: var(--color-muted); }

@media (max-width: 900px) { .nums { grid-template-columns: repeat(2, minmax(0, 1fr)); } .split { grid-template-columns: minmax(0, 1fr); } .sent { font-size: 16px; } .sent b { font-size: 21px; } }
@media (max-width: 640px) { .tl { display: none; } .timeline { height: 80px; margin: 0 14px; } .track { top: 36px; } .now { top: 24px; } .truck { top: 26px; } }
@media (prefers-reduced-motion: reduce) {
  .rise, .r, .pr, .truck, .now, .cnt, .track i, .nbar i { animation: none; }
  .now::before, .truck.draft .tdot :deep(svg), .r.bad .dot { animation: none; }
}
</style>
