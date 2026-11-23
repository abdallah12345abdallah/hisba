<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import PayOutDialog from '../components/suppliers/PayOutDialog.vue'
import SupplierForm from '../components/suppliers/SupplierForm.vue'
import { SUPPLIERS, MANIFESTS, fmt } from '../data/demo.js'
import { feedOf, manifestsOf, shareUrl } from '../data/suppliers.js'
import { toast } from '../composables/useToast.js'

// Suppliers — like the traders page (approved أ): figure cards, search + filter, table or farm cards (from ب), pages,
// and each farm's own account page. Balance: له = we owe the farm, عليه = its advances exceed its sales.
const router = useRouter()

/* figures */
const oweSum = computed(() => SUPPLIERS.filter((s) => s.balance > 0).reduce((a, s) => a + s.balance, 0))
const advSum = computed(() => SUPPLIERS.filter((s) => s.balance < 0).reduce((a, s) => a - s.balance, 0))
const feedSum = computed(() => SUPPLIERS.reduce((a, s) => a + (feedOf(s)?.amount || 0), 0))
const nextFeed = computed(() => SUPPLIERS.map((s) => feedOf(s)).filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft)[0])
const todayManifests = computed(() => MANIFESTS.length)
const todayCommission = computed(() => MANIFESTS.reduce((a, m) => a + m.commission, 0))
const tops = computed(() => {
  const all = oweSum.value + advSum.value || 1
  return [
    { key: 'owe', label: 'لهم علينا', icon: 'out', tone: 'teal', value: fmt(oweSum.value), unit: 'ج', share: (oweSum.value / all) * 100, sub: `${SUPPLIERS.filter((s) => s.balance > 0).length} مزارع · صافي بيعهم بعد العمولة` },
    { key: 'adv', label: 'عليهم سلف', icon: 'in', tone: 'red', value: fmt(advSum.value), unit: 'ج', share: (advSum.value / all) * 100, sub: `${SUPPLIERS.filter((s) => s.balance < 0).length} مزارع أخدوا أكتر من بيعهم` },
    { key: 'feed', label: 'علف آجل عندهم', icon: 'feed', tone: 'amber', value: fmt(feedSum.value), unit: 'ج', share: 100, sub: nextFeed.value ? `أقرب تسوية: ${nextFeed.value.name.replace('مزرعة ', '')} بعد ${nextFeed.value.daysLeft} يوم` : 'ما في علف آجل' },
    { key: null, label: 'بيانات اليوم', icon: 'sheet', tone: 'green', value: `${todayManifests.value} بيانات`, share: (MANIFESTS.filter((m) => m.status === 'approved').length / (todayManifests.value || 1)) * 100, sub: `عمولتها ${fmt(todayCommission.value)} ج` },
  ]
})
function pickTop(k) { if (k) filter.value = filter.value === k ? 'all' : k }

/* search + filter */
const q = ref('')
const filter = ref('all')
const FILTERS = computed(() => [
  { value: 'all', label: 'كل الموردين', hint: SUPPLIERS.length },
  { value: 'owe', label: 'لهم علينا', hint: SUPPLIERS.filter((s) => s.balance > 0).length },
  { value: 'adv', label: 'عليهم سلف', hint: SUPPLIERS.filter((s) => s.balance < 0).length },
  { value: 'feed', label: 'عندهم علف آجل', hint: SUPPLIERS.filter(feedOf).length },
  { value: 'soon', label: 'تسوية علف خلال شهر', hint: SUPPLIERS.filter((s) => (feedOf(s)?.daysLeft ?? 999) <= 30).length },
])
const list = computed(() => SUPPLIERS
  .filter((s) => !q.value || (s.name + ' ' + s.place).includes(q.value.trim()))
  .filter((s) => filter.value === 'all' || (filter.value === 'owe' && s.balance > 0) || (filter.value === 'adv' && s.balance < 0)
    || (filter.value === 'feed' && feedOf(s)) || (filter.value === 'soon' && (feedOf(s)?.daysLeft ?? 999) <= 30))
  .slice().sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)))

/* table (default on large screens) or farm cards (always on small screens) */
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

const side = (b) => (b > 0 ? 'له' : b < 0 ? 'عليه' : 'خالص')
const sideCls = (b) => (b > 0 ? 'owe' : b < 0 ? 'adv' : 'clear')

/* actions */
const openSupplier = (s) => router.push(`/suppliers/${s.id}`)
const payFor = ref(null)
const payKind = ref('pay')
const payOpen = ref(false)
function money(s, kind) { payFor.value = s; payKind.value = kind; payOpen.value = true }
const formOpen = ref(false)
const editFor = ref(null)
function addNew() { editFor.value = null; formOpen.value = true }
function editSupplier(s) { editFor.value = s; formOpen.value = true }
function onSaved() { q.value = ''; filter.value = 'all' }
async function copyLink(s) {
  const url = shareUrl(s)
  try { await navigator.clipboard.writeText(url); toast('انسخ رابط الكشف', `ابعته لـ${s.name}، بيشوف بياناته وفواتيره بدون حساب`) }
  catch { window.prompt('انسخ الرابط:', url) }
}
function exportList() {
  const head = ['المزرعة', 'المكان', 'التلفون', 'الرصيد', 'الحالة', 'علف آجل', 'العمولة %', 'التقييم']
  const rows = list.value.map((s) => [s.name, s.place, s.phone, Math.abs(s.balance), side(s.balance), feedOf(s)?.amount || 0, s.rate, s.rating])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `الموردين-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} مورد · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page suppliers">
    <header class="dhead">
      <div class="hello">
        <h1>الموردين</h1>
        <p class="num">{{ SUPPLIERS.length }} مزارع · لهم <b>{{ fmt(oweSum) }} ج</b><template v-if="advSum"> · <span class="hl neg">عليهم {{ fmt(advSum) }} ج</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="addNew">مورد جديد</SoftButton>
      </div>
    </header>

    <div class="grid">
      <div class="s12 tops">
        <component :is="k.key ? 'button' : 'div'" v-for="(k, i) in tops" :key="k.label" :type="k.key ? 'button' : undefined" class="top" :class="[k.tone, { on: k.key && filter === k.key }]"
          :style="{ '--i': i }" :aria-pressed="k.key ? filter === k.key : undefined" @click="pickTop(k.key)">
          <span class="th"><small>{{ k.label }}</small><AppIcon :name="k.icon" /></span>
          <b class="num">{{ k.value }}<span v-if="k.unit">{{ k.unit }}</span></b>
          <span class="share"><i :style="{ width: k.share + '%' }" /></span>
          <span class="sub num">{{ k.sub }}</span>
        </component>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على مزرعة أو بلد" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر الموردين" />
        <div v-if="!small" ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="search" title="ما في موردين هون" text="جرّب اسم تاني أو فلتر تاني." />
        <Transition v-else name="swap" mode="out-in">
          <TransitionGroup v-if="shownView === 'cards'" key="cards" name="list" tag="div" class="farms">
            <article v-for="s in paged" :key="s.id" class="farm">
              <div class="h">
                <button type="button" class="fname" @click="openSupplier(s)"><b>{{ s.name }}</b><small class="num">{{ s.place }} · عمولة {{ s.rate }}%</small></button>
                <span class="hr"><span class="stars" :title="`تقييم ${s.rating} من 5`">{{ '★'.repeat(s.rating) }}<i>{{ '★'.repeat(5 - s.rating) }}</i></span>
                  <button type="button" class="iconbtn" :aria-label="`تعديل ${s.name}`" title="تعديل بيانات المورد" @click="editSupplier(s)"><AppIcon name="edit" /></button></span>
              </div>
              <div class="money">
                <div :class="sideCls(s.balance)"><small>{{ s.balance > 0 ? 'له علينا' : s.balance < 0 ? 'عليه سلفة' : 'الرصيد' }}</small><b class="num">{{ fmt(Math.abs(s.balance)) }}</b></div>
                <div><small>علف آجل</small><b class="num">{{ feedOf(s) ? fmt(feedOf(s).amount) : '—' }}</b></div>
              </div>
              <div class="meta"><span>{{ feedOf(s) ? `تسوية العلف بعد ${feedOf(s).daysLeft} يوم` : 'بدون علف آجل' }}</span><span class="num">{{ manifestsOf(s).length ? `${manifestsOf(s).length} بيان اليوم` : 'ما في بيان اليوم' }}</span></div>
              <div class="go">
                <SoftButton size="sm" tone="ok" icon="cash" @click="money(s, 'pay')">صرف</SoftButton>
                <SoftButton size="sm" @click="money(s, 'adv')">سلفة</SoftButton>
                <SoftButton size="sm" @click="openSupplier(s)">الكشف</SoftButton>
              </div>
            </article>
          </TransitionGroup>

          <div v-else key="table" class="tbl-wrap tblcard">
            <table class="tbl">
              <thead><tr><th>المورد</th><th>الرصيد</th><th>العلف الآجل</th><th>العمولة</th><th>بيانات اليوم</th><th>التقييم</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="s in paged" :key="s.id">
                  <td><button type="button" class="tname" @click="openSupplier(s)"><b>{{ s.name }}</b><small class="num">{{ s.place }} · {{ s.phone }}</small></button></td>
                  <td><span class="bal num" :class="sideCls(s.balance)">{{ fmt(Math.abs(s.balance)) }}</span><span class="tag" :class="sideCls(s.balance)">{{ side(s.balance) }}</span></td>
                  <td>
                    <span v-if="feedOf(s)" class="feed" :class="{ soon: feedOf(s).daysLeft <= 30 }"><b class="num">{{ fmt(feedOf(s).amount) }}</b><small class="num">تسوية بعد {{ feedOf(s).daysLeft }} يوم</small></span>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="num">{{ s.rate }}%</td>
                  <td class="num">{{ manifestsOf(s).length || '—' }}</td>
                  <td><span class="stars" :title="`تقييم ${s.rating} من 5`">{{ '★'.repeat(s.rating) }}<i>{{ '★'.repeat(5 - s.rating) }}</i></span></td>
                  <td class="ops"><div class="opsin">
                    <SoftButton size="sm" tone="ok" icon="cash" @click="money(s, 'pay')">صرف</SoftButton>
                    <SoftButton size="sm" @click="openSupplier(s)">كشف الحساب</SoftButton>
                    <SoftButton size="sm" @click="money(s, 'adv')">سلفة</SoftButton>
                    <button type="button" class="iconbtn" :aria-label="`نسخ رابط كشف ${s.name}`" title="رابط كشف للمورد" @click="copyLink(s)"><AppIcon name="link" /></button>
                    <button type="button" class="iconbtn" :aria-label="`تعديل ${s.name}`" title="تعديل بيانات المورد" @click="editSupplier(s)"><AppIcon name="edit" /></button>
                  </div></td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
        </Transition>
      </div>

      <div v-if="list.length" class="s12">
        <PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="مورد" />
      </div>
    </div>

    <PayOutDialog v-model="payOpen" :supplier="payFor" :kind="payKind" />
    <SupplierForm v-model="formOpen" :supplier="editFor" @saved="onSaved" />
  </div>
</template>

<style scoped>
.suppliers .grid > * { min-width: 0; }
.tops { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.top { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border: 0; text-align: right; font: inherit; color: inherit;
  border-radius: 18px; padding: 14px 16px 16px; background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; transition: transform .2s, box-shadow .2s;
  animation: top-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
button.top { cursor: pointer; } button.top:hover { transform: translateY(-3px); }
.top.on { box-shadow: inset 0 0 0 2px var(--fg); }
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
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; }
.findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 230px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }
/* table */
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 860px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 10px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.tname, .fname { border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; line-height: 1.4; }
.tname b, .fname b { font-weight: 700; font-size: 14px; } .tname:hover b, .fname:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.tname small, .fname small { color: var(--color-muted); font-size: 11.5px; }
.bal { font-weight: 700; font-size: 15px; } .bal.owe { color: var(--color-primary-ink); } .bal.adv { color: var(--color-negative); } .bal.clear { color: var(--color-positive); }
.tag { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-inline-start: 6px; }
.tag.owe { background: var(--color-primary-pale); color: var(--color-primary-ink); } .tag.adv { background: var(--neg-bg); color: var(--neg-ink); } .tag.clear { background: var(--pos-bg); color: var(--pos-ink); }
.feed { display: grid; line-height: 1.35; } .feed b { font-weight: 600; } .feed small { color: var(--color-muted); font-size: 11px; } .feed.soon small { color: #8a5a00; font-weight: 600; }
.stars { color: #e0a33a; letter-spacing: 1px; font-size: 13px; } .stars i { font-style: normal; color: #d5dede; }
.muted { color: var(--color-muted); }
.tbl .ops { width: 1%; }
.opsin { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.iconbtn { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f1f6f6; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; flex: none; transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); } .iconbtn :deep(svg) { width: 16px; height: 16px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
/* farm cards (at most four a row) */
.farms { display: grid; grid-template-columns: repeat(auto-fill, minmax(max(280px, calc((100% - 36px) / 4)), 1fr)); gap: 12px; }
.farm { background: #fff; border-radius: 18px; padding: 16px; display: grid; gap: 12px; border: 1px solid #e4eeee; transition: transform .2s, box-shadow .2s, border-color .2s; }
.farm:hover { transform: translateY(-3px); border-color: transparent; box-shadow: 0 16px 30px -20px rgb(11 59 69 / .6); }
.farm .h { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
.hr { display: flex; align-items: center; gap: 6px; } .hr .iconbtn { width: 30px; height: 30px; }
.money { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.money div { border-radius: 12px; padding: 8px 12px; background: #f4f9f9; } .money small { display: block; color: var(--color-muted); font-size: 11.5px; } .money b { font-size: 18px; font-weight: 700; }
.money .owe { background: #eaf6f8; } .money .owe b { color: var(--color-primary-ink); } .money .adv { background: #fff1ef; } .money .adv b { color: var(--color-negative); }
.meta { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--color-muted); border-block: 1px dashed #e3ebea; padding: 8px 0; }
.go { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; } .go :deep(.sbt) { width: 100%; }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
