<script setup>
import { computed } from 'vue'

// A tiny trend line for a figure card.
const props = defineProps({ values: { type: Array, required: true }, color: { type: String, default: 'var(--color-primary)' } })
const W = 100, H = 30
const c = computed(() => {
  const v = props.values, max = Math.max(...v), min = Math.min(...v)
  const pts = v.map((n, i) => [(W * i) / Math.max(1, v.length - 1), 3 + (H - 6) * (1 - (n - min) / (max - min || 1))])
  return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') }
})
</script>

<template>
  <svg class="spark" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" aria-hidden="true">
    <path :d="c.d" :stroke="color" />
  </svg>
</template>

<style scoped>
.spark { width: 100%; height: 30px; display: block; overflow: visible; }
path { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
</style>
