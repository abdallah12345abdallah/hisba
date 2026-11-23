<script setup>
import { computed } from 'vue'
import { fmt } from '../../data/demo.js'

// Stepper — "دوائر كبيرة" (approved أ): big round − / + for the market table, with a quick "all" shortcut.
const props = defineProps({ min: { type: Number, default: 1 }, max: { type: Number, default: 99 }, unit: { type: String, default: 'بوكس' }, sub: String })
const model = defineModel({ type: Number, default: 1 })
const atMin = computed(() => model.value <= props.min)
const atMax = computed(() => model.value >= props.max)
const step = (d) => { model.value = Math.max(props.min, Math.min(props.max, model.value + d)) }
</script>

<template>
  <div class="bstep">
    <button type="button" class="mi" :disabled="atMin" aria-label="ناقص واحد" @click="step(-1)">−</button>
    <div class="n" aria-live="polite">
      <b class="num">{{ fmt(model) }}</b>
      <small>{{ unit }}<template v-if="sub"> · {{ sub }}</template></small>
    </div>
    <button type="button" class="pl" :disabled="atMax" aria-label="زائد واحد" @click="step(1)">+</button>
  </div>
</template>
