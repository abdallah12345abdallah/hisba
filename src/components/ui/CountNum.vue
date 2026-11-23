<script setup>
import { toRef } from 'vue'
import { useCountUp } from '../../composables/useCountUp.js'
import { fmt } from '../../data/demo.js'

// A figure that counts up when it appears and glides when it changes.
const props = defineProps({ value: { type: Number, default: 0 }, delay: { type: Number, default: 0 }, duration: { type: Number, default: 1100 } })
const shown = useCountUp(toRef(props, 'value'), { delay: props.delay, duration: props.duration })
</script>

<template><span class="num">{{ fmt(shown) }}</span></template>
