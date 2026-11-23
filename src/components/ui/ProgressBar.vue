<script setup>
import { computed } from 'vue'
import { fmt } from '../../data/demo.js'

// Progress — "كبسولة مقسومة" (approved 1): ten capsules, each a tenth of the total; sold fills in the brand
// gradient, the part about to be added in coral stripes. value/pending/total in the same unit.
const props = defineProps({
  value: { type: Number, required: true },
  total: { type: Number, required: true },
  pending: { type: Number, default: 0 },
  label: { type: String, default: 'انباع' },
  unit: { type: String, default: 'بوكس' },
  segments: { type: Number, default: 10 },
})
const pct = computed(() => (props.total ? Math.min(100, (props.value / props.total) * 100) : 0))
const left = computed(() => Math.max(0, props.total - props.value))
const cells = computed(() => {
  const size = props.total / props.segments
  return Array.from({ length: props.segments }, (_, i) => {
    const from = i * size
    const sold = Math.max(0, Math.min(size, props.value - from))
    const pend = Math.max(0, Math.min(size - sold, props.value + props.pending - from - sold))
    return { sold: (sold / size) * 100, pend: (pend / size) * 100 }
  })
})
</script>

<template>
  <div class="pbar">
    <div class="pbar-head">
      <span><b class="num">{{ fmt(value) }}</b> {{ label }} من {{ fmt(total) }}</span>
      <span class="pct num">{{ Math.round(pct) }}%</span>
    </div>
    <div class="segs" role="progressbar" :aria-valuenow="value" aria-valuemin="0" :aria-valuemax="total" :aria-label="`${value} من ${total} ${unit} ${label}`">
      <i v-for="(c, n) in cells" :key="n">
        <b v-if="c.sold" class="s" :style="{ width: `${c.sold}%`, animationDelay: `${n * 50}ms` }" />
        <b v-if="c.pend" class="p" :style="{ insetInlineStart: `${c.sold}%`, width: `${c.pend}%` }" />
      </i>
    </div>
    <div class="pbar-foot">
      <span v-if="left">باقي <b class="num">{{ fmt(left) }}</b> {{ unit }}</span>
      <span v-else class="done">خلص كله</span>
      <span v-if="pending" class="pend-note num">+{{ fmt(pending) }} على وشك ينضافوا</span>
    </div>
  </div>
</template>
