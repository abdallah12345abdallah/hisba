<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AGENCY, fmt } from '../data/demo.js'
import { findByToken, capitalOf, statementOf, split, profitProjected, profitsTaken, TERMS, YEAR } from '../data/investors.js'

// What a shareholder sees from his link: his capital, the expected share this year, past profits and the statement. Read only.
const route = useRoute()
const x = computed(() => findByToken(route.params.token))
const P = profitProjected()
const mine = computed(() => split(P).rows.find((r) => r.x === x.value))
const rows = computed(() => (x.value ? statementOf(x.value) : []))
const printIt = () => window.print()
</script>

<template>
  <div class="share" dir="rtl">
    <main v-if="x" class="paper">
      <header>
        <img :src="AGENCY.logo || '/logo-mark.png'" alt="" width="64" class="alogo" />
        <div><small>{{ AGENCY.name }} · {{ AGENCY.place }}</small><h1>حساب {{ x.name }}</h1></div>
        <button type="button" class="pr" @click="printIt">طباعة</button>
      </header>
      <div class="sum">
        <div><span>رأس مالك</span><b class="num">{{ fmt(capitalOf(x)) }} ج</b></div>
        <div><span>حصتك من ربح {{ YEAR }}</span><b class="num">{{ mine.pct.toFixed(1) }}%</b></div>
        <div class="g"><span>المتوقع لك آخر السنة</span><b class="num">~ {{ fmt(mine.get) }} ج</b></div>
        <div><span>أرباح استلمتها</span><b class="num">{{ fmt(profitsTaken(x)) }} ج</b></div>
      </div>
      <p class="terms">شروطك: {{ TERMS[x.terms].long }}. التوزيع كل 1/1، والمتوقع بيتغيّر مع ربح الشهور الجاية.</p>
      <table>
        <thead><tr><th>البيان</th><th>التاريخ</th><th>داخل</th><th>انسحب</th><th>أرباح</th></tr></thead>
        <tbody>
          <tr v-for="(l, i) in rows" :key="i">
            <td><b>{{ l.title }}</b><small v-if="l.kind === 'profit'">{{ l.how === 'reinvest' ? 'انضافت لرأس المال' : 'استلمتها' }}</small></td>
            <td class="num">{{ l.date }}</td>
            <td class="num in">{{ l.kind === 'in' ? fmt(l.amount) : '' }}</td>
            <td class="num out">{{ l.kind === 'out' ? fmt(-l.amount) : '' }}</td>
            <td class="num pf">{{ l.kind === 'profit' ? fmt(l.amount) : '' }}</td>
          </tr>
        </tbody>
      </table>
      <p class="foot">هالصفحة للقراءة بس. لأي استفسار تواصل مع الإدارة.</p>
    </main>
    <main v-else class="paper none"><h1>الرابط مش شغّال</h1><p>يمكن الإدارة غيّرته. اطلب رابط جديد.</p></main>
  </div>
</template>

<style scoped>
.share { min-height: 100vh; background: #eef5f5; padding: 24px 12px; }
.paper { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 20px 50px -30px rgb(11 59 69 / .5); }
header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
header div { flex: 1; } header small { color: var(--color-muted); font-size: 12.5px; } header h1 { margin: 0; font-size: 22px; }
.pr { border: 0; height: 38px; padding: 0 16px; border-radius: 10px; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-weight: 600; cursor: pointer; }
.sum { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.sum div { background: #eaf6f8; border-radius: 14px; padding: 12px 16px; display: grid; } .sum span { color: var(--color-muted); font-size: 12.5px; } .sum b { font-size: 22px; color: var(--color-primary-ink); }
.sum .g { background: #e7f6ed; } .sum .g b { color: var(--color-positive); }
.terms { color: var(--color-muted); font-size: 12.5px; margin: 12px 0 14px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); font-size: 12px; padding: 8px; border-bottom: 1px solid var(--color-line); }
td { padding: 10px 8px; border-bottom: 1px dashed var(--color-line); vertical-align: top; }
td b { display: block; font-weight: 600; } td small { color: var(--color-muted); font-size: 11.5px; }
.in { color: var(--color-primary-ink); font-weight: 700; } .out { color: var(--color-negative); font-weight: 700; } .pf { color: var(--color-positive); font-weight: 700; }
.foot { color: var(--color-muted); font-size: 12px; text-align: center; margin: 16px 0 0; }
.none { text-align: center; }
@media (max-width: 520px) { .sum { grid-template-columns: 1fr; } }
@media print { .share { background: #fff; padding: 0; } .paper { box-shadow: none; } .pr { display: none; } }
.alogo { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; }
</style>
