<script setup>
// Pick — "بلاطات مع تقدّم" (approved ب). items: [{ value, label, sub, ratio (0..1, optional), done }]
defineProps({ items: { type: Array, required: true }, label: String, cols: { type: Number, default: 3 } })
const model = defineModel()
</script>

<template>
  <div class="tiles" role="radiogroup" :aria-label="label" :style="{ '--cols': cols }">
    <button v-for="it in items" :key="it.value" type="button" class="tile" role="radio"
      :aria-checked="model === it.value" :class="{ on: model === it.value, done: it.done }" :disabled="it.done" @click="model = it.value">
      <b>{{ it.label }}</b>
      <small>{{ it.sub }}</small>
      <span v-if="it.ratio != null" class="tb"><i :style="{ width: `${Math.round(it.ratio * 100)}%` }" /></span>
    </button>
  </div>
</template>
