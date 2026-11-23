<script setup>
import { computed } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { AGENCY, fmt } from '../../data/demo.js'
import { whatsappNote } from '../../data/feed.js'

// The debit note (إشعار إضافة) as a document: shown right after a settlement (with undo) or from the archive; print or WhatsApp it.
const props = defineProps({ note: Object, undo: Function, fresh: Boolean })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['undone'])
const n = computed(() => props.note)

function undoIt() { props.undo?.(); open.value = false; emit('undone') }

/* print just the note, in its own window */
function printIt() {
  const x = n.value
  const rows = x.lines.map((l) => `<tr><td>${l.date}</td><td>${l.type}</td><td>${l.tons}</td><td>${fmt(l.price)}</td><td>${fmt(l.tons * l.price)}</td></tr>`).join('')
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>إشعار إضافة ${x.no}</title>
  <style>body{font-family:'Noto Kufi Arabic',Tahoma,sans-serif;margin:32px;color:#10221f}h1{margin:0;font-size:22px}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b3b45;padding-bottom:12px;margin-bottom:16px}
  small{color:#52625f}table{width:100%;border-collapse:collapse;font-size:13px;margin:12px 0}th,td{border-bottom:1px solid #dfe7e6;padding:7px;text-align:right}th{color:#52625f;font-weight:500}
  .sum{width:320px;margin-inline-start:auto;font-size:14px}.sum div{display:flex;justify-content:space-between;padding:4px 0}.sum .t{border-top:2px solid #0b3b45;font-weight:700;font-size:16px}.foot{margin-top:40px;display:flex;justify-content:space-between;color:#52625f}</style></head>
  <body><div class="top"><div><h1>إشعار إضافة رقم ${x.no}</h1><small>${AGENCY.name} · ${AGENCY.place}</small></div><div><b>${x.date}</b><br><small>${x.name}</small></div></div>
  <p>تسوية علف${x.partial ? ' جزئية' : ''} مورّد بسعر المصنع، مضاف إليها الزيادة المتفق عليها.</p>
  <table><thead><tr><th>التاريخ</th><th>النوع</th><th>طن</th><th>سعر الطن</th><th>القيمة</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="sum"><div><span>المسوّى بسعر المصنع (${x.tons} طن)</span><b>${fmt(x.factory)}</b></div><div><span>الزيادة</span><b>${fmt(x.markup)}</b></div><div class="t"><span>المطلوب</span><span>${fmt(x.total)} ج</span></div>
  <div><small>${x.pay === 'deduct' ? 'خُصم من حساب بيع المزرعة' : 'دُفع نقداً'}</small></div></div>
  <div class="foot"><span>توقيع المحاسب ..................</span><span>توقيع المزرعة ..................</span></div></body></html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}
</script>

<template>
  <AppModal v-model="open" :title="n ? `إشعار إضافة رقم ${n.no}` : ''" :width="520">
    <template v-if="n">
      <div v-if="fresh" class="done"><span class="ok"><AppIcon name="check" /></span><span><b>اتسوّى العلف وانصدر الإشعار</b><small>{{ n.pay === 'deduct' ? 'انخصم من حساب بيع المزرعة' : 'انضاف للخزنة نقدي' }}</small></span></div>
      <article class="paper">
        <header><span><b>{{ n.name }}</b><small class="num">{{ n.date }}{{ n.partial ? ' · تسوية جزئية' : '' }}</small></span><span class="no num">#{{ n.no }}</span></header>
        <table>
          <thead><tr><th>التاريخ</th><th>النوع</th><th>طن</th><th>القيمة</th></tr></thead>
          <tbody><tr v-for="(l, i) in n.lines" :key="i"><td>{{ l.date }}</td><td>{{ l.type }}</td><td class="num">{{ l.tons }}</td><td class="num">{{ fmt(l.tons * l.price) }}</td></tr></tbody>
        </table>
        <dl>
          <div><dt>المسوّى بسعر المصنع <small class="num">({{ n.tons }} طن)</small></dt><dd class="num">{{ fmt(n.factory) }}</dd></div>
          <div class="add"><dt>الزيادة</dt><dd class="num">+ {{ fmt(n.markup) }}</dd></div>
          <div class="tot"><dt>المطلوب</dt><dd class="num">{{ fmt(n.total) }} ج</dd></div>
        </dl>
      </article>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton icon="whatsapp" @click="whatsappNote(n)">واتساب</SoftButton>
        <SoftButton icon="print" tone="primary" @click="printIt">طباعة</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.done { display: flex; align-items: center; gap: 12px; background: var(--pos-bg); border-radius: 14px; padding: 10px 14px; margin-top: -4px; animation: pop .45s cubic-bezier(.2, 1.3, .4, 1); }
.done .ok { width: 34px; height: 34px; border-radius: 50%; background: var(--color-positive); color: #fff; display: grid; place-items: center; flex: none; }
.done .ok :deep(svg) { width: 18px; height: 18px; } .done b { display: block; color: #0d3b22; } .done small { color: #2c5a43; font-size: 12px; }
@keyframes pop { from { transform: scale(.9); opacity: 0; } }
.paper { background: #fffdf8; border: 1px solid #efe4cc; border-radius: 14px; padding: 14px 16px; display: grid; gap: 10px; }
.paper header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px dashed #e6d7b4; padding-bottom: 8px; }
.paper header b { display: block; font-size: 15px; } .paper header small { color: var(--color-muted); font-size: 12px; } .no { font-weight: 700; color: #8a5a00; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { text-align: right; font-weight: 500; color: var(--color-muted); padding: 4px 6px; } td { padding: 5px 6px; border-top: 1px solid #f1e8d4; }
dl { margin: 0; display: grid; gap: 4px; font-size: 13px; } dl div { display: flex; justify-content: space-between; } dd { margin: 0; font-weight: 600; }
dl small { color: var(--color-muted); } .add dd { color: #b4532a; }
.tot { border-top: 1.5px dashed #e6d7b4; padding-top: 6px; font-size: 15px; } .tot dd { font-size: 20px; font-weight: 700; color: #8a5a00; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; flex-wrap: wrap; } .acts .undo { margin-inline-end: auto; }
</style>
