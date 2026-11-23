<script setup>
import { ref, computed } from 'vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import { PRICES } from '../../data/demo.js'
import { gradeInUse, checkGrades, saveGrades } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// Fish grades in the order the sheet shows them, each with today's price per kg. Rename, reorder, add; delete only if unused.
const snap = () => PRICES.map(([name, price]) => ({ name, price: String(price), was: name, key: name }))
const rows = ref(snap())
let k = 0
const sig = (list) => JSON.stringify(list.map((r) => [r.name, r.price, r.was]))
const dirty = computed(() => sig(rows.value) !== sig(snap()))
const errors = computed(() => checkGrades(rows.value))
const bad = computed(() => Object.keys(errors.value).length > 0)
function move(i, d) { const j = i + d; if (j < 0 || j >= rows.value.length) return; const a = rows.value; [a[i], a[j]] = [a[j], a[i]] }
function add() { rows.value.push({ name: '', price: '', was: null, key: 'n' + ++k }) }
function del(i) { rows.value.splice(i, 1) }
const locked = (r) => r.was && gradeInUse(r.was)
function save() {
  if (bad.value) return
  const n = saveGrades(rows.value.map((r) => ({ name: r.name, price: Number(r.price), was: r.was })))
  rows.value = snap()
  toast('انحفظت الأصناف', n ? `${n} تغيير · الشيت والأسعار بياخدوها` : 'انحفظ الترتيب والأسعار')
}
const reset = () => { rows.value = snap() }
</script>

<template>
  <section class="card">
    <div class="ch"><h2>أصناف السمك</h2><span class="meta">بنفس الترتيب اللي بيطلع بالشيت · السعر بالكيلو لليوم</span></div>
    <TransitionGroup name="list" tag="ol" class="gl">
      <li v-for="(r, i) in rows" :key="r.key" :class="{ err: errors[i] }">
        <span class="ord">
          <button type="button" :disabled="i === 0" :aria-label="`طلّع ${r.name}`" @click="move(i, -1)"><AppIcon name="chevron" class="upi" /></button>
          <button type="button" :disabled="i === rows.length - 1" :aria-label="`نزّل ${r.name}`" @click="move(i, 1)"><AppIcon name="chevron" /></button>
        </span>
        <input v-model="r.name" class="nm" placeholder="اسم الصنف" :aria-label="`اسم الصنف ${i + 1}`" />
        <span class="pr"><input v-model="r.price" inputmode="decimal" dir="ltr" :aria-label="`سعر ${r.name}`" /><em>ج/ك</em></span>
        <button type="button" class="del" :disabled="!!locked(r)" :title="locked(r) ? 'مستعمل بشيت اليوم، ما بينفع ينحذف' : `احذف ${r.name}`" :aria-label="`احذف ${r.name || 'الصنف'}`" @click="del(i)"><AppIcon name="trash" /></button>
        <small v-if="errors[i]" class="sub e">{{ errors[i] }}</small>
        <small v-else-if="r.was && r.name.trim() !== r.was" class="sub ren">كان «{{ r.was }}»، بيتغيّر بالشيت كمان</small>
        <small v-else-if="!r.was" class="sub new">صنف جديد</small>
      </li>
    </TransitionGroup>
    <SoftButton icon="plus" class="addb" @click="add">صنف جديد</SoftButton>
    <SaveBar :dirty="dirty" :disabled="bad" @save="save" @reset="reset" />
  </section>
</template>

<style scoped>
.gl { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.gl li { display: grid; grid-template-columns: 30px minmax(0, 1fr) 140px 36px; grid-template-areas: "o n p d" ". s s ."; gap: 2px 10px; align-items: center; background: #f6f9f9; border-radius: 12px; padding: 6px 8px; }
.gl li.err { background: #fff4f2; }
.ord { grid-area: o; display: grid; } .ord button { border: 0; background: none; height: 18px; color: var(--color-muted); cursor: pointer; display: grid; place-items: center; border-radius: 5px; }
.ord button:hover:not(:disabled) { color: var(--color-primary-ink); background: #fff; } .ord button:disabled { opacity: .25; cursor: default; } .ord :deep(svg) { width: 15px; height: 15px; } .upi { transform: rotate(180deg); }
.nm { grid-area: n; height: 38px; border: 0; border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; font-size: 14px; font-weight: 600; outline: 0; min-width: 0; }
.nm:focus, .pr:focus-within { box-shadow: inset 0 0 0 2px var(--color-primary); }
.pr { grid-area: p; display: flex; align-items: center; background: #fff; border-radius: 9px; padding-inline-end: 10px; }
.pr input { flex: 1; min-width: 0; height: 38px; border: 0; background: none; text-align: center; font: inherit; font-size: 15px; font-weight: 700; outline: 0; color: var(--color-deep); }
.pr em { font-style: normal; font-size: 11px; color: var(--color-muted); }
.sub { grid-area: s; font-size: 11.5px; } .ren { color: #8a5a00; } .new { color: var(--color-positive); } .e { color: var(--color-negative); }
.del { grid-area: d; width: 34px; height: 34px; border: 0; border-radius: 9px; background: none; color: var(--color-muted); display: grid; place-items: center; cursor: pointer; }
.del:hover:not(:disabled) { background: var(--neg-bg); color: var(--color-negative); } .del:disabled { opacity: .3; cursor: not-allowed; } .del :deep(svg) { width: 16px; height: 16px; }
.addb { margin-top: 10px; }
@media (max-width: 520px) { .gl li { grid-template-columns: 26px minmax(0, 1fr) 36px; grid-template-areas: "o n d" "o p ." ". s ."; } }
</style>
