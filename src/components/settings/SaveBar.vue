<script setup>
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'

// Shows only while a section has unsaved changes: what is pending, undo the edits, or save.
defineProps({ dirty: Boolean, text: { type: String, default: 'في تعديلات ما انحفظت' }, disabled: Boolean })
defineEmits(['save', 'reset'])
</script>

<template>
  <Transition name="bar">
    <div v-if="dirty" class="savebar" role="status">
      <span class="t"><AppIcon name="edit" />{{ text }}</span>
      <SoftButton @click="$emit('reset')">رجّع متل ما كان</SoftButton>
      <SoftButton tone="primary" icon="check" :disabled="disabled" @click="$emit('save')">احفظ</SoftButton>
    </div>
  </Transition>
</template>

<style scoped>
.savebar { position: sticky; bottom: 12px; z-index: 6; display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 8px 10px 8px 8px; border-radius: 16px; background: #fff; border: 1px solid #f3dca8; box-shadow: 0 18px 34px -18px rgb(11 59 69 / .55); }
.t { flex: 1; display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #8a5a00; padding-inline-start: 8px; } .t :deep(svg) { width: 16px; height: 16px; }
.bar-enter-active, .bar-leave-active { transition: transform .3s cubic-bezier(.2, .9, .25, 1), opacity .25s; }
.bar-enter-from, .bar-leave-to { transform: translateY(16px); opacity: 0; }
</style>
