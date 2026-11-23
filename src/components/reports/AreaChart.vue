<script setup>
import { computed, useId } from 'vue'
import { fmt } from '../../data/demo.js'

// A soft area line with dots, an average line, and one highlighted point (the current month). points: [{ label, value }]
const props = defineProps({ points: { type: Array, required: true }, highlight: { type: Number, default: -1 }, ariaLabel: String, short: Function })
const id = useId()
const W = 720, H = 220, L = 22, R = 22, T = 30, B = 28
const c = computed(() => {
  const vals = props.points.map((p) => p.value)
  const max = Math.max(...vals) * 1.12, min = Math.min(0, ...vals)
  const x = (i) => L + ((W - L - R) * i) / Math.max(1, props.points.length - 1)
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min || 1))
  const pts = props.points.map((p, i) => ({ ...p, x: x(i), y: y(p.value), i }))
  // smooth curve (Catmull-Rom → Bézier)
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2
    d += ` C${p1.x + (p2.x - p0.x) / 6},${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6},${p2.y - (p3.y - p1.y) / 6} ${p2.x},${p2.y}`
  }
  const avg = vals.reduce((a, v) => a + v, 0) / vals.length
  return { pts, d, area: `${d} L${pts[pts.length - 1].x},${H - B} L${pts[0].x},${H - B} Z`, avgY: y(avg), avg }
})
</script>

<template>
  <svg class="area" :viewBox="`0 0 ${W} ${H}`" dir="ltr" role="img" :aria-label="ariaLabel">
    <defs>
      <linearGradient :id="`g${id}`" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b8aa6" stop-opacity=".32" /><stop offset="1" stop-color="#1b8aa6" stop-opacity="0" /></linearGradient>
    </defs>
    <line :x1="L" :x2="W - R" :y1="c.avgY" :y2="c.avgY" class="avg" />
    <text :x="L" :y="c.avgY - 6" text-anchor="start" class="avgt">المتوسط {{ short ? short(c.avg) : fmt(Math.round(c.avg)) }}</text>
    <path :d="c.area" :fill="`url(#g${id})`" class="fill" />
    <path :d="c.d" class="line" pathLength="1" />
    <g v-for="p in c.pts" :key="p.i">
      <circle :cx="p.x" :cy="p.y" :r="p.i === highlight ? 6 : 3.5" :class="{ hi: p.i === highlight }"><title>{{ p.label }}: {{ fmt(p.value) }}</title></circle>
      <text v-if="p.i === highlight" :x="p.x > W - 60 ? p.x + 8 : p.x < 60 ? p.x - 8 : p.x" :y="p.y - 14" :text-anchor="p.x > W - 60 ? 'end' : p.x < 60 ? 'start' : 'middle'" class="hit">{{ short ? short(p.value) : fmt(p.value) }}</text>
      <text :x="p.x" :y="H - 8" text-anchor="middle" class="lb" :class="{ on: p.i === highlight }">{{ p.label }}</text>
    </g>
  </svg>
</template>

<style scoped>
.area { width: 100%; height: auto; display: block; overflow: visible; }
.line { fill: none; stroke: var(--color-primary); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.2s cubic-bezier(.4, 0, .2, 1) forwards; }
.fill { opacity: 0; animation: fade .8s ease .5s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } } @keyframes fade { to { opacity: 1; } }
circle { fill: #fff; stroke: var(--color-primary); stroke-width: 2.5; }
circle.hi { fill: #f5a53a; stroke: #fff; stroke-width: 3; filter: drop-shadow(0 3px 6px rgb(245 165 58 / .6)); }
.avg { stroke: #9fb1b3; stroke-dasharray: 4 5; }
.avgt { font-size: 11px; fill: var(--color-muted); font-family: inherit; }
.hit { font-size: 13px; font-weight: 700; fill: #8a5a00; font-family: inherit; }
.lb { font-size: 11.5px; fill: var(--color-muted); font-family: inherit; } .lb.on { fill: var(--color-deep); font-weight: 700; }
@media (prefers-reduced-motion: reduce) { .line, .fill { animation: none; stroke-dashoffset: 0; opacity: 1; } }
</style>
