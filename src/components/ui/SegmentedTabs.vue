<script setup>
// Tabs — "مقسومة" (approved ب). tabs: [{ value, label, count }]
defineProps({ tabs: { type: Array, required: true }, label: String })
const model = defineModel()
</script>

<template>
  <div class="segt" role="tablist" :aria-label="label">
    <button v-for="t in tabs" :key="t.value" type="button" role="tab" :aria-selected="model === t.value" :class="{ on: model === t.value }" @click="model = t.value">
      {{ t.label }}<span v-if="t.count != null" class="c num">{{ t.count }}</span>
    </button>
  </div>
</template>
