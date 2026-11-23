<script setup>
// Loading — "هيكل نابض" (approved ب): flat bars at the size of what will arrive, gently pulsing.
defineProps({ lines: { type: Array, default: () => [['40%', 14], ['60%', 28], ['100%', 10], ['80%', 10]] } })
</script>

<template>
  <div class="skel" aria-busy="true" aria-label="عم يحمّل">
    <span v-for="(l, i) in lines" :key="i" class="sk" :style="{ width: l[0], height: `${l[1]}px` }" />
  </div>
</template>
