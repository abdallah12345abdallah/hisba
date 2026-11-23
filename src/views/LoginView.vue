<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '@fontsource/share-tech-mono/latin-400.css'
import AppIcon from '../components/AppIcon.vue'
import { AGENCY } from '../data/demo.js'
import { USERS, roleOf, signIn, lockedFor, homeFor } from '../data/auth.js'
import { toast } from '../composables/useToast.js'

// Sign in, on the market's water. One side: the scale (approved) — each person is a PLU key, the PIN shows on the green
// display, the lights tell the state (zero / person / steady), the orange TARE key clears; keyboard works too.
// The other side (approved 2): an invoice that writes itself line by line, the way the sheet adds it up, then "sent on WhatsApp".
const route = useRoute()
const router = useRouter()
const people = computed(() => USERS.filter((u) => u.active))
const LAST = 'hisba.lastUser'
const picked = ref((() => { try { const id = Number(localStorage.getItem(LAST)); return people.value.some((u) => u.id === id) ? id : null } catch { return null } })())
const who = computed(() => USERS.find((u) => u.id === picked.value))
const pin = ref('')
const err = ref('')
const bad = ref(false)
const done = ref(false)
const lock = ref(lockedFor())
let timer = 0
const short = (n) => n.split(' ').slice(0, 2).join(' ')
const initial = (n) => n.replace(/^(الحاج|م\.|د\.)\s+/, '').trim()[0]

function choose(u) { picked.value = u.id; pin.value = ''; err.value = '' }
function press(d) {
  if (lock.value || done.value) return
  if (!who.value) { err.value = 'اختار اسمك أول من الأزرار'; flash(); return }
  if (pin.value.length >= 4) return
  pin.value += d
  reveal.value = pin.value.length; clearTimeout(revealTimer); revealTimer = setTimeout(() => { reveal.value = 0 }, 650)
  err.value = ''
  if (pin.value.length === 4) setTimeout(submit, 180)
}
/* the digit just typed shows for a moment, then hides as * ; empty places show a faint - */
const reveal = ref(0)
let revealTimer = 0
const cell = (i) => (done.value ? ('OK  '[i - 1] || ' ') : i > pin.value.length ? '-' : i === reveal.value ? pin.value[i - 1] : '*')
function tare() { pin.value = ''; err.value = '' }
function back() { pin.value = pin.value.slice(0, -1) }
function flash() { bad.value = true; setTimeout(() => { bad.value = false }, 600) }
function submit() {
  const r = signIn(picked.value, pin.value)
  if (r.ok) {
    done.value = true
    try { localStorage.setItem(LAST, String(r.user.id)) } catch { /* fine */ }
    setTimeout(() => {
      toast(`أهلين ${short(r.user.name)}`, roleOf(r.user.role).label, { quiet: true })
      router.replace(typeof route.query.next === 'string' ? route.query.next : homeFor())
    }, 700)
    return
  }
  pin.value = ''
  flash()
  if (r.locked) { lock.value = r.locked; tick(); err.value = '' } else err.value = `الرقم غلط · باقيلك ${r.left} محاولات`
}
function tick() { clearInterval(timer); timer = setInterval(() => { lock.value = lockedFor(); if (!lock.value) clearInterval(timer) }, 500) }
const AR = '٠١٢٣٤٥٦٧٨٩'
function onKey(e) {
  if (/^[0-9]$/.test(e.key)) press(e.key)
  else if (AR.includes(e.key)) press(String(AR.indexOf(e.key)))
  else if (e.key === 'Backspace') back()
  else if (e.key === 'Escape') tare()
}
const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3']
// trial period only: show each person's PIN on their key. Set to false before handing the app to the client.
const SHOW_PINS = true
const plu = (i) => `PLU ${String(i + 1).padStart(2, '0')}`

/* a small live clock on the scale */
const now = ref(new Date())
const clock = computed(() => `${String(now.value.getHours()).padStart(2, '0')}:${String(now.value.getMinutes()).padStart(2, '0')}`)

/* an example invoice writes itself: grades, total, commission off, net, sent — then the next farm */
const SAMPLES = [
  { no: '2209', farm: 'مزرعة الشيخ عيد', rate: 5, rows: [['بلطي سوبر', 30, 27000], ['بلطي 1', 30, 24000], ['بلطي 2', 25, 17500], ['بوري', 12, 13500]] },
  { no: '2210', farm: 'مزرعة الحاج رمضان', rate: 4, rows: [['بلطي سوبر', 20, 18000], ['بلطي 1', 20, 16000], ['بوري', 10, 11250]] },
  { no: '2211', farm: 'مزرعة النجار', rate: 3, rows: [['بلطي 1', 26, 20800], ['بلطي 2', 18, 12600], ['طبار', 8, 8000]] },
]
const fmtN = (n) => n.toLocaleString('en-US')
const inv = ref(SAMPLES[0])
const shownLines = ref(0)
const sent = ref(false)
const invGross = computed(() => inv.value.rows.reduce((a, r) => a + r[2], 0))
const invCut = computed(() => Math.round((invGross.value * inv.value.rate) / 100))
const totalLines = computed(() => inv.value.rows.length + 3)
let invTimer = 0, invN = 0
function writeNext() {
  inv.value = SAMPLES[invN++ % SAMPLES.length]; shownLines.value = 0; sent.value = false
  clearInterval(invTimer)
  invTimer = setInterval(() => {
    if (shownLines.value < totalLines.value) { shownLines.value++; return }
    clearInterval(invTimer); sent.value = true
    invTimer = setTimeout(writeNext, 2800)
  }, 430)
}
const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let clockTimer = 0
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (lock.value) tick()
  clockTimer = setInterval(() => { now.value = new Date() }, 20000)
  if (still) { shownLines.value = totalLines.value; sent.value = true } else writeNext()
})
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearInterval(timer); clearInterval(clockTimer); clearInterval(invTimer); clearTimeout(invTimer) })
</script>

<template>
  <div class="login" dir="rtl">
    <!-- the water behind everything -->
    <div class="sea" aria-hidden="true">
      <span class="glow" />
      <svg class="swell s1" viewBox="0 0 1440 200" preserveAspectRatio="none"><path d="M0 70 C 180 30 360 110 540 70 S 900 30 1080 70 S 1260 110 1440 70 V200 H0 Z" /></svg>
      <svg class="swell s2" viewBox="0 0 1440 200" preserveAspectRatio="none"><path d="M0 90 C 200 130 400 50 600 90 S 1000 130 1200 90 S 1360 60 1440 90 V200 H0 Z" /></svg>
      <i v-for="n in 7" :key="n" class="bub" :style="{ '--x': (n * 14) % 96 + '%', '--d': (n % 4) * 1.4 + 's', '--s': 6 + (n % 3) * 3 + 'px' }" />
    </div>

    <div class="layout">
      <!-- ===== the scale ===== -->
      <main class="scale" :class="{ done }">
        <h1 class="sr">حِسبة · تسجيل الدخول</h1>
        <div class="pan" aria-hidden="true"><span>MAX 300kg · d=50g</span></div>
        <div class="body">
          <header>
            <span class="ag"><img v-if="AGENCY.logo" :src="AGENCY.logo" alt="" />{{ AGENCY.name }} · {{ AGENCY.place }}</span>
            <span class="clock num">{{ clock }}</span>
          </header>

          <!-- display, in its dark bezel, with the state lights -->
          <div class="bezel">
            <div class="leds" aria-hidden="true">
              <span :class="{ on: !pin.length && !done }"><i />ZERO</span>
              <span :class="{ on: !!who }"><i />NET</span>
              <span :class="{ on: pin.length === 4 || done }"><i />STABLE</span>
              <span :class="{ on: !!lock, warn: true }"><i />LOCK</span>
            </div>
            <div class="lcd" :class="{ bad, ok: done, lock: !!lock }" role="status" aria-live="polite">
              <span class="who">
                <template v-if="lock">مقفول {{ lock }} ثانية<small>كتير محاولات غلط</small></template>
                <template v-else-if="done">أهلين {{ short(who.name) }}<small>عم نفتحلك…</small></template>
                <template v-else-if="who">{{ short(who.name) }}<small>{{ err || roleOf(who.role).label }}</small></template>
                <template v-else>اختار اسمك<small>{{ err || 'من الأزرار تحت' }}</small></template>
              </span>
              <span class="read" :aria-label="`${pin.length} من 4`"><span v-for="i in 4" :key="i" :class="{ on: i <= pin.length || done }">{{ cell(i) }}</span></span>
              <span class="unit"><span>PIN</span><span>{{ done ? 'WELCOME' : lock ? 'LOCKED' : 'KG 0.000' }}</span></span>
            </div>
          </div>

          <!-- one PLU key per person -->
          <div class="plu" role="radiogroup" aria-label="مين إنت؟">
            <button v-for="(u, i) in people" :key="u.id" type="button" role="radio" :aria-checked="picked === u.id" :class="{ on: picked === u.id }" @click="choose(u)">
              <span class="av">{{ initial(u.name) }}</span>
              <span class="pt"><b>{{ short(u.name) }}</b><small>{{ roleOf(u.role).label }}</small></span>
              <em>{{ plu(i) }}</em>
              <span v-if="SHOW_PINS" class="demo num">PIN {{ u.pin }}</span>
            </button>
          </div>

          <!-- keypad, TARE clears -->
          <div class="keys" :class="{ off: !!lock }">
            <button v-for="k in KEYS" :key="k" type="button" :disabled="!!lock" @click="press(k)">{{ k }}</button>
            <button type="button" class="tare" :disabled="!!lock" @click="tare">تارا<small>صفّر</small></button>
            <button type="button" class="bk" :disabled="!!lock || !pin.length" aria-label="امسح رقم" @click="back"><AppIcon name="back" /></button>
            <button type="button" class="zero" :disabled="!!lock" @click="press('0')">0</button>
          </div>
          <small class="foot">بتقدر تكتب من الكيبورد · نسيت الرقم؟ صاحب الحلقة بيغيّره من الإعدادات</small>
        </div>
        <span class="feet" aria-hidden="true"><i /><i /></span>
      </main>

      <!-- ===== the invoice that writes itself ===== -->
      <aside class="story" aria-label="شو بتعمل حِسبة">
        <img class="biglogo" src="/logo-full.webp" alt="حِسبة" width="380" height="115" />
        <h2>بتبيع، <em>وحِسبة بتحسب</em>.</h2>
        <p class="lead">من أول بوكس لآخر قرش، فاتورة المورد بتجهز لحالها وبتوصله عالواتساب.</p>
        <article class="inv" aria-hidden="true">
          <header class="it"><b>{{ inv.farm }}</b><span class="num">#{{ inv.no }}</span></header>
          <div v-for="(r, i) in inv.rows" :key="inv.no + r[0]" class="l" :class="{ in: shownLines > i }"><span>{{ r[0] }} · {{ r[1] }} بوكس</span><b>{{ fmtN(r[2]) }}</b></div>
          <div class="l" :class="{ in: shownLines > inv.rows.length }"><span>إجمالي البيع</span><b>{{ fmtN(invGross) }}</b></div>
          <div class="l cut" :class="{ in: shownLines > inv.rows.length + 1 }"><span>العمولة {{ inv.rate }}%</span><b>− {{ fmtN(invCut) }}</b></div>
          <div class="l net" :class="{ in: shownLines > inv.rows.length + 2 }"><span>الصافي للمورد</span><b>{{ fmtN(invGross - invCut) }} ج</b></div>
          <div class="sent" :class="{ in: sent }"><AppIcon name="whatsapp" />انبعتت للمورد عالواتساب</div>
        </article>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.login { position: relative; isolation: isolate; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding-block: 28px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));
  background: linear-gradient(165deg, #0f6f78 0%, #168890 34%, #4fb0b6 62%, #a8dcdb 84%, #dcefee 100%); overflow: hidden; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0; }
/* water */
.sea { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.glow { position: absolute; width: 760px; height: 760px; border-radius: 50%; top: -380px; inset-inline-end: -160px; background: radial-gradient(circle, rgb(255 255 255 / .22), transparent 65%); }
.swell { position: absolute; left: 0; width: 200%; height: 240px; }
.swell path { fill: rgb(255 255 255 / .09); }
.s1 { bottom: 18%; animation: drift 22s linear infinite; } .s2 { bottom: 4%; height: 280px; animation: drift 15s linear infinite reverse; } .s2 path { fill: rgb(255 255 255 / .13); }
@keyframes drift { to { transform: translateX(-50%); } }
.bub { position: absolute; bottom: -14px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; border: 1.5px solid rgb(255 255 255 / .55); animation: bubble 8s ease-in infinite; animation-delay: var(--d); }
@keyframes bubble { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: .9; } 100% { transform: translateY(-70vh) translateX(20px); opacity: 0; } }

.layout { width: min(1180px, 100%); display: grid; grid-template-columns: minmax(0, 600px) minmax(0, 1fr); gap: 56px; align-items: center; }

/* ===== scale ===== */
.scale { position: relative; z-index: 2; display: grid; justify-items: center; animation: in .7s cubic-bezier(.2, .9, .25, 1) both; transition: transform .5s cubic-bezier(.2, .9, .25, 1); }
.scale.done { transform: translateY(-8px); }
@keyframes in { from { opacity: 0; transform: translateY(24px); } }
.pan { width: 74%; height: 30px; border-radius: 16px 16px 6px 6px; position: relative; z-index: 1; margin-bottom: -8px;
  background: repeating-linear-gradient(90deg, rgb(255 255 255 / .0) 0 2px, rgb(255 255 255 / .35) 2px 3px), linear-gradient(180deg, #eef3f3, #c7d3d2 70%, #aebdbb); box-shadow: 0 8px 18px -10px rgb(0 0 0 / .45), inset 0 1px 0 #fff;
  display: grid; place-items: center; }
.pan span { font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 11px; color: #6d7f7d; letter-spacing: 1.5px; direction: ltr; text-shadow: 0 1px 0 rgb(255 255 255 / .7); }
.body { width: 100%; position: relative; z-index: 2; background: linear-gradient(180deg, #fdfefe, #edf3f2); border-radius: 34px; padding: 20px; display: grid; gap: 16px;
  box-shadow: 0 50px 80px -40px rgb(5 40 48 / .75), inset 0 1px 0 #fff, inset 0 -4px 0 #dbe5e4; }
.feet { width: 70%; display: flex; justify-content: space-between; margin-top: -2px; } .feet i { width: 54px; height: 10px; border-radius: 0 0 10px 10px; background: #8ea3a1; box-shadow: 0 8px 14px -6px rgb(0 0 0 / .5); }
header { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.ag { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-muted); font-weight: 600; } .ag img { width: 22px; height: 22px; object-fit: contain; border-radius: 6px; }
.clock { font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 15px; color: var(--color-deep); background: #e9f0f0; border-radius: 9px; padding: 2px 10px; direction: ltr; }
/* display */
.bezel { background: linear-gradient(180deg, #33423f, #22302e); border-radius: 22px; padding: 10px 12px 12px; box-shadow: inset 0 2px 0 rgb(255 255 255 / .08), 0 6px 14px -8px rgb(0 0 0 / .5); display: grid; gap: 8px; }
.leds { display: flex; justify-content: space-between; direction: ltr; padding: 0 6px; }
.leds span { display: inline-flex; align-items: center; gap: 6px; font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: 1px; color: #7d8c89; transition: color .2s; }
.leds i { width: 8px; height: 8px; border-radius: 50%; background: #4a5754; transition: background .2s, box-shadow .2s; }
.leds span.on { color: #d6f5cf; } .leds span.on i { background: #7dff8a; box-shadow: 0 0 8px #7dff8a; }
.leds span.warn.on { color: #ffe0a6; } .leds span.warn.on i { background: #ffb547; box-shadow: 0 0 8px #ffb547; }
.lcd { background: linear-gradient(180deg, #cbe8c6, #b2d7ab); border-radius: 14px; padding: 14px 18px 10px; box-shadow: inset 0 4px 10px rgb(0 0 0 / .22); display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 6px 14px; color: #1d3b1a; transition: background .3s, color .3s; }
.lcd .who { font-size: 16px; font-weight: 700; min-width: 0; } .lcd .who small { display: block; font-size: 12px; opacity: .75; font-weight: 500; }
.lcd .read { font-family: 'Share Tech Mono', ui-monospace, 'Courier New', monospace; font-size: 66px; line-height: .95; letter-spacing: 8px; direction: ltr; white-space: pre; text-shadow: 1px 1px 0 rgb(29 59 26 / .12); }
.lcd .read span { opacity: .14; transition: opacity .12s; } .lcd .read span.on { opacity: 1; }
.lcd .unit { grid-column: 1 / -1; display: flex; justify-content: space-between; font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 12.5px; opacity: .7; direction: ltr; }
.lcd.bad { animation: shake .45s; background: linear-gradient(180deg, #f1cdc5, #e8b6ab); color: #5b1d12; }
.lcd.lock { background: linear-gradient(180deg, #f6e2b8, #eed19a); color: #5c3b00; }
.lcd.ok { background: linear-gradient(180deg, #c3f0d2, #9fdcb7); color: #0d3b22; }
@keyframes shake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
/* PLU */
.plu { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.plu button { border: 0; border-radius: 16px; padding: 10px 12px; background: #fff; box-shadow: 0 4px 0 #cfdad8, inset 0 0 0 1px #e1e9e8; display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 10px; align-items: center; font: inherit; color: inherit; cursor: pointer; text-align: right; transition: transform .08s, box-shadow .08s, background .15s; }
.plu button:hover { box-shadow: 0 4px 0 #cfdad8, inset 0 0 0 1.5px #9fcbd3; }
.plu button.on { transform: translateY(4px); box-shadow: 0 0 0 #cfdad8, inset 0 0 0 2px var(--color-primary); background: #effafc; }
.av { width: 40px; height: 40px; border-radius: 12px; background: var(--color-primary-pale); color: var(--color-primary-ink); display: grid; place-items: center; font-weight: 700; font-size: 17px; transition: background .15s, color .15s; }
.plu button.on .av { background: var(--color-primary); color: #fff; }
.pt { display: grid; min-width: 0; } .pt b { font-size: 14px; color: var(--color-deep); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .pt small { font-size: 11.5px; color: var(--color-muted); }
.demo { grid-column: 2 / -1; justify-self: start; font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 12px; font-weight: 700; color: #7a5410; background: #fff1cc; border-radius: 6px; padding: 0 8px; direction: ltr; letter-spacing: 1px; }
.plu em { font-style: normal; font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 11px; color: #9aaeae; direction: ltr; align-self: start; }
/* keypad */
.keys { display: grid; grid-template-columns: repeat(3, 1fr) 1.2fr; grid-template-rows: repeat(4, 64px); gap: 10px; direction: ltr; }
.keys button { border: 0; border-radius: 16px; background: linear-gradient(180deg, #ffffff, #edf2f1); box-shadow: 0 4px 0 #c6d3d1, inset 0 0 0 1px #dde6e5; font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 30px; color: var(--color-deep); cursor: pointer; transition: transform .08s, box-shadow .08s, background .1s; }
.keys button:hover:not(:disabled) { background: linear-gradient(180deg, #ffffff, #e6f3f4); }
.keys button:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 0 0 #c6d3d1, inset 0 0 0 1px #dde6e5; }
.keys button:disabled { opacity: .45; cursor: default; }
.keys button:nth-child(1) { grid-area: 1 / 1; } .keys button:nth-child(2) { grid-area: 1 / 2; } .keys button:nth-child(3) { grid-area: 1 / 3; }
.keys button:nth-child(4) { grid-area: 2 / 1; } .keys button:nth-child(5) { grid-area: 2 / 2; } .keys button:nth-child(6) { grid-area: 2 / 3; }
.keys button:nth-child(7) { grid-area: 3 / 1; } .keys button:nth-child(8) { grid-area: 3 / 2; } .keys button:nth-child(9) { grid-area: 3 / 3; }
.keys .tare { grid-area: 1 / 4 / 3 / 5; display: grid; place-content: center; gap: 2px; background: linear-gradient(180deg, #ff9a80, #ff7a5c); color: #fff; box-shadow: 0 4px 0 #d55a3e; font-family: inherit; font-size: 17px; font-weight: 700; }
.keys .tare:hover:not(:disabled) { background: linear-gradient(180deg, #ffa58d, #ff7a5c); }
.keys .tare small { font-size: 11.5px; font-weight: 500; opacity: .9; }
.keys .tare:active:not(:disabled) { box-shadow: 0 0 0 #d55a3e; }
.keys .bk { grid-area: 3 / 4 / 5 / 5; display: grid; place-items: center; } .keys .bk :deep(svg) { width: 26px; height: 26px; transform: scaleX(-1); }
.keys .zero { grid-area: 4 / 1 / 5 / 4; }
.keys.off { filter: grayscale(.5); }
.foot { text-align: center; font-size: 11.5px; color: var(--color-muted); }

/* ===== story ===== */
.story { position: relative; z-index: 2; color: #fff; display: grid; gap: 18px; align-content: center; animation: in .7s cubic-bezier(.2, .9, .25, 1) .15s both; }
.biglogo { width: 250px; height: auto; filter: drop-shadow(0 10px 24px rgb(0 0 0 / .25)); animation: float 5s ease-in-out infinite; }
@keyframes float { 50% { transform: translateY(-6px); } }
.story h2 { margin: 0; font-size: 34px; line-height: 1.5; font-weight: 700; text-wrap: balance; } .story h2 em { font-style: normal; color: #ffd2c4; }
.lead { margin: -8px 0 4px; font-size: 15px; color: rgb(255 255 255 / .88); max-width: 42ch; }
.inv { width: min(400px, 100%); background: #fffefb; color: #233; border-radius: 6px; padding: 18px 20px 28px; font-size: 13.5px; transform: rotate(-2deg); box-shadow: 0 34px 54px -30px rgb(0 0 0 / .6);
  -webkit-mask: linear-gradient(#000 0 0) top / 100% calc(100% - 10px) no-repeat, radial-gradient(circle at 7px 0, transparent 6px, #000 6.5px) bottom / 14px 10px repeat-x;
  mask: linear-gradient(#000 0 0) top / 100% calc(100% - 10px) no-repeat, radial-gradient(circle at 7px 0, transparent 6px, #000 6.5px) bottom / 14px 10px repeat-x; }
.it { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px dashed #b9c6c5; padding-bottom: 8px; margin-bottom: 6px; }
.it b { font-size: 15.5px; color: var(--color-deep); } .it span { font-family: 'Share Tech Mono', ui-monospace, monospace; color: var(--color-primary-ink); font-size: 14px; }
.l { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; opacity: 0; transform: translateY(5px); transition: opacity .35s, transform .35s; }
.l.in { opacity: 1; transform: none; }
.l b { font-family: 'Share Tech Mono', ui-monospace, monospace; font-size: 15px; }
.l.cut b { color: #b4532a; }
.l.net { border-top: 1.5px dashed #b9c6c5; margin-top: 6px; padding-top: 8px; font-weight: 700; } .l.net b { color: var(--color-primary-ink); font-size: 20px; }
.sent { margin-top: 10px; display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: #1f8a54; opacity: 0; transform: scale(.9); transform-origin: right; transition: opacity .35s, transform .35s cubic-bezier(.3, 1.5, .5, 1); }
.sent.in { opacity: 1; transform: none; } .sent :deep(svg) { width: 16px; height: 16px; }

@media (max-width: 1040px) {
  .layout { grid-template-columns: minmax(0, 1fr); justify-items: center; gap: 32px; }
  .scale { width: min(560px, 100%); }
  .story { order: 2; width: min(560px, 100%); justify-items: center; text-align: center; } .story h2 { font-size: 26px; }
}
@media (max-width: 480px) { .lcd .read { font-size: 50px; letter-spacing: 6px; } .keys { grid-template-rows: repeat(4, 56px); } .plu { grid-template-columns: minmax(0, 1fr); } .leds span { font-size: 9.5px; } }
@media (prefers-reduced-motion: reduce) { .scale, .story, .lcd.bad, .biglogo, .swell, .bub { animation: none; } .l { transition: none; } .bub { display: none; } }
</style>
