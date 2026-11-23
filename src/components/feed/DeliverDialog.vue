<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import SelectMenu from '../ui/SelectMenu.vue'
import FilledInput from '../ui/FilledInput.vue'
import { SUPPLIERS, FEED_TYPES, fmt } from '../../data/demo.js'
import { feedOfName, deliver } from '../../data/feed.js'
import { toast } from '../../composables/useToast.js'

// Record feed delivered to a farm on credit, at the factory price. A farm without an open account also gets its settlement date.
const props = defineProps({ farm: { type: String, default: '' } })
const open = defineModel({ type: Boolean, default: false })

const name = ref('')
const type = ref(FEED_TYPES[0].type)
const tons = ref('')
const price = ref('')
const due = ref('')
const tried = ref(false)
watch(open, (v) => {
  if (!v) return
  name.value = props.farm || SUPPLIERS[0]?.name || ''
  type.value = FEED_TYPES[0].type; price.value = String(FEED_TYPES[0].price); tons.value = '2'; due.value = '2027-03-01'; tried.value = false
})
watch(type, (t) => { price.value = String(FEED_TYPES.find((x) => x.type === t).price) })

const farms = computed(() => SUPPLIERS.map((s) => ({ value: s.name, label: s.name, hint: feedOfName(s.name) ? 'عنده علف' : '' })))
const account = computed(() => feedOfName(name.value))
const n = (v) => Number(String(v).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const total = computed(() => n(tons.value) * n(price.value))
const errors = computed(() => (tried.value ? {
  tons: n(tons.value) ? '' : 'اكتب الكمية',
  price: n(price.value) ? '' : 'اكتب سعر الطن',
  due: account.value || due.value ? '' : 'حدّد تاريخ التسوية',
} : {}))

function save() {
  tried.value = true
  if (errors.value.tons || errors.value.price || errors.value.due) return
  const [y, m, d] = due.value.split('-').map(Number)
  const undo = deliver({ name: name.value, type: type.value, tons: n(tons.value), price: n(price.value), due: `${d}/${m}/${y}` })
  open.value = false
  toast('انسجّل التوريد', `${n(tons.value)} طن ${type.value} لـ${name.value} · ${fmt(total.value)} ج`, { action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" title="توريد علف" text="بينسجّل بسعر المصنع، والزيادة بتنحسب وقت التسوية." :width="480">
    <div class="form">
      <div class="fld2"><span class="lbl">المزرعة</span><SelectMenu v-model="name" :options="farms" /></div>
      <div>
        <span class="lbl">نوع العلف</span>
        <div class="types" role="radiogroup" aria-label="نوع العلف">
          <button v-for="t in FEED_TYPES" :key="t.type" type="button" role="radio" :aria-checked="type === t.type" :class="{ on: type === t.type }" @click="type = t.type">
            <b>{{ t.type }}</b><small class="num">{{ fmt(t.price) }} ج/طن</small>
          </button>
        </div>
      </div>
      <div class="two">
        <FilledInput v-model="tons" label="الكمية (طن)" inputmode="decimal" dir="ltr" :error="errors.tons" />
        <FilledInput v-model="price" label="سعر الطن من المصنع" inputmode="numeric" dir="ltr" :error="errors.price" />
      </div>
      <FilledInput v-if="!account" v-model="due" label="تاريخ التسوية" type="date" dir="ltr" :error="errors.due" hint="أول توريد لهالمزرعة، فحدّد إمتى بتتسوّى." />
      <p v-else class="note num">بينضاف لحسابه المفتوح · التسوية {{ account.due }} (بعد {{ account.daysLeft }} يوم)</p>
      <div class="sum"><span>بسعر المصنع</span><b class="num">{{ fmt(total) }} ج</b></div>
    </div>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" @click="save">سجّل التوريد</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.form { display: grid; gap: 12px; }
.lbl { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.fld2 :deep(.sel) { min-width: 0; }
.types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.types button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 8px; display: grid; gap: 2px; justify-items: center; font: inherit; cursor: pointer; transition: border-color .15s, background .15s; }
.types b { font-size: 13px; } .types small { color: var(--color-muted); font-size: 11.5px; }
.types button:hover { border-color: #e8c27a; }
.types button.on { border-color: #e0a33a; background: #fffaf0; } .types button.on b { color: #8a5a00; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.note { margin: 0; font-size: 12.5px; color: var(--color-muted); background: #f6f9f9; border-radius: 10px; padding: 8px 12px; }
.sum { display: flex; justify-content: space-between; align-items: baseline; background: #fbf7ee; border-radius: 12px; padding: 10px 14px; }
.sum b { font-size: 20px; color: #8a5a00; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
