<script setup>
import { ref, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { FEED_TYPES, fmt } from '../../data/demo.js'
import { setPrices } from '../../data/feed.js'
import { toast } from '../../composables/useToast.js'

// The factory's price per ton for each feed type. New deliveries take these prices; deliveries already recorded keep theirs.
const open = defineModel({ type: Boolean, default: false })
const vals = ref([])
watch(open, (v) => { if (v) vals.value = FEED_TYPES.map((t) => String(t.price)) })
const num = (x) => Number(String(x).replace(/[^\d.]/g, '')) || 0
function save() {
  const prices = vals.value.map(num)
  if (prices.some((p) => !p)) return
  const undo = setPrices(prices)
  open.value = false
  toast('انحفظت أسعار المصنع', FEED_TYPES.map((t) => `${t.type.split(' ')[0]} ${fmt(t.price)}`).join(' · '), { action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" title="أسعار المصنع" text="سعر الطن لكل نوع. التوريدات الجديدة بتاخد هالأسعار، والقديمة بتضل بسعرها." :width="420">
    <div class="rows">
      <label v-for="(t, i) in FEED_TYPES" :key="t.type" class="row">
        <span><b>{{ t.type }}</b><small class="num">هلأ {{ fmt(t.price) }}</small></span>
        <span class="in"><input v-model="vals[i]" inputmode="numeric" dir="ltr" :aria-label="`سعر طن ${t.type}`" @keydown.enter="save" /><em>ج/طن</em></span>
      </label>
    </div>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">احفظ الأسعار</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.rows { display: grid; gap: 8px; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #fbf7ee; border-radius: 12px; padding: 8px 12px; }
.row b { display: block; font-size: 14px; } .row small { color: var(--color-muted); font-size: 11.5px; }
.in { display: flex; align-items: center; gap: 6px; background: #fff; border-radius: 10px; padding: 0 10px; height: 42px; width: 170px; }
.in:focus-within { box-shadow: inset 0 0 0 2px var(--color-primary); }
.in input { flex: 1; min-width: 0; border: 0; outline: 0; font: inherit; font-size: 16px; font-weight: 700; text-align: right; background: transparent; }
.in em { font-style: normal; font-size: 11.5px; color: var(--color-muted); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
