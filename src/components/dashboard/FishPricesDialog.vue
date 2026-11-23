<script setup>
import { ref, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import { PRICES } from '../../data/demo.js'
import { nowTime } from '../../data/safe.js'
import { log } from '../../data/audit.js'
import { toast } from '../../composables/useToast.js'

// Today's price per kg for each grade. The sheet fills new lines with these.
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['saved'])
const rows = ref([])
watch(open, (v) => { if (v) rows.value = PRICES.map(([g, p]) => ({ g, p: String(p), was: p })) })
const num = (s) => Number(String(s).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const bad = () => rows.value.some((r) => !num(r.p))
function bump(r, d) { r.p = String(Math.max(1, num(r.p) + d)) }
function save() {
  if (bad()) return
  const changes = []
  rows.value.forEach((r, i) => { const v = num(r.p); if (v !== PRICES[i][1]) changes.push(`${r.g}: ${PRICES[i][1]} ← ${v}`); PRICES[i][1] = v })
  const changed = changes.length
  if (changed) log('price', 'أسعار اليوم', changes.join(' · '))
  emit('saved', nowTime())
  toast('انحفظت الأسعار', changed ? `${changed} أصناف اتغيّر سعرها · البيع الجديد بالشيت بياخدها` : 'ما تغيّر شي')
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" title="أسعار اليوم" text="سعر الكيلو لكل صنف. البيع اللي بيتسجّل بعدها بالشيت بياخد السعر الجديد." :width="460">
    <ul class="pl num">
      <li v-for="r in rows" :key="r.g" :class="{ ch: num(r.p) !== r.was, bad: !num(r.p) }">
        <span class="g">{{ r.g }}<small v-if="num(r.p) !== r.was">كان {{ r.was }}</small></span>
        <span class="st">
          <button type="button" :aria-label="`نقّص سعر ${r.g}`" @click="bump(r, -1)">−</button>
          <input v-model="r.p" inputmode="decimal" dir="ltr" :aria-label="`سعر ${r.g}`" />
          <button type="button" :aria-label="`زيد سعر ${r.g}`" @click="bump(r, 1)">+</button>
        </span>
        <em>ج/ك</em>
      </li>
    </ul>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" :disabled="bad()" @click="save">احفظ الأسعار</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.pl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.pl li { display: grid; grid-template-columns: minmax(0, 1fr) auto 32px; gap: 10px; align-items: center; background: #f6f9f9; border-radius: 12px; padding: 6px 10px; transition: background .2s; }
.pl li.ch { background: #fff7e6; } .pl li.bad { background: #fff1ef; }
.g { font-weight: 600; font-size: 13.5px; display: grid; } .g small { font-size: 11px; color: #8a5a00; font-weight: 500; }
.st { display: inline-flex; align-items: center; background: #fff; border-radius: 10px; box-shadow: inset 0 0 0 1px #e1eaea; }
.st button { width: 34px; height: 36px; border: 0; background: none; font: inherit; font-size: 18px; color: var(--color-primary-ink); cursor: pointer; border-radius: 10px; }
.st button:hover { background: var(--color-primary-pale); }
.st input { width: 56px; height: 36px; border: 0; outline: 0; background: transparent; text-align: center; font: inherit; font-size: 16px; font-weight: 700; color: var(--color-deep); }
em { font-style: normal; font-size: 11.5px; color: var(--color-muted); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
