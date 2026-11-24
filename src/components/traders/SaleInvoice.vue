<script setup>
import { computed } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { AGENCY, TODAY, fmt } from '../../data/demo.js'
import { saleInvoice, whatsappSaleInvoice } from '../../data/traders.js'

// The trader's sales invoice for today: every line he bought from every manifest (grade, farm, boxes, kg, his price),
// what he paid cash, what went on his account, and his balance before / after. Print (→ PDF) or send on WhatsApp.
const props = defineProps({ name: String })
const open = defineModel({ type: Boolean, default: false })
const x = computed(() => (props.name ? saleInvoice(props.name) : null))

function printIt() {
  const v = x.value
  const body = v.rows.map((r) => `<tr><td>${r.grade}</td><td>${r.supplier}</td><td>${r.boxes}</td><td>${fmt(r.kg)}</td><td>${r.price}</td><td>${fmt(r.total)}${r.pay === 'cash' ? ' <small>(نقدي)</small>' : ''}</td></tr>`).join('')
  const bal = v.trader ? `<div><span>حسابه قبل الفاتورة</span><b>${fmt(v.before)}</b></div><div class="t"><span>حسابه بعد الفاتورة</span><span>${fmt(v.after)} ج</span></div>` : ''
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة بيع ${v.no}</title>
  <style>body{font-family:'Noto Kufi Arabic',Tahoma,sans-serif;margin:32px;color:#10221f}h1{margin:0;font-size:22px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b3b45;padding-bottom:12px;margin-bottom:16px}
  small{color:#52625f}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}th,td{border-bottom:1px solid #dfe7e6;padding:7px;text-align:right}th{color:#52625f;font-weight:500}
  .sum{width:340px;margin-inline-start:auto;font-size:14px}.sum div{display:flex;justify-content:space-between;padding:4px 0}.sum .t{border-top:2px solid #0b3b45;font-weight:700;font-size:16px}.foot{margin-top:40px;display:flex;justify-content:space-between;color:#52625f}</style></head>
  <body><div class="top"><div style="display:flex;gap:12px;align-items:center">${AGENCY.logo ? `<img src="${AGENCY.logo}" style="width:56px;height:56px;object-fit:contain">` : ''}<div><h1>فاتورة بيع رقم ${v.no}</h1><small>${AGENCY.name} · ${AGENCY.place}${AGENCY.phone ? ' · ' + AGENCY.phone : ''}</small></div></div><div><b>${props.name}</b><br><small>${TODAY}</small></div></div>
  <table><thead><tr><th>الصنف</th><th>من مزرعة</th><th>بوكس</th><th>كيلو</th><th>سعر الكيلو</th><th>القيمة</th></tr></thead><tbody>${body}</tbody></table>
  <div class="sum"><div><span>إجمالي الفاتورة</span><b>${fmt(v.total)}</b></div>${v.cash ? `<div><span>مدفوع نقدي</span><b>− ${fmt(v.cash)}</b></div>` : ''}${v.credit ? `<div><span>آجل على الحساب</span><b>${fmt(v.credit)}</b></div>` : ''}${bal}</div>
  <div class="foot"><span>توقيع المحاسب ..................</span><span>توقيع التاجر ..................</span></div>${AGENCY.note ? `<p style="text-align:center;color:#52625f;margin-top:24px">${AGENCY.note}</p>` : ''}</body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}
defineExpose({ printIt })
</script>

<template>
  <AppModal v-model="open" :title="x && x.no ? `فاتورة بيع رقم ${x.no}` : 'فاتورة بيع'" :width="580">
    <template v-if="x">
      <p v-if="!x.rows.length" class="none">{{ name }} ما اشترى شي اليوم، فما في فاتورة.</p>
      <article v-else class="paper">
        <header>
          <span><b>{{ name }}</b><small class="num">{{ TODAY }} · {{ x.rows.length }} {{ x.rows.length === 1 ? 'سطر' : 'سطور' }}</small></span>
          <span class="no num">#{{ x.no }}</span>
        </header>
        <div class="twrap">
          <table>
            <thead><tr><th>الصنف</th><th>من</th><th>بوكس</th><th>كيلو</th><th>السعر</th><th>القيمة</th></tr></thead>
            <tbody>
              <tr v-for="r in x.rows" :key="r.id">
                <td><b>{{ r.grade }}</b></td><td class="sup">{{ r.supplier.replace('مزرعة ', '') }}</td>
                <td class="num">{{ r.boxes }}</td><td class="num">{{ fmt(r.kg) }}</td><td class="num">{{ r.price }}</td>
                <td class="num amt">{{ fmt(r.total) }}<i v-if="r.pay === 'cash'" class="cashp">نقدي</i></td>
              </tr>
            </tbody>
          </table>
        </div>
        <dl>
          <div><dt>إجمالي الفاتورة</dt><dd class="num">{{ fmt(x.total) }}</dd></div>
          <div v-if="x.cash" class="cut"><dt>مدفوع نقدي</dt><dd class="num">− {{ fmt(x.cash) }}</dd></div>
          <div v-if="x.credit"><dt>آجل على الحساب</dt><dd class="num">{{ fmt(x.credit) }}</dd></div>
          <template v-if="x.trader">
            <div class="mut"><dt>حسابه قبل الفاتورة</dt><dd class="num">{{ fmt(x.before) }}</dd></div>
            <div class="tot"><dt>حسابه بعد الفاتورة</dt><dd class="num">{{ fmt(x.after) }} ج</dd></div>
          </template>
          <div v-else class="tot"><dt>المدفوع</dt><dd class="num">{{ fmt(x.total) }} ج</dd></div>
        </dl>
      </article>
      <p v-if="x.rows.length" class="hint"><AppIcon name="info" />{{ x.trader ? 'الواتساب بيبعتله الفاتورة ورابط حسابه. الطباعة بتفتحها لحالها وبتقدر تحفظها PDF.' : 'عميل النقدي ما إله رقم، فبس طباعة.' }}</p>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">تمام</SoftButton>
        <SoftButton v-if="x && x.trader" icon="whatsapp" :disabled="!x.rows.length" @click="whatsappSaleInvoice(name)">واتساب</SoftButton>
        <SoftButton icon="print" tone="primary" :disabled="!x || !x.rows.length" @click="printIt">طباعة</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.none { margin: 0; text-align: center; color: var(--color-muted); padding: 18px; }
.paper { background: #fbfefe; border: 1px solid #d8ecef; border-radius: 14px; padding: 14px 16px; display: grid; gap: 10px; }
.paper header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px dashed #c9e2e6; padding-bottom: 8px; }
.paper header b { display: block; font-size: 15px; } .paper header small { color: var(--color-muted); font-size: 12px; } .no { font-weight: 700; color: var(--color-primary-ink); }
.twrap { overflow-x: auto; max-height: 300px; overflow-y: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); padding: 4px 6px; white-space: nowrap; position: sticky; top: 0; background: #fbfefe; }
td { padding: 5px 6px; border-top: 1px solid #e6f1f2; white-space: nowrap; }
.sup { color: var(--color-muted); font-size: 12px; } .amt { font-weight: 600; }
.cashp { font-style: normal; font-size: 10.5px; margin-inline-start: 6px; padding: 1px 6px; border-radius: 999px; background: var(--pos-bg); color: var(--pos-ink); }
dl { margin: 0; display: grid; gap: 4px; font-size: 13px; } dl div { display: flex; justify-content: space-between; } dd { margin: 0; font-weight: 600; }
.cut dd { color: var(--color-positive); } .mut { color: var(--color-muted); font-size: 12.5px; }
.tot { border-top: 1.5px dashed #c9e2e6; padding-top: 6px; font-size: 15px; } .tot dd { font-size: 20px; font-weight: 700; color: var(--color-primary-ink); }
.hint { margin: 0; font-size: 12px; color: var(--color-muted); display: flex; align-items: center; gap: 6px; } .hint :deep(svg) { width: 15px; height: 15px; flex: none; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; } .acts > :first-child { margin-inline-end: auto; }
</style>
