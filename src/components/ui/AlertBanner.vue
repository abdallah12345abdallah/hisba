<script setup>
import AppIcon from '../AppIcon.vue'

// Alerts — "شريط ملوّن" (approved ب); also used for errors inside a card (error ب). tone: neg | warn | info | ok
defineProps({ tone: { type: String, default: 'info' }, icon: { type: String, default: 'alert' }, title: String, text: String })
</script>

<template>
  <div class="ban" :class="tone" :role="tone === 'neg' ? 'alert' : undefined">
    <AppIcon :name="icon" />
    <div><b v-if="title">{{ title }}</b><p v-if="text">{{ text }}</p><slot /></div>
    <slot name="action" />
  </div>
</template>
