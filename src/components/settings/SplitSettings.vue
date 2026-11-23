<script setup>
import { ref, computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import { fmt } from '../../data/demo.js'
import { SPLIT, managers, profitProjected, YEAR } from '../../data/investors.js'
import { saveSplit } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// How the year's profit splits on 1/1: the management share, and how the owner and the partner divide it. Live example below.
const mgmt = ref(SPLIT.mgmt)
const owner = ref(SPLIT.owner)
const dirty = computed(() => mgmt.value !== SPLIT.mgmt || owner.value !== SPLIT.owner)
const P = profitProjected()
const names = computed(() => managers().map((m) => m.name))
const m = computed(() => Math.round((P * mgmt.value) / 100))
function save() {
  saveSplit({ mgmt: mgmt.value, owner: owner.value })
  toast('انحفظ التوزيع', `الإدارة ${mgmt.value}% · المساهمين ${100 - mgmt.value}%`)
}
const reset = () => { mgmt.value = SPLIT.mgmt; owner.value = SPLIT.owner }
</script>

<template>
  <section class="card">
    <div class="ch"><h2>توزيع الأرباح</h2><span class="meta">بيتوزّع كل 1/1 · المحاكي بصفحة المساهمين بيمشي معه</span></div>
    <div class="blocks">
      <div class="blk">
        <div class="lh"><span>نصيب الإدارة من الربح</span><b class="num">{{ mgmt }}%</b></div>
        <input v-model.number="mgmt" type="range" min="0" max="50" step="1" aria-label="نصيب الإدارة" />
        <div class="bar"><i class="a" :style="{ width: mgmt + '%' }">الإدارة</i><i class="b">المساهمين {{ 100 - mgmt }}%</i></div>
      </div>
      <div class="blk">
        <div class="lh"><span>الإدارة بتنقسم</span><b class="num">{{ owner }} / {{ 100 - owner }}</b></div>
        <input v-model.number="owner" type="range" min="0" max="100" step="5" aria-label="نصيب صاحب الحلقة من الإدارة" />
        <div class="who num"><span><AppIcon name="crown" />{{ names[0] }} <b>{{ owner }}%</b></span><span><AppIcon name="handshake" />{{ names[1] }} <b>{{ 100 - owner }}%</b></span></div>
      </div>
    </div>
    <p class="ex num">مثال على ربح {{ YEAR }} المتوقع ({{ fmt(P) }} ج): الإدارة <b>{{ fmt(m) }}</b> ({{ names[0] }} {{ fmt(Math.round((m * owner) / 100)) }} · {{ names[1] }} {{ fmt(m - Math.round((m * owner) / 100)) }})، والمساهمين <b>{{ fmt(P - m) }}</b> على رأس المال الموزون. المساهم 50/50 بيرجع نص ربحه للإدارة.</p>
    <SaveBar :dirty="dirty" @save="save" @reset="reset" />
  </section>
</template>

<style scoped>
.blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.blk { background: #f6f9f9; border-radius: 16px; padding: 14px; display: grid; gap: 10px; align-content: start; }
.lh { display: flex; justify-content: space-between; font-size: 13px; } .lh b { font-size: 20px; color: var(--color-deep); }
input[type=range] { width: 100%; accent-color: var(--color-primary); }
.bar { display: flex; height: 30px; border-radius: 9px; overflow: hidden; font-size: 11.5px; font-weight: 600; }
.bar i { font-style: normal; display: grid; place-items: center; white-space: nowrap; overflow: hidden; transition: width .3s; }
.bar .a { background: #f5b04f; color: #5c3b00; } .bar .b { flex: 1; background: var(--color-primary); color: #fff; }
.who { display: flex; justify-content: space-between; gap: 8px; font-size: 12.5px; color: var(--color-muted); flex-wrap: wrap; }
.who span { display: inline-flex; align-items: center; gap: 5px; } .who :deep(svg) { width: 15px; height: 15px; color: #b07a12; } .who b { color: var(--color-deep); }
.ex { margin: 12px 0 0; font-size: 13px; line-height: 2; color: var(--color-muted); } .ex b { color: var(--color-deep); }
@media (max-width: 820px) { .blocks { grid-template-columns: 1fr; } }
</style>
