<script setup>
import { tint, initials } from '../../utils/person.js'

// Tables — "صفوف ككروت" (approved ب): avatar, name over a sub line, the figure at the end, optional trailing action.
defineProps({ name: { type: String, required: true }, sub: String, amount: [String, Number], avatar: { type: Boolean, default: true } })
</script>

<template>
  <div class="rw" :class="{ noav: !avatar }">
    <span v-if="avatar" class="av" :style="tint(name)">{{ initials(name) }}</span>
    <div class="who"><b>{{ name }}</b><small>{{ sub }}<slot name="sub" /></small></div>
    <div class="amt num">{{ amount }}<slot name="amount" /></div>
    <slot name="action" />
  </div>
</template>
