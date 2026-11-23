<script setup>
import AppIcon from '../AppIcon.vue'

// Buttons — "ناعم ملوّن" (approved ج): tinted, no border.
// tone: neutral | primary | danger · size: md | sm | lg · block: full width
defineProps({
  icon: String,
  tone: { type: String, default: 'neutral' },
  size: { type: String, default: 'md' },
  block: Boolean,
  loading: Boolean,
  disabled: Boolean,
})
</script>

<template>
  <button type="button" class="sbt" :class="[tone, size, { block }]" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span v-if="loading" class="spin" aria-hidden="true" />
    <AppIcon v-else-if="icon" :name="icon" />
    <slot />
  </button>
</template>
