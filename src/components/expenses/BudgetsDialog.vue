<script setup>
import { ref, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { CATS, setBudgets } from '../../data/expenses.js'
import { toast } from '../../composables/useToast.js'

// The monthly budget for each expense category.
const open = defineModel({ type: Boolean, default: false })
const vals = ref({})
watch(open, (v) => { if (v) vals.value = Object.fromEntries(CATS.map((c) => [c.key, String(c.budget)])) })
const num = (x) => Number(String(x).replace(/[^\d]/g, '')) || 0
const total = () => Object.values(vals.value).reduce((a, x) => a + num(x), 0)
function save() {
  setBudgets(Object.fromEntries(Object.entries(vals.value).map(([k, x]) => [k, num(x)])))
  open.value = false
  toast('انحفظت الميزانيات', `المجموع ${fmt(total())} ج بالشهر`)
}
</script>

<template>
  <AppModal v-model="open" title="ميزانية المصاريف" text="قديش بتسمح تصرف على كل بند بالشهر. بننبّهك لما تقرّب توصل." :width="460">
    <div class="rows">
      <label v-for="c in CATS" :key="c.key" class="row">
        <span class="n"><AppIcon :name="c.icon" />{{ c.label }}</span>
        <span class="in"><input v-model="vals[c.key]" inputmode="numeric" dir="ltr" :aria-label="`ميزانية ${c.label}`" /><em>ج</em></span>
      </label>
    </div>
    <p class="tot num">المجموع بالشهر <b>{{ fmt(total()) }} ج</b></p>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">احفظ الميزانيات</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.rows { display: grid; gap: 6px; max-height: 360px; overflow-y: auto; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 12px; background: #f6f9f9; border-radius: 12px; padding: 6px 10px; }
.n { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13.5px; } .n :deep(svg) { width: 18px; height: 18px; color: var(--color-primary); }
.in { display: flex; align-items: center; gap: 6px; background: #fff; border-radius: 10px; padding: 0 10px; height: 38px; width: 140px; }
.in:focus-within { box-shadow: inset 0 0 0 2px var(--color-primary); }
.in input { flex: 1; min-width: 0; border: 0; outline: 0; font: inherit; font-size: 15px; font-weight: 700; text-align: right; background: transparent; } .in em { font-style: normal; font-size: 12px; color: var(--color-muted); }
.tot { margin: 0; display: flex; justify-content: space-between; font-size: 13px; color: var(--color-muted); } .tot b { color: var(--color-deep); font-size: 16px; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
