<script setup>
import { ref, computed } from 'vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import { fmt } from '../../data/demo.js'
import { CATS } from '../../data/expenses.js'
import { ICON_CHOICES, catInUse, saveCats } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// Expense categories: name, icon, monthly budget, and the words that pick the category by themselves when an expense is typed.
const snap = () => CATS.map((c) => ({ key: c.key, label: c.label, icon: c.icon, budget: String(c.budget), words: c.words.join('، '), fresh: false }))
const rows = ref(snap())
let n = 0
const sig = (list) => JSON.stringify(list.map((r) => [r.key, r.label, r.icon, r.budget, r.words]))
const dirty = computed(() => sig(rows.value) !== sig(snap()))
const errors = computed(() => {
  const e = {}, seen = new Set()
  rows.value.forEach((r, i) => { const l = r.label.trim(); if (!l) e[i] = 'اكتب اسم البند'; else if (seen.has(l)) e[i] = 'الاسم مكرر'; seen.add(l) })
  return e
})
const bad = computed(() => Object.keys(errors.value).length > 0)
const total = computed(() => rows.value.reduce((a, r) => a + (Number(String(r.budget).replace(/[^\d]/g, '')) || 0), 0))
const picking = ref(null) // row key whose icon menu is open
function add() { const key = `c${Date.now().toString(36)}${++n}`; rows.value.splice(rows.value.length - 1, 0, { key, label: '', icon: 'dots', budget: '1000', words: '', fresh: true }); picking.value = null }
const locked = (r) => !r.fresh && (r.key === 'other' || catInUse(r.key))
function del(i) { rows.value.splice(i, 1) }
function save() {
  if (bad.value) return
  saveCats(rows.value.map((r) => ({ ...r, budget: Number(String(r.budget).replace(/[^\d]/g, '')) || 0 })))
  rows.value = snap()
  toast('انحفظت بنود المصاريف', `${CATS.length} بنود · ميزانية الشهر ${fmt(total.value)} ج`)
}
const reset = () => { rows.value = snap(); picking.value = null }
</script>

<template>
  <section class="card">
    <div class="ch"><h2>بنود المصاريف</h2><span class="meta num">ميزانية الشهر {{ fmt(total) }} ج</span></div>
    <TransitionGroup name="list" tag="ul" class="cl">
      <li v-for="(r, i) in rows" :key="r.key" :class="{ err: errors[i] }">
        <span class="ic">
          <button type="button" class="icb" :aria-label="`أيقونة ${r.label}`" :aria-expanded="picking === r.key" @click="picking = picking === r.key ? null : r.key"><AppIcon :name="r.icon" /></button>
          <span v-if="picking === r.key" class="icons" role="listbox" :aria-label="`اختار أيقونة ${r.label}`">
            <button v-for="ic in ICON_CHOICES" :key="ic" type="button" role="option" :aria-selected="r.icon === ic" :class="{ on: r.icon === ic }" @click="r.icon = ic; picking = null"><AppIcon :name="ic" /></button>
          </span>
        </span>
        <input v-model="r.label" class="nm" placeholder="اسم البند" :aria-label="`اسم البند ${i + 1}`" />
        <span class="bud"><input v-model="r.budget" inputmode="numeric" dir="ltr" :aria-label="`ميزانية ${r.label}`" /><em>ج/شهر</em></span>
        <button type="button" class="del" :disabled="locked(r)" :title="locked(r) ? 'عليه مصاريف هالشهر أو مصروف ثابت، ما بينفع ينحذف' : `احذف ${r.label}`" :aria-label="`احذف ${r.label || 'البند'}`" @click="del(i)"><AppIcon name="trash" /></button>
        <input v-model="r.words" class="words" :placeholder="r.key === 'other' ? 'أي مصروف ما بيطابق بند تاني' : 'كلمات بتختاره لحاله، مثلاً: ثلج، تلج'" :disabled="r.key === 'other'" :aria-label="`كلمات ${r.label}`" />
        <small v-if="errors[i]" class="e">{{ errors[i] }}</small>
      </li>
    </TransitionGroup>
    <SoftButton icon="plus" class="addb" @click="add">بند جديد</SoftButton>
    <SaveBar :dirty="dirty" :disabled="bad" @save="save" @reset="reset" />
  </section>
</template>

<style scoped>
.cl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.cl li { display: grid; grid-template-columns: 40px minmax(0, 1fr) 150px 36px; grid-template-areas: "i n b d" ". w w ." ". e e ."; gap: 6px 10px; align-items: center; background: #f6f9f9; border-radius: 12px; padding: 8px; }
.cl li.err { background: #fff4f2; }
.ic { grid-area: i; position: relative; }
.icb { width: 40px; height: 40px; border: 0; border-radius: 11px; background: #fff; color: var(--color-primary); display: grid; place-items: center; cursor: pointer; box-shadow: inset 0 0 0 1px #e1eaea; }
.icb:hover { box-shadow: inset 0 0 0 1.5px var(--color-primary); } .icb :deep(svg) { width: 18px; height: 18px; }
.icons { position: absolute; top: 46px; inset-inline-start: 0; z-index: 10; display: grid; grid-template-columns: repeat(5, 34px); gap: 4px; padding: 8px; background: #fff; border-radius: 14px; box-shadow: 0 18px 36px -14px rgb(11 59 69 / .45); animation: pop .2s cubic-bezier(.3, 1.4, .5, 1); }
@keyframes pop { from { transform: scale(.9); opacity: 0; } }
.icons button { width: 34px; height: 34px; border: 0; border-radius: 9px; background: #f4f8f8; color: var(--color-deep); display: grid; place-items: center; cursor: pointer; }
.icons button:hover { background: var(--color-primary-pale); } .icons button.on { background: var(--color-primary); color: #fff; } .icons :deep(svg) { width: 16px; height: 16px; }
.nm { grid-area: n; height: 38px; border: 0; border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; font-size: 14px; font-weight: 600; outline: 0; min-width: 0; }
.bud { grid-area: b; display: flex; align-items: center; background: #fff; border-radius: 9px; padding-inline-end: 10px; }
.bud input { flex: 1; min-width: 0; height: 38px; border: 0; background: none; text-align: center; font: inherit; font-size: 14.5px; font-weight: 700; outline: 0; color: var(--color-deep); }
.bud em { font-style: normal; font-size: 10.5px; color: var(--color-muted); white-space: nowrap; }
.words { grid-area: w; height: 32px; border: 0; border-radius: 8px; padding: 0 10px; background: rgb(255 255 255 / .7); font: inherit; font-size: 12.5px; outline: 0; color: var(--color-muted); min-width: 0; }
.words:disabled { opacity: .7; }
.nm:focus, .bud:focus-within, .words:focus { box-shadow: inset 0 0 0 2px var(--color-primary); background: #fff; color: var(--color-ink); }
.del { grid-area: d; width: 34px; height: 34px; border: 0; border-radius: 9px; background: none; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; }
.del:hover:not(:disabled) { background: var(--neg-bg); color: var(--color-negative); } .del:disabled { opacity: .3; cursor: not-allowed; } .del :deep(svg) { width: 16px; height: 16px; }
.e { grid-area: e; color: var(--color-negative); font-size: 11.5px; }
.addb { margin-top: 10px; }
@media (max-width: 560px) { .cl li { grid-template-columns: 40px minmax(0, 1fr) 36px; grid-template-areas: "i n d" "i b ." ". w w" ". e e"; } }
</style>
