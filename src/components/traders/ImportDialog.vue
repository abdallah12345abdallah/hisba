<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import StatusPill from '../ui/StatusPill.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { planImport, applyImport } from '../../data/traders.js'
import { toast } from '../../composables/useToast.js'

// Import traders from Excel (.xlsx) or CSV: drop or pick a file, see every row checked (new / update / why it's rejected), then import.
// Columns are matched by their Arabic or English header: الاسم/name, التلفون/phone, الحد/limit, الرصيد/opening.
const open = defineModel({ type: Boolean, default: false })
const plan = ref([])
const fileName = ref('')
const error = ref('')
const busy = ref(false)
const over = ref(false)
const input = ref(null)
watch(open, (v) => { if (v) { plan.value = []; fileName.value = ''; error.value = '' } })

const HEADERS = {
  name: ['الاسم', 'اسم التاجر', 'التاجر', 'name'],
  phone: ['التلفون', 'الهاتف', 'الموبايل', 'رقم التلفون', 'phone', 'mobile'],
  limit: ['الحد', 'حد الدين', 'limit'],
  opening: ['الرصيد', 'رصيد افتتاحي', 'عليه', 'opening', 'balance'],
}
const keyOf = (h) => Object.keys(HEADERS).find((k) => HEADERS[k].includes(String(h ?? '').trim().toLowerCase()) || HEADERS[k].includes(String(h ?? '').trim()))

function toRows(table) {
  const [head, ...body] = table
  const keys = head.map(keyOf)
  if (!keys.includes('name') || !keys.includes('phone')) throw new Error('الملف لازم يكون فيه عمود «الاسم» وعمود «التلفون» بأول سطر.')
  return body.filter((r) => r.some((c) => String(c ?? '').trim())).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]]).filter(([k]) => k)))
}
function parseCsv(text) {
  const sep = text.split('\n')[0].includes(';') ? ';' : ','
  return text.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((line) => line.split(sep).map((c) => c.replace(/^"|"$/g, '')))
}
async function read(file) {
  if (!file) return
  error.value = ''; busy.value = true; fileName.value = file.name
  try {
    let table
    if (/\.csv$/i.test(file.name)) table = parseCsv(await file.text())
    else if (/\.xlsx$/i.test(file.name)) { const { default: readXlsx } = await import('read-excel-file'); table = await readXlsx(file) }
    else throw new Error('اختار ملف إكسل (.xlsx) أو CSV.')
    plan.value = planImport(toRows(table))
    if (!plan.value.length) throw new Error('الملف فاضي، ما فيه تجار.')
  } catch (e) {
    plan.value = []; error.value = e.message || 'ما قدرنا نقرأ الملف.'
  } finally { busy.value = false }
}
function onDrop(e) { over.value = false; read(e.dataTransfer.files?.[0]) }

const counts = computed(() => ({ new: plan.value.filter((r) => r.status === 'new').length, update: plan.value.filter((r) => r.status === 'update').length, bad: plan.value.filter((r) => r.status === 'bad').length }))
const ready = computed(() => counts.value.new + counts.value.update)
function doImport() {
  const { added, updated } = applyImport(plan.value)
  open.value = false
  toast('خلص الاستيراد', [added && `${added} تاجر جديد`, updated && `${updated} اتحدّثوا`].filter(Boolean).join(' · '), { big: true })
}
function template() {
  const csv = '﻿الاسم,التلفون,الحد,الرصيد\nالحاج محمود,01002345678,50000,0\n'
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'قالب-التجار.csv' })
  a.click(); URL.revokeObjectURL(a.href)
}
</script>

<template>
  <AppModal v-model="open" title="استيراد التجار من إكسل" text="الأعمدة: الاسم، التلفون، الحد، والرصيد (اختياري). التاجر الموجود بنفس الاسم بيتحدّث." :width="620">
    <label class="drop" :class="{ over, has: fileName }" @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="onDrop">
      <input ref="input" type="file" accept=".xlsx,.csv" hidden @change="read($event.target.files[0])" />
      <AppIcon name="excel" />
      <span v-if="busy">عم نقرأ الملف…</span>
      <span v-else-if="fileName"><b>{{ fileName }}</b> · اكبس لتختار ملف تاني</span>
      <span v-else><b>اسحب الملف لهون</b> أو اكبس لتختاره · xlsx أو csv</span>
    </label>
    <button type="button" class="tpl" @click="template">نزّل قالب جاهز</button>
    <p v-if="error" class="err">{{ error }}</p>

    <template v-if="plan.length">
      <div class="sum num">
        <span class="n">{{ counts.new }} جديد</span><span class="u">{{ counts.update }} تحديث</span><span v-if="counts.bad" class="b">{{ counts.bad }} فيهم مشكلة</span>
      </div>
      <div class="rows">
        <table>
          <thead><tr><th>سطر</th><th>الاسم</th><th>التلفون</th><th>الحد</th><th>الرصيد</th><th>الحالة</th></tr></thead>
          <tbody>
            <tr v-for="r in plan" :key="r.line" :class="r.status">
              <td class="num">{{ r.line }}</td><td>{{ r.name || '—' }}</td><td class="num" dir="ltr">{{ r.phone || '—' }}</td>
              <td class="num">{{ r.limit ? fmt(r.limit) : '—' }}</td><td class="num">{{ r.opening ? fmt(r.opening) : '—' }}</td>
              <td>
                <StatusPill v-if="r.status === 'new'" tone="ok">جديد</StatusPill>
                <StatusPill v-else-if="r.status === 'update'" tone="info">تحديث</StatusPill>
                <span v-else class="why">{{ r.why }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #actions>
      <SoftButton @click="open = false">لسا</SoftButton>
      <SoftButton tone="primary" icon="check" :disabled="!ready" @click="doImport">{{ ready ? `استورد ${ready} تاجر` : 'استورد' }}</SoftButton>
    </template>
  </AppModal>
</template>

<style scoped>
.drop { display: grid; justify-items: center; gap: 6px; text-align: center; padding: 22px 16px; border-radius: 14px; border: 2px dashed #bcd8dc; background: #f6fbfb; color: var(--color-muted); font-size: 13px; cursor: pointer; transition: border-color .15s, background .15s; }
.drop :deep(svg) { width: 30px; height: 30px; color: var(--color-positive); }
.drop b { color: var(--color-ink); }
.drop:hover, .drop.over { border-color: var(--color-primary); background: #eef8fa; }
.drop.has { border-style: solid; }
.tpl { justify-self: start; border: 0; background: none; padding: 0; margin-top: -6px; font: inherit; font-size: 12.5px; color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.err { margin: 0; color: var(--color-negative); font-size: 13px; }
.sum { display: flex; gap: 8px; flex-wrap: wrap; font-size: 12.5px; font-weight: 600; }
.sum span { border-radius: 8px; padding: 3px 10px; }
.sum .n { background: var(--pos-bg); color: var(--pos-ink); } .sum .u { background: var(--color-primary-pale); color: var(--color-primary-ink); } .sum .b { background: var(--neg-bg); color: var(--neg-ink); }
.rows { max-height: 260px; overflow: auto; border-radius: 12px; background: #f6f9f9; }
table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
th { position: sticky; top: 0; background: #eef4f4; text-align: right; font-weight: 500; color: var(--color-muted); padding: 7px 10px; }
td { padding: 7px 10px; border-top: 1px solid #e6eeee; white-space: nowrap; }
tr.bad td { background: #fff6f5; }
.why { color: var(--color-negative); font-size: 12px; }
</style>
