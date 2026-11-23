<script setup>
// "خلفية فاتحة" (approved variant أ). tone: ok | draft | bad | info
defineProps({ tone: { type: String, default: 'info' } })
</script>

<template>
  <span class="pill" :class="`p-${tone}`"><slot /></span>
</template>
