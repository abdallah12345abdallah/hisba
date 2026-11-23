<script setup>
import { fmt } from '../../data/demo.js'

// KPI — "سونار" (approved 3): rings spread from the corner like a fish finder, a coral blip lights when it "finds" a catch.
// rows: [{ label, value, unit }] · default slot: extra content (e.g. the progress)
defineProps({ label: String, value: Number, unit: { type: String, default: 'ج' }, sub: String, rows: { type: Array, default: () => [] } })
</script>

<template>
  <section class="hero">
    <div class="sonar" aria-hidden="true"><i /><i /><i /><b /></div>
    <div class="c">
      <small>{{ label }}</small>
      <div class="big num">{{ fmt(value ?? 0) }}<span class="u">{{ unit }}</span></div>
      <div v-if="sub" class="sub">{{ sub }}</div>
      <div v-for="r in rows" :key="r.label" class="r">
        <span>{{ r.label }}</span>
        <b class="num">{{ typeof r.value === 'number' ? fmt(r.value) : r.value }}<span v-if="r.unit" class="u">{{ r.unit }}</span></b>
      </div>
      <slot />
    </div>
  </section>
</template>
