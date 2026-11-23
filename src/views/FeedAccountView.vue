<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import DeliverDialog from '../components/feed/DeliverDialog.vue'
import SettleDialog from '../components/feed/SettleDialog.vue'
import DebitNote from '../components/feed/DebitNote.vue'
import DeliveryEditDialog from '../components/feed/DeliveryEditDialog.vue'
import DueDialog from '../components/feed/DueDialog.vue'
import { SUPPLIERS, fmt } from '../data/demo.js'
import { feedOfName, removeDelivery, markupOf, SETTLED } from '../data/feed.js'
import { toast } from '../composables/useToast.js'

// One farm's feed account on its own page: figures, every delivery (edit in place / delete), the settlement date,
// this farm's past settlements with their debit notes, and the actions (delivery, settlement, the farm's page).
const route = useRoute()
const router = useRouter()
const name = computed(() => decodeURIComponent(route.params.name || ''))
const f = computed(() => feedOfName(name.value))
const farm = computed(() => SUPPLIERS.find((s) => s.name === name.value))
const history = computed(() => SETTLED.list.filter((s) => s.name === name.value))
const dayTone = (d) => (d <= 14 ? 'bad' : d <= 60 ? 'draft' : 'ok')

const figs = computed(() => {
  const x = f.value
  return [
    { label: 'مفتوح بسعر المصنع', icon: 'feed', tone: 'amber', value: fmt(x.amount), unit: 'ج', sub: `${x.tons} طن · ${x.deliveries.length} توريدات` },
    { label: 'مع زيادة 6%', icon: 'share', tone: 'teal', value: fmt(Math.round(x.amount + markupOf(x, 'pct', 6))), unit: 'ج', sub: `الزيادة ${fmt(Math.round(markupOf(x, 'pct', 6)))} ج` },
    { label: 'اتسوّى منه', icon: 'check', tone: 'green', value: fmt(x.paid), unit: 'ج', sub: x.paid ? 'تسوية جزئية قبل الموعد' : 'لسا ما اتسوّى منه شي' },
    { label: 'التسوية', icon: 'clock', tone: x.daysLeft <= 14 ? 'red' : 'teal', value: x.daysLeft >= 0 ? x.daysLeft : -x.daysLeft, unit: x.daysLeft >= 0 ? 'يوم' : 'يوم تأخير', sub: `بتاريخ ${x.due}` },
  ]
})

/* settlement date and delivery corrections open in dialogs */
const dueOpen = ref(false)
const editOpen = ref(false)
const editFor = ref(null)
function startEdit(d) { editFor.value = d; editOpen.value = true }
const toDelete = ref(null)
const askDelete = ref(false)
function confirmDelete(d) { toDelete.value = d; askDelete.value = true }
function doDelete() {
  const d = toDelete.value
  const undo = removeDelivery(f.value, d)
  toast('انحذف التوريد', `${d.tons} طن ${d.type} · ${d.date}`, { tone: 'info', action: { label: 'تراجع', run: undo } })
}

/* dialogs */
const deliverOpen = ref(false)
const settleOpen = ref(false)
const noteOpen = ref(false)
const note = ref(null)
const noteUndo = ref(null)
const noteFresh = ref(false)
function onSettled({ note: n, undo }) { note.value = n; noteUndo.value = undo; noteFresh.value = true; setTimeout(() => { noteOpen.value = true }, 200) }
function showNote(n) { note.value = n; noteUndo.value = null; noteFresh.value = false; noteOpen.value = true }
const openFarm = () => farm.value && router.push(`/suppliers/${farm.value.id}`)
</script>

<template>
  <div class="page feedacc">
    <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/feed">العلف</RouterLink><AppIcon name="next" /><span>{{ name }}</span></nav>

    <template v-if="f">
      <header class="dhead">
        <div class="hello">
          <h1>علف {{ name }}
            <StatusPill :tone="dayTone(f.daysLeft)">{{ f.daysLeft >= 0 ? `تسوية بعد ${f.daysLeft} يوم` : `متأخرة ${-f.daysLeft} يوم` }}</StatusPill>
          </h1>
          <p class="num">بسعر المصنع · الزيادة بتنضاف إشعار إضافة وقت التسوية</p>
        </div>
        <div class="actions">
          <SoftButton v-if="farm" icon="farm" @click="openFarm">صفحة المزرعة</SoftButton>
          <SoftButton icon="calendar" @click="dueOpen = true">تغيير موعد التسوية</SoftButton>
          <SoftButton icon="plus" @click="deliverOpen = true">توريد علف</SoftButton>
          <SoftButton icon="check" tone="warn" :disabled="!f.amount" @click="settleOpen = true">تسوية</SoftButton>
        </div>
      </header>

      <div class="grid">
        <div class="s12 figs">
          <div v-for="(x, i) in figs" :key="x.label" class="fig" :class="x.tone" :style="{ '--i': i }">
            <span class="fh"><small>{{ x.label }}</small><AppIcon :name="x.icon" /></span>
            <b class="num">{{ x.value }}<span v-if="x.unit">{{ x.unit }}</span></b>
            <span class="fsub num">{{ x.sub }}</span>
          </div>
        </div>

        <section class="s8 card tblcard">
          <div class="ch"><h2>التوريدات</h2><span class="meta num">{{ f.deliveries.length }} · {{ f.tonsAll }} طن</span></div>
          <div class="wrap">
            <table class="tbl">
              <thead><tr><th>التاريخ</th><th>النوع</th><th>طن</th><th>سعر الطن</th><th>القيمة</th><th><span class="sr">إجراءات</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="d in f.deliveries" :key="d.id">
                  <td>{{ d.date }}</td><td>{{ d.type }}</td><td class="num">{{ d.tons }}</td><td class="num">{{ fmt(d.price) }}</td><td class="num v">{{ fmt(d.tons * d.price) }}</td>
                  <td class="ops"><button type="button" class="mini" :aria-label="`تعديل توريد ${d.date}`" @click="startEdit(d)"><AppIcon name="edit" /></button><button type="button" class="mini del" :aria-label="`حذف توريد ${d.date}`" @click="confirmDelete(d)"><AppIcon name="trash" /></button></td>
                </tr>
              </TransitionGroup>
            </table>
            <p v-if="!f.deliveries.length" class="none">ما في توريدات بهالحساب.</p>
          </div>
        </section>

        <section class="s4 card">
          <div class="ch"><h2>تسويات سابقة</h2><span class="meta num">{{ history.length }}</span></div>
          <ul v-if="history.length" class="hist">
            <li v-for="s in history" :key="s.no">
              <span><b class="num">إشعار #{{ s.no }}</b><small class="num">{{ s.date }} · {{ s.tons }} طن{{ s.partial ? ' · جزئية' : '' }}</small></span>
              <span class="r"><b class="num">{{ fmt(s.total) }}</b><button type="button" class="link" @click="showNote(s)">عرض</button></span>
            </li>
          </ul>
          <p v-else class="none">لسا ما اتسوّى شي من علف هالمزرعة.</p>
        </section>
      </div>

      <DeliverDialog v-model="deliverOpen" :farm="name" />
      <SettleDialog v-model="settleOpen" :account="f" @settled="onSettled" />
      <DueDialog v-model="dueOpen" :account="f" />
      <DeliveryEditDialog v-model="editOpen" :delivery="editFor" />
    </template>

    <template v-else>
      <EmptyState icon="feed" :title="`ما في علف مفتوح عند ${name}`" text="اتسوّى كله، أو ما انورّدله علف. فيك تشوف تسوياته السابقة أو تسجّل توريد جديد.">
        <SoftButton tone="primary" icon="plus" @click="deliverOpen = true">توريد علف</SoftButton>
      </EmptyState>
      <section v-if="history.length" class="card past">
        <div class="ch"><h2>تسويات سابقة</h2></div>
        <ul class="hist"><li v-for="s in history" :key="s.no"><span><b class="num">إشعار #{{ s.no }}</b><small class="num">{{ s.date }} · {{ s.tons }} طن</small></span><span class="r"><b class="num">{{ fmt(s.total) }}</b><button type="button" class="link" @click="showNote(s)">عرض</button></span></li></ul>
      </section>
      <DeliverDialog v-model="deliverOpen" :farm="name" />
    </template>

    <DebitNote v-model="noteOpen" :note="note" :undo="noteUndo" :fresh="noteFresh" />
    <ConfirmDialog v-model="askDelete" :title="toDelete ? `تحذف توريد ${toDelete.date}؟` : ''" confirm="احذف التوريد"
      :text="toDelete ? `${toDelete.tons} طن ${toDelete.type} بـ ${fmt(toDelete.tons * toDelete.price)} ج. بينشال من حساب العلف.` : ''" @confirm="doDelete" />
  </div>
</template>

<style scoped>
.feedacc .grid > * { min-width: 0; }
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; } .crumb a:hover { text-decoration: underline; text-underline-offset: 3px; } .crumb :deep(svg) { width: 15px; height: 15px; }
.hello h1 { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.figs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.fig { --bg: #dbeff5; --fg: var(--color-primary); --fg2: var(--color-deep); position: relative; overflow: hidden; border-radius: 18px; padding: 14px 16px 16px;
  background: linear-gradient(150deg, var(--bg), #fff 80%); display: grid; gap: 6px; align-content: start; animation: fig-in .5s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 70ms); }
.fig::after { content: ""; position: absolute; width: 120px; height: 120px; border-radius: 50%; background: var(--bg); inset-inline-start: -40px; top: -50px; opacity: .7; }
.fig > * { position: relative; z-index: 1; }
.fig.red { --bg: #ffecea; --fg: var(--color-negative); --fg2: var(--color-negative); } .fig.green { --bg: #dcf5e6; --fg: var(--color-positive); --fg2: var(--color-positive); } .fig.amber { --bg: #fff4dc; --fg: #b07a12; --fg2: #8a5a00; }
.fh { display: flex; justify-content: space-between; align-items: center; color: var(--fg); } .fh small { color: var(--color-muted); font-size: 12px; } .fh :deep(svg) { width: 20px; height: 20px; }
.fig b { font-size: 26px; font-weight: 700; color: var(--fg2); line-height: 1.2; } .fig b span { font-size: 13px; color: var(--color-muted); font-weight: 500; margin-inline-start: 5px; }
.fsub { font-size: 11.5px; color: var(--color-muted); }
@keyframes fig-in { from { opacity: 0; transform: translateY(10px); } }
.link { justify-self: start; border: 0; background: none; padding: 0; font: inherit; font-size: 12px; font-weight: 600; color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.wrap { overflow-x: auto; }
.tbl { width: 100%; min-width: 560px; border-collapse: separate; border-spacing: 0 5px; }
.tbl th { text-align: right; font-weight: 500; font-size: 12px; color: var(--color-muted); padding: 2px 12px; white-space: nowrap; }
.tbl td { background: #fff; padding: 9px 12px; font-size: 13px; white-space: nowrap; vertical-align: middle; }
.tbl td:first-child { border-start-start-radius: 10px; border-end-start-radius: 10px; } .tbl td:last-child { border-start-end-radius: 10px; border-end-end-radius: 10px; }
.tbl td.v { font-weight: 700; color: #8a5a00; }
.ops { width: 1%; white-space: nowrap; }
.mini { width: 30px; height: 30px; border: 0; border-radius: 8px; background: #f1f6f6; color: var(--color-muted); display: inline-grid; place-items: center; cursor: pointer; margin-inline-start: 4px; }
.mini :deep(svg) { width: 15px; height: 15px; } .mini:hover { background: var(--color-primary-pale); color: var(--color-primary-ink); }
.mini.del:hover { background: var(--neg-bg); color: var(--color-negative); }
.none { margin: 0; padding: 10px; text-align: center; color: var(--color-muted); font-size: 13px; }
.hist { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.hist li { display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #fbf7ee; border-radius: 12px; padding: 8px 12px; }
.hist b { display: block; font-weight: 700; font-size: 13px; } .hist small { color: var(--color-muted); font-size: 11.5px; }
.hist .r { display: grid; justify-items: end; } .hist .r b { color: #8a5a00; }
.past { margin-top: 16px; max-width: 560px; margin-inline: auto; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 900px) { .figs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
