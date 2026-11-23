<script setup>
import { computed, ref, watch } from 'vue'
import { toasts, dismiss } from '../../composables/useToast.js'
import { fmt } from '../../data/demo.js'
import { GRADE_COLORS } from '../../utils/grades.js'

// the stroke for each tone, drawn in by animating its dash
const MARKS = {
  ok: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 7.5v.5M12 11v6',
  neg: 'M7 7l10 10M17 7L7 17',
}
const t = computed(() => toasts[0])
// the leaving toast is already gone from the list, so remember which kind was on screen for its exit animation
const lastBig = ref(false)
watch(t, (v) => { if (v) lastBig.value = !!v.big }, { immediate: true })
function act() { t.value.action.run(); dismiss(t.value.id) }

/* big success card: the amount counts up from zero once the mark has drawn */
const shown = ref(0)
let raf = 0
watch(() => t.value?.id, () => {
  cancelAnimationFrame(raf)
  const to = t.value?.big ? t.value.amount : null
  if (to == null) return
  shown.value = 0
  const start = performance.now() + 450
  const tick = (now) => {
    const k = Math.min(1, Math.max(0, (now - start) / 1000))
    shown.value = Math.round(to * (1 - Math.pow(1 - k, 3)))
    if (k < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})
// little boxes in the grade colours: a burst around the mark, then a few drifting down behind the card's text
const BURST = Array.from({ length: 14 }, (_, i) => ({ a: `${i * (360 / 14)}deg`, c: GRADE_COLORS[i % GRADE_COLORS.length], d: `${(i % 3) * 40}ms`, r: i % 2 ? 58 : 72 }))
const RAIN = Array.from({ length: 16 }, (_, i) => ({ l: `${(i * 41) % 100}%`, c: GRADE_COLORS[(i + 2) % GRADE_COLORS.length], d: `${0.35 + (i % 6) * 0.11}s`, r: `${(i % 2 ? 1 : -1) * (120 + i * 17)}deg` }))
</script>

<template>
  <div class="toasts" :class="{ big: t?.big }" dir="rtl" aria-live="polite">
    <Transition :name="(t ? t.big : lastBig) ? 'toast' : 'island'">
      <!-- big moment: the centred card -->
      <div v-if="t && t.big" :key="t.id" class="tcard" :class="t.tone" role="status">
        <span class="train" aria-hidden="true"><i v-for="(p, i) in RAIN" :key="i" :style="{ left: p.l, background: p.c, animationDelay: p.d, '--r': p.r }" /></span>
        <span class="tshine" aria-hidden="true" />
        <span class="tck">
          <span class="burst" aria-hidden="true"><i v-for="(p, i) in BURST" :key="i" :style="{ '--a': p.a, '--d': p.d, '--r': p.r + 'px', background: p.c }" /></span>
          <span class="halo" aria-hidden="true" />
          <svg viewBox="0 0 52 52" aria-hidden="true">
            <circle class="ring" cx="26" cy="26" r="23" />
            <path class="mark" :d="MARKS[t.tone] || MARKS.ok" transform="translate(8 8) scale(1.5)" />
          </svg>
        </span>
        <b>{{ t.title }}</b>
        <span v-if="t.amount != null" class="tamt num">{{ fmt(shown) }} <small>ج</small></span>
        <small v-if="t.text" class="ttext">{{ t.text }}</small>
        <button v-if="t.action" type="button" class="tact" @click="act">{{ t.action.label }}</button>
        <i class="tbar" :style="{ animationDuration: `${t.duration}ms` }" />
      </div>
      <!-- everyday: the island -->
      <div v-else-if="t" :key="t.id" class="island" :class="t.tone" role="status">
        <span class="idot"><svg viewBox="0 0 24 24" aria-hidden="true"><path :d="MARKS[t.tone] || MARKS.ok" /></svg></span>
        <span class="itx"><b>{{ t.title }}</b><small v-if="t.text">{{ t.text }}</small></span>
        <button v-if="t.action" type="button" class="iact" @click="act">{{ t.action.label }}</button>
      </div>
    </Transition>
  </div>
</template>
