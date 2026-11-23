<script setup>
import { ref, computed, onMounted, onBeforeUnmount, useId } from 'vue'
import AppIcon from '../AppIcon.vue'

// Select — "قائمة مع علامة صح" (approved أ). options: [{ value, label, hint }]
const props = defineProps({ options: { type: Array, required: true }, label: String, placeholder: { type: String, default: 'اختار…' } })
const model = defineModel()
const open = ref(false)
const root = ref(null)
const id = useId()
const current = computed(() => props.options.find((o) => o.value === model.value))

function pick(o) { model.value = o.value; open.value = false }

/* open upward when there isn't room below (inside the scrolling bubble or the window) */
const up = ref(false)
function bottomLimit(el) {
  let limit = window.innerHeight, top = 0
  for (let n = el.parentElement; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY
    if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') { const r = n.getBoundingClientRect(); limit = Math.min(limit, r.bottom); top = Math.max(top, r.top); break }
  }
  return { limit, top }
}
function toggle() {
  if (!open.value && root.value) {
    const r = root.value.getBoundingClientRect()
    const { limit, top } = bottomLimit(root.value)
    const need = props.options.length * 38 + 24
    up.value = limit - r.bottom < need && r.top - top > limit - r.bottom
  }
  open.value = !open.value
}
function onDoc(e) { if (root.value && !root.value.contains(e.target)) open.value = false }
onMounted(() => document.addEventListener('pointerdown', onDoc))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDoc))
</script>

<template>
  <div ref="root" class="sel" @keydown.esc="open = false">
    <label v-if="label" class="lbl" :for="id">{{ label }}</label>
    <button :id="id" type="button" class="trig" :class="{ open }" :aria-expanded="open" aria-haspopup="listbox" @click="toggle">
      <span :class="{ ph: !current }">{{ current ? current.label : placeholder }}</span>
      <small v-if="current?.hint" class="hint">{{ current.hint }}</small>
      <AppIcon name="chevron" />
    </button>
    <Transition name="pop">
      <ul v-if="open" class="menu" :class="{ up }" role="listbox">
        <li v-for="o in options" :key="o.value" role="option" :aria-selected="o.value === model" :class="{ on: o.value === model }" tabindex="0" @click="pick(o)" @keydown.enter.prevent="pick(o)">
          <span>{{ o.label }}</span><small v-if="o.hint">{{ o.hint }}</small>
          <AppIcon v-if="o.value === model" name="check" class="ck" />
        </li>
      </ul>
    </Transition>
  </div>
</template>
