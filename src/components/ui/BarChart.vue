<script setup>
import { computed } from 'vue'
import { fmt } from '../../data/demo.js'

// Charts — "أعمدة" (approved أ). bars: [{ key, label, value, highlight, gap }]; the highlighted bar takes the brand colour.
const props = defineProps({ bars: { type: Array, required: true }, step: { type: Number, required: true }, labelEvery: { type: Number, default: 5 }, ariaLabel: String, short: Function })
const W = 720, H = 190, PAD_L = 40, PAD_B = 22, TOP = 8
const chart = computed(() => {
  const max = Math.max(1, ...props.bars.map((b) => b.value))
  const ymax = Math.ceil(max / props.step) * props.step + (max % props.step === 0 ? props.step : 0)
  const y = (v) => TOP + (H - TOP - PAD_B) * (1 - v / ymax)
  const bw = (W - PAD_L) / props.bars.length
  const ticks = []
  for (let v = 0; v <= ymax; v += props.step) ticks.push({ v, y: y(v), label: props.short ? props.short(v) : fmt(v) })
  const bars = props.bars.map((b, i) => ({ ...b, x: PAD_L + i * bw + 2, w: bw - 4, y: y(b.value), h: y(0) - y(b.value), showLabel: i % props.labelEvery === 0 || b.highlight }))
  return { ticks, bars }
})
</script>

<template>
  <div class="scroll chart">
    <svg :viewBox="`0 0 ${W} ${H}`" dir="ltr" role="img" :aria-label="ariaLabel">
      <g v-for="t in chart.ticks" :key="t.v">
        <line :x1="PAD_L" :x2="W" :y1="t.y" :y2="t.y" :stroke="t.v === 0 ? '#9fb1ad' : '#e5ebe9'" />
        <text x="0" :y="t.y + 4">{{ t.label }}</text>
      </g>
      <g v-for="b in chart.bars" :key="b.key">
        <rect v-if="!b.gap" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="2" :fill="b.highlight ? 'var(--color-primary)' : '#c3d3d2'">
          <title>{{ b.label }}: {{ fmt(b.value) }}</title>
        </rect>
        <text v-if="b.showLabel" :x="b.x + b.w / 2" :y="H - 6" text-anchor="middle" :class="{ today: b.highlight }">{{ b.label }}</text>
      </g>
    </svg>
  </div>
</template>
