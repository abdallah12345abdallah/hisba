<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import CapitalDialog from '../components/investors/CapitalDialog.vue'
import InvestorForm from '../components/investors/InvestorForm.vue'
import SplitDialog from '../components/investors/SplitDialog.vue'
import DistributeDialog from '../components/investors/DistributeDialog.vue'
import { fmt } from '../data/demo.js'
import { INVESTORS, YEAR, YEARS, DONE, SPLIT, mgColor, TERMS, MONTHS, capitalOf, weightedOf, capitalByMonth, totalCapital, totalWeighted, split, profitYTD, profitProjected, daysToSplit, shareUrl } from '../data/investors.js'
import { toast } from '../composables/useToast.js'

// Shareholders — same pattern: figure cards, then the profit simulator (slide the year's profit, every share follows,
// and so does the table), search + filter, table or cards, pages, and each shareholder's own page.
const router = useRouter()

/* the simulator */
const proj = profitProjected()
const sim = ref(proj)
const s = computed(() => split(sim.value))
const SHADES = ['#0e7490', '#1b8aa6', '#3aa3b9', '#61b9c9', '#8ccdd8', '#b3dfe6', '#d2edf1']
const segs = computed(() => [
  ...s.value.managers.map((m, i) => ({ key: 'm' + i, name: m.name, sub: `إدارة ${m.pct}%`, amount: m.get, color: mgColor(i), mg: true })),
  ...s.value.rows.slice().sort((a, b) => b.get - a.get).map((r, i) => ({ key: r.x.id, name: r.x.name, sub: `${r.pct.toFixed(1)}% · ${TERMS[r.x.terms].label}`, amount: r.get, color: SHADES[i % SHADES.length], id: r.x.id })),
])
const delta = computed(() => Math.round(((sim.value - proj) / proj) * 100))
const expectedOf = (x) => s.value.rows.find((r) => r.x === x)?.get || 0
const pctOf = (x) => s.value.rows.find((r) => r.x === x)?.pct || 0

/* figures */
const tops = computed(() => [
  { label: 'رأس المال', icon: 'safe', tone: 'teal', value: fmt(totalCapital()), unit: 'ج', share: 100, sub: `${INVESTORS.length} مساهمين · الموزون لـ${YEAR} ${fmt(totalWeighted())}` },
  { label: `ربح ${YEAR} لحد اليوم`, icon: 'report', tone: 'green', value: fmt(profitYTD()), unit: 'ج', share: (profitYTD() / proj) * 100, sub: `المتوقع لآخر السنة حوالي ${fmt(proj)} ج` },
  { label: 'نصيب الإدارة', icon: 'crown', tone: 'amber', value: fmt(s.value.mgmt), unit: 'ج', share: (s.value.mgmt / (sim.value || 1)) * 100, sub: `${SPLIT.mgmt}% + ${fmt(s.value.extra)} من مساهمين الـ50/50` },
  DONE[YEAR]
    ? { label: 'التوزيع', icon: 'calendar', tone: 'green', value: 'اتوزّع', unit: '', share: 100, sub: `أرباح ${YEAR}: ${fmt(DONE[YEAR].P)} ج` }
    : { label: 'التوزيع الجاي', icon: 'calendar', tone: 'red', value: `بعد ${daysToSplit()}`, unit: 'يوم', share: ((365 - daysToSplit()) / 365) * 100, sub: `1/1/${YEAR + 1} · آخر مرة ${fmt(YEARS[0].profit)} ج` },
])

/* search + filter */
const q = ref('')
const filter = ref('all')
const isNew = (x) => !x.moves.some((m) => m.month === 0)
const withdrew = (x) => x.moves.some((m) => m.amount < 0)
const FILTERS = computed(() => [
  { value: 'all', label: 'كل المساهمين', hint: INVESTORS.length },
  { value: 'full', label: 'شروط 100%', hint: INVESTORS.filter((x) => x.terms === 'full').length },
  { value: 'half', label: 'شروط 50 / 50', hint: INVESTORS.filter((x) => x.terms === 'half').length },
  { value: 'new', label: `دخلوا ${YEAR}`, hint: INVESTORS.filter(isNew).length },
  { value: 'out', label: 'سحبوا من رأس المال', hint: INVESTORS.filter(withdrew).length },
])
const list = computed(() => INVESTORS
  .filter((x) => !q.value || `${x.name} ${x.phone}`.includes(q.value.trim()))
  .filter((x) => filter.value === 'all' || (filter.value === 'new' ? isNew(x) : filter.value === 'out' ? withdrew(x) : x.terms === filter.value))
  .slice().sort((a, b) => capitalOf(b) - capitalOf(a)))

/* table or cards */
const view = ref('table')
const small = ref(false)
let mq = null
const onMq = () => { small.value = mq.matches }
const shownView = computed(() => (small.value ? 'cards' : view.value))
const VIEWS = [{ value: 'cards', label: 'بطاقات', icon: 'grid' }, { value: 'table', label: 'جدول', icon: 'rows' }]
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
const maxCap = computed(() => Math.max(1, ...INVESTORS.flatMap((x) => capitalByMonth(x))))

/* actions */
const openOne = (x) => router.push(`/investors/${x.id}`)
const capFor = ref(null)
const capOpen = ref(false)
function capital(x) { capFor.value = x; capOpen.value = true }
const formOpen = ref(false)
const editFor = ref(null)
function addNew() { editFor.value = null; formOpen.value = true }
function editOne(x) { editFor.value = x; formOpen.value = true }
const splitOpen = ref(false)
const distOpen = ref(false)
async function copyLink(x) {
  const url = shareUrl(x)
  try { await navigator.clipboard.writeText(url); toast('انسخ الرابط', `ابعته لـ${x.name}، بيشوف رأس ماله وأرباحه بدون حساب`) }
  catch { window.prompt('انسخ الرابط:', url) }
}
function exportList() {
  const head = ['المساهم', 'التلفون', 'رأس المال', `الموزون ${YEAR}`, 'الحصة %', 'الشروط', `المتوقع (على ربح ${sim.value})`]
  const rows = list.value.map((x) => [x.name, x.phone, capitalOf(x), weightedOf(x), pctOf(x).toFixed(2), TERMS[x.terms].label, expectedOf(x)])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `المساهمين-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} مساهم · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page investors">
    <header class="dhead">
      <div class="hello">
        <h1>المساهمين</h1>
        <p class="num">{{ INVESTORS.length }} مساهمين · رأس المال <b>{{ fmt(totalCapital()) }} ج</b> · الإدارة {{ SPLIT.mgmt }}% والمساهمين {{ 100 - SPLIT.mgmt }}%</p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="gear" @click="splitOpen = true">طريقة التوزيع</SoftButton>
        <SoftButton icon="share" tone="ok" :disabled="!!DONE[YEAR]" @click="distOpen = true">{{ DONE[YEAR] ? `أرباح ${YEAR} اتوزّعت` : 'توزيع الأرباح' }}</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="addNew">مساهم جديد</SoftButton>
      </div>
    </header>

    <div class="grid">
      <div class="s12 tops">
        <div v-for="(k, i) in tops" :key="k.label" class="top" :class="k.tone" :style="{ '--i': i }">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span v-if="k.unit">{{ k.unit }}</span></b>
          <span class="share"><i :style="{ width: Math.min(100, k.share) + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </div>
      </div>

      <!-- the simulator: one slider, every share follows -->
      <section class="s12 simc">
        <div class="sh">
          <div><h2>لو السنة سكّرت على…</h2><small>حرّك الربح وشوف نصيب كل واحد. الجدول تحت بيمشي معه.</small></div>
          <div class="big num">{{ fmt(sim) }} <small>ج</small><span v-if="delta" class="dl" :class="delta > 0 ? 'up' : 'down'">{{ delta > 0 ? '+' : '' }}{{ delta }}% عن المتوقع</span></div>
        </div>
        <input v-model.number="sim" class="slider" type="range" :min="Math.round(proj * 0.5 / 10000) * 10000" :max="Math.round(proj * 1.5 / 10000) * 10000" step="10000" aria-label="ربح السنة"
          :style="{ '--f': ((sim - proj * 0.5) / proj) * 100 + '%' }" />
        <div class="presets num">
          <button type="button" :class="{ on: sim === Math.round(profitYTD() / 10000) * 10000 }" @click="sim = Math.round(profitYTD() / 10000) * 10000">لحد اليوم</button>
          <button type="button" :class="{ on: sim === proj }" @click="sim = proj">المتوقع</button>
          <button type="button" :class="{ on: sim === Math.round(YEARS[0].profit / 10000) * 10000 }" @click="sim = Math.round(YEARS[0].profit / 10000) * 10000">زي {{ YEARS[0].year }}</button>
        </div>
        <div class="stack" role="img" :aria-label="`توزيع ${fmt(sim)} ج`">
          <i v-for="g in segs" :key="g.key" :style="{ width: (g.amount / (sim || 1)) * 100 + '%', background: g.color }" :title="`${g.name}: ${fmt(g.amount)} ج`" />
        </div>
        <div class="legend">
          <component :is="g.id ? 'button' : 'span'" v-for="g in segs" :key="g.key" :type="g.id ? 'button' : undefined" class="lg" :class="{ mg: g.mg }" @click="g.id && router.push(`/investors/${g.id}`)">
            <i :style="{ background: g.color }" /><span class="ln"><b>{{ g.name }}</b><small class="num">{{ g.sub }}</small></span><b class="num la">{{ fmt(g.amount) }}</b>
          </component>
        </div>
      </section>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على مساهم" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر المساهمين" />
        <div v-if="!small" ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="search" title="ما في مساهمين هون" text="جرّب اسم تاني أو فلتر تاني." />
        <Transition v-else name="swap" mode="out-in">
          <TransitionGroup v-if="shownView === 'cards'" key="cards" name="list" tag="div" class="cards">
            <article v-for="x in paged" :key="x.id" class="pc">
              <div class="h">
                <button type="button" class="tname" @click="openOne(x)"><b>{{ x.name }}</b><small class="num">معنا من {{ x.since }} · {{ TERMS[x.terms].label }}</small></button>
                <button type="button" class="iconbtn" :aria-label="`تعديل ${x.name}`" title="تعديل بيانات المساهم" @click="editOne(x)"><AppIcon name="edit" /></button>
              </div>
              <div class="money">
                <div><small>رأس المال</small><b class="num">{{ fmt(capitalOf(x)) }}</b></div>
                <div class="exp"><small>متوقع له</small><b class="num">{{ fmt(expectedOf(x)) }}</b></div>
              </div>
              <div class="mbars" :aria-label="`رأس المال شهر بشهر ${YEAR}`"><i v-for="(c, i) in capitalByMonth(x)" :key="i" :class="{ fut: i + 1 > 11 }" :style="{ height: Math.max(3, (c / maxCap) * 100) + '%' }" :title="`${MONTHS[i]}: ${fmt(c)}`" /></div>
              <div class="go">
                <SoftButton size="sm" @click="openOne(x)">الكشف</SoftButton>
                <SoftButton size="sm" icon="safe" @click="capital(x)">رأس المال</SoftButton>
                <SoftButton size="sm" icon="link" @click="copyLink(x)">الرابط</SoftButton>
              </div>
            </article>
          </TransitionGroup>

          <div v-else key="table" class="tbl-wrap tblcard">
            <table class="tbl">
              <thead><tr><th>المساهم</th><th>رأس المال</th><th>شهر بشهر {{ YEAR }}</th><th>الحصة</th><th>الشروط</th><th>متوقع له</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="x in paged" :key="x.id">
                  <td><button type="button" class="tname" @click="openOne(x)"><b>{{ x.name }}</b><small class="num">{{ x.phone }} · معنا من {{ x.since }}</small></button></td>
                  <td><span class="cap"><b class="num">{{ fmt(capitalOf(x)) }}</b><small class="num">موزون {{ fmt(weightedOf(x)) }}</small></span></td>
                  <td><div class="mbars sm"><i v-for="(c, i) in capitalByMonth(x)" :key="i" :class="{ fut: i + 1 > 11 }" :style="{ height: Math.max(3, (c / maxCap) * 100) + '%' }" :title="`${MONTHS[i]}: ${fmt(c)}`" /></div></td>
                  <td class="num pct">{{ pctOf(x).toFixed(1) }}%</td>
                  <td><span class="ttag" :class="x.terms">{{ TERMS[x.terms].label }}</span></td>
                  <td class="num exp">{{ fmt(expectedOf(x)) }}</td>
                  <td class="ops"><div class="opsin">
                    <SoftButton size="sm" @click="openOne(x)">كشف الحساب</SoftButton>
                    <SoftButton size="sm" icon="safe" @click="capital(x)">رأس المال</SoftButton>
                    <button type="button" class="iconbtn" :aria-label="`نسخ رابط ${x.name}`" title="رابط للمساهم" @click="copyLink(x)"><AppIcon name="link" /></button>
                    <button type="button" class="iconbtn" :aria-label="`تعديل ${x.name}`" title="تعديل بيانات المساهم" @click="editOne(x)"><AppIcon name="edit" /></button>
                  </div></td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
        </Transition>
      </div>

      <div v-if="list.length" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="مساهم" /></div>
    </div>

    <CapitalDialog v-model="capOpen" :investor="capFor" />
    <InvestorForm v-model="formOpen" :investor="editFor" @saved="() => { q = ''; filter = 'all' }" />
    <SplitDialog v-model="splitOpen" :profit="sim" />
    <DistributeDialog v-model="distOpen" />
  </div>
</template>

<style scoped>
.investors .grid > * { min-width: 0; }
.tops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.top { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px 16px; background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px;
  animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.top::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.top > * { position: relative; z-index: 1; }
.top.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); }
.top.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.top.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.top .th { display: flex; justify-content: space-between; align-items: center; color: var(--fg); }
.top .th small { color: var(--color-muted); font-size: 12px; } .top .th :deep(svg) { width: 20px; height: 20px; }
.top b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .top b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.top .share { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.top .share i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: share-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.top .sub { font-size: 11.5px; color: var(--color-muted); }
@keyframes top-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes share-in { from { width: 0; } }

/* simulator */
.simc { background: #fff; border-radius: 20px; padding: 16px 20px 18px; display: grid; gap: 12px; animation: top-in .5s cubic-bezier(.2, .9, .25, 1) .25s both; }
.sh { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.sh h2 { margin: 0; font-size: 16px; } .sh small { color: var(--color-muted); font-size: 12.5px; }
.sh .big { font-size: 30px; font-weight: 700; color: var(--color-deep); line-height: 1.1; display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; } .sh .big small { font-size: 14px; }
.dl { font-size: 12px; font-weight: 600; border-radius: 999px; padding: 2px 10px; } .dl.up { background: var(--pos-bg); color: var(--pos-ink); } .dl.down { background: var(--neg-bg); color: var(--neg-ink); }
.slider { -webkit-appearance: none; appearance: none; width: 100%; height: 10px; border-radius: 5px; direction: ltr; cursor: pointer;
  background: linear-gradient(90deg, var(--color-primary) var(--f), #e6eeee var(--f)); }
.slider::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 3px solid var(--color-primary); box-shadow: 0 4px 12px -4px rgb(11 59 69 / .5); transition: transform .15s; }
.slider::-webkit-slider-thumb:hover { transform: scale(1.12); }
.slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid var(--color-primary); }
.presets { display: flex; gap: 6px; flex-wrap: wrap; }
.presets button { border: 0; height: 30px; padding: 0 14px; border-radius: 999px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; color: var(--color-ink); }
.presets button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.stack { display: flex; height: 22px; border-radius: 8px; overflow: hidden; gap: 2px; }
.stack i { display: block; min-width: 3px; transition: width .35s cubic-bezier(.2, .9, .25, 1); }
.legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 6px 10px; }
.lg { display: flex; align-items: center; gap: 8px; border: 0; background: none; padding: 6px 8px; border-radius: 10px; font: inherit; color: inherit; text-align: right; }
button.lg { cursor: pointer; } button.lg:hover { background: #f4f9f9; } button.lg:hover b:first-child { color: var(--color-primary-ink); }
.lg > i { width: 10px; height: 26px; border-radius: 4px; flex: none; }
.ln { flex: 1; min-width: 0; display: grid; line-height: 1.3; } .ln b { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ln small { color: var(--color-muted); font-size: 11px; }
.la { font-size: 14px; color: var(--color-deep); } .lg.mg .la { color: #8a5a00; }

.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; }
.findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 230px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }

.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 1000px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.tname { border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; line-height: 1.4; min-width: 0; }
.tname b { font-weight: 700; font-size: 14px; } .tname:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.tname small { color: var(--color-muted); font-size: 11.5px; }
.cap { display: grid; line-height: 1.35; } .cap b { font-size: 15px; color: var(--color-deep); } .cap small { color: var(--color-muted); font-size: 11px; }
.mbars { display: flex; align-items: flex-end; gap: 3px; height: 34px; }
.mbars i { flex: 1; min-width: 5px; border-radius: 2px 2px 1px 1px; background: var(--color-primary); opacity: .8; transition: height .4s; }
.mbars i.fut { background: #dbe7e8; opacity: 1; }
.mbars.sm { width: 140px; height: 28px; }
.pct { font-weight: 700; color: var(--color-primary-ink); }
.ttag { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.ttag.full { background: var(--color-primary-pale); color: var(--color-primary-ink); } .ttag.half { background: #fff4dc; color: #8a5a00; }
.exp { font-weight: 700; font-size: 15px; color: var(--color-positive); transition: color .2s; }
.tbl .ops { width: 1%; }
.opsin { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.iconbtn { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f1f6f6; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; flex: none; transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); } .iconbtn :deep(svg) { width: 16px; height: 16px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(max(280px, calc((100% - 36px) / 4)), 1fr)); gap: 12px; }
.pc { background: #fff; border-radius: 18px; padding: 16px; display: grid; gap: 12px; border: 1px solid #e4eeee; transition: transform .2s, box-shadow .2s, border-color .2s; }
.pc:hover { transform: translateY(-3px); border-color: transparent; box-shadow: 0 16px 30px -20px rgb(11 59 69 / .6); }
.pc .h { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; } .pc .h .iconbtn { width: 30px; height: 30px; }
.money { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.money div { border-radius: 12px; padding: 8px 12px; background: #f4f9f9; } .money small { display: block; color: var(--color-muted); font-size: 11.5px; } .money b { font-size: 18px; font-weight: 700; color: var(--color-deep); }
.money .exp { background: #eaf6ef; } .money .exp b { color: var(--color-positive); }
.pc .mbars { border-block: 1px dashed #e3ebea; padding: 8px 0; height: 50px; }
.go { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; } .go :deep(.sbt) { width: 100%; }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .top, .simc { animation: none; } }
</style>
