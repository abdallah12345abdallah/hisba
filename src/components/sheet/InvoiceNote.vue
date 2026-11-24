<script setup>
import { computed } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { AGENCY, fmt } from '../../data/demo.js'
import { invoiceRows, netOf, whatsappInvoice } from '../../data/sheet.js'

// The farm's purchase invoice as a document: shown right after approval (fresh) or from the approved list.
// Print opens it alone in a new window (save as PDF from there); WhatsApp opens a chat with the farm carrying the invoice.
const props = defineProps({ manifest: Object, fresh: Boolean, nudgePrint: Boolean })
const open = defineModel({ type: Boolean, default: false })
const m = computed(() => props.manifest)
const rows = computed(() => (m.value ? invoiceRows(m.value) : []))

function printIt() {
  const x = m.value
  const body = rows.value.map((r) => `<tr><td>${r.grade}</td><td>${r.boxes}</td><td>${fmt(r.kg)}</td><td>${r.price.toFixed(1)}</td><td>${fmt(r.total)}</td></tr>`).join('')
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة شراء ${x.invoiceNo}</title>
  <style>body{font-family:'Noto Kufi Arabic',Tahoma,sans-serif;margin:32px;color:#10221f}h1{margin:0;font-size:22px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b3b45;padding-bottom:12px;margin-bottom:16px}
  small{color:#52625f}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}th,td{border-bottom:1px solid #dfe7e6;padding:7px;text-align:right}th{color:#52625f;font-weight:500}
  .sum{width:320px;margin-inline-start:auto;font-size:14px}.sum div{display:flex;justify-content:space-between;padding:4px 0}.sum .t{border-top:2px solid #0b3b45;font-weight:700;font-size:16px}.foot{margin-top:40px;display:flex;justify-content:space-between;color:#52625f}</style></head>
  <body><div class="top"><div style="display:flex;gap:12px;align-items:center">${AGENCY.logo ? `<img src="${AGENCY.logo}" style="width:56px;height:56px;object-fit:contain">` : ''}<div><h1>فاتورة شراء رقم ${x.invoiceNo}</h1><small>${AGENCY.name} · ${AGENCY.place}${AGENCY.phone ? ' · ' + AGENCY.phone : ''}</small></div></div><div><b>${x.supplier}</b><br><small>بيان وصل ${x.time} · اعتمده ${x.approvedBy || ''} ${x.approvedAt || ''}</small></div></div>
  ${body ? `<table><thead><tr><th>الصنف</th><th>بوكس</th><th>كيلو</th><th>متوسط السعر</th><th>القيمة</th></tr></thead><tbody>${body}</tbody></table>` : `<p>${x.boxes} بوكس</p>`}
  <div class="sum"><div><span>إجمالي البيع</span><b>${fmt(x.gross)}</b></div><div><span>العمولة ${x.rate}%</span><b>− ${fmt(x.commission)}</b></div><div class="t"><span>الصافي للمورد</span><span>${fmt(netOf(x))} ج</span></div></div>
  <div class="foot"><span>توقيع المحاسب ..................</span><span>توقيع المورد ..................</span></div>${AGENCY.note ? `<p style="text-align:center;color:#52625f;margin-top:24px">${AGENCY.note}</p>` : ''}</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}
defineExpose({ printIt })
</script>

<template>
  <AppModal v-model="open" :title="m ? `فاتورة شراء رقم ${m.invoiceNo}` : ''" :width="540">
    <template v-if="m">
      <div v-if="fresh" class="done"><span class="ok"><AppIcon name="check" /></span><span><b>اعتمد البيان وانقفل</b><small class="num">انضاف {{ fmt(netOf(m)) }} ج لحساب {{ m.supplier }}</small></span></div>
      <article class="paper">
        <header>
          <span><b>{{ m.supplier }}</b><small class="num">وصل {{ m.time }} · اعتمده {{ m.approvedBy }} {{ m.approvedAt || '' }}</small></span>
          <span class="no num">#{{ m.invoiceNo }}</span>
        </header>
        <table v-if="rows.length">
          <thead><tr><th>الصنف</th><th>بوكس</th><th>كيلو</th><th>القيمة</th></tr></thead>
          <tbody><tr v-for="r in rows" :key="r.grade"><td>{{ r.grade }}</td><td class="num">{{ r.boxes }}</td><td class="num">{{ fmt(r.kg) }}</td><td class="num">{{ fmt(r.total) }}</td></tr></tbody>
        </table>
        <dl>
          <div><dt>إجمالي البيع <small class="num">({{ m.boxes }} بوكس)</small></dt><dd class="num">{{ fmt(m.gross) }}</dd></div>
          <div class="cut"><dt>العمولة {{ m.rate }}%</dt><dd class="num">− {{ fmt(m.commission) }}</dd></div>
          <div class="tot"><dt>الصافي للمورد</dt><dd class="num">{{ fmt(netOf(m)) }} ج</dd></div>
        </dl>
      </article>
      <p class="hint">الطباعة بتفتح الفاتورة لحالها، ومنها بتقدر تحفظها PDF. الواتساب بيفتح محادثة المورد وفيها الفاتورة ورابط كشفه.</p>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">تمام</SoftButton>
        <SoftButton icon="whatsapp" @click="whatsappInvoice(m)">واتساب</SoftButton>
        <SoftButton icon="print" tone="primary" :class="{ nudge: nudgePrint }" @click="printIt">طباعة</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.done { display: flex; align-items: center; gap: 12px; background: var(--pos-bg); border-radius: 14px; padding: 10px 14px; margin-top: -4px; animation: pop .45s cubic-bezier(.2, 1.3, .4, 1); }
.done .ok { width: 34px; height: 34px; border-radius: 50%; background: var(--color-positive); color: #fff; display: grid; place-items: center; flex: none; }
.done .ok :deep(svg) { width: 18px; height: 18px; } .done b { display: block; color: #0d3b22; } .done small { color: #2c5a43; font-size: 12px; }
@keyframes pop { from { transform: scale(.9); opacity: 0; } }
.paper { background: #fbfefe; border: 1px solid #d8ecef; border-radius: 14px; padding: 14px 16px; display: grid; gap: 10px; }
.paper header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px dashed #c9e2e6; padding-bottom: 8px; }
.paper header b { display: block; font-size: 15px; } .paper header small { color: var(--color-muted); font-size: 12px; } .no { font-weight: 700; color: var(--color-primary-ink); }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); padding: 4px 6px; } td { padding: 5px 6px; border-top: 1px solid #e6f1f2; }
dl { margin: 0; display: grid; gap: 4px; font-size: 13px; } dl div { display: flex; justify-content: space-between; } dd { margin: 0; font-weight: 600; }
dl small { color: var(--color-muted); } .cut dd { color: #b4532a; }
.tot { border-top: 1.5px dashed #c9e2e6; padding-top: 6px; font-size: 15px; } .tot dd { font-size: 20px; font-weight: 700; color: var(--color-primary-ink); }
.hint { margin: 0; font-size: 12px; color: var(--color-muted); }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; } .acts > :first-child { margin-inline-end: auto; }
.nudge { animation: nudge 1.6s ease-in-out .6s 3; } @keyframes nudge { 0%, 100% { transform: none; } 20% { transform: scale(1.06); } 40% { transform: none; } }
</style>
