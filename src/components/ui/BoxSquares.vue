<script setup>
// Box progress — "مربعات" (approved أ): one square per box, the sold ones filled; "pending" squares show what is about to be added.
defineProps({ total: { type: Number, required: true }, sold: { type: Number, required: true }, pending: { type: Number, default: 0 }, size: { type: Number, default: 9 } })
</script>

<template>
  <div class="boxes" role="img" :aria-label="`${sold} من ${total} بوكس انباعوا`" :style="{ '--sq': `${size}px` }">
    <i v-for="n in total" :key="n" :class="{ s: n <= sold, p: n > sold && n <= sold + pending }" />
  </div>
</template>
