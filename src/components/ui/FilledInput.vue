<script setup>
import { useId } from 'vue'

// Inputs — "حقل معبّى" (approved ب): filled field, label above, error below.
defineProps({ label: String, error: String, hint: String, type: { type: String, default: 'text' }, placeholder: String, dir: String, inputmode: String })
const model = defineModel()
const id = useId()
</script>

<template>
  <div class="fld">
    <label v-if="label" :for="id">{{ label }}</label>
    <input :id="id" v-model="model" class="fin" :class="{ er: error }" :type="type" :placeholder="placeholder" :dir="dir" :inputmode="inputmode"
      :aria-invalid="!!error || undefined" :aria-describedby="error || hint ? `${id}-m` : undefined" />
    <span v-if="error" :id="`${id}-m`" class="fmsg er">{{ error }}</span>
    <span v-else-if="hint" :id="`${id}-m`" class="fmsg">{{ hint }}</span>
  </div>
</template>
