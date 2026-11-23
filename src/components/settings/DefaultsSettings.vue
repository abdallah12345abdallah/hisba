<script setup>
import { ref, reactive, computed } from 'vue'
import FilledInput from '../ui/FilledInput.vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import { fmt } from '../../data/demo.js'
import { SETTINGS, saveDefaults } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// What a new farm or trader starts with: the default commission, the quick commission choices, the trader's credit limit.
const snap = () => ({ defaultRate: String(SETTINGS.defaultRate), rates: [...SETTINGS.rates], defaultLimit: String(SETTINGS.defaultLimit) })
const f = reactive(snap())
const newRate = ref('')
const num = (x) => Number(String(x).replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d.]/g, '')) || 0
const dirty = computed(() => JSON.stringify(f) !== JSON.stringify(snap()))
const errors = computed(() => ({
  rate: num(f.defaultRate) > 0 && num(f.defaultRate) <= 15 ? '' : 'العمولة بين 1% و 15%',
  limit: num(f.defaultLimit) >= 1000 ? '' : 'الحد لازم يكون 1,000 ج أو أكتر',
  rates: f.rates.length ? '' : 'خلّي اختيار واحد على الأقل',
}))
const bad = computed(() => Object.values(errors.value).some(Boolean))
function addRate() { const v = num(newRate.value); if (v > 0 && v <= 15 && !f.rates.includes(v)) { f.rates.push(v); f.rates.sort((a, b) => a - b) } newRate.value = '' }
function dropRate(r) { f.rates = f.rates.filter((x) => x !== r) }
function save() {
  if (bad.value) return
  saveDefaults({ defaultRate: num(f.defaultRate), rates: [...f.rates], defaultLimit: num(f.defaultLimit) })
  Object.assign(f, snap())
  toast('انحفظت الافتراضيات', 'أي مورد أو تاجر جديد بيبلّش فيها')
}
const reset = () => Object.assign(f, snap())
</script>

<template>
  <section class="card">
    <div class="ch"><h2>الموردين والتجار</h2><span class="meta">بتنطبق على الجديد بس، القديم بيضل متل ما هو</span></div>
    <div class="blocks">
      <div class="blk">
        <span class="bh"><AppIcon name="farm" /><b>مورد جديد</b></span>
        <FilledInput v-model="f.defaultRate" label="العمولة اللي بيبلّش فيها %" inputmode="decimal" dir="ltr" :error="errors.rate" />
        <div>
          <small class="lbl">اختيارات العمولة السريعة بفورم المورد</small>
          <div class="chips">
            <span v-for="r in f.rates" :key="r" class="chip num" :class="{ def: num(f.defaultRate) === r }">{{ r }}%<button type="button" :aria-label="`شيل ${r}%`" @click="dropRate(r)"><AppIcon name="x" /></button></span>
            <span class="addc"><input v-model="newRate" inputmode="decimal" dir="ltr" placeholder="+ %" aria-label="اختيار عمولة جديد" @keydown.enter.prevent="addRate" @blur="addRate" /></span>
          </div>
          <small v-if="errors.rates" class="e">{{ errors.rates }}</small>
        </div>
      </div>
      <div class="blk">
        <span class="bh"><AppIcon name="traders" /><b>تاجر جديد</b></span>
        <FilledInput v-model="f.defaultLimit" label="حد الدين (ج)" inputmode="numeric" dir="ltr" :error="errors.limit" :hint="`لما يعدّي ${fmt(num(f.defaultLimit))} ج بيطلع تنبيه بالشيت والرئيسية.`" />
        <div class="quick"><button v-for="v in [10000, 15000, 20000, 30000]" :key="v" type="button" class="num" :class="{ on: num(f.defaultLimit) === v }" @click="f.defaultLimit = String(v)">{{ fmt(v) }}</button></div>
      </div>
    </div>
    <SaveBar :dirty="dirty" :disabled="bad" @save="save" @reset="reset" />
  </section>
</template>

<style scoped>
.blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.blk { background: #f6f9f9; border-radius: 16px; padding: 14px; display: grid; gap: 12px; align-content: start; }
.bh { display: flex; align-items: center; gap: 8px; } .bh :deep(svg) { width: 18px; height: 18px; color: var(--color-primary); } .bh b { font-size: 14px; }
.lbl { display: block; font-size: 12px; color: var(--color-muted); margin-bottom: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.chip { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 6px 0 12px; border-radius: 9px; background: #fff; font-size: 13px; font-weight: 600; box-shadow: inset 0 0 0 1px #e1eaea; }
.chip.def { box-shadow: inset 0 0 0 1.5px var(--color-primary); color: var(--color-primary-ink); }
.chip button { border: 0; background: none; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; color: var(--color-muted); cursor: pointer; } .chip button:hover { background: var(--neg-bg); color: var(--color-negative); } .chip :deep(svg) { width: 13px; height: 13px; }
.addc input { width: 64px; height: 32px; border: 1.5px dashed #c7d6d7; border-radius: 9px; background: none; text-align: center; font: inherit; font-size: 13px; outline: 0; } .addc input:focus { border-color: var(--color-primary); background: #fff; }
.e { color: var(--color-negative); font-size: 12px; }
.quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.quick button { border: 0; height: 32px; border-radius: 9px; background: #fff; font: inherit; font-size: 12.5px; font-weight: 600; cursor: pointer; }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
@media (max-width: 820px) { .blocks { grid-template-columns: 1fr; } }
</style>
