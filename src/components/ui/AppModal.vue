<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue'

// Dialog — "نافذة بالنص" (approved أ). Closes on Esc and on the backdrop; focus moves in and returns.
const props = defineProps({ title: String, text: String, width: { type: Number, default: 440 } })
const open = defineModel({ type: Boolean, default: false })
const box = ref(null)
let back = null

watch(open, async (v) => {
  if (v) { back = document.activeElement; await nextTick(); box.value?.querySelector('button, input, [tabindex]')?.focus() }
  else back?.focus?.()
})
function onKey(e) { if (e.key === 'Escape' && open.value) open.value = false }
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="mscrim" dir="rtl" @pointerdown.self="open = false">
        <div ref="box" class="mbox" role="dialog" aria-modal="true" :aria-label="title" :style="{ maxWidth: `${props.width}px` }">
          <h3 v-if="title">{{ title }}</h3>
          <p v-if="text" class="mtext">{{ text }}</p>
          <slot />
          <div v-if="$slots.actions" class="mact"><slot name="actions" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
