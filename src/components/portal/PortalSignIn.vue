<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import FilledInput from '../ui/FilledInput.vue'
import { portalSignIn } from '../../data/portal.js'
import { toast } from '../../composables/useToast.js'

// Traders and farms sign in with their phone + the 4-digit code the agency sent them, and land on their own page.
const open = defineModel({ type: Boolean, default: false })
const router = useRouter()
const phone = ref('')
const code = ref('')
const err = ref('')
watch(open, (v) => { if (v) { phone.value = ''; code.value = ''; err.value = '' } })
function go() {
  if (!phone.value.trim() || !code.value.trim()) { err.value = 'اكتب رقم التلفون والكود'; return }
  const r = portalSignIn(phone.value, code.value)
  if (!r.ok) { err.value = r.locked ? `كتير محاولات غلط · استنى ${r.locked} ثانية` : `الرقم أو الكود غلط · باقيلك ${r.left} محاولات`; code.value = ''; return }
  open.value = false
  toast(`أهلين ${r.rec.name}`, r.kind === 'trader' ? 'هاد حسابك وفواتيرك' : 'هاد كشفك وفواتير بياناتك', { quiet: true })
  router.replace(r.path)
}
</script>

<template>
  <AppModal v-model="open" title="دخول التجار والموردين" text="برقم تلفونك المسجّل عند الوكالة والكود (4 أرقام) اللي وصلك. بتشوف حسابك وفواتيرك بس." :width="420">
    <form class="pform" novalidate @submit.prevent="go">
      <FilledInput v-model="phone" label="رقم التلفون" type="tel" dir="ltr" placeholder="01xx xxx xxxx" inputmode="tel" />
      <FilledInput v-model="code" label="كود الدخول" type="password" dir="ltr" inputmode="numeric" placeholder="••••" :error="err" />
      <button type="submit" hidden />
    </form>
    <template #actions>
      <div class="acts"><SoftButton @click="open = false">لسا</SoftButton><SoftButton tone="primary" icon="key" @click="go">ادخل</SoftButton></div>
    </template>
  </AppModal>
</template>

<style scoped>
.pform { display: grid; gap: 12px; }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; } .acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
