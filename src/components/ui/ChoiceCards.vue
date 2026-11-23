<script setup>
// Choice — "كروت للاختيار" (approved ب). options: [{ value, label, hint }]
defineProps({ options: { type: Array, required: true }, label: String })
const model = defineModel()
</script>

<template>
  <div class="choice" role="radiogroup" :aria-label="label">
    <button v-for="o in options" :key="o.value" type="button" role="radio" :aria-checked="model === o.value" :class="{ on: model === o.value }" @click="model = o.value">
      <b>{{ o.label }}</b><span v-if="o.hint">{{ o.hint }}</span>
    </button>
  </div>
</template>
