<script setup>
import { computed } from 'vue'

// Date — "نطاق مع اختيارات جاهزة" (approved ب). Presets on the side, the month below; Friday dimmed (market closed).
// v-model: { from: Date, to: Date, preset }
const model = defineModel({ type: Object, required: true })
const props = defineProps({ today: { type: Date, default: () => new Date(2026, 10, 22) } })

const day = (d, n = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const PRESETS = computed(() => {
  const t = props.today
  return [
    { key: 'today', label: 'اليوم', from: t, to: t },
    { key: 'yesterday', label: 'أمس', from: day(t, -1), to: day(t, -1) },
    { key: 'week', label: 'آخر 7 أيام', from: day(t, -6), to: t },
    { key: 'month', label: 'هالشهر', from: new Date(t.getFullYear(), t.getMonth(), 1), to: t },
    { key: 'lastMonth', label: 'الشهر الماضي', from: new Date(t.getFullYear(), t.getMonth() - 1, 1), to: new Date(t.getFullYear(), t.getMonth(), 0) },
  ]
})
const WEEK = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
const cells = computed(() => {
  const t = model.value.to || props.today
  const first = new Date(t.getFullYear(), t.getMonth(), 1)
  const days = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() + 1) % 7 // week starts Saturday
  const out = Array.from({ length: lead }, () => null)
  for (let d = 1; d <= days; d++) out.push(new Date(t.getFullYear(), t.getMonth(), d))
  return out
})
const title = computed(() => { const t = model.value.to || props.today; return `${MONTHS[t.getMonth()]} ${t.getFullYear()}` })
const same = (a, b) => a && b && a.toDateString() === b.toDateString()
function cls(d) {
  const { from, to } = model.value
  return { fr: d.getDay() === 5, rs: same(d, from), re: same(d, to), rg: from && to && d > from && d < to, td: same(d, props.today) }
}
function pickDay(d) {
  const { from, to } = model.value
  if (!from || (from && to && !same(from, to))) model.value = { from: d, to: d, preset: null }
  else model.value = d < from ? { from: d, to: from, preset: null } : { from, to: d, preset: null }
}
</script>

<template>
  <div class="drange">
    <div class="pres">
      <button v-for="p in PRESETS" :key="p.key" type="button" :class="{ on: model.preset === p.key }" @click="model = { from: p.from, to: p.to, preset: p.key }">{{ p.label }}</button>
    </div>
    <div class="cal">
      <div class="mh">{{ title }}</div>
      <div class="gd">
        <span v-for="w in WEEK" :key="w" class="w">{{ w }}</span>
        <template v-for="(d, i) in cells" :key="i">
          <span v-if="!d" />
          <button v-else type="button" class="d num" :class="cls(d)" @click="pickDay(d)">{{ d.getDate() }}</button>
        </template>
      </div>
    </div>
  </div>
</template>
