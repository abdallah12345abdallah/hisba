<script setup>
defineProps({ label: String })
const model = defineModel({ type: Boolean, default: false })
</script>

<template>
  <label class="tgl">
    <span>{{ label }}</span>
    <button type="button" role="switch" class="sw" :class="{ on: model }" :aria-checked="model" :aria-label="label" @click="model = !model" />
  </label>
</template>
