<script setup>
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import StatusPill from '../ui/StatusPill.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { RECURRING, catOf, isPaid, dueIn } from '../../data/expenses.js'

// Every fixed monthly expense, with pay / edit / add. Opened from the expenses header.
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['pay', 'edit', 'add'])
const paid = () => RECURRING.filter(isPaid).length
</script>

<template>
  <AppModal v-model="open" title="المصاريف الثابتة" :text="`اندفع ${paid()} من ${RECURRING.length} هالشهر`" :width="520">
    <ul class="rec">
      <li v-for="r in RECURRING" :key="r.id" :class="{ paid: isPaid(r), late: !isPaid(r) && dueIn(r) < 0 }">
        <span class="ic"><AppIcon :name="catOf(r.cat).icon" /></span>
        <button type="button" class="nm" @click="emit('edit', r)"><b>{{ r.name }}</b><small class="num">{{ fmt(r.amount) }} ج · يوم {{ r.day }} بالشهر</small></button>
        <StatusPill v-if="isPaid(r)" tone="ok">اندفع</StatusPill>
        <SoftButton v-else size="sm" :tone="dueIn(r) < 0 ? 'danger' : 'primary'" @click="emit('pay', r)">{{ dueIn(r) < 0 ? `متأخر ${-dueIn(r)} يوم · ادفع` : dueIn(r) === 0 ? 'اليوم · ادفع' : `بعد ${dueIn(r)} يوم · ادفع` }}</SoftButton>
      </li>
    </ul>
    <template #actions>
      <div class="acts"><SoftButton icon="plus" @click="emit('add')">مصروف ثابت جديد</SoftButton><SoftButton tone="primary" @click="open = false">تمام</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.rec { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 380px; overflow-y: auto; }
.rec li { display: flex; align-items: center; gap: 10px; background: #f7fafa; border-radius: 12px; padding: 8px 10px; border: 1px solid #e8efef; }
.rec li.late { border-color: #f3c3bf; background: #fff8f7; } .rec li.paid { opacity: .75; }
.rec .ic { width: 32px; height: 32px; border-radius: 9px; background: #fff; color: var(--color-primary); display: grid; place-items: center; flex: none; } .rec .ic :deep(svg) { width: 16px; height: 16px; }
.rec .nm { flex: 1; min-width: 0; border: 0; background: none; padding: 0; text-align: right; font: inherit; cursor: pointer; display: grid; }
.rec .nm b { font-size: 13.5px; font-weight: 600; } .rec .nm small { color: var(--color-muted); font-size: 11.5px; } .rec .nm:hover b { color: var(--color-primary-ink); text-decoration: underline; text-underline-offset: 3px; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: space-between; }
</style>
