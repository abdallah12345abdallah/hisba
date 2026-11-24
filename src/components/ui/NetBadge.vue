<script setup>
import AppIcon from '../AppIcon.vue'
import { SYNC } from '../../data/sync.js'

// Connection state, only when it matters: offline (work goes on, changes wait), sending on reconnect, then "sent" for a moment.
</script>

<template>
  <Transition name="net">
    <div v-if="!SYNC.online" class="net off" role="status">
      <AppIcon name="offline" />
      <span><b>مش متصل بالنت</b><small class="num">{{ SYNC.pending ? `الشغل ماشي · ${SYNC.pending} تعديلات بتنبعت لما يرجع النت` : 'كمّل شغلك عادي، كل شي بينحفظ على الجهاز' }}</small></span>
    </div>
    <div v-else-if="SYNC.sending" class="net busy" role="status"><AppIcon name="sync" /><span><b>رجع النت</b><small class="num">عم نبعت {{ SYNC.pending }} تعديلات…</small></span></div>
    <div v-else-if="SYNC.justSent" class="net ok" role="status"><AppIcon name="check" /><span><b>انبعت كل شي</b><small class="num">{{ SYNC.justSent }} تعديلات · {{ SYNC.lastSync }}</small></span></div>
  </Transition>
</template>

<style scoped>
.net { position: fixed; z-index: 90; bottom: 16px; inset-inline-start: 16px; display: flex; align-items: center; gap: 10px; padding: 9px 14px 9px 16px; border-radius: 14px; max-width: min(380px, calc(100vw - 32px));
  box-shadow: 0 14px 30px -16px rgb(11 59 69 / .55), 0 0 0 1px rgb(11 59 69 / .06); font-size: 13px; }
.net b { display: block; font-size: 13px; } .net small { font-size: 11.5px; opacity: .85; }
.net :deep(svg) { width: 19px; height: 19px; flex: none; }
.off { background: var(--warn-bg); color: var(--warn-ink); }
.busy { background: var(--color-primary-pale); color: var(--color-primary-ink); } .busy :deep(svg) { animation: spin 1s linear infinite; }
.ok { background: var(--pos-bg); color: var(--pos-ink); }
@keyframes spin { to { transform: rotate(360deg); } }
.net-enter-active, .net-leave-active { transition: opacity .25s, transform .25s cubic-bezier(.2, .9, .25, 1); }
.net-enter-from, .net-leave-to { opacity: 0; transform: translateY(10px); }
@media (prefers-reduced-motion: reduce) { .busy :deep(svg) { animation: none; } .net-enter-active, .net-leave-active { transition: none; } }
@media print { .net { display: none; } }
</style>
