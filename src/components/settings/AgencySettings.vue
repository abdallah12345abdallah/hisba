<script setup>
import { ref, reactive, computed } from 'vue'
import FilledInput from '../ui/FilledInput.vue'
import SoftButton from '../ui/SoftButton.vue'
import AppIcon from '../AppIcon.vue'
import SaveBar from './SaveBar.vue'
import { AGENCY } from '../../data/demo.js'
import { normalizePhone } from '../../data/traders.js'
import { saveAgency } from '../../data/settings.js'
import { toast } from '../../composables/useToast.js'

// The agency's own profile: name, place, phone, logo and the line printed under every invoice. Preview beside it.
const snap = () => ({ name: AGENCY.name, place: AGENCY.place, phone: AGENCY.phone, note: AGENCY.note, logo: AGENCY.logo })
const f = reactive(snap())
const dirty = computed(() => JSON.stringify(f) !== JSON.stringify(snap()))
const errors = computed(() => ({ name: f.name.trim() ? '' : 'اكتب اسم الوكالة', phone: !f.phone.trim() || normalizePhone(f.phone) ? '' : 'الرقم لازم يكون 11 رقم ويبلّش بـ 01' }))
const bad = computed(() => !!(errors.value.name || errors.value.phone))
const file = ref(null)
const logoErr = ref('')
function pickLogo(e) {
  const fl = e.target.files?.[0]
  e.target.value = ''
  if (!fl) return
  if (!fl.type.startsWith('image/')) { logoErr.value = 'اختار صورة (PNG أو JPG أو SVG)'; return }
  if (fl.size > 600 * 1024) { logoErr.value = 'الصورة كبيرة، خليها أقل من 600 كيلوبايت'; return }
  logoErr.value = ''
  const r = new FileReader()
  r.onload = () => { f.logo = r.result }
  r.readAsDataURL(fl)
}
function save() {
  if (bad.value) return
  saveAgency({ name: f.name.trim(), place: f.place.trim(), phone: normalizePhone(f.phone) || '', note: f.note.trim(), logo: f.logo })
  Object.assign(f, snap())
  toast('انحفظت بيانات الوكالة', 'بتطلع بالشريط الجانبي وعلى الفواتير والكشوفات')
}
const reset = () => Object.assign(f, snap())
</script>

<template>
  <div class="grid2">
    <section class="card">
      <div class="ch"><h2>بيانات الوكالة</h2></div>
      <div class="form">
        <div class="two">
          <FilledInput v-model="f.name" label="اسم الوكالة" :error="errors.name" />
          <FilledInput v-model="f.place" label="المكان" placeholder="المدينة أو السوق" />
        </div>
        <FilledInput v-model="f.phone" label="رقم التلفون" type="tel" dir="ltr" :error="errors.phone" hint="بيطلع على الفاتورة والكشف." />
        <FilledInput v-model="f.note" label="سطر تحت الفاتورة" placeholder="مثلاً: شكراً لتعاملكم معنا" />
        <div class="logo">
          <span class="lp"><img v-if="f.logo" :src="f.logo" alt="لوجو الوكالة" /><AppIcon v-else name="building" /></span>
          <span class="lt"><b>لوجو الوكالة</b><small>بيطلع على الفواتير والكشوفات اللي بتبعتها. PNG أو JPG، أقل من 600 كيلوبايت.</small><small v-if="logoErr" class="err">{{ logoErr }}</small></span>
          <span class="la">
            <SoftButton size="sm" icon="plus" @click="file?.click()">{{ f.logo ? 'غيّر' : 'ارفع' }}</SoftButton>
            <SoftButton v-if="f.logo" size="sm" tone="danger" icon="trash" @click="f.logo = null">شيل</SoftButton>
          </span>
          <input ref="file" type="file" accept="image/*" hidden @change="pickLogo" />
        </div>
      </div>
      <SaveBar :dirty="dirty" :disabled="bad" @save="save" @reset="reset" />
    </section>

    <section class="card">
      <div class="ch"><h2>هيك بتطلع الفاتورة</h2></div>
      <article class="paper">
        <header>
          <span class="pl"><img v-if="f.logo" :src="f.logo" alt="" /><AppIcon v-else name="building" /></span>
          <span class="pn"><b>{{ f.name || 'اسم الوكالة' }}</b><small class="num">{{ f.place }}<template v-if="f.phone"> · {{ f.phone }}</template></small></span>
          <span class="no num">#2209</span>
        </header>
        <div class="ln"><span>بلطي سوبر · 18 بوكس</span><b class="num">16,200</b></div>
        <div class="ln"><span>بلطي 1 · 26 بوكس</span><b class="num">20,800</b></div>
        <div class="ln tot"><span>الصافي للمورد</span><b class="num">35,150 ج</b></div>
        <p v-if="f.note" class="note">{{ f.note }}</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.grid2 { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 16px; align-items: start; }
.form { display: grid; gap: 12px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.logo { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 12px; align-items: center; background: #f6f9f9; border-radius: 14px; padding: 10px 12px; }
.lp { width: 64px; height: 64px; border-radius: 14px; background: #fff; display: grid; place-items: center; overflow: hidden; color: #9fbfc3; box-shadow: inset 0 0 0 1px #e1eaea; }
.lp img { width: 100%; height: 100%; object-fit: contain; } .lp :deep(svg) { width: 26px; height: 26px; }
.lt { display: grid; } .lt b { font-size: 13.5px; } .lt small { color: var(--color-muted); font-size: 11.5px; } .lt .err { color: var(--color-negative); }
.la { display: flex; gap: 6px; }
.paper { background: #fbfefe; border: 1px solid #d8ecef; border-radius: 14px; padding: 14px 16px; display: grid; gap: 8px; }
.paper header { display: flex; align-items: center; gap: 10px; border-bottom: 1.5px dashed #c9e2e6; padding-bottom: 10px; margin-bottom: 2px; }
.pl { width: 42px; height: 42px; border-radius: 11px; background: #fff; display: grid; place-items: center; overflow: hidden; color: #9fbfc3; box-shadow: inset 0 0 0 1px #e1eaea; flex: none; }
.pl img { width: 100%; height: 100%; object-fit: contain; } .pl :deep(svg) { width: 20px; height: 20px; }
.pn { flex: 1; display: grid; min-width: 0; } .pn b { font-size: 14px; } .pn small { color: var(--color-muted); font-size: 11.5px; }
.no { font-weight: 700; color: var(--color-primary-ink); }
.ln { display: flex; justify-content: space-between; font-size: 13px; color: var(--color-muted); } .ln b { color: var(--color-ink); }
.ln.tot { border-top: 1.5px dashed #c9e2e6; padding-top: 6px; color: var(--color-ink); font-weight: 600; } .ln.tot b { color: var(--color-primary-ink); font-size: 16px; }
.note { margin: 4px 0 0; text-align: center; font-size: 12px; color: var(--color-muted); }
@media (max-width: 980px) { .grid2 { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .two { grid-template-columns: 1fr; } .logo { grid-template-columns: 52px minmax(0, 1fr); } .la { grid-column: 1 / -1; } }
</style>
