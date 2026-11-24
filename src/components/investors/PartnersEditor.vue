<script setup>
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { checkPartners, mgColor } from '../../data/investors.js'

// The management partners and how they split the management share: one row each (name + %), add / remove,
// a split bar that follows the numbers, and the total that must reach 100%. `amount` = the management share in ج for the example.
const rows = defineModel({ type: Array, required: true })
defineProps({ amount: { type: Number, default: 0 } })
const check = computed(() => checkPartners(rows.value))
const total = computed(() => check.value.total)
function add() {
  const left = Math.max(0, 100 - total.value)
  rows.value.push({ name: '', pct: left || 10 })
}
function remove(i) { rows.value.splice(i, 1) }
/* "بالتساوي": the same % for everyone, the rounding goes to the first */
function even() {
  const n = rows.value.length
  if (!n) return
  const each = Math.floor((100 / n) * 100) / 100
  rows.value.forEach((r, i) => { r.pct = i ? each : +(100 - each * (n - 1)).toFixed(2) })
}
</script>

<template>
  <div class="pted">
    <div class="pbar" aria-hidden="true">
      <i v-for="(r, i) in rows" :key="i" :style="{ flexGrow: Math.max(0, Number(r.pct) || 0), background: mgColor(i) }"><span v-if="(Number(r.pct) || 0) >= 12">{{ r.name || '…' }}</span></i>
      <i v-if="total < 100" class="gap" :style="{ flexGrow: 100 - total }" />
    </div>
    <ul class="prows">
      <li v-for="(r, i) in rows" :key="i" :class="{ bad: check.errors[i] }">
        <span class="dot" :style="{ background: mgColor(i) }" />
        <input v-model="r.name" class="pname" type="text" placeholder="اسم شريك الإدارة" :aria-label="`اسم الشريك ${i + 1}`" />
        <span class="pct"><input v-model.number="r.pct" type="number" min="0" max="100" step="0.5" dir="ltr" :aria-label="`نسبة ${r.name || 'الشريك'}`" /><b>%</b></span>
        <span v-if="amount" class="get num">{{ fmt(Math.round((amount * (Number(r.pct) || 0)) / 100)) }} ج</span>
        <button type="button" class="pdel" :disabled="rows.length <= 1" :title="rows.length <= 1 ? 'لازم يضل شريك واحد' : 'شيله'" :aria-label="`شيل ${r.name || 'الشريك'}`" @click="remove(i)"><AppIcon name="trash" /></button>
        <small v-if="check.errors[i]" class="perr">{{ check.errors[i] }}</small>
      </li>
    </ul>
    <div class="pfoot">
      <button type="button" class="padd" @click="add"><AppIcon name="plus" />شريك إدارة</button>
      <button type="button" class="padd" :disabled="rows.length < 2" @click="even">بالتساوي</button>
      <span class="ptot num" :class="{ ok: !check.errors.total }">{{ check.errors.total || `المجموع 100% ✓` }}</span>
    </div>
  </div>
</template>

<style scoped>
.pted { display: grid; gap: 10px; }
.pbar { display: flex; height: 28px; border-radius: 9px; overflow: hidden; background: #eef3f3; font-size: 11.5px; font-weight: 600; color: #5c3b00; }
.pbar i { font-style: normal; display: grid; place-items: center; min-width: 0; overflow: hidden; white-space: nowrap; transition: flex-grow .3s; }
.pbar i + i { box-shadow: inset 1.5px 0 0 #fff; }
.pbar .gap { background: repeating-linear-gradient(135deg, #f6f9f9 0 6px, #e6eeee 6px 12px); }
.prows { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.prows li { display: grid; grid-template-columns: auto 1fr 92px auto auto; align-items: center; gap: 8px; background: #fff; border-radius: 12px; padding: 6px 8px 6px 6px; box-shadow: 0 0 0 1px #e3eded; }
.prows li.bad { box-shadow: 0 0 0 1.5px #f1b7b3; }
.dot { width: 12px; height: 12px; border-radius: 4px; }
.pname, .pct input { border: 0; background: #f4f8f8; border-radius: 9px; height: 36px; padding: 0 10px; font: inherit; font-size: 13px; color: var(--color-ink); min-width: 0; width: 100%; }
.pname:focus, .pct input:focus { outline: 2px solid var(--color-primary); outline-offset: 0; background: #fff; }
.pct { display: flex; align-items: center; gap: 4px; } .pct b { color: var(--color-muted); font-size: 13px; }
.get { font-size: 12.5px; color: var(--color-deep); font-weight: 600; white-space: nowrap; }
.pdel { border: 0; background: none; width: 32px; height: 32px; border-radius: 9px; color: #b4532a; cursor: pointer; display: grid; place-items: center; }
.pdel:hover:not(:disabled) { background: var(--neg-bg); } .pdel:disabled { color: #c4cfcd; cursor: not-allowed; }
.pdel :deep(svg) { width: 17px; height: 17px; }
.perr { grid-column: 2 / -1; color: var(--color-negative); font-size: 11.5px; margin-top: -2px; }
.pfoot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.padd { display: inline-flex; align-items: center; justify-content: center; gap: 5px; height: 34px; padding: 0 12px; border-radius: 10px; border: 1px solid #9fd0dc; background: var(--color-primary-pale); color: var(--color-primary-ink); font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.padd:hover:not(:disabled) { border-color: var(--color-primary); } .padd:disabled { background: #eef2f2; color: #9aa8a6; border-color: #dde5e4; cursor: not-allowed; }
.padd :deep(svg) { width: 15px; height: 15px; }
.ptot { margin-inline-start: auto; font-size: 12.5px; font-weight: 600; color: var(--color-negative); } .ptot.ok { color: var(--color-positive); }
@media (max-width: 520px) { .prows li { grid-template-columns: auto 1fr 84px auto; } .get { display: none; } }
</style>
