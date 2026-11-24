<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { ownPrices, setTraderPrices } from '../../data/traders.js'
import { toast } from '../../composables/useToast.js'

// A trader's own price per kilo for each grade. Empty = he follows the day's price. Used automatically on the sale sheet.
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({ trader: Object })
const vals = ref({})
const rows = computed(() => (props.trader ? ownPrices(props.trader) : []))
watch(open, (v) => { if (v) vals.value = Object.fromEntries(rows.value.map((r) => [r.grade, r.own ?? ''])) })
const diff = (r) => { const v = Number(vals.value[r.grade]); return v > 0 ? v - r.day : null }
const bad = computed(() => rows.value.some((r) => vals.value[r.grade] !== '' && !(Number(vals.value[r.grade]) > 0)))
const count = computed(() => rows.value.filter((r) => Number(vals.value[r.grade]) > 0).length)
function clearAll() { rows.value.forEach((r) => { vals.value[r.grade] = '' }) }
function save() {
  if (bad.value) return
  const n = setTraderPrices(props.trader, vals.value)
  open.value = false
  toast(n ? 'انحفظت أسعاره' : 'ما تغيّر شي', n ? `${props.trader.name} · ${count.value} أصناف بسعر خاص، والباقي بسعر اليوم` : 'الأسعار متل ما هي')
}
</script>

<template>
  <AppModal v-model="open" :title="trader ? `أسعار ${trader.name}` : ''" text="سعر الكيلو الخاص فيه لكل صنف. الفاضي بيمشي على سعر اليوم. بالشيت بيطلع سعره لحاله وبتقدر تغيّره وقت البيع." :width="500">
    <ul class="tprows">
      <li v-for="r in rows" :key="r.grade" :class="{ own: Number(vals[r.grade]) > 0 }">
        <span class="g"><b>{{ r.grade }}</b><small class="num">سعر اليوم {{ r.day }} ج</small></span>
        <span class="in"><input v-model="vals[r.grade]" type="number" min="0" step="0.5" dir="ltr" class="num" :placeholder="String(r.day)" :aria-label="`سعر ${r.grade} لـ${trader?.name}`" /><i>ج</i></span>
        <span class="d num" :class="{ up: diff(r) > 0, dn: diff(r) < 0 }">{{ diff(r) === null ? 'سعر اليوم' : diff(r) === 0 ? 'نفس اليوم' : (diff(r) > 0 ? '+' : '') + diff(r) }}</span>
      </li>
    </ul>
    <p v-if="bad" class="err">في سعر مش مزبوط، لازم يكون أكبر من صفر أو فاضي.</p>
    <template #actions>
      <div class="acts">
        <SoftButton :disabled="!count" @click="clearAll">رجّع الكل لسعر اليوم</SoftButton>
        <SoftButton tone="primary" icon="check" :disabled="bad" @click="save">احفظ</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.tprows { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 52vh; overflow-y: auto; }
.tprows li { display: grid; grid-template-columns: 1fr 110px 80px; align-items: center; gap: 10px; background: #f6f9f9; border-radius: 12px; padding: 7px 12px; }
.tprows li.own { background: var(--color-primary-pale); }
.g b { display: block; font-size: 13.5px; } .g small { color: var(--color-muted); font-size: 11.5px; }
.in { display: flex; align-items: center; gap: 5px; } .in i { font-style: normal; color: var(--color-muted); font-size: 12px; }
.in input { width: 100%; height: 36px; border: 0; border-radius: 9px; background: #fff; box-shadow: inset 0 0 0 1.5px #d5e3e5; font: inherit; font-size: 15px; font-weight: 700; text-align: center; color: var(--color-deep); outline: 0; }
.in input:focus { box-shadow: inset 0 0 0 2px var(--color-primary); } .in input::placeholder { color: #b2c2c0; font-weight: 500; }
.d { font-size: 12px; color: var(--color-muted); text-align: center; } .d.up { color: var(--color-positive); font-weight: 600; } .d.dn { color: var(--color-negative); font-weight: 600; }
.err { margin: 8px 0 0; color: var(--color-negative); font-size: 12.5px; }
.acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
