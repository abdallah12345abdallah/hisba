<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import StaffPayDialog from '../components/staff/StaffPayDialog.vue'
import StaffForm from '../components/staff/StaffForm.vue'
import { fmt } from '../data/demo.js'
import { findStaff, roleOf, tracked, dueOf, unpaidDays, daysLabel, statementOf, cycle, weekday, DAYS, ATT, TODAY, MONTH } from '../data/staff.js'

// One employee — same layout as a trader's or a farm's page: figures, statement with a filter, and on the side
// the month's attendance (tap a day to change it; day wages follow), his details and the actions.
const route = useRoute()
const router = useRouter()
const e = computed(() => findStaff(route.params.id))
const role = computed(() => roleOf(e.value.role))
const count = (s) => DAYS.filter((d) => e.value.att[d] === s).length
const worked = computed(() => DAYS.reduce((a, d) => a + (ATT[e.value.att[d]]?.unit || 0), 0))

const figs = computed(() => {
  const x = e.value
  const due = dueOf(x)
  return [
    { label: x.pay === 'month' ? `باقي راتب ${MONTH}` : 'يوميات مش مدفوعة', icon: 'cash', value: due ? fmt(due) : 'خالص', unit: due ? 'ج' : '', tone: 'green', bar: x.pay === 'month' ? ((x.rate - due) / x.rate) * 100 : 100, sub: x.pay === 'month' ? `قبض ${fmt(x.paidThisMonth)} من ${fmt(x.rate)}` : `${daysLabel(unpaidDays(x))} من ${x.paidThrough + 1}/11 لليوم` },
    { label: 'عليه سلفة', icon: 'hand', value: x.adv ? fmt(x.adv) : '—', unit: x.adv ? 'ج' : '', tone: 'red', bar: Math.min(100, (x.adv / (x.pay === 'month' ? x.rate : x.rate * 10)) * 100), sub: x.adv ? `${Math.round((x.adv / (x.pay === 'month' ? x.rate : x.rate * 26)) * 100)}% من ${x.pay === 'month' ? 'راتبه' : 'يوميات شهر'}` : 'ما عليه شي' },
    tracked(x)
      ? { label: `حضور ${MONTH}`, icon: 'ucheck', value: daysLabel(worked.value), unit: '', tone: 'teal', bar: (worked.value / DAYS.length) * 100, sub: `من ${DAYS.length} يوم شغل · غاب ${count('a')}` }
      : { label: 'الحضور', icon: 'ucheck', value: '—', unit: '', tone: 'teal', bar: 0, sub: `${role.value.label} ما بيسجّل حضور` },
    { label: x.pay === 'month' ? 'الراتب الشهري' : 'اليومية', icon: role.value.icon, value: fmt(x.rate), unit: 'ج', tone: 'amber', bar: 100, sub: `${role.value.label} من ${x.since}` },
  ]
})

/* statement + filter */
const seg = ref('all')
const SEGS = [{ value: 'all', label: 'الكل' }, { value: 'pay', label: 'القبضات' }, { value: 'adv', label: 'السلف' }]
const rows = computed(() => (e.value ? statementOf(e.value).filter((h) => seg.value === 'all' || h.kind === seg.value) : []))
const KIND = { pay: { icon: 'cash', label: 'قبضة' }, adv: { icon: 'hand', label: 'سلفة' } }

/* the month on a calendar, weeks start on Saturday */
const HEAD = ['سبت', 'أحد', 'اتنين', 'تلات', 'أربع', 'خميس', 'جمعة']
const cells = computed(() => {
  const lead = (new Date(2026, 10, 1).getDay() + 1) % 7
  return [...Array(lead).fill(null), ...Array.from({ length: 30 }, (_, i) => i + 1)]
})
const dayCls = (d) => (new Date(2026, 10, d).getDay() === 5 ? 'fri' : d > TODAY ? 'future' : e.value.att[d] || 'none')
const canTap = (d) => tracked(e.value) && d <= TODAY && new Date(2026, 10, d).getDay() !== 5
const paidDay = (d) => e.value.pay === 'day' && d <= e.value.paidThrough

/* actions */
const payOpen = ref(false)
const payKind = ref('pay')
function money(kind) { payKind.value = kind; payOpen.value = true }
const formOpen = ref(false)
function onDeleted() { router.push('/staff') }
function printIt() { window.print() }
function whatsapp() {
  const x = e.value
  const last = statementOf(x).slice(0, 4).map((h) => `• ${h.title} (${h.date}): ${fmt(h.amount)} ج`).join('\n')
  const text = `السلام عليكم ${x.name}\n${x.pay === 'month' ? `باقي من راتب ${MONTH}: ${fmt(dueOf(x))} ج` : `يومياتك المش مدفوعة: ${daysLabel(unpaidDays(x))} = ${fmt(dueOf(x))} ج`}\nعليك سلفة: ${fmt(x.adv)} ج\n\nآخر الحركات:\n${last}`
  window.open(`https://wa.me/2${x.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
</script>

<template>
  <div class="page member">
    <EmptyState v-if="!e" icon="search" title="ما لقينا هالموظف" text="يمكن انمسح.">
      <SoftButton tone="primary" icon="back" @click="router.push('/staff')">رجوع للموظفين</SoftButton>
    </EmptyState>

    <template v-else>
      <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/staff">الموظفين</RouterLink><AppIcon name="next" /><span>{{ e.name }}</span></nav>
      <header class="dhead">
        <div class="hello">
          <h1>{{ e.name }} <StatusPill :tone="e.pay === 'month' ? 'info' : 'draft'">{{ e.pay === 'month' ? 'راتب شهري' : 'يومية' }}</StatusPill></h1>
          <p class="num"><AppIcon :name="role.icon" />{{ role.label }} · <AppIcon name="phone" />{{ e.phone }}</p>
        </div>
        <div class="actions">
          <SoftButton icon="whatsapp" @click="whatsapp">واتساب</SoftButton>
          <SoftButton icon="print" @click="printIt">طباعة</SoftButton>
          <SoftButton icon="hand" @click="money('adv')">سلفة</SoftButton>
          <SoftButton icon="cash" tone="ok" :disabled="!dueOf(e)" @click="money('pay')">{{ e.pay === 'month' ? 'صرف الراتب' : 'صرف اليوميات' }}</SoftButton>
        </div>
      </header>

      <div class="grid">
        <div class="s12 figs">
          <div v-for="(f, i) in figs" :key="f.label" class="fig" :class="f.tone" :style="{ '--i': i }">
            <span class="fh"><small>{{ f.label }}</small><AppIcon :name="f.icon" /></span>
            <b class="num">{{ f.value }}<span v-if="f.unit">{{ f.unit }}</span></b>
            <span class="fbar"><i :style="{ width: f.bar + '%' }" /></span>
            <span class="fsub num">{{ f.sub }}</span>
          </div>
        </div>

        <section class="s8 card tblcard">
          <div class="ch">
            <h2>كشف الحساب</h2>
            <div class="segs" role="radiogroup" aria-label="نوع الحركة">
              <button v-for="x in SEGS" :key="x.value" type="button" role="radio" :aria-checked="seg === x.value" :class="{ on: seg === x.value }" @click="seg = x.value">{{ x.label }}</button>
            </div>
          </div>
          <div class="stmt-wrap">
            <table class="stmt">
              <thead><tr><th><span class="sr">النوع</span></th><th>البيان</th><th>التاريخ</th><th>قبض</th><th>سلفة</th><th>انخصم من السلفة</th><th>السلفة بعدها</th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="(h, i) in rows" :key="h.title + h.date + h.amount + i">
                  <td class="kc"><span class="k" :class="h.kind" :title="KIND[h.kind].label"><AppIcon :name="KIND[h.kind].icon" /></span></td>
                  <td class="t"><b>{{ h.title }}</b><small class="num">{{ h.sub }}</small></td>
                  <td>{{ h.date }}</td>
                  <td class="num inc">{{ h.kind === 'pay' ? fmt(h.amount) : '' }}</td>
                  <td class="num outp">{{ h.kind === 'adv' ? fmt(h.amount) : '' }}</td>
                  <td class="num ded">{{ h.deduct ? fmt(h.deduct) : '' }}</td>
                  <td class="num bal" :class="{ adv: h.after > 0 }">{{ h.after ? fmt(h.after) : 'خالص' }}</td>
                </tr>
              </TransitionGroup>
            </table>
            <p v-if="!rows.length" class="none">ما في حركات من هالنوع.</p>
          </div>
        </section>

        <div class="s4 side">
          <section class="card">
            <div class="ch"><h2>{{ tracked(e) ? `حضور ${MONTH}` : `راتب ${MONTH}` }}</h2><span v-if="tracked(e)" class="meta num">{{ daysLabel(worked) }}</span></div>
            <!-- owner / partner: no roll call, so the card shows where this month's salary stands -->
            <div v-if="!tracked(e)" class="sal">
              <div class="salring" :style="{ '--p': (e.paidThisMonth / e.rate) * 100 }">
                <span class="num"><b>{{ Math.round((e.paidThisMonth / e.rate) * 100) }}%</b><small>قبض</small></span>
              </div>
              <dl class="num">
                <div><dt>الراتب</dt><dd>{{ fmt(e.rate) }} ج</dd></div>
                <div><dt>قبض منه</dt><dd class="ok">{{ fmt(e.paidThisMonth) }} ج</dd></div>
                <div><dt>الباقي</dt><dd class="due">{{ fmt(dueOf(e)) }} ج</dd></div>
              </dl>
              <p class="when num"><AppIcon name="calendar" />بيستحق آخر الشهر · بعد {{ 30 - TODAY }} أيام</p>
              <p class="badge"><AppIcon :name="role.icon" />{{ role.label }} ما بيسجّل حضور، راتبه كامل كل شهر.</p>
            </div>
            <template v-else>
              <div class="cal">
                <span v-for="h in HEAD" :key="h" class="hd">{{ h }}</span>
                <template v-for="(d, i) in cells" :key="i">
                  <span v-if="!d" />
                  <button v-else type="button" class="day num" :class="[dayCls(d), { paid: paidDay(d), today: d === TODAY }]" :disabled="!canTap(d)"
                    :title="canTap(d) ? `${weekday(d)} ${d}/11: ${ATT[e.att[d]]?.label || 'لسا'}${paidDay(d) ? ' · مدفوع' : ''}` : ''" @click="cycle(e, d)">{{ d }}</button>
                </template>
              </div>
              <div class="legend"><span><i class="p" />حاضر {{ count('p') }}</span><span><i class="h" />نص {{ count('h') }}</span><span><i class="a" />غايب {{ count('a') }}</span><span><i class="fri" />جمعة</span></div>
              <p class="hint">دوس على أي يوم لتغيّره.<template v-if="e.pay === 'day'"> الأيام اللي عليها خط انقبضت، والباقي بيتجمّع لليوميات.</template></p>
            </template>
          </section>
          <section class="card info">
            <div class="ch"><h2>بيانات الموظف</h2><SoftButton size="sm" icon="edit" @click="formOpen = true">تعديل</SoftButton></div>
            <dl>
              <div><dt>الشغلة</dt><dd>{{ role.label }}</dd></div>
              <div><dt>{{ e.pay === 'month' ? 'الراتب' : 'اليومية' }}</dt><dd class="num">{{ fmt(e.rate) }} ج</dd></div>
              <div><dt>التلفون</dt><dd class="num">{{ e.phone }}</dd></div>
              <div><dt>معنا من</dt><dd class="num">{{ e.since }}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <StaffPayDialog v-model="payOpen" :person="e" :kind="payKind" />
      <StaffForm v-model="formOpen" :person="e" @deleted="onDeleted" />
    </template>
  </div>
</template>

<style scoped>
.member .grid > * { min-width: 0; }
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; } .crumb a:hover { text-decoration: underline; text-underline-offset: 3px; }
.crumb :deep(svg) { width: 15px; height: 15px; }
.hello h1 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hello p { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } .hello p :deep(svg) { width: 15px; height: 15px; }
.figs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.fig { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px 16px;
  background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; animation: fig-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.fig::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.fig > * { position: relative; z-index: 1; }
.fig.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); }
.fig.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.fig.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.fh { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .fh small { color: var(--color-muted); font-size: 12px; } .fh :deep(svg) { width: 20px; height: 20px; }
.fig b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .fig b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.fbar { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.fbar i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: fbar-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.fsub { font-size: 11.5px; color: var(--color-muted); }
@keyframes fig-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes fbar-in { from { width: 0; } }
.ch { flex-wrap: wrap; }
.segs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: rgb(11 59 69 / .07); }
.segs button { border: 0; background: none; font: inherit; font-size: 12.5px; color: var(--color-muted); height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; }
.segs button.on { background: #fff; color: var(--color-primary-ink); font-weight: 600; }
.stmt-wrap { overflow-x: auto; }
.stmt { width: 100%; min-width: 640px; border-collapse: separate; border-spacing: 0 5px; }
.stmt th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 2px 12px; white-space: nowrap; }
.stmt td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.stmt td:first-child { border-start-start-radius: 10px; border-end-start-radius: 10px; } .stmt td:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.kc { width: 1%; }
.k { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; } .k :deep(svg) { width: 15px; height: 15px; }
.k.pay { background: var(--pos-bg); color: var(--color-positive); } .k.adv { background: #fff4dc; color: #b07a12; }
.t b { display: block; font-weight: 600; } .t small { color: var(--color-muted); font-size: 11.5px; }
.inc { color: var(--color-positive); font-weight: 700; } .outp { color: #b4532a; font-weight: 700; } .ded { color: var(--color-primary-ink); font-weight: 600; }
.bal { font-weight: 700; color: var(--color-positive); } .bal.adv { color: var(--color-negative); }
.none { text-align: center; color: var(--color-muted); font-size: 13px; padding: 12px; margin: 0; }
.side { display: grid; gap: 16px; align-content: start; }
/* attendance calendar */
.cal { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
.hd { text-align: center; font-size: 10.5px; color: var(--color-muted); padding-bottom: 2px; }
.day { position: relative; aspect-ratio: 1; border: 0; border-radius: 10px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; display: grid; place-items: center; transition: transform .12s, background .2s, color .2s; }
.day:not(:disabled):hover { transform: scale(1.08); } .day:disabled { cursor: default; }
.day.p { background: #e2f5e9; color: var(--color-positive); }
.day.h { background: linear-gradient(180deg, #fff 50%, #fde8bd 50%); color: #8a5a00; box-shadow: inset 0 0 0 1.5px #f1d08c; }
.day.a { background: #ffe9e6; color: var(--color-negative); }
.day.none { background: #fff; color: var(--color-muted); outline: 1.5px dashed #c7d6d7; outline-offset: -2px; }
.day.fri { background: repeating-linear-gradient(135deg, #eef3f3 0 4px, #f8fbfb 4px 8px); color: #b5c4c5; }
.day.future { background: transparent; color: #c2d0d1; font-weight: 500; }
.day.today { box-shadow: 0 0 0 2px var(--color-deep); }
.day.paid::after { content: ""; position: absolute; inset-inline: 22%; bottom: 5px; height: 2px; border-radius: 1px; background: currentColor; opacity: .55; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; color: var(--color-muted); margin-top: 10px; }
.legend span { display: inline-flex; align-items: center; gap: 5px; } .legend i { width: 12px; height: 12px; border-radius: 4px; }
.legend i.p { background: #bfe6cd; } .legend i.h { background: linear-gradient(180deg, #fff 50%, #f5cf7f 50%); box-shadow: inset 0 0 0 1px #f1d08c; } .legend i.a { background: #ffc7c0; }
.legend i.fri { background: repeating-linear-gradient(135deg, #dfe8e8 0 3px, #f8fbfb 3px 6px); }
.hint { margin: 8px 0 0; font-size: 12px; color: var(--color-muted); line-height: 1.8; }
/* salary card for those without a roll call */
.sal { display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 12px 16px; align-items: center; }
@property --a { syntax: '<number>'; inherits: true; initial-value: 0; }
.salring { --a: var(--p); position: relative; width: 116px; height: 116px; transition: --a .6s; animation: ring-in 1s cubic-bezier(.2, .9, .25, 1) .2s both; }
.salring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: conic-gradient(var(--color-positive) calc(var(--a) * 1%), #e8f0f0 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10.5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 10.5px)); }
@keyframes ring-in { from { --a: 0; } }
.salring span { position: absolute; inset: 0; border: 0; background: none; display: grid; place-content: center; text-align: center; line-height: 1.2; }
.salring b { font-size: 22px; color: var(--color-deep); } .salring small { font-size: 11.5px; color: var(--color-muted); }
.sal dl { margin: 0; display: grid; gap: 6px; }
.sal dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; }
.sal dt { color: var(--color-muted); } .sal dd { margin: 0; font-weight: 700; } .sal dd.ok { color: var(--color-positive); } .sal dd.due { color: var(--color-deep); font-size: 15px; }
.when, .badge { grid-column: 1 / -1; margin: 0; display: flex; align-items: center; gap: 8px; font-size: 12.5px; border-radius: 12px; padding: 9px 12px; }
.when { background: #eef7f9; color: var(--color-primary-ink); font-weight: 600; }
.badge { background: #fff7e6; color: #8a5a00; }
.when :deep(svg), .badge :deep(svg) { width: 17px; height: 17px; flex: none; }
.empty { display: flex; align-items: center; gap: 10px; color: var(--color-muted); font-size: 13px; background: #f6f9f9; border-radius: 12px; padding: 12px 14px; }
.empty :deep(svg) { width: 22px; height: 22px; color: #9fbfc3; flex: none; }
.info dl { margin: 0; display: grid; gap: 8px; }
.info dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; border-bottom: 1px dashed var(--color-line); padding-bottom: 8px; }
.info dl div:last-child { border: 0; padding: 0; } .info dt { color: var(--color-muted); } .info dd { margin: 0; font-weight: 600; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) { .figs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media print { .actions, .crumb, .segs { display: none; } }
</style>
