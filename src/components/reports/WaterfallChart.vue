<script setup>
import { computed } from 'vue'
import { fmt } from '../../data/demo.js'

// From commission to net profit: each step floats from where the last one ended; the last bar stands on the floor.
// steps: [{ label, value, kind: 'up' | 'down' | 'total' }]
const props = defineProps({ steps: { type: Array, required: true }, ariaLabel: String })
const W = 720, H = 250, TOP = 26, BOT = 34, GAP = 26
const bars = computed(() => {
  let run = 0
  const pts = props.steps.map((s) => {
    const from = s.kind === 'total' ? 0 : run
    const to = s.kind === 'total' ? s.value : s.kind === 'up' ? run + s.value : run - s.value
    if (s.kind !== 'total') run = to
    return { ...s, from, to }
  })
  const max = Math.max(1, ...pts.map((p) => Math.max(p.from, p.to)))
  const y = (v) => TOP + (H - TOP - BOT) * (1 - v / max)
  const bw = (W - GAP * (pts.length + 1)) / pts.length
  return pts.map((p, i) => {
    const x = GAP + i * (bw + GAP)
    const top = y(Math.max(p.from, p.to)), bottom = y(Math.min(p.from, p.to))
    return { ...p, x, w: bw, top, h: Math.max(2, bottom - top), cx: x + bw / 2, link: i < pts.length - 1 ? y(p.to) : null }
  })
})
</script>

<template>
  <svg class="wf" :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="ariaLabel">
    <line :x1="0" :x2="W" :y1="H - BOT" :y2="H - BOT" stroke="#c9d6d5" />
    <g v-for="(b, i) in bars" :key="b.label" class="st" :style="{ '--i': i }">
      <line v-if="b.link !== null" class="lk" :x1="b.x + b.w" :x2="b.x + b.w + GAP" :y1="b.link" :y2="b.link" />
      <rect :x="b.x" :y="b.top" :width="b.w" :height="b.h" rx="6" :class="b.kind"><title>{{ b.label }}: {{ fmt(b.value) }}</title></rect>
      <text class="v" :class="b.kind" :x="b.cx" :y="b.top - 8" text-anchor="middle">{{ b.kind === 'down' ? '−' : b.kind === 'up' && i ? '+' : '' }}{{ fmt(b.value) }}</text>
      <text class="l" :x="b.cx" :y="H - 12" text-anchor="middle">{{ b.label }}</text>
    </g>
  </svg>
</template>

<style scoped>
.wf { width: 100%; height: auto; display: block; overflow: visible; }
rect { transform-box: fill-box; transform-origin: bottom; animation: wf-in .6s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i) * 110ms); }
rect.up { fill: #3aa3b9; } .st:first-child rect.up { fill: var(--color-primary); }
rect.down { fill: #f08a7c; } rect.total { fill: var(--color-positive); }
.lk { stroke: #9fb1b3; stroke-dasharray: 3 3; }
.v { font-size: 13px; font-weight: 700; fill: var(--color-deep); font-family: inherit; } .v.down { fill: var(--color-negative); } .v.total { fill: var(--color-positive); font-size: 15px; }
.l { font-size: 12.5px; fill: var(--color-muted); font-family: inherit; }
@keyframes wf-in { from { transform: scaleY(0); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { rect { animation: none; } }
</style>
