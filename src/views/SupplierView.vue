<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PayOutDialog from '../components/suppliers/PayOutDialog.vue'
import SupplierForm from '../components/suppliers/SupplierForm.vue'
import { fmt } from '../data/demo.js'
import { findSupplier, statementOf, feedOf, manifestsOf, netOf, shareUrl } from '../data/suppliers.js'
import { toast } from '../composables/useToast.js'

// One farm's account — same layout as a trader's page: figures, statement table with a filter, today's manifests, feed on credit,
// the farm's details, and the actions (statement link, WhatsApp, print, advance, payment).
const route = useRoute()
const router = useRouter()
const s = computed(() => findSupplier(route.params.id))
const side = (b) => (b > 0 ? 'له' : b < 0 ? 'عليه' : 'خالص')
const feed = computed(() => s.value && feedOf(s.value))
const today = computed(() => (s.value ? manifestsOf(s.value) : []))
const todayNet = computed(() => today.value.filter((m) => m.status === 'approved').reduce((a, m) => a + netOf(m), 0))

const figs = computed(() => {
  const x = s.value
  const owe = x.balance >= 0
  const net = today.value.filter((m) => m.status === 'approved').reduce((a, m) => a + netOf(m), 0)
  return [
    { label: owe ? 'له علينا' : 'عليه سلفة', icon: owe ? 'out' : 'in', value: fmt(Math.abs(x.balance)), unit: 'ج', tone: owe ? 'teal' : 'red', bar: 100, sub: owe ? 'صافي بيعه بعد العمولة وبعد اللي انصرفله' : 'بتنخصم من أول بيانات جاية' },
    { label: 'علف آجل', icon: 'feed', value: feed.value ? fmt(feed.value.amount) : '—', unit: feed.value ? 'ج' : '', tone: 'amber', bar: feed.value ? Math.max(4, 100 - (feed.value.daysLeft / 240) * 100) : 0, sub: feed.value ? `تسوية ${feed.value.due} · بعد ${feed.value.daysLeft} يوم` : 'ما عنده علف آجل' },
    { label: 'بيانات اليوم', icon: 'sheet', value: today.value.length, unit: today.value.length === 1 ? 'بيان' : 'بيانات', tone: 'green', bar: today.value.length ? (today.value.filter((m) => m.status === 'approved').length / today.value.length) * 100 : 0, sub: net ? `صافيها المعتمد ${fmt(net)} ج` : 'لسا ما في بيان معتمد اليوم' },
    { label: 'العمولة', icon: 'share', value: `${x.rate}%`, tone: 'teal', bar: (x.rate / 10) * 100, sub: `التقييم ${'★'.repeat(x.rating)}` },
  ]
})

/* statement + filter */
const seg = ref('all')
const SEGS = [{ value: 'all', label: 'الكل' }, { value: 'sale', label: 'البيانات' }, { value: 'pay', label: 'الدفعات' }, { value: 'adv', label: 'السلف' }]
const rows = computed(() => (s.value ? statementOf(s.value).filter((e) => seg.value === 'all' || e.kind === seg.value) : []))
const KIND = { sale: { icon: 'in', label: 'بيان' }, pay: { icon: 'out', label: 'دفعة' }, adv: { icon: 'out', label: 'سلفة' }, feed: { icon: 'feed', label: 'تسوية علف' } }

/* actions */
const payOpen = ref(false)
const payKind = ref('pay')
function money(kind) { payKind.value = kind; payOpen.value = true }
const formOpen = ref(false)
function printIt() { window.print() }
function onDeleted() { router.push('/suppliers') }
async function copyLink() {
  const url = shareUrl(s.value)
  try { await navigator.clipboard.writeText(url); toast('انسخ رابط الكشف', `ابعته لـ${s.value.name}، بيشوف بياناته وفواتيره بدون حساب`) }
  catch { window.prompt('انسخ الرابط:', url) }
}
function whatsapp() {
  const x = s.value
  const text = `السلام عليكم ${x.name}\nرصيدك عندنا: ${fmt(Math.abs(x.balance))} ج ${side(x.balance)}\nكشف حسابك وفواتيرك على الرابط:\n${shareUrl(x)}`
  window.open(`https://wa.me/2${x.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
}
</script>

<template>
  <div class="page supplier">
    <EmptyState v-if="!s" icon="search" title="ما لقينا هالمورد" text="يمكن انمسح.">
      <SoftButton tone="primary" icon="back" @click="router.push('/suppliers')">رجوع للموردين</SoftButton>
    </EmptyState>

    <template v-else>
      <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/suppliers">الموردين</RouterLink><AppIcon name="next" /><span>{{ s.name }}</span></nav>
      <header class="dhead">
        <div class="hello">
          <h1>{{ s.name }}
            <StatusPill :tone="s.balance > 0 ? 'info' : s.balance < 0 ? 'bad' : 'ok'">{{ side(s.balance) }}</StatusPill>
          </h1>
          <p class="num"><AppIcon name="phone" />{{ s.phone }} · {{ s.place }} · <span class="stars">{{ '★'.repeat(s.rating) }}<i>{{ '★'.repeat(5 - s.rating) }}</i></span></p>
        </div>
        <div class="actions">
          <SoftButton icon="link" @click="copyLink">رابط الكشف</SoftButton>
          <SoftButton icon="whatsapp" @click="whatsapp">واتساب</SoftButton>
          <SoftButton icon="print" @click="printIt">طباعة</SoftButton>
          <SoftButton @click="money('adv')">سلفة</SoftButton>
          <SoftButton icon="cash" tone="ok" @click="money('pay')">صرف دفعة</SoftButton>
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
              <thead><tr><th><span class="sr">النوع</span></th><th>البيان</th><th>التاريخ</th><th>له</th><th>انصرف</th><th>الرصيد</th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="(e, i) in rows" :key="e.title + e.date + e.amount + i">
                  <td class="kc"><span class="k" :class="e.kind" :title="KIND[e.kind].label"><AppIcon :name="KIND[e.kind].icon" /></span></td>
                  <td class="t"><b>{{ e.title }}</b><small class="num">{{ e.sub }}</small></td>
                  <td>{{ e.date }}</td>
                  <td class="num inc">{{ e.kind === 'sale' ? fmt(e.amount) : '' }}</td>
                  <td class="num outp">{{ e.kind !== 'sale' ? fmt(e.amount) : '' }}</td>
                  <td class="num bal" :class="{ adv: e.after < 0 }">{{ fmt(Math.abs(e.after)) }} <small>{{ side(e.after) }}</small></td>
                </tr>
              </TransitionGroup>
            </table>
            <p v-if="!rows.length" class="none">ما في حركات من هالنوع.</p>
          </div>
        </section>

        <div class="s4 side">
          <section class="card">
            <div class="ch"><h2>بيانات اليوم</h2><span v-if="todayNet" class="meta num">صافيها {{ fmt(todayNet) }} ج</span></div>
            <ul v-if="today.length" class="mlist">
              <li v-for="m in today" :key="m.id" :class="m.status">
                <div class="mh">
                  <span class="time num"><AppIcon name="clock" />وصل {{ m.time }}</span>
                  <StatusPill :tone="m.status === 'draft' ? 'draft' : 'ok'">{{ m.status === 'draft' ? 'لسا بينباع' : 'معتمد' }}</StatusPill>
                </div>
                <div class="mbar" :aria-label="`انباع ${m.sold} من ${m.boxes} بوكس`"><i :style="{ width: (m.sold / m.boxes) * 100 + '%' }" /></div>
                <div class="mcount num"><span>{{ m.sold }} من {{ m.boxes }} بوكس</span><span v-if="m.boxes - m.sold">باقي {{ m.boxes - m.sold }}</span><span v-else>كلها انباعت</span></div>
                <dl v-if="m.status !== 'draft'" class="mmoney">
                  <div><dt>إجمالي البيع</dt><dd class="num">{{ fmt(m.gross) }}</dd></div>
                  <div><dt>عمولة {{ m.rate }}%</dt><dd class="num c">− {{ fmt(m.commission) }}</dd></div>
                  <div class="net"><dt>الصافي له</dt><dd class="num">{{ fmt(netOf(m)) }}</dd></div>
                </dl>
                <RouterLink v-else :to="`/sheet/${m.id}`" class="go"><AppIcon name="sheet" />كمّل البيع بالشيت</RouterLink>
              </li>
            </ul>
            <div v-else class="empty"><AppIcon name="truck" /><span>ما وصل منه بيان اليوم.</span></div>
          </section>
          <section v-if="feed" class="card feedc">
            <div class="ch"><h2>العلف الآجل</h2><RouterLink :to="`/feed/${encodeURIComponent(s.name)}`">التفاصيل</RouterLink></div>
            <b class="num">{{ fmt(feed.amount) }} ج</b>
            <p class="num">التسوية {{ feed.due }} · بعد <strong>{{ feed.daysLeft }} يوم</strong>. الزيادة بتنضاف إشعار إضافة وقت التسوية.</p>
          </section>
          <section class="card info">
            <div class="ch"><h2>بيانات المورد</h2><SoftButton size="sm" icon="edit" @click="formOpen = true">تعديل</SoftButton></div>
            <dl>
              <div><dt>المكان</dt><dd>{{ s.place || '—' }}</dd></div>
              <div><dt>التلفون</dt><dd class="num">{{ s.phone }}</dd></div>
              <div><dt>العمولة</dt><dd class="num">{{ s.rate }}%</dd></div>
              <div><dt>التقييم</dt><dd><span class="stars">{{ '★'.repeat(s.rating) }}<i>{{ '★'.repeat(5 - s.rating) }}</i></span></dd></div>
            </dl>
          </section>
        </div>
      </div>

      <PayOutDialog v-model="payOpen" :supplier="s" :kind="payKind" />
      <SupplierForm v-model="formOpen" :supplier="s" @deleted="onDeleted" />
    </template>
  </div>
</template>

<style scoped>
.supplier .grid > * { min-width: 0; }
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; } .crumb a:hover { text-decoration: underline; text-underline-offset: 3px; }
.crumb :deep(svg) { width: 15px; height: 15px; }
.hello h1 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.hello p { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; } .hello p :deep(svg) { width: 15px; height: 15px; }
.stars { color: #e0a33a; letter-spacing: 1px; } .stars i { font-style: normal; color: #d5dede; }
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
.stmt { width: 100%; min-width: 580px; border-collapse: separate; border-spacing: 0 5px; }
.stmt th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 2px 12px; white-space: nowrap; }
.stmt td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.stmt td:first-child { border-start-start-radius: 10px; border-end-start-radius: 10px; } .stmt td:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.kc { width: 1%; }
.k { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; } .k :deep(svg) { width: 15px; height: 15px; }
.k.sale { background: #e3f3f6; color: var(--color-primary); } .k.pay { background: var(--pos-bg); color: var(--color-positive); } .k.adv { background: #fff4dc; color: #b07a12; }
.k.feed { background: #fdf1dc; color: #8a5a00; }
.t b { display: block; font-weight: 600; } .t small { color: var(--color-muted); font-size: 11.5px; }
.inc { color: var(--color-primary-ink); font-weight: 700; } .outp { color: #b4532a; font-weight: 700; }
.bal { font-weight: 700; color: var(--color-deep); } .bal small { font-size: 11px; color: var(--color-muted); font-weight: 500; } .bal.adv { color: var(--color-negative); }
.none { text-align: center; color: var(--color-muted); font-size: 13px; padding: 12px; margin: 0; }
.side { display: grid; gap: 16px; align-content: start; }
.mlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.mlist li { background: #fff; border-radius: 14px; padding: 12px 14px; display: grid; gap: 8px; border: 1px solid #e6eeee; }
.mh { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.time { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; }
.time :deep(svg) { width: 16px; height: 16px; color: var(--color-primary); }
.mbar { height: 8px; border-radius: 4px; background: #e8efef; overflow: hidden; }
.mbar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #2dd4bf, var(--color-primary)); transition: width .6s cubic-bezier(.2, .9, .25, 1); }
.draft .mbar i { background: repeating-linear-gradient(135deg, #f5b04f 0 6px, #f8c77d 6px 12px); }
.mcount { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-muted); }
.mmoney { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.mmoney div { background: #f5f9f9; border-radius: 10px; padding: 6px 10px; }
.mmoney dt { color: var(--color-muted); font-size: 11px; }
.mmoney dd { margin: 0; font-weight: 700; font-size: 14px; }
.mmoney dd.c { color: #b4532a; }
.mmoney .net { background: #e6f4f7; } .mmoney .net dd { color: var(--color-primary-ink); }
.mlist .go { display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border-radius: 10px; background: var(--color-primary); color: #fff; font-weight: 600; font-size: 13px; text-decoration: none; transition: background .15s; }
.mlist .go:hover { background: var(--color-primary-ink); }
.mlist .go :deep(svg) { width: 16px; height: 16px; }
.empty { display: flex; align-items: center; gap: 10px; color: var(--color-muted); font-size: 13px; background: #f6f9f9; border-radius: 12px; padding: 12px 14px; }
.empty :deep(svg) { width: 22px; height: 22px; color: #9fbfc3; }
.feedc > b { font-size: 24px; color: #8a5a00; } .feedc p { margin: 4px 0 0; color: var(--color-muted); font-size: 12.5px; line-height: 1.8; } .feedc strong { color: #8a5a00; }
.info dl { margin: 0; display: grid; gap: 8px; }
.info dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; border-bottom: 1px dashed var(--color-line); padding-bottom: 8px; }
.info dl div:last-child { border: 0; padding: 0; } .info dt { color: var(--color-muted); } .info dd { margin: 0; font-weight: 600; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) { .figs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media print { .actions, .crumb, .segs { display: none; } }
</style>
