<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SoftButton from '../components/ui/SoftButton.vue'
import StatusPill from '../components/ui/StatusPill.vue'
import AmountField from '../components/ui/AmountField.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import AppModal from '../components/ui/AppModal.vue'
import FilledInput from '../components/ui/FilledInput.vue'
import ToggleSwitch from '../components/ui/ToggleSwitch.vue'
import SuccessDialog from '../components/ui/SuccessDialog.vue'
import AppIcon from '../components/AppIcon.vue'
import CrateBoard from '../components/sheet/CrateBoard.vue'
import CountNum from '../components/ui/CountNum.vue'
import { gradeColor } from '../utils/grades.js'
import { KG_PER_BOX } from '../data/demo.js'
import InvoiceNote from '../components/sheet/InvoiceNote.vue'
import ApprovedDialog from '../components/sheet/ApprovedDialog.vue'
import { MANIFESTS, TRADERS, fmt } from '../data/demo.js'
import { findManifest, addLine, removeLine, restoreLine, approve, lineTotal, netOf, whatsappInvoice } from '../data/sheet.js'
import { can } from '../data/auth.js'
import { toast } from '../composables/useToast.js'

const route = useRoute()
const router = useRouter()

/* which manifest: from the URL, or the first one still being sold */
const drafts = computed(() => MANIFESTS.filter((m) => m.status === 'draft'))
const m = computed(() => {
  const byId = route.params.id && findManifest(route.params.id)
  return byId && byId.status === 'draft' ? byId : drafts.value[0]
})
const manifestId = computed({ get: () => m.value?.id, set: (id) => router.replace(`/sheet/${id}`) })

/* manifest tabs — "مسار زجاجي" (approved 4): a white thumb slides to the open manifest */
/* switching tabs swaps only the content below the tabs; the cards skip their first-load stagger */
const switched = ref(false)
watch(() => m.value?.id, (now, before) => { if (before) switched.value = true })

const tabsEl = ref(null)
const thumb = ref({ left: '0px', width: '0px', opacity: 0 })
function placeThumb() {
  const b = tabsEl.value?.querySelector('button.on')
  if (b) thumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 }
}
watch(() => [m.value?.id, drafts.value.length], () => nextTick(placeThumb))
onMounted(() => { nextTick(placeThumb); document.fonts?.ready.then(placeThumb); window.addEventListener('resize', placeThumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeThumb))
const left = computed(() => (m.value ? m.value.boxes - m.value.sold : 0))
const balanced = computed(() => m.value && left.value === 0)
/* the header is the summary (approved 3): progress ring, the farm's net, and the last sales as chips you can remove */
const net = computed(() => (m.value ? m.value.gross - m.value.commission : 0))
/* the sales table: newest first, pages of 10, colour per grade */
const page = ref(1)
const size = ref(10)
watch(() => m.value?.id, () => { page.value = 1 })
const pagedLines = computed(() => (m.value ? m.value.lines.slice((page.value - 1) * size.value, page.value * size.value) : []))
const gColor = (grade) => gradeColor(Math.max(0, m.value.grades.findIndex((g) => g.grade === grade)))
const cashSum = computed(() => (m.value ? m.value.lines.filter((l) => l.pay === 'cash').reduce((a, l) => a + lineTotal(l), 0) : 0))
const soldPct = computed(() => (m.value && m.value.boxes ? (m.value.sold / m.value.boxes) * 100 : 0))

/* a crate dropped on a trader → one line; warns when it pushes a credit trader past the limit */
function sell(entry) {
  const sheet = m.value
  const t = TRADERS.find((x) => x.name === entry.trader)
  const wasOver = t && t.due > t.limit
  const line = addLine(sheet, entry)
  const crossed = t && !wasOver && line.pay === 'credit' && t.due > t.limit
  toast(crossed ? `انضاف، و${t.name} صار فوق الحد` : 'انضاف للشيت', `${line.trader} · ${line.boxes} بوكس ${line.grade} · ${fmt(lineTotal(line))} ج`, { tone: crossed ? 'info' : 'ok', quiet: true })
}

/* delete a line, with confirm and undo */
const toDelete = ref(null)
const deleteOpen = ref(false)
function askDelete(l) { toDelete.value = l; deleteOpen.value = true }
function doDelete() {
  const sheet = m.value
  const line = removeLine(sheet, toDelete.value.id)
  if (line) toast('انحذف السطر', `${line.trader} · ${line.boxes} بوكس ${line.grade}`, { tone: 'info', action: { label: 'تراجع', run: () => restoreLine(sheet, line) } })
}

/* approve: lock the sheet and issue the supplier invoice */
const approveOpen = ref(false)
const asha = ref('')
const sendWhatsapp = ref(true)
const printIt = ref(false)
const approvedCount = computed(() => MANIFESTS.filter((x) => x.status === 'approved').length)
const approvedOpen = ref(false)
/* the invoice: shown right after approval, or from the approved list */
const invoiceRef = ref(null)
const invoiceFor = ref(null)
const invoiceOpen = ref(false)
const invoiceFresh = ref(false)
const nudgePrint = ref(false)
function showInvoice(x) { approvedOpen.value = false; invoiceFor.value = x; invoiceFresh.value = false; nudgePrint.value = false; invoiceOpen.value = true }
watch(approveOpen, (v) => { if (v) asha.value = String(m.value.asha) })
function doApprove() {
  const sheet = m.value
  approve(sheet, Number(asha.value) || 0)
  approveOpen.value = false
  invoiceFor.value = sheet; invoiceFresh.value = true; nudgePrint.value = sendWhatsapp.value && printIt.value; invoiceOpen.value = true
  // one window per click: WhatsApp first if asked, otherwise the printout
  if (sendWhatsapp.value) whatsappInvoice(sheet)
  else if (printIt.value) invoiceRef.value?.printIt()
  router.replace(drafts.value.length ? `/sheet/${drafts.value[0].id}` : '/sheet')
}
/* save draft: a success dialog with what was saved, not a toast */
const savedOpen = ref(false)
const savedRows = computed(() => (m.value ? [
  { label: 'البوكسات', value: `${m.value.sold} من ${m.value.boxes} انباعوا` },
  { label: 'السطور', value: m.value.lines.length },
  { label: 'إجمالي البيع', value: `${fmt(m.value.gross)} ج` },
  { label: 'الصافي للمورد', value: `${fmt(m.value.gross - m.value.commission)} ج` },
] : []))
function saveDraft() { savedOpen.value = true }
</script>

<template>
  <div class="page sheet">
    <EmptyState v-if="!m" icon="check" title="كل البيانات معتمدة" text="ما في بيانات مسودة هلأ. أول ما توصل سيارة، اعمل بيان جديد.">
      <SoftButton icon="lock" @click="approvedOpen = true">البيانات المعتمدة ({{ approvedCount }})</SoftButton>
      <SoftButton tone="primary" icon="back" @click="router.push('/')">رجوع للرئيسية</SoftButton>
    </EmptyState>

    <template v-else>
      <header class="dhead">
        <div class="hello">
          <h1>شيت البيع</h1>
          <p class="num">{{ m.supplier }} · وصل {{ m.time }} · عمولة {{ m.rate }}%</p>
        </div>
        <!-- one tab per manifest still being sold -->
        <nav v-if="drafts.length > 1" ref="tabsEl" class="mtabs inhead" role="tablist" aria-label="البيانات المفتوحة">
          <span class="thumb" :style="thumb" aria-hidden="true" />
          <button v-for="d in drafts" :key="d.id" type="button" role="tab" :aria-selected="d.id === m.id" :class="{ on: d.id === m.id }" @click="manifestId = d.id">
            <b>{{ d.supplier }}</b>
            <small class="num">{{ d.boxes - d.sold ? `باقي ${d.boxes - d.sold}` : 'كلها انباعت ✓' }}</small>
          </button>
        </nav>
      </header>

      <!-- a reopened manifest says so, with why -->
      <div v-if="m.reopened" class="reopened"><AppIcon name="edit" /><span><b>البيان مفتوح للتعديل · فاتورة {{ m.invoiceNo }}</b><small class="num">فتحه {{ m.reopened.by }} {{ m.reopened.at }} · السبب: {{ m.reopened.reason }} · كل سطر بتغيّره بيتسجّل</small></span><RouterLink to="/audit">السجل</RouterLink></div>


      <!-- the summary: one plain line right above the board -->
      <div class="sumline">
        <span class="sring" :style="{ '--p': soldPct }" aria-hidden="true" />
        <span class="sold num"><b>{{ m.sold }}</b> من {{ m.boxes }} بوكس</span>
        <span class="vsep" />
        <span class="net"><small>الصافي للمورد</small><b class="num"><CountNum :value="net" :duration="500" /> ج</b></span>
        <span class="calc num">{{ fmt(m.gross) }} − {{ m.rate }}% {{ fmt(m.commission) }}</span>
        <div class="sumacts">
          <SoftButton icon="lock" @click="approvedOpen = true">المعتمدة ({{ approvedCount }})</SoftButton>
          <SoftButton icon="save" @click="saveDraft">حفظ مسودة</SoftButton>
          <SoftButton icon="check" tone="primary" :disabled="!balanced || !can('approve')" :title="!can('approve') ? 'الاعتماد للمحاسب أو صاحب الحلقة' : balanced ? '' : `لازم تبيع الـ ${left} بوكس الباقيين قبل الاعتماد`" @click="approveOpen = true">
            {{ balanced ? (m.reopened ? 'اعتمد التعديل' : 'اعتماد وإصدار الفاتورة') : `اعتماد · باقي ${left}` }}
          </SoftButton>
        </div>
      </div>

      <Transition name="swap" mode="out-in">
      <div :key="m.id" class="grid" :class="{ still: switched }">
        <div class="s12"><CrateBoard :manifest="m" @sell="sell" /></div>

        <section class="s12 card tblcard">
          <div class="ch"><h2>البيعات</h2><span class="lpills num"><span class="lp">{{ m.lines.length }} {{ m.lines.length === 1 ? 'بيعة' : 'بيعات' }}</span><span class="lp sold">{{ m.sold }} من {{ m.boxes }} بوكس انباعوا</span></span></div>
          <EmptyState v-if="!m.lines.length" icon="sheet" title="لسا ما في بيعات" text="اسحب صنف لعند التاجر، أو اكبس الصنف بعدين التاجر." />
          <div v-else class="stbl-wrap">
            <table class="stbl">
              <thead><tr><th>التاجر</th><th>الصنف</th><th>البوكسات</th><th>سعر الكيلو</th><th>الدفع</th><th>المبلغ</th><th><span class="sr">حذف</span></th></tr></thead>
              <TransitionGroup name="list" tag="tbody">
                <tr v-for="l in pagedLines" :key="l.id">
                  <td><b class="tn">{{ l.trader }}</b></td>
                  <td><span class="gtag"><i :style="{ background: gColor(l.grade) }" />{{ l.grade }}</span></td>
                  <td class="num"><b>{{ l.boxes }}</b> <small>· {{ fmt(l.boxes * KG_PER_BOX) }} ك</small></td>
                  <td class="num">{{ l.price }} ج</td>
                  <td><span class="ptag" :class="l.pay">{{ l.pay === 'cash' ? 'نقدي' : 'آجل' }}</span></td>
                  <td class="num amt">{{ fmt(lineTotal(l)) }}</td>
                  <td class="ops"><button type="button" class="rdel" :aria-label="`احذف بيعة ${l.trader}`" title="احذف البيعة" @click="askDelete(l)"><AppIcon name="trash" /></button></td>
                </tr>
              </TransitionGroup>
              <tfoot><tr><td colspan="2">المجموع<small v-if="cashSum" class="num"> · منه نقدي {{ fmt(cashSum) }}</small></td><td class="num"><b>{{ m.sold }}</b> بوكس</td><td /><td /><td class="num amt">{{ fmt(m.gross) }}</td><td /></tr></tfoot>
            </table>
          </div>
          <PagerBar v-if="m.lines.length > 10" v-model:page="page" v-model:size="size" :total="m.lines.length" noun="بيعة" :sizes="[10, 20, 50]" />
        </section>
      </div>
      </Transition>

      <ConfirmDialog v-model="deleteOpen" :title="toDelete ? `تحذف سطر ${toDelete.trader}؟` : ''" confirm="احذف السطر"
        :text="toDelete ? `${toDelete.boxes} بوكس ${toDelete.grade} بـ ${fmt(lineTotal(toDelete))} ج. البوكسات بترجع للباقي${toDelete.pay === 'credit' ? '، والمبلغ بينشال من حسابه' : ''}.` : ''"
        @confirm="doDelete" />

      <AppModal v-model="approveOpen" title="اعتماد البيان وإصدار الفاتورة" :text="m.reopened ? `${m.supplier} · الصافي كان ${fmt(m.reopened.net)} ج وهلأ ${fmt(netOf(m))} ج. بعد الاعتماد بيرجع ينقفل.` : `${m.supplier} · ${m.boxes} بوكس · بعد الاعتماد الشيت بيتقفل، ولتعديله لازم تفتحه مع ذكر السبب.`" :width="460">
        <AmountField label="المستحق للمورد" :value="m.gross - m.commission" tone="soft"
          :caption="`إجمالي ${fmt(m.gross)} − عمولة ${m.rate}% (${fmt(m.commission)})`" />
        <FilledInput v-model="asha" label="العشا (كجم)" type="number" dir="ltr" hint="الزيادة اللي بتضل لصالح الوكالة." />
        <ToggleSwitch v-model="sendWhatsapp" label="ابعت الفاتورة للمورد على الواتساب" />
        <ToggleSwitch v-model="printIt" label="اطبع الفاتورة" />
        <template #actions>
          <SoftButton @click="approveOpen = false">لسا</SoftButton>
          <SoftButton tone="primary" icon="check" @click="doApprove">{{ m.reopened ? 'اعتمد التعديل' : 'اعتمد وأصدر الفاتورة' }}</SoftButton>
        </template>
      </AppModal>

      <SuccessDialog v-model="savedOpen" title="انحفظت المسودة" :text="left ? `${m.supplier} · لسا باقي ${left} بوكس، بتقدر تكمّل وقت ما بدك.` : `${m.supplier} · كل البوكسات انباعت، جاهز للاعتماد.`" :rows="savedRows">
        <template #actions>
          <SoftButton @click="router.push('/')">للرئيسية</SoftButton>
          <SoftButton tone="primary" @click="savedOpen = false">{{ left ? 'كمّل البيع' : 'تمام' }}</SoftButton>
        </template>
      </SuccessDialog>
    </template>

    <InvoiceNote ref="invoiceRef" v-model="invoiceOpen" :manifest="invoiceFor" :fresh="invoiceFresh" :nudge-print="nudgePrint" />
    <ApprovedDialog v-model="approvedOpen" @invoice="showInvoice" />
  </div>
</template>

<style scoped>
/* sales table */
.stbl-wrap { overflow-x: auto; }
.stbl { width: 100%; min-width: 680px; border-collapse: separate; border-spacing: 0 5px; font-size: 13.5px; }
.stbl th { text-align: right; font-weight: 600; font-size: 12px; color: #4c5d5a; padding: 2px 12px; white-space: nowrap; }
.stbl td { background: #fff; padding: 9px 12px; white-space: nowrap; vertical-align: middle; }
.stbl tbody td:first-child { border-start-start-radius: 12px; border-end-start-radius: 12px; } .stbl tbody td:last-child { border-start-end-radius: 12px; border-end-end-radius: 12px; }
.stbl tbody tr:hover td { background: #f7fbfb; }
.tn { font-weight: 700; color: var(--color-deep); }
.gtag { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; } .gtag i { width: 10px; height: 10px; border-radius: 3px; }
.stbl td small { color: #6b7b78; font-size: 11.5px; }
.ptag { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.ptag.credit { background: #fff3dc; color: #8a5a00; } .ptag.cash { background: var(--pos-bg); color: var(--color-positive); }
.amt { font-weight: 700; font-size: 15px; color: var(--color-deep); }
.stbl .ops { width: 1%; }
.stbl tfoot td { background: transparent; padding: 10px 12px 2px; font-weight: 700; color: var(--color-deep); border-top: 1.5px dashed rgb(11 59 69 / .18); }
.stbl tfoot .amt { font-size: 17px; color: var(--color-primary-ink); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.lpills { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.lp { display: inline-flex; align-items: center; height: 26px; padding: 0 11px; border-radius: 999px; background: #eef4f4; color: var(--color-deep); font-size: 12.5px; font-weight: 600; }
.lp.sold { background: var(--color-primary-pale); color: var(--color-primary-ink); }
/* summary line: no card, just above the board */
.mtabs.inhead { margin: 0; }
.mtabs.inhead button { min-width: 180px; padding-inline: 18px; } .mtabs.inhead button b { font-size: 14.5px; } .mtabs.inhead button small { font-size: 12px; }
.sumline { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin: 0 0 12px; padding: 6px 4px; }
.sring { --a: var(--p); width: 30px; height: 30px; border-radius: 50%; flex: none; background: conic-gradient(var(--color-primary) calc(var(--a) * 1%), rgb(11 59 69 / .12) 0); -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5.5px)); mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5.5px)); }
.sold { font-size: 14px; color: var(--color-deep); white-space: nowrap; } .sold b { font-size: 17px; }
.vsep { width: 1px; height: 28px; background: rgb(11 59 69 / .14); }
.net { display: inline-flex; align-items: baseline; gap: 8px; } .net small { font-size: 13px; color: #3f514e; font-weight: 600; } .net b { font-size: 26px; font-weight: 700; color: var(--color-deep); line-height: 1; white-space: nowrap; }
.calc { font-size: 12.5px; color: #4c5d5a; direction: ltr; white-space: nowrap; }
.sumacts { display: flex; gap: 8px; flex-wrap: wrap; margin-inline-start: auto; }
@media (max-width: 760px) { .calc, .vsep { display: none; } .net b { font-size: 22px; } }
/* a reopened manifest: amber band with the reason, until it is approved again */
.reopened { display: flex; align-items: center; gap: 12px; background: #fff7e6; border: 1px solid #f3dca8; color: #6b4a00; border-radius: 16px; padding: 10px 14px; margin: -6px 0 16px; animation: band-in .45s cubic-bezier(.2, .9, .25, 1) both; }
.reopened > :deep(svg) { width: 20px; height: 20px; flex: none; }
.reopened span { flex: 1; min-width: 0; display: grid; } .reopened b { font-size: 13.5px; } .reopened small { font-size: 12px; opacity: .85; }
.reopened a { color: #8a5a00; font-weight: 700; font-size: 12.5px; text-decoration: none; } .reopened a:hover { text-decoration: underline; text-underline-offset: 3px; }
@keyframes band-in { from { opacity: 0; transform: translateY(-6px); } }
</style>
