<script setup>
import AppIcon from '../AppIcon.vue'

// Empty — "مع رسمة خطية" (approved ب)
defineProps({ icon: { type: String, default: 'inbox' }, title: String, text: String })
</script>

<template>
  <div class="empty">
    <span class="eic"><AppIcon :name="icon" /></span>
    <b>{{ title }}</b>
    <p v-if="text">{{ text }}</p>
    <slot />
  </div>
</template>
