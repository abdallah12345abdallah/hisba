<script setup>
import AppIcon from '../AppIcon.vue'

// Search — "كبسولة مع فلاتر" (approved ب)
defineProps({ placeholder: { type: String, default: 'ابحث…' }, filters: { type: Array, default: () => [] } })
const q = defineModel({ default: '' })
const filter = defineModel('filter')
</script>

<template>
  <div class="search">
    <label class="spill"><AppIcon name="search" /><input v-model="q" type="search" :placeholder="placeholder" :aria-label="placeholder" /></label>
    <div v-if="filters.length" class="chips" role="radiogroup">
      <button v-for="f in filters" :key="f.value" type="button" class="chip" :class="{ on: filter === f.value }" role="radio" :aria-checked="filter === f.value" @click="filter = f.value">{{ f.label }}</button>
    </div>
  </div>
</template>
