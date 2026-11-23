<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AGENCY, fmt } from '../data/demo.js'
import { findByToken, statementOf } from '../data/suppliers.js'

// The read-only statement a farm opens from its link — no sign-in, no sidebar, nothing it could change.
const route = useRoute()
const s = computed(() => findByToken(route.params.token))
const side = (b) => (b > 0 ? 'لك عندنا' : b < 0 ? 'عليك' : 'خالص')
const rows = computed(() => (s.value ? statementOf(s.value) : []))
const printIt = () => window.print()
</script>

<template>
  <div class="share" dir="rtl">
    <main v-if="s" class="paper">
      <header>
        <img :src="AGENCY.logo || '/logo-mark.png'" alt="" width="64" class="alogo" />
        <div><small>{{ AGENCY.name }} · {{ AGENCY.place }}</small><h1>كشف حساب {{ s.name }}</h1></div>
        <button type="button" class="pr" @click="printIt">طباعة</button>
      </header>
      <div class="bal" :class="{ adv: s.balance < 0 }"><span>{{ side(s.balance) }}</span><b class="num">{{ fmt(Math.abs(s.balance)) }} ج</b></div>
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
      <p class="foot">هالكشف للقراءة بس. لأي استفسار تواصل مع الوكالة.</p>
    </main>
    <main v-else class="paper none"><h1>الرابط مش شغّال</h1><p>يمكن الوكالة غيّرته. اطلب رابط جديد.</p></main>
  </div>
</template>

<style scoped>
.share { min-height: 100vh; background: #eef5f5; padding: 24px 12px; }
.paper { max-width: 760px; margin: 0 auto; background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 20px 50px -30px rgb(11 59 69 / .5); }
header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
header img { flex: none; }
header div { flex: 1; } header small { color: var(--color-muted); font-size: 12.5px; } header h1 { margin: 0; font-size: 22px; }
.pr { border: 0; height: 38px; padding: 0 16px; border-radius: 10px; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-weight: 600; cursor: pointer; }
.bal { display: flex; justify-content: space-between; align-items: baseline; background: #eaf6f8; border-radius: 14px; padding: 14px 18px; margin-bottom: 16px; }
.bal span { color: var(--color-muted); } .bal b { font-size: 28px; color: var(--color-primary-ink); }
.bal.adv { background: #fff1ef; } .bal.adv b { color: var(--color-negative); }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); font-size: 12px; padding: 8px; border-bottom: 1px solid var(--color-line); }
td { padding: 10px 8px; border-bottom: 1px dashed var(--color-line); vertical-align: top; }
td b { display: block; font-weight: 600; } td small { color: var(--color-muted); font-size: 11.5px; }
.in { color: var(--color-primary-ink); font-weight: 700; } .out { color: #b4532a; font-weight: 700; }
.foot { color: var(--color-muted); font-size: 12px; text-align: center; margin: 16px 0 0; }
.none { text-align: center; }
@media print { .share { background: #fff; padding: 0; } .paper { box-shadow: none; } .pr { display: none; } }
.alogo { width: 64px; height: 64px; object-fit: contain; border-radius: 12px; }
</style>
