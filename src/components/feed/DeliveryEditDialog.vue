<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import { FEED_TYPES, fmt } from '../../data/demo.js'
import { updateDelivery } from '../../data/feed.js'
import { toast } from '../../composables/useToast.js'

// Correct one delivery: feed type, tons, price per ton.
const props = defineProps({ delivery: Object })
const open = defineModel({ type: Boolean, default: false })
const type = ref('')
const tons = ref('')
const price = ref('')
const tried = ref(false)
watch(open, (v) => { if (v && props.delivery) { const d = props.delivery; type.value = d.type; tons.value = String(d.tons); price.value = String(d.price); tried.value = false } })
const num = (x) => Number(String(x).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const total = computed(() => num(tons.value) * num(price.value))
const was = computed(() => (props.delivery ? props.delivery.tons * props.delivery.price : 0))
function pickType(t) { type.value = t.type; price.value = String(t.price) }
function save() {
  tried.value = true
  if (!num(tons.value) || !num(price.value)) return
  const d = props.delivery
  const undo = updateDelivery(d, { type: type.value, tons: num(tons.value), price: num(price.value) })
  open.value = false
  toast('انحفظ تعديل التوريد', `${d.date} · ${d.tons} طن ${d.type}`, { action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" :title="delivery ? `تعديل توريد ${delivery.date}` : ''" :width="460">
    <div class="form">
      <div>
        <span class="lbl">نوع العلف</span>
        <div class="types" role="radiogroup" aria-label="نوع العلف">
          <button v-for="t in FEED_TYPES" :key="t.type" type="button" role="radio" :aria-checked="type === t.type" :class="{ on: type === t.type }" @click="pickType(t)">
            <b>{{ t.type }}</b><small class="num">{{ fmt(t.price) }} ج/طن</small>
          </button>
        </div>
      </div>
      <div class="two">
        <FilledInput v-model="tons" label="الكمية (طن)" inputmode="decimal" dir="ltr" :error="tried && !num(tons) ? 'اكتب الكمية' : ''" />
        <FilledInput v-model="price" label="سعر الطن" inputmode="numeric" dir="ltr" :error="tried && !num(price) ? 'اكتب السعر' : ''" />
      </div>
      <div class="sum">
        <span>القيمة</span>
        <span><s v-if="was !== total" class="num">{{ fmt(was) }}</s><b class="num">{{ fmt(total) }} ج</b></span>
      </div>
    </div>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">احفظ التعديل</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.types button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 8px; display: grid; gap: 2px; justify-items: center; font: inherit; cursor: pointer; }
.types b { font-size: 13px; } .types small { color: var(--color-muted); font-size: 11.5px; }
.types button.on { border-color: #e0a33a; background: #fffaf0; } .types button.on b { color: #8a5a00; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sum { display: flex; justify-content: space-between; align-items: baseline; background: #fbf7ee; border-radius: 12px; padding: 10px 14px; }
.sum s { color: var(--color-muted); font-size: 13px; margin-inline-end: 8px; } .sum b { font-size: 20px; color: #8a5a00; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
