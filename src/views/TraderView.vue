<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PayDialog from '../components/traders/PayDialog.vue'
import TraderForm from '../components/traders/TraderForm.vue'
import SaleInvoice from '../components/traders/SaleInvoice.vue'
import TraderPricesDialog from '../components/traders/TraderPricesDialog.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import { fmt } from '../data/demo.js'
import { findTrader, isOver, statementOf, AGE_BUCKETS, bucketOf, whatsappStatement, cycleOf, isLate, lateBy, ownPrices, boughtToday, traderShareUrl, renewTraderToken, resetTraderCode } from '../data/traders.js'
import { toast } from '../composables/useToast.js'

// One trader's account — "صفحة خاصة" (approved أ): its own address, the figures, the statement as a table with a filter,
// debt age and the trader's details on the side, and the actions (print, WhatsApp statement, receive payment).
const route = useRoute()
const router = useRouter()
const t = computed(() => findTrader(decodeURIComponent(route.params.name || '')))
const over = computed(() => t.value && isOver(t.value))

const bought = computed(() => (t.value ? statementOf(t.value).filter((e) => e.kind === 'buy' && e.date === 'اليوم').reduce((s, e) => s + e.amount, 0) : 0))

/* the four figures, in the same "soft colour field" cards as the traders list: icon, value, a bar and a line that explains it */
const figs = computed(() => {
  const x = t.value
  const used = x.limit ? (x.due / x.limit) * 100 : 0
  return [
    { label: 'عليه', icon: 'out', value: fmt(x.due), unit: 'ج', tone: over.value ? 'red' : x.due ? 'teal' : 'green', bar: Math.min(100, used),
      sub: bought.value ? `منها ${fmt(bought.value)} مشتريات اليوم` : 'ما اشترى اليوم' },
    { label: 'حد الدين', icon: 'lock', value: fmt(x.limit), unit: 'ج', tone: 'teal', bar: Math.min(100, used), sub: `مستعمل منه ${Math.round(used)}%` },
    over.value
      ? { label: 'فوق الحد بـ', icon: 'alert', value: fmt(x.due - x.limit), unit: 'ج', tone: 'red', bar: Math.min(100, ((x.due - x.limit) / x.limit) * 100), sub: 'لازم يدفعها ليرجع تحت الحد' }
      : { label: 'متاح له', icon: 'check', value: fmt(x.limit - x.due), unit: 'ج', tone: 'green', bar: 100 - Math.min(100, used), sub: 'بيقدر يشتري فيها آجل' },
    { label: 'عمر أقدم فاتورة', icon: 'clock', value: x.due ? x.days : '—', unit: x.due ? 'يوم' : '', tone: x.days > 30 ? 'red' : 'amber', bar: Math.min(100, (x.days / 60) * 100), sub: `آخر دفعة ${x.lastPay}` },
  ]
})

/* statement with a filter: everything / purchases / payments */
const seg = ref('all')
const SEGS = [{ value: 'all', label: 'الكل' }, { value: 'buy', label: 'المشتريات' }, { value: 'pay', label: 'الدفعات' }]
const rows = computed(() => (t.value ? statementOf(t.value).filter((e) => seg.value === 'all' || e.kind === seg.value) : []))
const bucket = computed(() => (t.value?.due ? bucketOf(t.value.days) : -1))
// marker position on a 0 → 90 day track (each bucket a quarter: 0–7, 8–30, 31–60, 60+)
const agePos = computed(() => {
  const d = t.value?.days ?? 0
  const seg = d <= 7 ? [0, 7, 0] : d <= 30 ? [8, 30, 1] : d <= 60 ? [31, 60, 2] : [61, 120, 3]
  return Math.min(98, Math.max(2, (seg[2] + Math.min(1, (d - seg[0]) / (seg[1] - seg[0] || 1))) * 25))
})

const payOpen = ref(false)
function sendStatement() { whatsappStatement(t.value) }
function printIt() { window.print() }
/* edit (a new name moves the page to its new address) and delete */
const formOpen = ref(false)
function onSaved(x) { if (x.name !== decodeURIComponent(route.params.name)) router.replace(`/traders/${encodeURIComponent(x.name)}`) }
function onDeleted() { router.push('/traders') }

/* today's sales invoice, his prices, and his own account (link + code) */
const invoiceOpen = ref(false)
const pricesOpen = ref(false)
const prices = computed(() => (t.value ? ownPrices(t.value) : []))
const ownCount = computed(() => prices.value.filter((p) => p.own).length)
const link = computed(() => (t.value ? traderShareUrl(t.value) : ''))
const linkShort = computed(() => link.value.replace(/^https?:\/\//, ''))
const showCode = ref(false)
async function copyLink() {
  try { await navigator.clipboard.writeText(link.value); toast('انتسخ الرابط', 'ابعته للتاجر، وبيدخل بكوده.', { tone: 'info' }) } catch { toast('ما قدرت انسخ', link.value, { tone: 'info' }) }
}
function sendAccess() {
  const x = t.value
  const text = `السلام عليكم ${x.name}\nصار فيك تشوف حسابك وفواتيرك عندنا من موبايلك:\n${link.value}\nكود الدخول: ${x.code}\n(أو من صفحة الدخول: «تاجر أو مورد؟» برقم تلفونك والكود)`
  window.open(`https://wa.me/2${x.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
const askRenew = ref(false)
function doRenew() { renewTraderToken(t.value); toast('انعمل رابط جديد', 'الرابط القديم ما عاد يفتح. ابعتله الجديد.', { tone: 'info' }) }
const askCode = ref(false)
function doCode() { const c = resetTraderCode(t.value); showCode.value = true; toast('انعمل كود جديد', `كود ${t.value.name} صار ${c}`, { tone: 'info' }) }
</script>

<template>
  <div class="page trader">
    <EmptyState v-if="!t" icon="search" title="ما لقينا هالتاجر" text="يمكن انمسح أو تغيّر اسمه.">
      <SoftButton tone="primary" icon="back" @click="router.push('/traders')">رجوع للتجار</SoftButton>
    </EmptyState>

    <template v-else>
      <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/traders">التجار</RouterLink><AppIcon name="next" /><span>{{ t.name }}</span></nav>

      <header class="dhead">
        <div class="hello">
          <h1>{{ t.name }}
            <StatusPill v-if="!t.due" tone="ok">خالص</StatusPill>
            <StatusPill v-else-if="over" tone="bad">فوق الحد</StatusPill>
            <StatusPill v-else-if="isLate(t)" tone="draft">متأخر عن موعده {{ lateBy(t) }} يوم</StatusPill>
          </h1>
          <p class="num"><AppIcon name="phone" />{{ t.phone }} · اشترى اليوم بـ <b>{{ fmt(bought) }} ج</b></p>
        </div>
        <div class="actions">
          <SoftButton icon="receipt" :disabled="!boughtToday(t.name)" :title="boughtToday(t.name) ? '' : 'ما اشترى شي اليوم'" @click="invoiceOpen = true">فاتورة اليوم</SoftButton>
          <SoftButton icon="print" @click="printIt">طباعة</SoftButton>
          <SoftButton icon="whatsapp" @click="sendStatement">كشف واتساب</SoftButton>
          <SoftButton icon="cash" tone="primary" :disabled="!t.due" @click="payOpen = true">تسجيل قبض</SoftButton>
        </div>
      </header>

      <div class="grid">
        <div class="s12 figs">
          <div v-for="(f, i) in figs" :key="f.label" class="fig" :class="f.tone" :style="{ '--i': i }">
            <span class="fh"><small>{{ f.label }}</small><AppIcon :name="f.icon" /></span>
            <b class="num">{{ f.value }}<span v-if="f.unit">{{ f.unit }}</span></b>
            <span class="fbar"><i :style="{ width: f.bar + '%' }" /></span>
            <span class="fsub">{{ f.sub }}</span>
          </div>
        </div>

        <section class="s8 card tblcard">
          <div class="ch">
            <h2>كشف الحساب</h2>
            <div class="segs" role="radiogroup" aria-label="نوع الحركة">
              <button v-for="s in SEGS" :key="s.value" type="button" role="radio" :aria-checked="seg === s.value" :class="{ on: seg === s.value }" @click="seg = s.value">{{ s.label }}</button>
            </div>
          </div>
          <div class="stmt-wrap">
            <table class="stmt">
              <thead><tr><th><span class="sr">النوع</span></th><th>البيان</th><th>التاريخ</th><th>عليه</th><th>دفع</th><th>الرصيد</th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="(e, i) in rows" :key="e.title + e.date + e.amount + i">
                  <td class="kc"><span class="k" :class="e.kind"><AppIcon :name="e.kind === 'buy' ? 'out' : 'in'" /></span></td>
                  <td class="t"><b>{{ e.title }}</b><small class="num">{{ e.sub }}</small></td>
                  <td>{{ e.date }}</td>
                  <td class="num inc">{{ e.kind === 'buy' ? fmt(e.amount) : '' }}</td>
                  <td class="num outp">{{ e.kind === 'pay' ? fmt(e.amount) : '' }}</td>
                  <td class="num bal">{{ fmt(e.after) }}</td>
                </tr>
              </TransitionGroup>
            </table>
            <p v-if="!rows.length" class="none">ما في حركات من هالنوع.</p>
          </div>
        </section>

        <div class="s4 side">
          <section class="card">
            <div class="ch"><h2>عمر الدين</h2><span class="meta">من أقدم فاتورة ما اندفعت</span></div>
            <div class="age">
              <div class="track" aria-hidden="true">
                <i v-for="(b, i) in AGE_BUCKETS" :key="b.label" :class="['b' + i, { on: i === bucket }]" />
                <span v-if="t.due" class="pin" :style="{ insetInlineStart: agePos + '%' }"><b class="num">{{ t.days }} يوم</b></span>
              </div>
              <ol class="ages">
                <li v-for="(b, i) in AGE_BUCKETS" :key="b.label" :class="['b' + i, { on: i === bucket }]">
                  <span class="dot" /><span class="l">{{ b.label }}</span><b class="num">{{ i === bucket ? fmt(t.due) + ' ج' : '—' }}</b>
                </li>
              </ol>
              <p v-if="!t.due" class="clear">ما عليه شي، حسابه خالص.</p>
            </div>
          </section>
          <section class="card info">
            <div class="ch"><h2>بيانات التاجر</h2><SoftButton size="sm" @click="formOpen = true">تعديل</SoftButton></div>
            <dl>
              <div><dt>التلفون</dt><dd class="num">{{ t.phone }}</dd></div>
              <div><dt>حد الدين</dt><dd class="num">{{ fmt(t.limit) }} ج</dd></div>
              <div><dt>التحصيل</dt><dd :class="{ late: isLate(t) }">{{ cycleOf(t).label }}<small v-if="isLate(t)" class="num"> · متأخر {{ lateBy(t) }} يوم</small></dd></div>
              <div><dt>آخر شرا</dt><dd>{{ t.lastBuy }}</dd></div>
              <div><dt>آخر دفعة</dt><dd>{{ t.lastPay }}</dd></div>
            </dl>
          </section>
          <section class="card tprice">
            <div class="ch"><h2>أسعاره</h2><SoftButton size="sm" icon="tag" @click="pricesOpen = true">تعديل</SoftButton></div>
            <p class="pmeta">{{ ownCount ? `${ownCount} أصناف بسعر خاص، والباقي بسعر اليوم` : 'بيمشي على سعر اليوم بكل الأصناف' }}</p>
            <ul>
              <li v-for="p in prices" :key="p.grade" :class="{ own: p.own }"><span>{{ p.grade }}</span><b class="num">{{ p.own || p.day }}<small> ج</small></b><em v-if="p.own" class="num">{{ p.own > p.day ? '+' : '' }}{{ p.own - p.day }}</em></li>
            </ul>
          </section>
          <section class="card acc">
            <div class="ch"><h2>حسابه على حِسبة</h2><AppIcon name="key" /></div>
            <p class="pmeta">بيفتح رابطه أو بيدخل برقم تلفونه والكود، وبيشوف كشفه وفواتيره بس.</p>
            <div class="linkbox num" dir="ltr">{{ linkShort }}</div>
            <div class="code"><span>كود الدخول</span><b class="num">{{ showCode ? t.code : '••••' }}</b><button type="button" class="eye" @click="showCode = !showCode">{{ showCode ? 'خبّي' : 'وَرجي' }}</button></div>
            <div class="accbtns">
              <SoftButton size="sm" icon="whatsapp" @click="sendAccess">ابعتله الدخول</SoftButton>
              <SoftButton size="sm" icon="link" @click="copyLink">نسخ الرابط</SoftButton>
              <SoftButton size="sm" icon="sync" @click="askRenew = true">رابط جديد</SoftButton>
              <SoftButton size="sm" icon="key" @click="askCode = true">كود جديد</SoftButton>
            </div>
          </section>
        </div>
      </div>

      <SaleInvoice v-model="invoiceOpen" :name="t.name" />
      <TraderPricesDialog v-model="pricesOpen" :trader="t" />
      <ConfirmDialog v-model="askRenew" title="تعمل رابط جديد؟" confirm="رابط جديد" text="الرابط القديم ما عاد يفتح، ولازم تبعتله الجديد." @confirm="doRenew" />
      <ConfirmDialog v-model="askCode" title="تعمل كود دخول جديد؟" confirm="كود جديد" text="الكود القديم ما عاد يشتغل، ولازم تبعتله الجديد." @confirm="doCode" />
      <PayDialog v-model="payOpen" :trader="t" />
      <TraderForm v-model="formOpen" :trader="t" @saved="onSaved" @deleted="onDeleted" />
    </template>
  </div>
</template>

<style scoped>
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; }
.crumb a:hover { text-decoration: underline; text-underline-offset: 3px; }
.crumb :deep(svg) { width: 15px; height: 15px; }
.hello h1 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hello p { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.hello p :deep(svg) { width: 15px; height: 15px; }
.figs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.fig { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px 16px;
  background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; animation: fig-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.fig::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.fig > * { position: relative; z-index: 1; }
.fig.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); }
.fig.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); }
.fig.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.fh { display: flex; justify-content: space-between; align-items: center; color: var(--fg); }
.fh small { color: var(--color-muted); font-size: 12px; }
.fh :deep(svg) { width: 20px; height: 20px; }
.fig b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; }
.fig b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.fbar { height: 6px; border-radius: 3px; background: rgb(11 59 69 / .08); overflow: hidden; }
.fbar i { display: block; height: 100%; border-radius: 3px; background: var(--fg); transition: width .6s cubic-bezier(.2, .9, .25, 1); animation: fbar-in .9s cubic-bezier(.2, .9, .25, 1) .3s both; }
@keyframes fbar-in { from { width: 0; } }
.fsub { font-size: 11.5px; color: var(--color-muted); }
@keyframes fig-in { from { opacity: 0; transform: translateY(10px); } }
.card { min-width: 0; }
.ch { flex-wrap: wrap; }
.segs { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: rgb(11 59 69 / .07); }
.segs button { border: 0; background: none; font: inherit; font-size: 12.5px; color: var(--color-muted); height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; }
.segs button.on { background: #fff; color: var(--color-primary-ink); font-weight: 600; }
.stmt-wrap { overflow-x: auto; }
.stmt { width: 100%; min-width: 560px; border-collapse: separate; border-spacing: 0 5px; }
.stmt th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 2px 12px; white-space: nowrap; }
.stmt td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.stmt td:first-child { border-start-start-radius: 10px; border-end-start-radius: 10px; }
.stmt td:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.kc { width: 1%; }
.k { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; }
.k :deep(svg) { width: 15px; height: 15px; }
.k.buy { background: #ffefe9; color: #c2410c; }
.k.pay { background: var(--pos-bg); color: var(--color-positive); }
.t b { display: block; font-weight: 600; }
.t small { color: var(--color-muted); font-size: 11.5px; }
.inc { color: var(--color-negative); font-weight: 700; }
.outp { color: var(--color-positive); font-weight: 700; }
.bal { font-weight: 700; color: var(--color-deep); }
.none { text-align: center; color: var(--color-muted); font-size: 13px; padding: 16px; }
.side { display: grid; gap: 16px; align-content: start; }
.age { display: grid; gap: 14px; }
.track { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; height: 10px; margin-top: 26px; }
.track i { border-radius: 3px; opacity: .35; }
.track i:first-child { border-start-start-radius: 6px; border-end-start-radius: 6px; } .track i:last-of-type { border-start-end-radius: 6px; border-end-end-radius: 6px; }
.track i.on { opacity: 1; }
.b0 { --c: #2dd4bf; } .b1 { --c: #e0a33a; } .b2 { --c: #f97362; } .b3 { --c: #c4242a; }
.track i { background: var(--c); }
.pin { position: absolute; top: -6px; bottom: -6px; width: 4px; margin-inline-start: -2px; border-radius: 2px; background: var(--color-deep); box-shadow: 0 0 0 2px #fff; transition: inset-inline-start .5s cubic-bezier(.2, .9, .25, 1); }
.pin b { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11.5px; font-weight: 700; color: #fff; background: var(--color-deep); border-radius: 6px; padding: 1px 7px; }
.ages { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.ages li { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: 10px; font-size: 13px; color: var(--color-muted); }
.ages .dot { width: 10px; height: 10px; border-radius: 3px; background: var(--c); opacity: .45; flex: none; }
.ages .l { flex: 1; }
.ages b { font-weight: 600; }
.ages li.on { background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--color-ink); }
.ages li.on .dot { opacity: 1; }
.ages li.on b { color: var(--color-deep); font-weight: 700; }
.ages li.on.b2 b, .ages li.on.b3 b { color: var(--color-negative); }
.clear { margin: 0; color: var(--color-positive); font-size: 13px; }
.info dl { margin: 0; display: grid; gap: 8px; }
.info dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; border-bottom: 1px dashed var(--color-line); padding-bottom: 8px; }
.info dl div:last-child { border: 0; padding: 0; }
.info dt { color: var(--color-muted); }
.info dd { margin: 0; font-weight: 600; }
.info dd.late { color: var(--color-negative); }
.pmeta { margin: 0 0 10px; font-size: 12.5px; color: var(--color-muted); }
.tprice ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.tprice li { display: flex; align-items: center; gap: 6px; background: #f6f9f9; border-radius: 10px; padding: 7px 10px; font-size: 12.5px; min-width: 0; }
.tprice li span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-muted); }
.tprice li b { font-weight: 700; color: var(--color-deep); } .tprice li b small { font-weight: 500; color: var(--color-muted); }
.tprice li.own { background: var(--color-primary-pale); } .tprice li.own span { color: var(--color-primary-ink); font-weight: 600; }
.tprice li em { font-style: normal; font-size: 10.5px; font-weight: 700; color: var(--color-primary-ink); }
.acc .ch :deep(svg) { width: 19px; height: 19px; color: var(--color-primary); }
.linkbox { background: #f6f9f9; border-radius: 10px; padding: 8px 10px; font-size: 12px; color: var(--color-primary-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.code { display: flex; align-items: center; gap: 10px; margin: 8px 0 10px; font-size: 13px; color: var(--color-muted); }
.code b { font-size: 20px; letter-spacing: 4px; color: var(--color-deep); }
.eye { margin-inline-start: auto; border: 0; background: none; color: var(--color-primary-ink); font: inherit; font-size: 12.5px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.accbtns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .accbtns :deep(.sbt) { width: 100%; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.trader .grid > * { min-width: 0; }
@media (max-width: 900px) { .figs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media print { .actions, .crumb, .segs { display: none; } }
</style>
