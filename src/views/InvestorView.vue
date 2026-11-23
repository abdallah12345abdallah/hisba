<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import CapitalDialog from '../components/investors/CapitalDialog.vue'
import InvestorForm from '../components/investors/InvestorForm.vue'
import { fmt } from '../data/demo.js'
import { findInvestor, capitalOf, weightedOf, capitalByMonth, profitsTaken, statementOf, split, profitProjected, shareUrl, whatsappText, monthsIn, TERMS, MONTHS, YEAR, SPLIT, MONTH_NOW } from '../data/investors.js'
import { toast } from '../composables/useToast.js'

// One shareholder — same layout as the other account pages: figures, the statement (capital in/out and yearly profits),
// and on the side how his share is worked out month by month, his past profits and his details.
const route = useRoute()
const router = useRouter()
const x = computed(() => findInvestor(route.params.id))
const P = profitProjected()
const mine = computed(() => split(P).rows.find((r) => r.x === x.value) || { pct: 0, raw: 0, get: 0 })
const bars = computed(() => capitalByMonth(x.value))
const maxBar = computed(() => Math.max(1, ...bars.value))

const figs = computed(() => [
  { label: 'رأس المال', icon: 'safe', value: fmt(capitalOf(x.value)), unit: 'ج', tone: 'teal', bar: 100, sub: `موزون ${YEAR}: ${fmt(weightedOf(x.value))} ج` },
  { label: 'حصته من الربح', icon: 'share', value: `${mine.value.pct.toFixed(1)}%`, unit: '', tone: 'amber', bar: mine.value.pct, sub: `من ${100 - SPLIT.mgmt}% المساهمين · ${TERMS[x.value.terms].label}` },
  { label: `متوقع له ${YEAR}`, icon: 'report', value: fmt(mine.value.get), unit: 'ج', tone: 'green', bar: 100, sub: `على ربح متوقع ${fmt(P)} ج` },
  { label: 'أرباح استلمها', icon: 'cash', value: fmt(profitsTaken(x.value)), unit: 'ج', tone: 'teal', bar: 100, sub: x.value.profits.length ? `${x.value.profits.length} سنين · آخرها ${x.value.profits[0].year}` : 'لسا ما اندفعله أرباح' },
])

/* statement */
const seg = ref('all')
const SEGS = [{ value: 'all', label: 'الكل' }, { value: 'cap', label: 'رأس المال' }, { value: 'profit', label: 'الأرباح' }]
const rows = computed(() => statementOf(x.value).filter((l) => seg.value === 'all' || (seg.value === 'profit' ? l.kind === 'profit' : l.kind !== 'profit')))
const KIND = { in: { icon: 'in', label: 'داخل' }, out: { icon: 'out', label: 'سحب' }, profit: { icon: 'share', label: 'أرباح' } }

/* actions */
const capOpen = ref(false)
const capDir = ref('in')
function capital(d) { capDir.value = d; capOpen.value = true }
const formOpen = ref(false)
async function copyLink() {
  const url = shareUrl(x.value)
  try { await navigator.clipboard.writeText(url); toast('انسخ الرابط', `ابعته لـ${x.value.name}، بيشوف رأس ماله وأرباحه بدون حساب`) }
  catch { window.prompt('انسخ الرابط:', url) }
}
const printIt = () => window.print()
const whatsapp = () => window.open(`https://wa.me/2${x.value.phone.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappText(x.value, P))}`, '_blank', 'noopener')
</script>

<template>
  <div class="page investor">
    <EmptyState v-if="!x" icon="search" title="ما لقينا هالمساهم" text="يمكن انمسح.">
      <SoftButton tone="primary" icon="back" @click="router.push('/investors')">رجوع للمساهمين</SoftButton>
    </EmptyState>

    <template v-else>
      <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/investors">المساهمين</RouterLink><AppIcon name="next" /><span>{{ x.name }}</span></nav>
      <header class="dhead">
        <div class="hello">
          <h1>{{ x.name }} <StatusPill :tone="x.terms === 'full' ? 'info' : 'draft'">{{ TERMS[x.terms].label }}</StatusPill></h1>
          <p class="num"><AppIcon name="phone" />{{ x.phone }} · معنا من {{ x.since }} · {{ TERMS[x.terms].long }}</p>
        </div>
        <div class="actions">
          <SoftButton icon="link" @click="copyLink">رابط المساهم</SoftButton>
          <SoftButton icon="whatsapp" @click="whatsapp">واتساب</SoftButton>
          <SoftButton icon="print" @click="printIt">طباعة</SoftButton>
          <SoftButton icon="out" @click="capital('out')">سحب</SoftButton>
          <SoftButton icon="in" tone="primary" @click="capital('in')">زيادة رأس مال</SoftButton>
        </div>
      </header>

      <div class="grid">
        <div class="s12 figs">
          <div v-for="(f, i) in figs" :key="f.label" class="fig" :class="f.tone" :style="{ '--i': i }">
            <span class="fh"><small>{{ f.label }}</small><AppIcon :name="f.icon" /></span>
            <b class="num">{{ f.value }}<span v-if="f.unit">{{ f.unit }}</span></b>
            <span class="fbar"><i :style="{ width: Math.min(100, f.bar) + '%' }" /></span>
            <span class="fsub num">{{ f.sub }}</span>
          </div>
        </div>

        <section class="s8 card tblcard">
          <div class="ch">
            <h2>كشف الحساب</h2>
            <div class="segs" role="radiogroup" aria-label="نوع الحركة">
              <button v-for="sg in SEGS" :key="sg.value" type="button" role="radio" :aria-checked="seg === sg.value" :class="{ on: seg === sg.value }" @click="seg = sg.value">{{ sg.label }}</button>
            </div>
          </div>
          <div class="stmt-wrap">
            <table class="stmt">
              <thead><tr><th><span class="sr">النوع</span></th><th>البيان</th><th>التاريخ</th><th>داخل</th><th>انسحب</th><th>أرباح</th><th>رأس المال بعدها</th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="(l, i) in rows" :key="l.title + l.date + i">
                  <td class="kc"><span class="k" :class="l.kind" :title="KIND[l.kind].label"><AppIcon :name="KIND[l.kind].icon" /></span></td>
                  <td class="t"><b>{{ l.title }}</b><small v-if="l.kind === 'profit'">{{ l.how === 'reinvest' ? 'انضافت لرأس المال' : 'قبضها' }}</small><small v-else-if="l.month && l.month <= 12" class="num">بتنحسب {{ monthsIn(l) }} شهر من {{ YEAR }}</small></td>
                  <td class="num">{{ l.date }}</td>
                  <td class="num inc">{{ l.kind === 'in' ? fmt(l.amount) : '' }}</td>
                  <td class="num outp">{{ l.kind === 'out' ? fmt(-l.amount) : '' }}</td>
                  <td class="num prof">{{ l.kind === 'profit' ? fmt(l.amount) : '' }}</td>
                  <td class="num bal">{{ l.kind !== 'profit' ? fmt(l.after) : '' }}</td>
                </tr>
              </TransitionGroup>
            </table>
            <p v-if="!rows.length" class="none">ما في حركات من هالنوع.</p>
          </div>
        </section>

        <div class="s4 side">
          <section class="card">
            <div class="ch"><h2>كيف انحسب نصيبه</h2><span class="meta num">{{ YEAR }}</span></div>
            <div class="mchart">
              <div v-for="(c, i) in bars" :key="i" class="mc" :class="{ fut: i + 1 > MONTH_NOW, now: i + 1 === MONTH_NOW }" :title="`${MONTHS[i]}: ${fmt(c)} ج`">
                <i :style="{ height: Math.max(4, (c / maxBar) * 100) + '%' }" /><small>{{ MONTHS[i].slice(0, 3) }}</small>
              </div>
            </div>
            <ol class="calc num">
              <li><span>رأس المال الموزون</span><b>{{ fmt(weightedOf(x)) }}</b></li>
              <li><span>حصته من {{ 100 - SPLIT.mgmt }}% المساهمين</span><b>{{ mine.pct.toFixed(2) }}%</b></li>
              <li><span>ربحه على {{ fmt(P) }}</span><b>{{ fmt(mine.raw) }}</b></li>
              <li v-if="x.terms === 'half'"><span>نص للإدارة (50/50)</span><b class="neg">− {{ fmt(mine.raw - mine.get) }}</b></li>
              <li class="tot"><span>متوقع له</span><b>{{ fmt(mine.get) }} ج</b></li>
            </ol>
            <p class="hint">كل شهر بيدخل فيه المبلغ بيتحسب. اللي دخل بنص السنة بياخد على قدّ الشهور.</p>
          </section>
          <section v-if="x.profits.length" class="card">
            <div class="ch"><h2>أرباح السنين اللي فاتت</h2></div>
            <ul class="yrs">
              <li v-for="p in x.profits" :key="p.year"><b class="num">{{ p.year }}</b><span class="num">{{ fmt(p.amount) }} ج</span><small>{{ p.how === 'reinvest' ? 'لرأس المال' : 'قبضها' }}</small></li>
            </ul>
          </section>
          <section class="card info">
            <div class="ch"><h2>بيانات المساهم</h2><SoftButton size="sm" icon="edit" @click="formOpen = true">تعديل</SoftButton></div>
            <dl>
              <div><dt>التلفون</dt><dd class="num">{{ x.phone }}</dd></div>
              <div><dt>الشروط</dt><dd>{{ TERMS[x.terms].long }}</dd></div>
              <div><dt>معنا من</dt><dd class="num">{{ x.since }}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <CapitalDialog v-model="capOpen" :investor="x" :dir="capDir" />
      <InvestorForm v-model="formOpen" :investor="x" @deleted="router.push('/investors')" />
    </template>
  </div>
</template>

<style scoped>
.investor .grid > * { min-width: 0; }
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
.fig.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.fig.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.fh { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .fh small { color: var(--color-muted); font-size: 12px; } .fh :deep(svg) { width: 20px; height: 20px; }
.fig b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .fig b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.fbar { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.fbar i { display: block; height: 100%; border-radius: 3px; background: var(--fg); animation: fbar-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
.fsub { font-size: 11.5px; color: var(--color-muted); }
@keyframes fig-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes fbar-in { from { width: 0; } }
.ch { flex-wrap: wrap; }
.segs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: rgb(11 59 69 / .07); }
.segs button { border: 0; background: none; font: inherit; font-size: 12.5px; color: var(--color-muted); height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; }
.segs button.on { background: #fff; color: var(--color-primary-ink); font-weight: 600; }
.stmt-wrap { overflow-x: auto; }
.stmt { width: 100%; min-width: 660px; border-collapse: separate; border-spacing: 0 5px; }
.stmt th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 2px 12px; white-space: nowrap; }
.stmt td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.stmt td:first-child { border-start-start-radius: 10px; border-end-start-radius: 10px; } .stmt td:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.kc { width: 1%; }
.k { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; } .k :deep(svg) { width: 15px; height: 15px; }
.k.in { background: #e3f3f6; color: var(--color-primary); } .k.out { background: #fff1ef; color: var(--color-negative); } .k.profit { background: var(--pos-bg); color: var(--color-positive); }
.t b { display: block; font-weight: 600; } .t small { color: var(--color-muted); font-size: 11.5px; }
.inc { color: var(--color-primary-ink); font-weight: 700; } .outp { color: var(--color-negative); font-weight: 700; } .prof { color: var(--color-positive); font-weight: 700; }
.bal { font-weight: 700; color: var(--color-deep); }
.none { text-align: center; color: var(--color-muted); font-size: 13px; padding: 12px; margin: 0; }
.side { display: grid; gap: 16px; align-content: start; }
.mchart { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; height: 110px; align-items: end; }
.mc { display: grid; grid-template-rows: 1fr auto; height: 100%; gap: 4px; justify-items: center; }
.mc i { align-self: end; width: 100%; border-radius: 4px 4px 2px 2px; background: linear-gradient(180deg, #3aa3b9, var(--color-primary)); animation: grow .7s cubic-bezier(.2, .9, .25, 1) both; transform-origin: bottom; }
.mc.now i { background: linear-gradient(180deg, #f8c77d, #f5a53a); } .mc.fut i { background: #e1eaeb; }
.mc small { font-size: 9.5px; color: var(--color-muted); }
@keyframes grow { from { transform: scaleY(0); } }
.calc { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 6px; }
.calc li { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--color-muted); }
.calc b { color: var(--color-deep); } .calc b.neg { color: var(--color-negative); }
.calc li.tot { border-top: 1px dashed var(--color-line); padding-top: 8px; color: var(--color-ink); font-weight: 600; } .calc li.tot b { font-size: 17px; color: var(--color-positive); }
.hint { margin: 8px 0 0; font-size: 12px; color: var(--color-muted); line-height: 1.8; }
.yrs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.yrs li { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; background: #f6f9f9; border-radius: 10px; padding: 8px 12px; font-size: 13px; }
.yrs b { color: var(--color-deep); } .yrs span { font-weight: 700; color: var(--color-positive); } .yrs small { color: var(--color-muted); font-size: 11.5px; }
.info dl { margin: 0; display: grid; gap: 8px; }
.info dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; border-bottom: 1px dashed var(--color-line); padding-bottom: 8px; }
.info dl div:last-child { border: 0; padding: 0; } .info dt { color: var(--color-muted); } .info dd { margin: 0; font-weight: 600; text-align: left; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) { .figs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media print { .actions, .crumb, .segs { display: none; } }
</style>
