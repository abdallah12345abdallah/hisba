<script setup>
import AppModal from './AppModal.vue'
import SoftButton from './SoftButton.vue'

// Delete confirm — "نافذة تأكيد" (approved أ). Names the object and the consequence; the destructive button says what it does.
defineProps({ title: String, text: String, confirm: { type: String, default: 'احذف' }, cancel: { type: String, default: 'لا' }, tone: { type: String, default: 'danger' } })
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['confirm'])
</script>

<template>
  <AppModal v-model="open" :title="title" :text="text" :width="400">
    <template #actions>
      <SoftButton @click="open = false">{{ cancel }}</SoftButton>
      <SoftButton :tone="tone" @click="emit('confirm'); open = false">{{ confirm }}</SoftButton>
    </template>
  </AppModal>
</template>
