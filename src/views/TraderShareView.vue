<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import CodeGate from '../components/portal/CodeGate.vue'
import { AGENCY, TODAY, fmt } from '../data/demo.js'
import { findTraderByToken, statementOf, saleInvoice, cycleOf, isLate, lateBy } from '../data/traders.js'
import { isUnlocked, portalSignOut } from '../data/portal.js'

// A trader's own page (his link, or phone + code from the login screen): what he owes, today's invoice, his statement.
// Read-only; he sees nothing of anyone else.
const route = useRoute()
const router = useRouter()
const t = computed(() => findTraderByToken(route.params.token))
const open = computed(() => t.value && isUnlocked('trader', t.value.token))
const inv = computed(() => (t.value ? saleInvoice(t.value.name) : null))
const rows = computed(() => (t.value ? statementOf(t.value) : []))
const printIt = () => window.print()
function out() { portalSignOut(); router.replace('/login') }
</script>

<template>
  <div class="share" dir="rtl">
    <main v-if="!t" class="paper none"><h1>الرابط مش شغّال</h1><p>يمكن الوكالة غيّرته. اطلب رابط جديد، أو ادخل برقم تلفونك والكود.</p><RouterLink to="/login" class="pr">صفحة الدخول</RouterLink></main>
    <CodeGate v-else-if="!open" kind="trader" :rec="t" />
    <main v-else class="paper">
      <header>
        <span class="gl"><img :src="AGENCY.logo || '/logo-full.webp'" alt="" :class="{ own: AGENCY.logo }" /></span>
        <div><small>{{ AGENCY.name }} · {{ AGENCY.place }}</small><h1>حساب {{ t.name }}</h1></div>
        <button type="button" class="pr" @click="printIt"><AppIcon name="print" />طباعة</button>
        <button type="button" class="pr ghost" @click="out"><AppIcon name="logout" />خروج</button>
      </header>

      <div class="bal" :class="{ clear: !t.due, late: isLate(t) }">
        <span><small>المطلوب منك</small><b class="num">{{ fmt(t.due) }} ج</b></span>
        <span class="meta"><small>التحصيل {{ cycleOf(t).label }}</small><em v-if="isLate(t)" class="num">متأخر {{ lateBy(t) }} يوم</em><em v-else-if="!t.due" class="ok">حسابك خالص</em><em v-else class="num">من حد {{ fmt(t.limit) }} ج</em></span>
      </div>

      <section v-if="inv && inv.rows.length" class="blk">
        <h2>فاتورة اليوم <span class="num">#{{ inv.no }} · {{ TODAY }}</span></h2>
        <div class="twrap">
          <table>
            <thead><tr><th>الصنف</th><th>بوكس</th><th>كيلو</th><th>سعر الكيلو</th><th>القيمة</th></tr></thead>
            <tbody><tr v-for="r in inv.rows" :key="r.id"><td><b>{{ r.grade }}</b></td><td class="num">{{ r.boxes }}</td><td class="num">{{ fmt(r.kg) }}</td><td class="num">{{ r.price }}</td><td class="num">{{ fmt(r.total) }}<i v-if="r.pay === 'cash'" class="cashp">نقدي</i></td></tr></tbody>
          </table>
        </div>
        <dl>
          <div><dt>الإجمالي</dt><dd class="num">{{ fmt(inv.total) }} ج</dd></div>
          <div v-if="inv.cash"><dt>دفعت نقدي</dt><dd class="num">{{ fmt(inv.cash) }} ج</dd></div>
          <div v-if="inv.credit"><dt>انضاف على حسابك</dt><dd class="num">{{ fmt(inv.credit) }} ج</dd></div>
        </dl>
      </section>

      <section class="blk">
        <h2>كشف الحساب</h2>
        <div class="twrap">
          <table>
            <thead><tr><th>البيان</th><th>التاريخ</th><th>عليك</th><th>دفعت</th><th>الرصيد</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in rows" :key="i">
                <td><b>{{ e.title }}</b><small class="num">{{ e.sub }}</small></td>
                <td>{{ e.date }}</td>
                <td class="num in">{{ e.kind === 'buy' ? fmt(e.amount) : '' }}</td>
                <td class="num out">{{ e.kind === 'pay' ? fmt(e.amount) : '' }}</td>
                <td class="num">{{ fmt(e.after) }}</td>
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
.bal { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; background: linear-gradient(150deg, #dbeff5, #fff 85%); border-radius: 16px; padding: 14px 18px; }
.bal small { display: block; color: var(--color-muted); font-size: 12.5px; } .bal b { font-size: 30px; color: var(--color-primary-ink); }
.bal.late { background: linear-gradient(150deg, #fff4dc, #fff 85%); } .bal.clear { background: linear-gradient(150deg, #dcf5e6, #fff 85%); } .bal.clear b { color: var(--color-positive); }
.meta { text-align: left; } .meta em { font-style: normal; font-size: 13px; font-weight: 600; color: var(--color-deep); } .bal.late .meta em { color: var(--warn-ink); } .meta em.ok { color: var(--color-positive); }
.blk h2 { margin: 0 0 8px; font-size: 15.5px; } .blk h2 span { font-size: 12px; font-weight: 500; color: var(--color-muted); }
.twrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 460px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); font-size: 12px; padding: 8px; border-bottom: 1px solid var(--color-line); white-space: nowrap; }
td { padding: 9px 8px; border-bottom: 1px dashed var(--color-line); vertical-align: top; white-space: nowrap; }
td b { display: block; font-weight: 600; } td small { color: var(--color-muted); font-size: 11.5px; }
.in { color: var(--color-negative); font-weight: 700; } .out { color: var(--color-positive); font-weight: 700; }
.cashp { font-style: normal; font-size: 10.5px; margin-inline-start: 6px; padding: 1px 6px; border-radius: 999px; background: var(--pos-bg); color: var(--pos-ink); }
dl { margin: 10px 0 0; display: grid; gap: 4px; font-size: 13.5px; max-width: 320px; margin-inline-start: auto; } dl div { display: flex; justify-content: space-between; } dd { margin: 0; font-weight: 700; }
.foot { color: var(--color-muted); font-size: 12px; text-align: center; margin: 0; }
.none { text-align: center; justify-items: center; }
@media print { .share { background: #fff; padding: 0; } .paper { box-shadow: none; } .pr { display: none; } }
</style>
