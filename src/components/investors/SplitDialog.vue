<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import PartnersEditor from './PartnersEditor.vue'
import { fmt } from '../../data/demo.js'
import { SPLIT, checkPartners } from '../../data/investors.js'
import { saveSplit } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// How the year's profit is split: the management share, and how the management partners divide it (each his own %).
const open = defineModel({ type: Boolean, default: false })
const props = defineProps({ profit: { type: Number, default: 0 } })
const mgmt = ref(25)
const partners = ref([])
watch(open, (v) => { if (v) { mgmt.value = SPLIT.mgmt; partners.value = SPLIT.partners.map((p) => ({ ...p })) } })
const valid = computed(() => mgmt.value >= 0 && mgmt.value <= 50 && !Object.keys(checkPartners(partners.value).errors).length)
const mAmount = computed(() => Math.round((props.profit * mgmt.value) / 100))
function save() {
  if (!valid.value) return
  saveSplit({ mgmt: mgmt.value, partners: partners.value })
  toast('انحفظ التوزيع', `الإدارة ${mgmt.value}% بين ${partners.value.length} شركاء · المساهمين ${100 - mgmt.value}%`)
  open.value = false
}
</script>

<template>
  <AppModal v-model="open" title="طريقة توزيع الربح" text="بتنطبق على توزيع السنة الجاي وعلى المحاكي هلأ." :width="540">
    <div class="blk">
      <div class="lh"><span>نصيب الإدارة من الربح</span><b class="num">{{ mgmt }}%</b></div>
      <input v-model.number="mgmt" type="range" min="0" max="50" step="1" aria-label="نصيب الإدارة" />
      <div class="chips"><button v-for="v in [20, 25, 30]" :key="v" type="button" class="num" :class="{ on: mgmt === v }" @click="mgmt = v">{{ v }}%</button></div>
      <div class="bar"><i class="m" :style="{ width: mgmt + '%' }">الإدارة</i><i class="s">المساهمين {{ 100 - mgmt }}%</i></div>
    </div>
    <div class="blk">
      <div class="lh"><span>شركاء الإدارة</span><b class="num">{{ fmt(mAmount) }} ج</b></div>
      <PartnersEditor v-model="partners" :amount="mAmount" />
    </div>
    <p class="note num">مثال على ربح {{ fmt(profit) }} ج: الإدارة {{ fmt(mAmount) }} ج بتنقسم على الشركاء بنسبهم، والباقي {{ fmt(profit - mAmount) }} ج على رأس المال الموزون. المساهم 50/50 بيرجع نص ربحه للإدارة.</p>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="check" :disabled="!valid" @click="save">احفظ</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.blk { display: grid; gap: 8px; background: #f6f9f9; border-radius: 14px; padding: 12px 14px; }
.lh { display: flex; justify-content: space-between; font-size: 13px; } .lh b { font-size: 18px; color: var(--color-deep); }
input[type=range] { width: 100%; accent-color: var(--color-primary); }
.chips { display: flex; gap: 6px; }
.chips button { border: 0; height: 30px; padding: 0 14px; border-radius: 8px; background: #fff; font: inherit; font-size: 12.5px; cursor: pointer; }
.chips button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
.bar { display: flex; height: 28px; border-radius: 8px; overflow: hidden; font-size: 11.5px; font-weight: 600; }
.bar i { font-style: normal; display: grid; place-items: center; white-space: nowrap; overflow: hidden; transition: width .3s; }
.bar .m { background: #f5b04f; color: #5c3b00; } .bar .s { flex: 1; background: var(--color-primary); color: #fff; }
.note { margin: 0; font-size: 12.5px; color: var(--color-muted); line-height: 1.8; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
