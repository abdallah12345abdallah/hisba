<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue'

// Success dialog: a centred card that pops in, a ring fills, a burst of dots, then the check draws itself.
// rows: [{ label, value }] shown under the message, each sliding in after the check.
const props = defineProps({ title: String, text: String, rows: { type: Array, default: () => [] } })
const open = defineModel({ type: Boolean, default: false })
const box = ref(null)
let back = null

watch(open, async (v) => {
  if (v) { back = document.activeElement; await nextTick(); box.value?.querySelector('.sact button')?.focus() }
  else back?.focus?.()
})
function onKey(e) { if (e.key === 'Escape' && open.value) open.value = false }
document.addEventListener('keydown', onKey)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
const DOTS = 10
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="mscrim" dir="rtl" @pointerdown.self="open = false">
        <div ref="box" class="sbox" role="alertdialog" aria-modal="true" :aria-label="title">
          <div class="mark" aria-hidden="true">
            <span v-for="i in DOTS" :key="i" class="dot" :style="{ '--a': `${(i - 1) * (360 / DOTS)}deg` }" />
            <svg viewBox="0 0 64 64">
              <circle class="ring" cx="32" cy="32" r="28" />
              <path class="tick" d="M20 33.5l8 8 16-17" />
            </svg>
          </div>
          <h3>{{ title }}</h3>
          <p v-if="text">{{ text }}</p>
          <dl v-if="rows.length" class="rows">
            <div v-for="(r, i) in rows" :key="r.label" :style="{ '--i': i }"><dt>{{ r.label }}</dt><dd class="num">{{ r.value }}</dd></div>
          </dl>
          <div class="sact"><slot name="actions" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sbox { width: 100%; max-width: 400px; background: #fff; border-radius: 22px; padding: 30px 26px 22px; text-align: center; display: grid; gap: 6px;
  box-shadow: 0 30px 60px -24px rgb(8 38 42 / .55); animation: pop .5s cubic-bezier(.2, 1.3, .4, 1) both; }
@keyframes pop { from { transform: scale(.86) translateY(14px); opacity: 0; } }
.mark { position: relative; width: 88px; height: 88px; margin: 0 auto 10px; display: grid; place-items: center; }
.mark svg { width: 88px; height: 88px; position: relative; }
.ring { fill: var(--color-positive); transform-origin: center; animation: ring .45s cubic-bezier(.2, 1.4, .4, 1) .12s both; }
@keyframes ring { from { transform: scale(0); } }
.tick { fill: none; stroke: #fff; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; animation: draw .4s ease .45s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }
.mark::before { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--color-positive); opacity: 0; animation: halo .9s ease-out .3s; }
@keyframes halo { from { opacity: .35; transform: scale(.8); } to { opacity: 0; transform: scale(1.7); } }
.dot { position: absolute; top: 50%; left: 50%; width: 7px; height: 7px; margin: -3.5px; border-radius: 50%; background: var(--color-secondary); opacity: 0;
  animation: burst .7s cubic-bezier(.2, .8, .3, 1) .35s; }
.dot:nth-child(even) { background: #2dd4bf; width: 5px; height: 5px; margin: -2.5px; }
@keyframes burst { 0% { opacity: 1; transform: rotate(var(--a)) translateY(0); } 100% { opacity: 0; transform: rotate(var(--a)) translateY(-62px); } }
h3 { margin: 0; font-size: 20px; font-weight: 700; animation: up .4s ease .5s both; }
p { margin: 0; color: var(--color-muted); font-size: 13.5px; animation: up .4s ease .58s both; }
@keyframes up { from { opacity: 0; transform: translateY(8px); } }
.rows { margin: 14px 0 4px; padding: 6px 14px; background: #f4f9f9; border-radius: 14px; display: grid; text-align: right; }
.rows div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; font-size: 13.5px; border-bottom: 1px dashed var(--color-line); animation: up .35s ease both; animation-delay: calc(.66s + var(--i) * .07s); }
.rows div:last-child { border: 0; }
.rows dt { color: var(--color-muted); }
.rows dd { margin: 0; font-weight: 700; }
.sact { display: flex; gap: 8px; justify-content: center; margin-top: 12px; flex-wrap: wrap; animation: up .4s ease .8s both; }
.sact :deep(.sbt) { flex: 1; }
@media (prefers-reduced-motion: reduce) { .sbox, .sbox * { animation: none !important; } .tick { stroke-dashoffset: 0; } }
</style>
