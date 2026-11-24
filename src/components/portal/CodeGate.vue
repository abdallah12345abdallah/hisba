<script setup>
import { ref, nextTick, onMounted } from 'vue'
import AppIcon from '../AppIcon.vue'
import { AGENCY } from '../../data/demo.js'
import { unlockWithCode, portalLockedFor } from '../../data/portal.js'

// The 4-digit code a trader or a farm types before his own page opens (once per device).
const props = defineProps({ kind: { type: String, required: true }, rec: { type: Object, required: true } })
const code = ref(['', '', '', ''])
const err = ref('')
const shake = ref(false)
const boxes = ref([])
onMounted(() => nextTick(() => boxes.value[0]?.focus()))
const AR = '٠١٢٣٤٥٦٧٨٩'
function onInput(i, e) {
  const v = String(e.target.value).replace(/[٠-٩]/g, (c) => AR.indexOf(c)).replace(/\D/g, '')
  if (v.length > 1) { v.slice(0, 4).split('').forEach((d, k) => { code.value[k] = d }); boxes.value[Math.min(3, v.length - 1)]?.focus() } else { code.value[i] = v; if (v && i < 3) boxes.value[i + 1]?.focus() }
  err.value = ''
  if (code.value.every(Boolean)) submit()
}
function onBack(i, e) { if (!code.value[i] && i > 0) { e.preventDefault(); code.value[i - 1] = ''; boxes.value[i - 1]?.focus() } }
function submit() {
  const r = unlockWithCode(props.kind, props.rec, code.value.join(''))
  if (r.ok) return
  shake.value = true; setTimeout(() => { shake.value = false }, 500)
  code.value = ['', '', '', '']
  err.value = r.locked ? `كتير محاولات غلط · استنى ${portalLockedFor()} ثانية` : `الكود غلط · باقيلك ${r.left} محاولات`
  nextTick(() => boxes.value[0]?.focus())
}
</script>

<template>
  <main class="gate">
    <span class="gl"><img :src="AGENCY.logo || '/logo-full.webp'" alt="" :class="{ own: AGENCY.logo }" /></span>
    <small>{{ AGENCY.name }} · {{ AGENCY.place }}</small>
    <h1>أهلين {{ rec.name }}</h1>
    <p>اكتب كود الدخول (4 أرقام) اللي وصلك من الوكالة، وبتشوف {{ kind === 'trader' ? 'حسابك وفواتيرك' : 'كشفك وفواتير بياناتك' }}.</p>
    <div class="cells" :class="{ shake }" dir="ltr">
      <input v-for="i in 4" :key="i" :ref="(el) => (boxes[i - 1] = el)" :value="code[i - 1]" class="cell num" type="tel" inputmode="numeric" maxlength="4" autocomplete="one-time-code"
        :aria-label="`الرقم ${i} من الكود`" @input="onInput(i - 1, $event)" @keydown.backspace="onBack(i - 1, $event)" @focus="$event.target.select()" />
    </div>
    <p class="err" role="alert">{{ err }}</p>
    <small class="help"><AppIcon name="key" />نسيت الكود؟ اطلب كود جديد من الوكالة{{ AGENCY.phone ? ` على ${AGENCY.phone}` : '' }}.</small>
  </main>
</template>

<style scoped>
.gate { max-width: 420px; margin: 0 auto; background: #fff; border-radius: 22px; padding: 28px 24px; box-shadow: 0 24px 60px -34px rgb(11 59 69 / .6); display: grid; justify-items: center; gap: 8px; text-align: center; }
.gl { width: 108px; height: 64px; border-radius: 16px; background: linear-gradient(150deg, #0e7490, #0b5870); display: grid; place-items: center; margin-bottom: 4px; }
.gl img { width: 88px; height: auto; } .gl img.own { width: 52px; height: 52px; object-fit: contain; background: #fff; border-radius: 10px; }
.gate small { color: var(--color-muted); font-size: 12.5px; }
.gate h1 { margin: 0; font-size: 22px; color: var(--color-deep); }
.gate p { margin: 0; font-size: 13.5px; color: var(--color-muted); line-height: 1.8; }
.cells { display: flex; gap: 10px; margin-top: 10px; }
.cell { width: 56px; height: 64px; border: 0; border-radius: 14px; background: #f1f7f7; box-shadow: inset 0 0 0 1.5px #d5e3e5; font: inherit; font-size: 28px; font-weight: 700; text-align: center; color: var(--color-deep); outline: 0; }
.cell:focus { box-shadow: inset 0 0 0 2px var(--color-primary); background: #fff; }
.shake { animation: shake .4s; } @keyframes shake { 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
.err { min-height: 22px; color: var(--color-negative) !important; font-size: 12.5px !important; }
.help { display: inline-flex; align-items: center; gap: 6px; } .help :deep(svg) { width: 15px; height: 15px; }
@media (prefers-reduced-motion: reduce) { .shake { animation: none; } }
</style>
