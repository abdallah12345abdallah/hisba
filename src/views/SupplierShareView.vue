<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import CodeGate from '../components/portal/CodeGate.vue'
import { AGENCY, fmt } from '../data/demo.js'
import { findByToken, statementOf, manifestsOf, netOf } from '../data/suppliers.js'
import { invoiceRows } from '../data/sheet.js'
import { isUnlocked, portalSignOut } from '../data/portal.js'

// A farm's own page (its link, or phone + code from the login screen): its balance, today's purchase invoices, its statement.
// Read-only; it sees nothing of anyone else.
const route = useRoute()
const router = useRouter()
const s = computed(() => findByToken(route.params.token))
const open = computed(() => s.value && isUnlocked('supplier', s.value.token))
const side = (b) => (b > 0 ? 'لك عندنا' : b < 0 ? 'عليك' : 'خالص')
const rows = computed(() => (s.value ? statementOf(s.value) : []))
const invoices = computed(() => (s.value ? manifestsOf(s.value).filter((m) => m.status === 'approved') : []))
const shown = ref(null)
const printIt = () => window.print()
function out() { portalSignOut(); router.replace('/login') }
</script>

<template>
  <div class="share" dir="rtl">
    <main v-if="!s" class="paper none"><h1>الرابط مش شغّال</h1><p>يمكن الوكالة غيّرته. اطلب رابط جديد، أو ادخل برقم تلفونك والكود.</p><RouterLink to="/login" class="pr">صفحة الدخول</RouterLink></main>
    <CodeGate v-else-if="!open" kind="supplier" :rec="s" />
    <main v-else class="paper">
      <header>
        <span class="gl"><img :src="AGENCY.logo || '/logo-full.webp'" alt="" :class="{ own: AGENCY.logo }" /></span>
        <div><small>{{ AGENCY.name }} · {{ AGENCY.place }}</small><h1>كشف حساب {{ s.name }}</h1></div>
        <button type="button" class="pr" @click="printIt"><AppIcon name="print" />طباعة</button>
        <button type="button" class="pr ghost" @click="out"><AppIcon name="logout" />خروج</button>
      </header>
      <div class="bal" :class="{ adv: s.balance < 0 }"><span>{{ side(s.balance) }}</span><b class="num">{{ fmt(Math.abs(s.balance)) }} ج</b></div>

      <section v-if="invoices.length" class="blk">
        <h2>فواتير اليوم</h2>
        <ul class="invs">
          <li v-for="m in invoices" :key="m.id" :class="{ on: shown === m.id }">
            <button type="button" class="ih" :aria-expanded="shown === m.id" @click="shown = shown === m.id ? null : m.id">
              <span class="num">#{{ m.invoiceNo }}</span><span class="num">وصل {{ m.time }} · {{ m.boxes }} بوكس</span><b class="num">{{ fmt(netOf(m)) }} ج</b><AppIcon name="chevron" />
            </button>
            <div v-if="shown === m.id" class="ib">
              <table v-if="invoiceRows(m).length">
                <thead><tr><th>الصنف</th><th>بوكس</th><th>كيلو</th><th>القيمة</th></tr></thead>
                <tbody><tr v-for="r in invoiceRows(m)" :key="r.grade"><td>{{ r.grade }}</td><td class="num">{{ r.boxes }}</td><td class="num">{{ fmt(r.kg) }}</td><td class="num">{{ fmt(r.total) }}</td></tr></tbody>
              </table>
              <dl>
                <div><dt>إجمالي البيع</dt><dd class="num">{{ fmt(m.gross) }}</dd></div>
                <div><dt>العمولة {{ m.rate }}%</dt><dd class="num">− {{ fmt(m.commission) }}</dd></div>
                <div class="t"><dt>الصافي إلك</dt><dd class="num">{{ fmt(netOf(m)) }} ج</dd></div>
              </dl>
            </div>
          </li>
        </ul>
      </section>

      <section class="blk">
        <h2>كشف الحساب</h2>
        <div class="twrap">
          <table>
            <thead><tr><th>البيان</th><th>التاريخ</th><th>لك</th><th>انصرفلك</th><th>الرصيد</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in rows" :key="i">
                <td><b>{{ e.title }}</b><small class="num">{{ e.sub }}</small></td>
                <td>{{ e.date }}</td>
                <td class="num in">{{ e.kind === 'sale' ? fmt(e.amount) : '' }}</td>
                <td class="num out">{{ e.kind !== 'sale' ? fmt(e.amount) : '' }}</td>
                <td class="num">{{ fmt(Math.abs(e.after)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <p class="foot">هالصفحة إلك لحالك وللقراءة بس. لأي استفسار تواصل مع الوكالة{{ AGENCY.phone ? ` على ${AGENCY.phone}` : '' }}.</p>
    </main>
  </div>
</template>

<style scoped>
.share { min-height: 100vh; min-height: 100dvh; background: linear-gradient(170deg, #dcefee, #eef5f5 40%); padding: 24px 12px; }
.paper { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 22px; box-shadow: 0 20px 50px -30px rgb(11 59 69 / .5); display: grid; gap: 16px; }
header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.gl { width: 78px; height: 50px; border-radius: 12px; background: linear-gradient(150deg, #0e7490, #0b5870); display: grid; place-items: center; flex: none; }
.gl img { width: 64px; height: auto; } .gl img.own { width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 8px; }
header div { flex: 1; min-width: 160px; } header small { color: var(--color-muted); font-size: 12.5px; } header h1 { margin: 0; font-size: 21px; }
.pr { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid #9fd0dc; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
.pr:hover { border-color: var(--color-primary); } .pr.ghost { background: #fff; } .pr :deep(svg) { width: 16px; height: 16px; }
.bal { display: flex; justify-content: space-between; align-items: baseline; background: linear-gradient(150deg, #dbeff5, #fff 85%); border-radius: 16px; padding: 14px 18px; }
.bal span { color: var(--color-muted); } .bal b { font-size: 30px; color: var(--color-primary-ink); }
.bal.adv { background: linear-gradient(150deg, #ffecea, #fff 85%); } .bal.adv b { color: var(--color-negative); }
.blk h2 { margin: 0 0 8px; font-size: 15.5px; }
.invs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.invs li { border-radius: 12px; box-shadow: 0 0 0 1px #e3eded; overflow: hidden; } .invs li.on { box-shadow: 0 0 0 1.5px var(--color-primary); }
.ih { width: 100%; display: flex; align-items: center; gap: 12px; border: 0; background: #fbfefe; padding: 10px 14px; font: inherit; font-size: 13px; cursor: pointer; text-align: right; }
.ih span:first-child { font-weight: 700; color: var(--color-primary-ink); } .ih span:nth-child(2) { flex: 1; color: var(--color-muted); } .ih b { color: var(--color-deep); }
.ih :deep(svg) { width: 16px; height: 16px; color: var(--color-muted); transition: transform .2s; } li.on .ih :deep(svg) { transform: rotate(180deg); }
.ib { padding: 6px 14px 12px; display: grid; gap: 8px; }
.ib dl { margin: 0; display: grid; gap: 3px; font-size: 13px; } .ib dl div { display: flex; justify-content: space-between; } .ib dd { margin: 0; font-weight: 600; } .ib .t { border-top: 1.5px dashed #c9e2e6; padding-top: 5px; font-size: 14.5px; } .ib .t dd { color: var(--color-primary-ink); font-weight: 700; }
.twrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
.twrap table { min-width: 460px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); font-size: 12px; padding: 8px; border-bottom: 1px solid var(--color-line); white-space: nowrap; }
td { padding: 9px 8px; border-bottom: 1px dashed var(--color-line); vertical-align: top; }
td b { display: block; font-weight: 600; } td small { color: var(--color-muted); font-size: 11.5px; }
.in { color: var(--color-primary-ink); font-weight: 700; } .out { color: #b4532a; font-weight: 700; }
.foot { color: var(--color-muted); font-size: 12px; text-align: center; margin: 0; }
.none { text-align: center; justify-items: center; }
@media print { .share { background: #fff; padding: 0; } .paper { box-shadow: none; } .pr { display: none; } }
</style>
