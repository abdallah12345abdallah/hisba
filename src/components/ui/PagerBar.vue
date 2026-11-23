<script setup>
import { computed, watch } from 'vue'
import AppIcon from '../AppIcon.vue'
import SelectMenu from './SelectMenu.vue'

// Pagination: "showing a–b of n", previous / page numbers with gaps / next, and rows per page.
const props = defineProps({ total: { type: Number, required: true }, sizes: { type: Array, default: () => [10, 20, 50] }, noun: { type: String, default: 'سجل' } })
const page = defineModel('page', { default: 1 })
const size = defineModel('size', { default: 10 })

const pages = computed(() => Math.max(1, Math.ceil(props.total / size.value)))
const from = computed(() => (props.total ? (page.value - 1) * size.value + 1 : 0))
const to = computed(() => Math.min(props.total, page.value * size.value))
watch([pages, size], () => { if (page.value > pages.value) page.value = pages.value })

/* 1 … 4 5 6 … 12 */
const items = computed(() => {
  const n = pages.value, p = page.value
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const set = new Set([1, n, p - 1, p, p + 1].filter((x) => x >= 1 && x <= n))
  const out = []
  ;[...set].sort((a, b) => a - b).forEach((x, i, arr) => { if (i && x - arr[i - 1] > 1) out.push('…'); out.push(x) })
  return out
})
const sizeOptions = computed(() => props.sizes.map((s) => ({ value: s, label: `${s} بالصفحة` })))
function go(p) { if (p >= 1 && p <= pages.value) page.value = p }
</script>

<template>
  <nav class="pager" aria-label="الصفحات">
    <span class="info num">عرض <b>{{ from }}–{{ to }}</b> من <b>{{ total }}</b> {{ noun }}</span>
    <div class="nums">
      <button type="button" class="pg arrow" :disabled="page <= 1" aria-label="الصفحة السابقة" @click="go(page - 1)"><AppIcon name="back" /></button>
      <template v-for="(x, i) in items" :key="i">
        <span v-if="x === '…'" class="gap">…</span>
        <button v-else type="button" class="pg num" :class="{ on: x === page }" :aria-current="x === page ? 'page' : undefined" @click="go(x)">{{ x }}</button>
      </template>
      <button type="button" class="pg arrow" :disabled="page >= pages" aria-label="الصفحة الجاية" @click="go(page + 1)"><AppIcon name="next" /></button>
    </div>
    <SelectMenu v-model="size" :options="sizeOptions" class="psize" />
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 4px 2px; }
.info { color: var(--color-muted); font-size: 13px; }
.info b { color: var(--color-ink); font-weight: 600; }
.nums { display: flex; align-items: center; gap: 4px; }
.pg { min-width: 36px; height: 36px; padding: 0 6px; border: 0; border-radius: 10px; background: transparent; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--color-muted);
  cursor: pointer; display: grid; place-items: center; transition: background .15s, color .15s, transform .1s; }
.pg:hover:not(:disabled):not(.on) { background: #fff; color: var(--color-ink); }
.pg:active:not(:disabled) { transform: scale(.94); }
.pg.on { background: var(--color-primary); color: #fff; box-shadow: 0 6px 14px -8px rgb(14 116 144 / .8); }
.pg:disabled { opacity: .35; cursor: not-allowed; }
.pg :deep(svg) { width: 18px; height: 18px; }
.gap { color: var(--color-muted); padding: 0 4px; }
.psize { width: 150px; }
.psize :deep(.trig) { height: 36px; border-radius: 10px; background: #fff; }
@media (max-width: 640px) { .pager { justify-content: center; } .info { width: 100%; text-align: center; } .psize { display: none; } }
</style>
