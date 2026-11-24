<script setup>
import { ref, computed } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import SaleInvoice from './SaleInvoice.vue'
import { fmt } from '../../data/demo.js'
import { buyersToday, whatsappSaleInvoice } from '../../data/traders.js'

// Today's sales invoices: one per trader who bought (from every manifest), biggest first. Open one to print, or send it straight on WhatsApp.
const open = defineModel({ type: Boolean, default: false })
const list = computed(() => (open.value ? buyersToday() : []))
const total = computed(() => list.value.reduce((a, b) => a + b.total, 0))
const pick = ref(null)
const invOpen = ref(false)
function show(name) { pick.value = name; invOpen.value = true }
</script>

<template>
  <AppModal v-model="open" title="فواتير التجار اليوم" :text="`${list.length} فواتير · ${fmt(total)} ج. كل تاجر إله فاتورة وحدة فيها كل اللي اشتراه من كل البيانات.`" :width="560">
    <p v-if="!list.length" class="none">لسا ما في بيعات اليوم.</p>
    <ul v-else class="blist">
      <li v-for="b in list" :key="b.name">
        <button type="button" class="open" @click="show(b.name)">
          <span class="ic"><AppIcon name="receipt" /></span>
          <span class="w"><b>{{ b.name }}</b><small class="num">#{{ b.no }} · {{ b.rows.length }} {{ b.rows.length === 1 ? 'سطر' : 'سطور' }}<template v-if="b.cash"> · نقدي {{ fmt(b.cash) }}</template><template v-if="b.credit"> · آجل {{ fmt(b.credit) }}</template></small></span>
          <b class="amt num">{{ fmt(b.total) }} ج</b>
        </button>
        <button v-if="b.trader" type="button" class="wa" :aria-label="`ابعت فاتورة ${b.name} واتساب`" title="واتساب" @click="whatsappSaleInvoice(b.name)"><AppIcon name="whatsapp" /></button>
      </li>
    </ul>
    <template #actions><div class="acts"><SoftButton @click="open = false">سكّر</SoftButton></div></template>
  </AppModal>
  <SaleInvoice v-model="invOpen" :name="pick" />
</template>

<style scoped>
.none { margin: 0; text-align: center; color: var(--color-muted); padding: 18px; }
.blist { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 56vh; overflow-y: auto; }
.blist li { display: flex; gap: 6px; }
.open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; border: 0; background: #fff; box-shadow: 0 0 0 1px #e3eded; border-radius: 12px; padding: 9px 12px; font: inherit; text-align: right; cursor: pointer; transition: box-shadow .15s, background .15s; }
.open:hover { box-shadow: 0 0 0 1.5px var(--color-primary); background: #fbfefe; }
.ic { width: 34px; height: 34px; border-radius: 10px; background: var(--color-primary-pale); color: var(--color-primary-ink); display: grid; place-items: center; flex: none; } .ic :deep(svg) { width: 17px; height: 17px; }
.w { flex: 1; min-width: 0; } .w b { display: block; font-size: 13.5px; } .w small { color: var(--color-muted); font-size: 11.5px; }
.amt { font-size: 14.5px; color: var(--color-deep); white-space: nowrap; }
.wa { width: 44px; flex: none; border: 1px solid #9fd0dc; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 12px; display: grid; place-items: center; cursor: pointer; }
.wa:hover { border-color: var(--color-primary); } .wa :deep(svg) { width: 18px; height: 18px; }
.acts { display: flex; justify-content: flex-end; width: 100%; }
</style>
