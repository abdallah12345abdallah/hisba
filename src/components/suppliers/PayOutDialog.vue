<script setup>
import { ref, computed, watch } from 'vue'
import AppModal from '../ui/AppModal.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import { fmt } from '../../data/demo.js'
import { payOut } from '../../data/suppliers.js'
import { toast } from '../../composables/useToast.js'

// Money out to a farm: kind 'pay' (against what we owe him) or 'adv' (an interest-free advance taken back from his next manifests).
const props = defineProps({ supplier: Object, kind: { type: String, default: 'pay' } })
const open = defineModel({ type: Boolean, default: false })

const s = ref(null)
const k = ref('pay')
const amount = ref('')
const METHODS = [{ value: 'دفعة نقدي', label: 'نقدي', icon: 'cash' }, { value: 'تحويل فودافون كاش', label: 'فودافون كاش', icon: 'phone' }, { value: 'تحويل بنكي', label: 'تحويل بنكي', icon: 'safe' }]
const how = ref(METHODS[0].value)
watch(open, (v) => {
  if (!v || !props.supplier) return
  s.value = props.supplier; k.value = props.kind; how.value = METHODS[0].value
  amount.value = String(k.value === 'pay' ? Math.max(0, Math.min(props.supplier.balance, 20000)) || '' : 5000)
})
const isPay = computed(() => k.value === 'pay')
const v = computed(() => Number(String(amount.value).replace(/[^\d]/g, '')) || 0)
const after = computed(() => (s.value ? s.value.balance - v.value : 0))
const quick = computed(() => {
  if (!s.value) return []
  const list = [5000, 10000, 20000].map((x) => ({ v: x, label: fmt(x) }))
  return isPay.value && s.value.balance > 0 ? list.filter((x) => x.v < s.value.balance).concat({ v: s.value.balance, label: 'كل اللي إله' }) : list
})
const side = (b) => (b > 0 ? 'له' : b < 0 ? 'عليه' : 'خالص')

function save() {
  if (!v.value) return
  const x = s.value
  const undo = payOut(x, v.value, k.value, how.value)
  open.value = false
  toast(isPay.value ? 'انصرفت الدفعة' : 'انسجّلت السلفة', `${x.name} · رصيده هلأ ${fmt(Math.abs(x.balance))} ${side(x.balance)}`, { amount: v.value, big: true, action: { label: 'تراجع', run: undo } })
}
</script>

<template>
  <AppModal v-model="open" :title="s ? `${isPay ? 'صرف دفعة لـ' : 'سلفة لـ'}${s.name}` : ''" :width="440">
    <template v-if="s">
      <div class="owe"><span>رصيده هلأ</span><b class="num" :class="s.balance < 0 ? 'adv' : ''">{{ fmt(Math.abs(s.balance)) }} ج {{ side(s.balance) }}</b></div>
      <div class="kind" role="radiogroup" aria-label="نوع الصرف">
        <button type="button" role="radio" :aria-checked="isPay" :class="{ on: isPay }" @click="k = 'pay'">دفعة من حسابه</button>
        <button type="button" role="radio" :aria-checked="!isPay" :class="{ on: !isPay }" @click="k = 'adv'">سلفة</button>
      </div>
      <label class="amtin">
        <small>المبلغ</small>
        <span class="row"><input v-model="amount" inputmode="numeric" dir="ltr" aria-label="المبلغ" @keydown.enter="save" /><em>ج</em></span>
      </label>
      <div class="quick"><button v-for="q in quick" :key="q.label" type="button" class="num" :class="{ on: v === q.v }" @click="amount = String(q.v)">{{ q.label }}</button></div>
      <div v-if="isPay" class="how" role="radiogroup" aria-label="طريقة الصرف">
        <button v-for="m in METHODS" :key="m.value" type="button" role="radio" :aria-checked="how === m.value" :class="{ on: how === m.value }" @click="how = m.value"><AppIcon :name="m.icon" /><span>{{ m.label }}</span></button>
      </div>
      <p v-else class="note">السلفة بدون فوايد، وبتنخصم من أول بيانات جاية للمزرعة.</p>
      <p v-if="isPay && after < 0" class="warn">الدفعة أكبر من اللي إله، الفرق ({{ fmt(-after) }}) بيصير سلفة عليه.</p>
      <div class="after"><span>بعدها بيصير رصيده</span><b class="num" :class="after < 0 ? 'adv' : ''">{{ fmt(Math.abs(after)) }} ج {{ side(after) }}</b></div>
    </template>
    <template #actions>
      <div class="acts">
        <SoftButton @click="open = false">لسا</SoftButton>
        <SoftButton :tone="isPay ? 'ok' : 'primary'" icon="check" :disabled="!v" @click="save">{{ isPay ? 'اصرف الدفعة' : 'اعطيه السلفة' }}</SoftButton>
      </div>
    </template>
  </AppModal>
</template>

<style scoped>
.owe { display: flex; justify-content: space-between; align-items: baseline; margin-top: -6px; color: var(--color-muted); font-size: 13px; }
.owe b { color: var(--color-primary-ink); font-size: 15px; } .owe b.adv { color: var(--color-negative); }
.kind { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; border-radius: 12px; background: rgb(11 59 69 / .07); }
.kind button { border: 0; height: 36px; border-radius: 9px; background: none; font: inherit; font-size: 13px; color: var(--color-muted); cursor: pointer; }
.kind button.on { background: #fff; color: var(--color-primary-ink); font-weight: 700; }
.amtin { display: grid; gap: 2px; background: var(--color-field); border-radius: 14px; padding: 10px 16px 8px; cursor: text; }
.amtin:focus-within { background: #fff; box-shadow: inset 0 0 0 2px var(--color-primary); }
.amtin small { color: var(--color-muted); font-size: 12px; }
.amtin .row { display: flex; align-items: center; gap: 10px; }
.amtin input { flex: 1; min-width: 0; width: 100%; border: 0; outline: 0; background: transparent; font: inherit; font-size: 30px; font-weight: 700; text-align: right; color: var(--color-deep); }
.amtin em { font-style: normal; background: var(--color-primary-pale); color: var(--color-primary-ink); border-radius: 8px; padding: 2px 10px; font-weight: 600; }
.quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.quick button { border: 0; height: 36px; border-radius: 10px; background: #f1f6f6; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.quick button:hover { background: var(--color-primary-pale); }
.quick button.on { background: var(--color-primary-pale); color: var(--color-primary-ink); box-shadow: inset 0 0 0 1.5px var(--color-primary); }
.how { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.how button { border: 1.5px solid #e1eaea; background: #fff; border-radius: 12px; padding: 10px 6px; display: grid; justify-items: center; gap: 4px; font: inherit; font-size: 12.5px; color: var(--color-muted); cursor: pointer; }
.how button :deep(svg) { width: 22px; height: 22px; }
.how button.on { border-color: var(--color-primary); background: #f0f9fb; color: var(--color-primary-ink); font-weight: 600; }
.note { margin: 0; color: var(--color-muted); font-size: 12.5px; }
.warn { margin: 0; color: #8a5a00; font-size: 12.5px; background: var(--warn-bg); border-radius: 10px; padding: 6px 10px; }
.after { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; background: #f6f9f9; border-radius: 12px; padding: 10px 14px; }
.after b { font-size: 16px; color: var(--color-primary-ink); } .after b.adv { color: var(--color-negative); }
.acts { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; width: 100%; }
.acts :deep(.sbt) { width: 100%; height: 46px; }
</style>
