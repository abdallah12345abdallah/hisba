<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { MANIFESTS, fmt } from '../../data/demo.js'
import { netOf, canReopen, reopen } from '../../data/sheet.js'
import { can } from '../../data/auth.js'
import { toast } from '../../composables/useToast.js'

// Today's approved (locked) manifests: open the invoice, or reopen one for a correction — only with a reason, and it is logged.
const open = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['invoice'])
const router = useRouter()
const approved = computed(() => MANIFESTS.filter((m) => m.status === 'approved').slice().sort((a, b) => b.invoiceNo - a.invoiceNo))
const which = ref(null) // the manifest being reopened
const reason = ref('')
const tried = ref(false)
const REASONS = ['تاجر رجّع بوكس', 'غلط بالسعر', 'غلط باسم التاجر', 'غلط بعدد البوكسات']
watch(open, (v) => { if (v) { which.value = null; reason.value = ''; tried.value = false } })
function ask(m) { which.value = m; reason.value = ''; tried.value = false }
function doReopen() {
  tried.value = true
  if (reason.value.trim().length < 4) return
  const m = which.value
  reopen(m, reason.value.trim())
  open.value = false
  toast(`بيان ${m.supplier} انفتح للتعديل`, 'صافيه انشال من حساب المورد لحد ما تعتمده تاني، وكل تعديل بيتسجّل.', { tone: 'info' })
  router.push(`/sheet/${m.id}`)
}
</script>

<template>
  <AppModal v-model="open" :title="which ? `فتح بيان ${which.supplier} للتعديل` : 'البيانات المعتمدة اليوم'" :text="which ? '' : can('reopen') ? 'كل بيان معتمد مقفول. لتصحيحه افتحه مع ذكر السبب.' : 'كل بيان معتمد مقفول. فتحه للتعديل لصاحب الحلقة أو الشريك.'" :width="560">
    <template v-if="!which">
      <ul v-if="approved.length" class="list">
        <li v-for="m in approved" :key="m.id">
          <span class="lk"><AppIcon name="lock" /></span>
          <span class="t"><b>{{ m.supplier }}</b><small class="num">فاتورة {{ m.invoiceNo }} · وصل {{ m.time }} · {{ m.boxes }} بوكس</small></span>
          <b class="num net">{{ fmt(netOf(m)) }}</b>
          <span class="ops">
            <SoftButton size="sm" icon="doc" @click="emit('invoice', m)">الفاتورة</SoftButton>
            <SoftButton v-if="canReopen(m) && can('reopen')" size="sm" @click="ask(m)">فتح للتعديل</SoftButton>
          </span>
        </li>
      </ul>
      <p v-else class="none">لسا ما في بيانات معتمدة اليوم.</p>
      <RouterLink v-if="can('audit')" to="/audit" class="audit" @click="open = false"><AppIcon name="clock" />سجل التعديلات</RouterLink>
    </template>

    <template v-else>
      <div class="warnbox"><AppIcon name="alert" /><span>صافي الفاتورة <b class="num">{{ fmt(netOf(which)) }} ج</b> بينشال من حساب المورد لحد ما تعتمد البيان تاني. اسمك والسبب وكل سطر بتغيّره بيتسجّلوا.</span></div>
      <label class="lbl" for="reopen-reason">ليش بدك تفتحه؟</label>
      <div class="chips"><button v-for="r in REASONS" :key="r" type="button" :class="{ on: reason === r }" @click="reason = r">{{ r }}</button></div>
      <textarea id="reopen-reason" v-model="reason" rows="2" placeholder="اكتب السبب بكلمتين" :class="{ err: tried && reason.trim().length < 4 }" />
      <small v-if="tried && reason.trim().length < 4" class="errt">اكتب السبب، بيضل بالسجل.</small>
    </template>

    <template #actions>
      <div class="acts">
        <SoftButton v-if="which" @click="which = null">رجوع</SoftButton>
        <SoftButton v-else @click="open = false">تمام</SoftButton>
        <SoftButton v-if="which" tone="primary" icon="edit" @click="doReopen">افتحه للتعديل</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 380px; overflow-y: auto; }
.list li { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; background: #f6f9f9; border-radius: 12px; padding: 8px 10px; }
.lk { width: 34px; height: 34px; border-radius: 10px; background: #fff; color: var(--color-primary); display: grid; place-items: center; } .lk :deep(svg) { width: 16px; height: 16px; }
.t { display: grid; min-width: 0; } .t b { font-size: 13.5px; } .t small { color: var(--color-muted); font-size: 11.5px; }
.net { color: var(--color-primary-ink); font-size: 15px; }
.ops { display: flex; gap: 6px; }
.none { margin: 0; color: var(--color-muted); font-size: 13px; text-align: center; padding: 16px; }
.audit { display: inline-flex; align-items: center; gap: 6px; justify-self: start; color: var(--color-primary-ink); font-weight: 600; font-size: 13px; text-decoration: none; }
.audit :deep(svg) { width: 15px; height: 15px; } .audit:hover { text-decoration: underline; text-underline-offset: 3px; }
.warnbox { display: flex; gap: 10px; align-items: flex-start; background: #fff7e6; color: #6b4a00; border-radius: 12px; padding: 10px 12px; font-size: 13px; line-height: 1.8; }
.warnbox :deep(svg) { width: 18px; height: 18px; flex: none; margin-top: 3px; }
.lbl { font-size: 13px; font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chips button { border: 0; height: 32px; padding: 0 12px; border-radius: 9px; background: #f1f6f6; font: inherit; font-size: 12.5px; cursor: pointer; }
.chips button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); font-weight: 600; }
textarea { width: 100%; border: 0; border-radius: 12px; background: var(--color-field); padding: 10px 12px; font: inherit; font-size: 13.5px; resize: vertical; outline: 0; }
textarea:focus { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); } textarea.err { box-shadow: inset 0 0 0 2px var(--color-negative); }
.errt { color: var(--color-negative); font-size: 12px; margin-top: -6px; }
.acts { display: flex; gap: 8px; width: 100%; justify-content: flex-end; }
@media (max-width: 560px) { .list li { grid-template-columns: 34px minmax(0, 1fr) auto; } .ops { grid-column: 1 / -1; } }
</style>
