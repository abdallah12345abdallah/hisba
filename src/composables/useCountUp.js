import { ref, watch, onBeforeUnmount } from 'vue'

// A number that counts up to its value when the page opens, and glides to every new value after that.
export function useCountUp(source, { duration = 1100, delay = 0 } = {}) {
  const shown = ref(0)
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  let raf = 0
  let first = true
  const ease = (t) => 1 - Math.pow(1 - t, 3)
  function run(to) {
    cancelAnimationFrame(raf)
    if (reduce) { shown.value = to; return }
    const from = shown.value
    const wait = first ? delay : 0
    first = false
    const start = performance.now() + wait
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      shown.value = Math.round(from + (to - from) * ease(t))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  watch(source, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => cancelAnimationFrame(raf))
  return shown
}
