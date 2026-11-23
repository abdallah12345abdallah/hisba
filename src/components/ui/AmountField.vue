<script setup>
import { fmt } from '../../data/demo.js'

// Amount — "رقم كبير" (approved ب): the figure large with a currency chip. Read-only display, or editable.
defineProps({ label: String, value: Number, caption: String, currency: { type: String, default: 'ج.م' }, tone: { type: String, default: 'plain' } })
</script>

<template>
  <div class="amt-big" :class="tone">
    <span v-if="label" class="lbl">{{ label }}</span>
    <div class="v"><b class="num">{{ fmt(value ?? 0) }}</b><i>{{ currency }}</i></div>
    <span v-if="caption" class="cap">{{ caption }}</span>
  </div>
</template>
