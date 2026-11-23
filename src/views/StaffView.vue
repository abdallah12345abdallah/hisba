<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import StaffPayDialog from '../components/staff/StaffPayDialog.vue'
import StaffForm from '../components/staff/StaffForm.vue'
import { fmt } from '../data/demo.js'
import { STAFF, TODAY, DAYS, ATT, roleOf, tracked, dueOf, unpaidDays, daysLabel, mark, unmarkedToday, weekday, MONTH } from '../data/staff.js'
import { toast } from '../composables/useToast.js'

// Staff — same pattern as traders and suppliers: figure cards, today's roll call (tap a name: present → half day → absent),
// search + filter, table or cards, pages, and each person's own page. Day wages follow the roll call by themselves.
const router = useRouter()

/* figures */
const monthly = computed(() => STAFF.filter((e) => e.pay === 'month'))
const daily = computed(() => STAFF.filter((e) => e.pay === 'day'))
const monthDue = computed(() => monthly.value.reduce((a, e) => a + dueOf(e), 0))
const monthAll = computed(() => monthly.value.reduce((a, e) => a + e.rate, 0))
const dayDue = computed(() => daily.value.reduce((a, e) => a + dueOf(e), 0))
const advSum = computed(() => STAFF.reduce((a, e) => a + e.adv, 0))
const roll = computed(() => STAFF.filter(tracked))
const here = computed(() => roll.value.filter((e) => e.att[TODAY] === 'p' || e.att[TODAY] === 'h').length)
const tops = computed(() => [
  { key: 'month', label: `رواتب ${MONTH} الباقية`, icon: 'calendar', tone: 'teal', value: fmt(monthDue.value), unit: 'ج', share: ((monthAll.value - monthDue.value) / (monthAll.value || 1)) * 100, sub: `${monthly.value.length} بالشهر · قبضوا ${fmt(monthAll.value - monthDue.value)} من ${fmt(monthAll.value)}` },
  { key: 'day', label: 'يوميات مش مدفوعة', icon: 'clock', tone: 'amber', value: fmt(dayDue.value), unit: 'ج', share: 100, sub: `${daily.value.length} عمال باليومية · من آخر قبضة لليوم` },
  { key: 'adv', label: 'عليهم سلف', icon: 'hand', tone: 'red', value: fmt(advSum.value), unit: 'ج', share: (STAFF.filter((e) => e.adv).length / (STAFF.length || 1)) * 100, sub: `${STAFF.filter((e) => e.adv).length} موظفين · بتنخصم من القبضة الجاية` },
  { key: null, label: 'حضور اليوم', icon: 'ucheck', tone: 'green', value: `${here.value} من ${roll.value.length}`, unit: '', share: (here.value / (roll.value.length || 1)) * 100, sub: unmarkedToday().length ? `لسا ما سجّلت ${unmarkedToday().length}` : 'سجّلت الكل' },
])
function pickTop(k) { if (k) filter.value = filter.value === k ? 'all' : k }

/* today's roll call */
const rollAll = () => { unmarkedToday().forEach((e) => mark(e, TODAY, 'p')); toast('انسجّل الحضور', 'الباقيين حاضرين اليوم', { quiet: true }) }
const PICKS = [{ v: 'p', label: 'حاضر', icon: 'check' }, { v: 'h', label: 'نص يوم' }, { v: 'a', label: 'غايب', icon: 'x' }]
const initial = (n) => n.replace(/^(الحاج|عم)\s+/, '').trim()[0]

/* search + filter */
const q = ref('')
const filter = ref('all')
const FILTERS = computed(() => [
  { value: 'all', label: 'كل الموظفين', hint: STAFF.length },
  { value: 'month', label: 'راتب شهري', hint: monthly.value.length },
  { value: 'day', label: 'باليومية', hint: daily.value.length },
  { value: 'adv', label: 'عليهم سلف', hint: STAFF.filter((e) => e.adv).length },
  { value: 'absent', label: 'غايبين اليوم', hint: roll.value.filter((e) => e.att[TODAY] === 'a').length },
])
const list = computed(() => STAFF
  .filter((e) => !q.value || `${e.name} ${roleOf(e.role).label} ${e.phone}`.includes(q.value.trim()))
  .filter((e) => filter.value === 'all' || (filter.value === 'adv' ? e.adv > 0 : filter.value === 'absent' ? tracked(e) && e.att[TODAY] === 'a' : e.pay === filter.value)))

/* table (default on large screens) or cards (always on small screens) */
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

const dueText = (e) => (e.pay === 'month' ? (dueOf(e) ? `باقي راتب ${MONTH}` : 'قبض الشهر') : unpaidDays(e) ? daysLabel(unpaidDays(e)) : 'ما إله شي')

/* actions */
const openOne = (e) => router.push(`/staff/${e.id}`)
const payFor = ref(null)
const payKind = ref('pay')
const payOpen = ref(false)
function money(e, kind) { payFor.value = e; payKind.value = kind; payOpen.value = true }
const formOpen = ref(false)
const editFor = ref(null)
function addNew() { editFor.value = null; formOpen.value = true }
function editOne(e) { editFor.value = e; formOpen.value = true }
function onSaved() { q.value = ''; filter.value = 'all' }
function exportList() {
  const head = ['الاسم', 'الشغلة', 'الدفع', 'الراتب/اليومية', 'المستحق', 'السلفة', 'أيام الحضور', 'التلفون']
  const rows = list.value.map((e) => [e.name, roleOf(e.role).label, e.pay === 'month' ? 'شهري' : 'يومية', e.rate, dueOf(e), e.adv, tracked(e) ? DAYS.reduce((a, d) => a + (ATT[e.att[d]]?.unit || 0), 0) : '', e.phone])
  const csv = '﻿' + [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `الموظفين-${new Date().toISOString().slice(0, 10)}.csv` })
  a.click(); URL.revokeObjectURL(a.href)
  toast('انصدّر الملف', `${rows.length} موظف · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page staff">
    <header class="dhead">
      <div class="hello">
        <h1>الموظفين</h1>
        <p class="num">{{ STAFF.length }} موظفين · إلهم <b>{{ fmt(monthDue + dayDue) }} ج</b><template v-if="advSum"> · <span class="hl neg">عليهم سلف {{ fmt(advSum) }} ج</span></template></p>
      </div>
      <div class="actions">
        <SoftButton icon="out" @click="exportList">تصدير</SoftButton>
        <SoftButton icon="plus" tone="primary" @click="addNew">موظف جديد</SoftButton>
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

      <!-- today's roll call: one tap per person, the day wages follow -->
      <section class="s12 roll">
        <div class="rh">
          <div><h2>حضور اليوم</h2><small class="num">{{ weekday(TODAY) }} {{ TODAY }}/11 · سجّلت {{ roll.length - unmarkedToday().length }} من {{ roll.length }}</small></div>
          <SoftButton v-if="unmarkedToday().length" size="sm" icon="ucheck" @click="rollAll">الباقيين حاضرين ({{ unmarkedToday().length }})</SoftButton>
        </div>
        <div class="chips">
          <div v-for="e in roll" :key="e.id" class="who" :class="e.att[TODAY] || 'none'">
            <div class="wh">
              <span class="av">{{ initial(e.name) }}<i><AppIcon :name="roleOf(e.role).icon" /></i></span>
              <span class="nm"><b>{{ e.name }}</b><small>{{ ATT[e.att[TODAY]]?.label || 'لسا ما انسجّل' }}<template v-if="e.pay === 'day' && e.att[TODAY] && e.att[TODAY] !== 'a'"> · {{ fmt(e.rate * ATT[e.att[TODAY]].unit) }} ج</template></small></span>
            </div>
            <div class="pick" role="radiogroup" :aria-label="`حضور ${e.name}`">
              <button v-for="o in PICKS" :key="o.v" type="button" role="radio" :aria-checked="e.att[TODAY] === o.v" :class="[o.v, { on: e.att[TODAY] === o.v }]" :title="o.label" :aria-label="o.label" @click="mark(e, TODAY, o.v)">
                <AppIcon v-if="o.icon" :name="o.icon" /><em v-else>½</em>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على اسم أو شغلة" />
        <SelectMenu v-model="filter" :options="FILTERS" class="fsel" aria-label="فلتر الموظفين" />
        <div v-if="!small" ref="vtogEl" class="vtog" role="radiogroup" aria-label="طريقة العرض">
          <span class="vthumb" :style="vthumb" aria-hidden="true" />
          <button v-for="v in VIEWS" :key="v.value" type="button" role="radio" :aria-checked="view === v.value" :class="{ on: view === v.value }" :title="v.label" :aria-label="v.label" @click="view = v.value"><AppIcon :name="v.icon" /></button>
        </div>
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="search" title="ما في موظفين هون" text="جرّب اسم تاني أو فلتر تاني." />
        <Transition v-else name="swap" mode="out-in">
          <TransitionGroup v-if="shownView === 'cards'" key="cards" name="list" tag="div" class="cards">
            <article v-for="e in paged" :key="e.id" class="pc">
              <div class="h">
                <span class="av big">{{ initial(e.name) }}<i><AppIcon :name="roleOf(e.role).icon" /></i></span>
                <button type="button" class="tname" @click="openOne(e)"><b>{{ e.name }}</b><small class="num">{{ roleOf(e.role).label }} · {{ e.pay === 'month' ? `راتب ${fmt(e.rate)}` : `يومية ${fmt(e.rate)}` }}</small></button>
                <button type="button" class="iconbtn" :aria-label="`تعديل ${e.name}`" title="تعديل بيانات الموظف" @click="editOne(e)"><AppIcon name="edit" /></button>
              </div>
              <div class="money">
                <div class="owe"><small>{{ dueText(e) }}</small><b class="num">{{ fmt(dueOf(e)) }}</b></div>
                <div :class="{ adv: e.adv }"><small>عليه سلفة</small><b class="num">{{ e.adv ? fmt(e.adv) : '—' }}</b></div>
              </div>
              <div v-if="tracked(e)" class="dots" :aria-label="`حضور ${MONTH}`"><i v-for="d in DAYS" :key="d" :class="e.att[d] || 'none'" :title="`${weekday(d)} ${d}/11: ${ATT[e.att[d]]?.label || 'لسا'}`" /></div>
              <div v-else class="dots-none">{{ roleOf(e.role).label }} · ما بيسجّل حضور</div>
              <div class="go">
                <SoftButton size="sm" tone="ok" icon="cash" :disabled="!dueOf(e)" @click="money(e, 'pay')">صرف</SoftButton>
                <SoftButton size="sm" @click="money(e, 'adv')">سلفة</SoftButton>
                <SoftButton size="sm" @click="openOne(e)">الكشف</SoftButton>
              </div>
            </article>
          </TransitionGroup>

          <div v-else key="table" class="tbl-wrap tblcard">
            <table class="tbl">
              <thead><tr><th>الموظف</th><th>الدفع</th><th>إله</th><th>عليه سلفة</th><th>حضور {{ MONTH }}</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="e in paged" :key="e.id">
                  <td><div class="who-cell"><span class="av">{{ initial(e.name) }}<i><AppIcon :name="roleOf(e.role).icon" /></i></span>
                    <button type="button" class="tname" @click="openOne(e)"><b>{{ e.name }}</b><small class="num">{{ roleOf(e.role).label }} · {{ e.phone }}</small></button></div></td>
                  <td><span class="ptag" :class="e.pay">{{ e.pay === 'month' ? 'شهري' : 'يومية' }}</span><span class="num rate">{{ fmt(e.rate) }}</span></td>
                  <td><span class="due"><b class="num" :class="{ zero: !dueOf(e) }">{{ dueOf(e) ? fmt(dueOf(e)) : '—' }}</b><small class="num">{{ dueText(e) }}</small></span></td>
                  <td><b v-if="e.adv" class="num advb">{{ fmt(e.adv) }}</b><span v-else class="muted">—</span></td>
                  <td>
                    <div v-if="tracked(e)" class="dots"><i v-for="d in DAYS" :key="d" :class="e.att[d] || 'none'" :title="`${weekday(d)} ${d}/11: ${ATT[e.att[d]]?.label || 'لسا'}`" /></div>
                    <span v-else class="muted">ما بيسجّل</span>
                  </td>
                  <td class="ops"><div class="opsin">
                    <SoftButton size="sm" tone="ok" icon="cash" :disabled="!dueOf(e)" @click="money(e, 'pay')">صرف</SoftButton>
                    <SoftButton size="sm" @click="openOne(e)">كشف الحساب</SoftButton>
                    <SoftButton size="sm" @click="money(e, 'adv')">سلفة</SoftButton>
                    <button type="button" class="iconbtn" :aria-label="`تعديل ${e.name}`" title="تعديل بيانات الموظف" @click="editOne(e)"><AppIcon name="edit" /></button>
                  </div></td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
        </Transition>
      </div>

      <div v-if="list.length" class="s12">
        <PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="موظف" />
      </div>
    </div>

    <StaffPayDialog v-model="payOpen" :person="payFor" :kind="payKind" />
    <StaffForm v-model="formOpen" :person="editFor" @saved="onSaved" />
  </div>
</template>

<style scoped>
.staff .grid > * { min-width: 0; }
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

/* roll call */
.roll { background: #fff; border-radius: 20px; padding: 14px 16px; display: grid; gap: 12px; animation: top-in .5s cubic-bezier(.2, .9, .25, 1) .25s both; }
.rh { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.rh h2 { margin: 0; font-size: 16px; } .rh small { color: var(--color-muted); font-size: 12px; }
.chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 8px; }
.who { --c: #9fb3b5; --bg: #f6f9f9; display: flex; align-items: center; gap: 8px; border: 1.5px solid transparent; background: var(--bg); border-radius: 14px; padding: 7px 8px 7px 7px; transition: background .25s, border-color .25s; }
.who.none { border: 1.5px dashed #c7d6d7; background: #fff; }
.wh { flex: 1; display: flex; align-items: center; gap: 9px; min-width: 0; }
/* three small clear choices: present / half / absent */
.pick { flex: none; display: flex; gap: 3px; }
.pick button { width: 28px; height: 28px; display: grid; place-items: center; border: 0; border-radius: 50%; background: #fff; box-shadow: inset 0 0 0 1.5px #dbe5e6; font: inherit; color: #93a7a9; cursor: pointer; transition: background .2s, color .2s, box-shadow .2s, transform .12s; }
.pick button :deep(svg) { width: 14px; height: 14px; stroke-width: 2.6; } .pick em { font-style: normal; font-weight: 700; font-size: 13px; line-height: 1; }
.pick button:active { transform: scale(.9); }
.pick button.p:hover { color: var(--color-positive); box-shadow: inset 0 0 0 1.5px var(--color-positive); } .pick button.h:hover { color: #c98a12; box-shadow: inset 0 0 0 1.5px #d99a1e; } .pick button.a:hover { color: var(--color-negative); box-shadow: inset 0 0 0 1.5px var(--color-negative); }
.pick button.on.p { background: var(--color-positive); color: #fff; box-shadow: none; } .pick button.on.h { background: #d99a1e; color: #fff; box-shadow: none; } .pick button.on.a { background: var(--color-negative); color: #fff; box-shadow: none; }
.who .nm { display: grid; min-width: 0; line-height: 1.35; } .who b { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.who small { font-size: 11.5px; color: var(--c); font-weight: 600; } .who.none small { color: var(--color-muted); font-weight: 500; }
.who .av { background: var(--c); color: #fff; transition: background .25s; } .who.none .av { background: #dfe9ea; color: var(--color-muted); }
.av { position: relative; flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; font-size: 15px; background: var(--color-primary-pale); color: var(--color-primary-ink); }
.av i { position: absolute; bottom: -3px; inset-inline-start: -4px; width: 18px; height: 18px; border-radius: 50%; background: #fff; color: var(--color-primary); display: grid; place-items: center; box-shadow: 0 0 0 1.5px #fff; }
.av i :deep(svg) { width: 11px; height: 11px; }
.av.big { width: 42px; height: 42px; font-size: 17px; }

.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; }
.findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 220px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.vtog { position: relative; display: inline-flex; padding: 4px; border-radius: 10px; background: rgb(11 59 69 / .08); margin-inline-start: auto; }
.vthumb { position: absolute; top: 4px; bottom: 4px; border-radius: 7px; background: #fff; transition: left .4s cubic-bezier(.3, 1.25, .5, 1), width .4s cubic-bezier(.3, 1.25, .5, 1), opacity .2s; }
.vtog button { position: relative; z-index: 1; border: 0; background: none; cursor: pointer; display: grid; place-items: center; height: 36px; width: 44px; color: var(--color-muted); transition: color .2s; }
.vtog button.on { color: var(--color-primary); } .vtog button :deep(svg) { width: 21px; height: 21px; } .vtog button:focus-visible { outline: 0; }

/* table */
.tbl-wrap { border-radius: 16px; padding: 6px 10px; overflow-x: auto; }
.tbl { width: 100%; border-collapse: separate; border-spacing: 0 6px; min-width: 980px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 6px 12px 2px; white-space: nowrap; }
.tbl td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .tbl td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.tbl tr:hover td { background: #f7fbfb; }
.who-cell { display: flex; align-items: center; gap: 10px; }
.tname { border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; line-height: 1.4; min-width: 0; }
.tname b { font-weight: 700; font-size: 14px; } .tname:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.tname small { color: var(--color-muted); font-size: 11.5px; }
.ptag { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-inline-end: 6px; }
.ptag.month { background: var(--color-primary-pale); color: var(--color-primary-ink); } .ptag.day { background: #fff4dc; color: #8a5a00; }
.rate { font-weight: 600; }
.due { display: grid; line-height: 1.35; } .due b { font-weight: 700; font-size: 15px; color: var(--color-positive); } .due b.zero { color: var(--color-muted); } .due small { color: var(--color-muted); font-size: 11px; }
.advb { color: var(--color-negative); font-size: 15px; }
.muted { color: var(--color-muted); }
.dots { display: flex; gap: 3px; flex-wrap: wrap; max-width: 200px; }
.dots i { width: 8px; height: 14px; border-radius: 3px; background: var(--color-positive); opacity: .85; }
.dots i.h { background: linear-gradient(180deg, #e3ece9 50%, #e0a33a 50%); opacity: 1; } .dots i.a { background: var(--color-negative); opacity: .8; } .dots i.none { background: #dfe9ea; }
.tbl .ops { width: 1%; }
.opsin { display: flex; gap: 6px; justify-content: flex-end; align-items: center; }
.iconbtn { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f1f6f6; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; flex: none; transition: background .15s, color .15s; }
.iconbtn:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); } .iconbtn :deep(svg) { width: 16px; height: 16px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

/* cards (at most four a row) */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(max(280px, calc((100% - 36px) / 4)), 1fr)); gap: 12px; }
.pc { background: #fff; border-radius: 18px; padding: 16px; display: grid; gap: 12px; border: 1px solid #e4eeee; transition: transform .2s, box-shadow .2s, border-color .2s; }
.pc:hover { transform: translateY(-3px); border-color: transparent; box-shadow: 0 16px 30px -20px rgb(11 59 69 / .6); }
.pc .h { display: flex; align-items: center; gap: 10px; } .pc .h .tname { flex: 1; } .pc .h .iconbtn { width: 30px; height: 30px; }
.money { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.money div { border-radius: 12px; padding: 8px 12px; background: #f4f9f9; } .money small { display: block; color: var(--color-muted); font-size: 11.5px; } .money b { font-size: 18px; font-weight: 700; }
.money .owe { background: #eaf6ef; } .money .owe b { color: var(--color-positive); } .money .adv { background: #fff1ef; } .money .adv b { color: var(--color-negative); }
.pc .dots { max-width: none; border-block: 1px dashed #e3ebea; padding: 9px 0; }
.dots-none { font-size: 12px; color: var(--color-muted); border-block: 1px dashed #e3ebea; padding: 8px 0; }
.go { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; } .go :deep(.sbt) { width: 100%; }
@media (max-width: 900px) { .tops { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .top, .roll { animation: none; } }
</style>
