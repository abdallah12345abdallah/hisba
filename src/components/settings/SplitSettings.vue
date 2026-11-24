<script setup>
import { ref, computed } from 'vue'
import SaveBar from './SaveBar.vue'
import PartnersEditor from '../investors/PartnersEditor.vue'
import { fmt } from '../../data/demo.js'
import { SPLIT, profitProjected, checkPartners, YEAR } from '../../data/investors.js'
import { saveSplit } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// How the year's profit splits on 1/1: the management share, and how the management partners divide it (each his own %).
const copy = () => SPLIT.partners.map((p) => ({ ...p }))
const mgmt = ref(SPLIT.mgmt)
const partners = ref(copy())
const key = (rows) => rows.map((p) => `${String(p.name).trim()}:${Number(p.pct)}`).join('|')
const dirty = computed(() => mgmt.value !== SPLIT.mgmt || key(partners.value) !== key(SPLIT.partners))
const valid = computed(() => !Object.keys(checkPartners(partners.value).errors).length)
const P = profitProjected()
const m = computed(() => Math.round((P * mgmt.value) / 100))
function save() {
  if (!valid.value) return
  saveSplit({ mgmt: mgmt.value, partners: partners.value })
  toast('انحفظ التوزيع', `الإدارة ${mgmt.value}% بين ${partners.value.length} شركاء · المساهمين ${100 - mgmt.value}%`)
}
const reset = () => { mgmt.value = SPLIT.mgmt; partners.value = copy() }
</script>

<template>
  <section class="card">
    <div class="ch"><h2>توزيع الأرباح</h2><span class="meta">بيتوزّع كل 1/1 · المحاكي بصفحة المساهمين بيمشي معه</span></div>
    <div class="blocks">
      <div class="blk">
        <div class="lh"><span>نصيب الإدارة من الربح</span><b class="num">{{ mgmt }}%</b></div>
        <input v-model.number="mgmt" type="range" min="0" max="50" step="1" aria-label="نصيب الإدارة" />
        <div class="bar"><i class="a" :style="{ width: mgmt + '%' }">الإدارة</i><i class="b">المساهمين {{ 100 - mgmt }}%</i></div>
        <p class="ex num">مثال على ربح {{ YEAR }} المتوقع ({{ fmt(P) }} ج): الإدارة <b>{{ fmt(m) }}</b>، والمساهمين <b>{{ fmt(P - m) }}</b> على رأس المال الموزون بعدد الشهور. المساهم 50/50 بيرجع نص ربحه للإدارة.</p>
      </div>
      <div class="blk">
        <div class="lh"><span>شركاء الإدارة ونسبة كل واحد</span><b class="num">{{ partners.length }}</b></div>
        <PartnersEditor v-model="partners" :amount="m" />
      </div>
    </div>
    <SaveBar :dirty="dirty" :disabled="!valid" :text="valid ? 'في تعديلات ما انحفظت' : 'صحّح النسب لحتى تقدر تحفظ'" @save="save" @reset="reset" />
  </section>
</template>

<style scoped>
.blocks { display: grid; grid-template-columns: 1fr 1.3fr; gap: 12px; }
.blk { background: #f6f9f9; border-radius: 16px; padding: 14px; display: grid; gap: 10px; align-content: start; }
.lh { display: flex; justify-content: space-between; font-size: 13px; } .lh b { font-size: 20px; color: var(--color-deep); }
input[type=range] { width: 100%; accent-color: var(--color-primary); }
.bar { display: flex; height: 30px; border-radius: 9px; overflow: hidden; font-size: 11.5px; font-weight: 600; }
.bar i { font-style: normal; display: grid; place-items: center; white-space: nowrap; overflow: hidden; transition: width .3s; }
.bar .a { background: #f5b04f; color: #5c3b00; } .bar .b { flex: 1; background: var(--color-primary); color: #fff; }
.ex { margin: 0; font-size: 13px; line-height: 2; color: var(--color-muted); } .ex b { color: var(--color-deep); }
@media (max-width: 900px) { .blocks { grid-template-columns: 1fr; } }
</style>
