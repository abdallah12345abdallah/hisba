<script setup>
import { computed } from 'vue'
import { fmt } from '../../data/demo.js'

// A ring split into parts, the total (or any label) in the middle. parts: [{ label, value, color }]
const props = defineProps({ parts: { type: Array, required: true }, center: String, sub: String, size: { type: Number, default: 180 }, ariaLabel: String })
const R = 15.9155 // circumference 100
const arcs = computed(() => {
  const total = props.parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1
  let at = 0
  return props.parts.map((p, i) => {
    const len = (Math.max(0, p.value) / total) * 100
    const a = { ...p, len: Math.max(0, len - 0.8), off: 25 - at, pct: Math.round((p.value / total) * 100), i }
    at += len
    return a
  })
})
</script>

<template>
  <div class="donut" :style="{ width: size + 'px', height: size + 'px' }" role="img" :aria-label="ariaLabel">
    <svg viewBox="0 0 42 42">
      <circle cx="21" cy="21" :r="R" class="bg" />
      <circle v-for="a in arcs" :key="a.label" cx="21" cy="21" :r="R" class="seg" :stroke="a.color" :stroke-dasharray="`${a.len} ${100 - a.len}`" :stroke-dashoffset="a.off" :style="{ '--i': a.i }">
        <title>{{ a.label }}: {{ fmt(a.value) }} ({{ a.pct }}%)</title>
      </circle>
    </svg>
    <span class="mid"><b class="num">{{ center }}</b><small v-if="sub">{{ sub }}</small></span>
  </div>
</template>

<style scoped>
.donut { position: relative; flex: none; }
svg { width: 100%; height: 100%; display: block; }
circle { fill: none; stroke-width: 5.2; }
.bg { stroke: #eef3f3; }
.seg { stroke-linecap: butt; animation: d-in .9s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 120ms); transition: stroke-dasharray .5s, stroke-dashoffset .5s; }
@keyframes d-in { from { stroke-dasharray: 0 100; } }
.mid { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; line-height: 1.25; }
.mid b { font-size: 22px; color: var(--color-deep); } .mid small { font-size: 11.5px; color: var(--color-muted); }
@media (prefers-reduced-motion: reduce) { .seg { animation: none; } }
</style>
