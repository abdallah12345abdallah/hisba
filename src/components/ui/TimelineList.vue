<script setup>
// Statement — "خط زمني" (approved ب). items: [{ title, sub, amount (signed text), after (balance text), tone: in | out }]
defineProps({ items: { type: Array, required: true } })
</script>

<template>
  <ol class="tl">
    <li v-for="(e, i) in items" :key="i" class="e" :class="e.tone">
      <i aria-hidden="true" />
      <div><b>{{ e.title }}</b><small>{{ e.sub }}</small></div>
      <div class="a"><b class="num">{{ e.amount }}</b><small class="num">{{ e.after }}</small></div>
    </li>
  </ol>
</template>
