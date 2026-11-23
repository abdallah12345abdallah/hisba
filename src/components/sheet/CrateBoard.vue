<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { TRADERS, CASH_CUSTOMER, KG_PER_BOX, priceOf, fmt } from '../../data/demo.js'
import { gradeColor } from '../../utils/grades.js'
import AppIcon from '../AppIcon.vue'

// "اسحب البوكس" (approved): grades are crates, traders are drop zones.
// Drag a crate onto a trader → a small popover asks how many boxes and how they pay → emit('sell').
// Touch / keyboard fallback: tap a crate to pick it up, then tap a trader.
const props = defineProps({ manifest: { type: Object, required: true } })
const emit = defineEmits(['sell'])

const m = computed(() => props.manifest)
const remainingOf = (g) => g.boxes - m.value.soldOf(g.grade)
const crates = computed(() => m.value.grades.map((g, i) => ({ ...g, rem: remainingOf(g), color: gradeColor(i), price: priceOf(g.grade) })))
const colorOf = (grade) => crates.value.find((c) => c.grade === grade)?.color ?? '#9fb0ad'
const people = computed(() => [{ name: CASH_CUSTOMER }, ...TRADERS].map((t) => {
  const got = m.value.grades.map((g) => [g.grade, m.value.lines.filter((l) => l.trader === t.name && l.grade === g.grade).reduce((a, l) => a + l.boxes, 0)]).filter((x) => x[1])
  const over = t.limit && t.due > t.limit
  // the tray: every box this trader took from this manifest, oldest first, in its grade colour
  const mine = m.value.lines.filter((l) => l.trader === t.name).reverse()
  const minis = mine.flatMap((l) => Array(l.boxes).fill(colorOf(l.grade)))
  const amount = mine.reduce((a, l) => a + l.boxes * KG_PER_BOX * l.price, 0)
  return { ...t, got, over, minis, amount, line: !t.limit ? 'بيدفع هلأ بالدرج' : over ? `فوق الحد · عليه ${fmt(t.due)}` : `عليه ${fmt(t.due)} من ${fmt(t.limit)}` }
}))

/* a one-time hint on the first crate until the user drags or taps once */
const HINT_KEY = 'hisba.dragHint'
const hint = ref((() => { try { return !sessionStorage.getItem(HINT_KEY) } catch { return true } })())
function seenHint() { if (!hint.value) return; hint.value = false; try { sessionStorage.setItem(HINT_KEY, '1') } catch { /* private mode */ } }
const firstLive = computed(() => crates.value.find((x) => x.rem)?.grade)

const leftTotal = computed(() => crates.value.reduce((a, c) => a + c.rem, 0))
const picked = ref(null) // grade name in hand
const target = ref(null) // trader whose popover is open
const qty = ref(1)
const pay = ref('credit')

const crate = computed(() => crates.value.find((c) => c.grade === picked.value))
const amount = computed(() => (crate.value ? qty.value * KG_PER_BOX * crate.value.price : 0))
const targetTrader = computed(() => TRADERS.find((t) => t.name === target.value))
const payNow = computed(() => (target.value === CASH_CUSTOMER ? 'cash' : pay.value))
const goesOver = computed(() => payNow.value === 'credit' && targetTrader.value && targetTrader.value.due + amount.value > targetTrader.value.limit)

watch(() => m.value.id, () => { picked.value = null; target.value = null })

/* when a grade loses boxes, the last few little boxes on its pile fly off (crate design 5 "كومة بوكسات") */
const leaving = reactive({})
watch(() => crates.value.map((c) => c.rem), (now, before) => {
  if (!before || now.length !== before.length) return
  crates.value.forEach((c, i) => {
    const gone = before[i] - now[i]
    if (gone > 0 && before[i] <= 12 + gone) {
      leaving[c.grade] = Math.min(gone, 5)
      setTimeout(() => { leaving[c.grade] = 0 }, 650)
    }
  })
})

function pick(g) { picked.value = picked.value === g ? null : g; target.value = null }
function open(name) { if (!picked.value || target.value) return; target.value = name; qty.value = 1; pay.value = 'credit' }
function step(d) { qty.value = Math.max(1, Math.min((Number(qty.value) || 0) + d, crate.value?.rem ?? 1)) }
/* typed counts are kept between 1 and what is left of the grade */
function fixQty() { qty.value = Math.max(1, Math.min(Math.round(Number(qty.value) || 1), crate.value?.rem ?? 1)) }
const qtyIn = ref(null)
/* the count is ready to type as soon as the popover opens */
watch(target, (t) => { if (t) nextTick(() => qtyIn.value?.[0]?.focus?.() ?? qtyIn.value?.focus?.()) })
function sell() {
  fixQty()
  const g = crate.value
  emit('sell', { trader: target.value, grade: g.grade, boxes: qty.value, price: g.price, pay: payNow.value })
  target.value = null
  if (g.rem - qty.value <= 0) picked.value = null
}

/* pointer drag with a floating ghost; a short press without movement counts as a tap */
const ghost = ref(null) // { x, y, text }
const over = ref(null)
let press = null
function down(e, c) {
  if (!c.rem) return
  seenHint()
  press = { grade: c.grade, x: e.clientX, y: e.clientY, moving: false }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', cancel)
}
function move(e) {
  if (!press) return
  if (!press.moving && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) {
    press.moving = true; picked.value = press.grade; target.value = null
  }
  if (!press.moving) return
  const c = crates.value.find((x) => x.grade === press.grade)
  ghost.value = { x: e.clientX, y: e.clientY, text: `${c.grade} · باقي ${c.rem}` }
  const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]')
  over.value = hit ? hit.dataset.drop : null
}
function up() {
  if (!press) return
  if (press.moving) { if (over.value) open(over.value) } else pick(press.grade)
  cancel()
}
function cancel() {
  press = null; ghost.value = null; over.value = null
  window.removeEventListener('pointermove', move)
  window.removeEventListener('pointerup', up)
  window.removeEventListener('pointercancel', cancel)
}
onBeforeUnmount(cancel)
</script>

<template>
  <section class="board">
    <div class="col fish">
      <div class="hd">
        <span><b><AppIcon name="farm" />السمك</b><small>{{ m.supplier }}</small><span v-if="leftTotal" class="howto" aria-hidden="true"><AppIcon name="pointhand" />اسحب لعند التاجر<i>‹‹‹</i></span></span>
        <span class="big num">{{ leftTotal }}<small>باقي من {{ m.boxes }}</small></span>
      </div>
      <div class="body crates">
        <button v-for="c in crates" :key="c.grade" type="button" class="crate" :class="{ picked: picked === c.grade, empty: !c.rem, nudge: hint && c.grade === firstLive }" :style="{ '--c': c.color }"
          :disabled="!c.rem" :aria-pressed="picked === c.grade" @pointerdown="down($event, c)" @click="$event.detail === 0 && pick(c.grade)">
          <span class="top">
            <span v-if="c.rem" class="grip" aria-hidden="true"><AppIcon name="grip" /></span>
            <span class="w"><b>{{ c.grade }}</b><small v-if="c.rem" class="num">{{ c.price }} ج/كجم · من {{ c.boxes }}</small></span>
            <span v-if="c.rem" class="n num">{{ c.rem }}</span>
            <span v-else class="done"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>خلص</span>
          </span>
          <span v-if="c.rem" class="pull" aria-hidden="true"><AppIcon name="next" /></span>
          <span v-if="hint && c.grade === firstLive" class="hint" aria-hidden="true"><AppIcon name="pointhand" />اسحبني لعند التاجر</span>
          <span class="pile" aria-hidden="true">
            <i v-for="i in Math.min(c.rem, 12)" :key="i" :style="{ '--i': i - 1 }" />
            <i v-for="j in leaving[c.grade] || 0" :key="'go' + j" class="go" />
            <em v-if="c.rem > 12" class="num">+{{ c.rem - 12 }}</em>
          </span>
        </button>
      </div>
    </div>

    <div class="col people">
      <div class="hd">
        <span><b><AppIcon name="traders" />التجار</b><small>{{ picked ? `مسكت ${picked}، اختار التاجر` : 'اسحب الصنف لعند التاجر، أو اكبسه بعدين اكبس التاجر' }}</small></span>
        <span class="big num">{{ people.length }}<small>تجار</small></span>
      </div>
      <div class="body drops">
        <div v-for="p in people" :key="p.name" class="drop" :data-drop="p.name"
          :class="{ ready: picked, over: over === p.name, open: target === p.name }"
          :role="picked && target !== p.name ? 'button' : undefined" :tabindex="picked && target !== p.name ? 0 : undefined"
          @click="open(p.name)" @keydown.enter.prevent="open(p.name)" @keydown.space.prevent="open(p.name)">
          <svg class="edge" aria-hidden="true"><rect x="1" y="1" rx="17" ry="17" /></svg>
          <header>
            <span class="who"><b>{{ p.name }}</b><small class="num" :class="{ bad: p.over }">{{ p.line }}</small><span v-if="p.limit" class="debt" :class="{ bad: p.over }" role="progressbar" :aria-label="`الدين من الحد`" :aria-valuenow="Math.round((p.due / p.limit) * 100)" aria-valuemax="100"><i :style="{ width: Math.min(100, (p.due / p.limit) * 100) + '%' }" /></span></span>
            <span v-if="p.amount" class="amt"><b class="num">{{ fmt(p.amount) }}</b><small>ج اليوم</small></span>
          </header>
          <div class="basket">
            <div class="tray" :aria-label="p.got.map(([g, b]) => b + ' ' + g).join('، ') || 'لسا ما اشترى'">
              <template v-if="p.minis.length">
                <i v-for="(col, i) in p.minis.slice(0, 30)" :key="i" :style="{ '--c': col }" />
                <em v-if="p.minis.length > 30" class="num">+{{ p.minis.length - 30 }}</em>
              </template>
              <span v-else-if="picked" class="ph drophere"><AppIcon name="down" />حط البوكس هون</span>
              <span v-else class="ph">فاضية</span>
            </div>
          </div>

          <Transition name="qpop">
            <div v-if="target === p.name && crate" class="qpop" role="dialog" :aria-label="`كم بوكس ${crate.grade} لـ${p.name}`" @click.stop @keydown.stop>
              <small>{{ crate.grade }} لـ{{ p.name }}</small>
              <div class="row">
                <button type="button" aria-label="ناقص" :disabled="qty <= 1" @click="step(-1)">−</button>
                <input ref="qtyIn" v-model.number="qty" class="qin num" type="number" inputmode="numeric" min="1" :max="crate.rem" dir="ltr" aria-label="عدد البوكسات" @focus="$event.target.select()" @blur="fixQty" @keydown.enter.prevent="fixQty(); sell()" />
                <button type="button" aria-label="زائد" :disabled="qty >= crate.rem" @click="step(1)">+</button>
              </div>
              <small class="num">{{ fmt(qty * KG_PER_BOX) }} كجم · {{ fmt(amount) }} ج<template v-if="goesOver"> · فوق الحد!</template></small>
              <div v-if="p.name !== CASH_CUSTOMER" class="paysw">
                <span>آجل</span>
                <button type="button" class="sw" :class="{ on: pay === 'cash' }" role="switch" :aria-checked="pay === 'cash'" aria-label="نقدي"
                  @click="pay = pay === 'cash' ? 'credit' : 'cash'" />
                <span>نقدي</span>
              </div>
              <div class="go">
                <button type="button" class="no" @click="target = null">إلغاء</button>
                <button type="button" class="ok" @click="sell">بيع</button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="ghost" class="crate-ghost" dir="rtl" :style="{ left: ghost.x + 'px', top: ghost.y + 'px' }"><AppIcon name="grab" />{{ ghost.text }}</div>
    </Teleport>
  </section>
</template>

<style scoped>
.board { background: var(--card); border-radius: 14px; display: grid; grid-template-columns: 270px minmax(0, 1fr); box-shadow: 0 1px 3px rgb(11 59 69 / .07); }
.col { min-width: 0; display: grid; align-content: start; }
.fish { border-inline-end: 1px solid #cfe5e9; background: linear-gradient(180deg, #d6f0f4 0%, #e6f6f8 100%); border-start-start-radius: 14px; border-end-start-radius: 14px; }
.hd { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 16px; }
.hd b { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.hd b :deep(svg) { width: 20px; height: 20px; }
.hd small { display: block; color: var(--color-muted); font-size: 12px; }
.hd .big { font-size: 26px; font-weight: 700; line-height: 1; text-align: left; }
.hd .big small { font-size: 11px; font-weight: 500; margin-top: 4px; }
.fish .hd { background: transparent; border-bottom: 1px solid #c6e3e8; color: var(--color-primary-ink); border-start-start-radius: 14px; }
.people .hd { background: linear-gradient(120deg, #ffe4dd, #fff1ec); color: #9a3412; border-start-end-radius: 14px; }
.body { padding: 14px 16px 16px; }
.crates { display: grid; gap: 12px; }
.crate { position: relative; border: 1.5px solid color-mix(in srgb, var(--c) 35%, #fff); text-align: right; border-radius: 12px; padding: 12px; background: linear-gradient(160deg, color-mix(in srgb, var(--c) 7%, #fff), color-mix(in srgb, var(--c) 14%, #fff)); color: var(--color-ink); font: inherit;
  box-shadow: 0 1px 3px rgb(11 59 69 / .1); display: grid; gap: 8px; cursor: grab; user-select: none; touch-action: none; transition: transform .2s, box-shadow .2s; }
.crate .top { display: flex; align-items: center; gap: 10px; }
.crate .w { flex: 1; min-width: 0; display: grid; line-height: 1.45; }
.crate b { font-weight: 700; }
.crate small { color: var(--color-muted); font-size: 11.5px; }
.crate .n { font-size: 24px; font-weight: 700; }
.pile { display: flex; flex-wrap: wrap; align-items: center; gap: 3px; min-height: 12px; }
.pile i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); box-shadow: inset 0 -2px 0 rgb(0 0 0 / .12); animation: drop .35s cubic-bezier(.2, .9, .25, 1) both; animation-delay: calc(var(--i, 0) * 25ms); }
@keyframes drop { from { transform: translateY(-8px); opacity: 0; } }
.pile i.go { animation: popoff .55s ease-in forwards; }
@keyframes popoff { 0% { transform: none; } 40% { transform: translateY(-12px) scale(1.2); } 100% { transform: translate(-18px, -26px) scale(.4); opacity: 0; } }
.pile em { font-style: normal; font-size: 11px; color: var(--color-muted); margin-inline-start: 4px; }
.crate:hover:not(:disabled) { box-shadow: 0 8px 18px -12px rgb(11 59 69 / .6); }
.crate.picked { outline: 2px solid var(--color-primary); transform: translateY(-3px); box-shadow: 0 12px 22px -14px rgb(11 59 69 / .6); }
.crate.picked .pile i:not(.go) { animation: jig .9s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 60ms); }
@keyframes jig { 50% { transform: translateY(-2px); } }
/* sold out: a calm green "done" card that moves to the end of the list */
.crate.empty { order: 1; cursor: default; padding: 9px 12px; background: #fff; border-color: #dbe8e6; box-shadow: none; gap: 0; }
.crate.empty b { font-weight: 600; color: var(--color-muted); }
.done { display: inline-flex; align-items: center; gap: 4px; color: var(--color-positive); font-size: 12.5px; font-weight: 600; flex: none; }
.done svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.8; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 22; stroke-dashoffset: 22; animation: tick .45s ease .15s forwards; }
@keyframes tick { to { stroke-dashoffset: 0; } }

.drops { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.drop { position: relative; border-radius: 18px; background: #fff; display: grid; gap: 10px; align-content: start; padding: 12px;
  transition: transform .2s, box-shadow .2s, min-height .2s; }
/* dashed edge drawn in SVG so it follows the rounded corners and can march */
.edge { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
.edge rect { width: calc(100% - 2px); height: calc(100% - 2px); fill: none; stroke: #c3dcdf; stroke-width: 1.8; stroke-dasharray: 9 6; animation: march 5s linear infinite; transition: stroke .2s; }
@keyframes march { to { stroke-dashoffset: -30; } }
.drop.ready { cursor: pointer; }
.drop.ready .edge rect { stroke: #8fc3cb; animation-duration: 2.6s; }
.drop.ready:hover, .drop.over { transform: translateY(-3px); box-shadow: 0 14px 26px -16px rgb(11 59 69 / .6); }
.drop.ready:hover .edge rect, .drop.over .edge rect { stroke-dasharray: none; stroke-width: 2.5; }
.drop.open .edge rect { animation: none; }
.drop.open { min-height: 240px; cursor: default; transform: none; }
.drop header { display: flex; gap: 12px; align-items: center; }
.who { display: grid; min-width: 0; line-height: 1.45; flex: 1; }
.who b { font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.who small { color: var(--color-muted); font-size: 11.5px; }
.who small.bad { color: #b42d2d; font-weight: 600; }
/* debt toward the limit: a slim bar under the debt line, red once past it */
.debt { display: block; height: 5px; border-radius: 3px; background: #e6eeee; margin-top: 5px; max-width: 220px; overflow: hidden; }
.debt i { display: block; height: 100%; border-radius: 3px; background: linear-gradient(90deg, #2dd4bf, var(--color-primary)); transition: width .6s cubic-bezier(.2, .9, .25, 1); }
.debt.bad i { background: var(--color-negative); }
.amt { text-align: left; line-height: 1.3; flex: none; }
.amt b { display: block; font-size: 16px; font-weight: 700; color: var(--color-deep); }
.amt small { font-size: 11px; color: var(--color-muted); }
/* the tray the boxes land in */
.basket { position: relative; }
.tray { padding: 10px 12px; min-height: 46px; display: flex; flex-wrap: wrap; gap: 3px; align-content: center; align-items: center; border-radius: 10px; background: #f4f9f9; transition: background .2s; }
.tray i { width: 12px; height: 12px; border-radius: 3px; background: var(--c); box-shadow: inset 0 -2px 0 rgb(0 0 0 / .12); animation: fall .5s cubic-bezier(.3, 1.3, .5, 1) both; }
@keyframes fall { from { transform: translateY(-30px); opacity: 0; } }
.tray em { font-style: normal; font-size: 11px; color: var(--color-muted); align-self: center; margin-inline-start: 4px; }
.tray .ph { color: #8a9a97; font-size: 12px; align-self: center; }
.drop.ready:hover .tray, .drop.over .tray { background: #eaf6f8; }

.qpop { position: absolute; inset: 6px; z-index: 3; background: linear-gradient(180deg, #f3fafb, #e6f4f7); color: var(--color-ink); border-radius: 12px; padding: 12px;
  display: grid; gap: 10px; align-content: center; box-shadow: inset 0 0 0 1.5px #b9dde5, 0 14px 30px -18px rgb(11 59 69 / .55); }
.qpop small { text-align: center; color: var(--color-muted); font-size: 12px; }
.qpop small:first-child { color: var(--color-primary-ink); font-weight: 600; font-size: 13px; }
.qpop .row { display: flex; align-items: center; justify-content: center; gap: 16px; }
.qpop .row button { width: 44px; height: 44px; border-radius: 50%; border: 0; background: #fff; color: var(--color-primary-ink); font-size: 22px; cursor: pointer;
  box-shadow: 0 1px 3px rgb(11 59 69 / .15); transition: transform .12s, background .15s; }
.qpop .row button:last-child { background: var(--color-primary); color: #fff; box-shadow: 0 6px 14px -6px rgb(14 116 144 / .7); }
.qpop .row button:active:not(:disabled) { transform: scale(.92); }
.qpop .row button:disabled { opacity: .4; cursor: not-allowed; }
.qin { width: 78px; height: 48px; border: 0; border-radius: 12px; background: #fff; box-shadow: inset 0 0 0 1.5px #d5e3e5; font: inherit; font-size: 30px; font-weight: 700; text-align: center; color: var(--color-deep); outline: 0; -moz-appearance: textfield; appearance: textfield; }
.qin:focus { box-shadow: inset 0 0 0 2px var(--color-primary); }
.qin::-webkit-outer-spin-button, .qin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.paysw { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: var(--color-muted); }
.sw { width: 50px; height: 28px; border-radius: 999px; border: 0; background: #c9dcdc; position: relative; cursor: pointer; transition: background .2s; }
.sw::after { content: ""; position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / .2); transition: transform .2s; }
.sw.on { background: var(--color-secondary); }
.sw.on::after { transform: translateX(-22px); }
.go { display: flex; gap: 8px; }
.go button { flex: 1; height: 40px; border: 0; border-radius: 9px; font: inherit; font-weight: 600; cursor: pointer; transition: background .15s; }
.go .ok { background: var(--color-primary); color: #fff; }
.go .ok:hover { background: var(--color-primary-ink); }
.go .no { background: #fff; color: var(--color-ink); }
.go .no:hover { background: #f3f7f7; }
.qpop-enter-active { transition: opacity .25s, transform .25s cubic-bezier(.2, .9, .25, 1); }
.qpop-enter-from { opacity: 0; transform: scale(.9); }

@media (max-width: 1280px) { .board { grid-template-columns: minmax(0, 1fr); } .fish { border: 0; border-bottom: 1px solid #cfe5e9; border-radius: 14px 14px 0 0; } .fish .hd { border-start-end-radius: 14px; } .people .hd { border-radius: 0; } .crates { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); } }
@media (max-width: 560px) { .drops { grid-template-columns: minmax(0, 1fr); } .crates { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>

<style>
/* drag cues: a grip on every crate, a lift on hover, a one-time hint, a target in the tray while holding */
.grip { display: grid; place-items: center; width: 18px; margin-inline-start: -4px; color: color-mix(in srgb, var(--c) 55%, #8aa); opacity: .7; transition: opacity .2s, color .2s, transform .2s; }
.grip :deep(svg) { width: 18px; height: 18px; }
.crate:hover:not(:disabled) { transform: translateY(-2px) rotate(-.6deg); }
.crate:hover:not(:disabled) .grip { opacity: 1; color: var(--c); transform: scale(1.15); }
.crate:active:not(:disabled) { cursor: grabbing; transform: scale(.98); }
.crate.nudge { animation: nudge 3.2s ease-in-out 1s infinite; }
@keyframes nudge { 0%, 70%, 100% { transform: none; } 76% { transform: translateX(-7px) rotate(-1.2deg); } 82% { transform: translateX(0); } 88% { transform: translateX(-4px) rotate(-.6deg); } }
.hint { position: absolute; z-index: 3; top: -14px; inset-inline-end: 10px; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 12px; border-radius: 999px; background: var(--color-deep); color: #fff; font-size: 12px; font-weight: 600; white-space: nowrap;
  box-shadow: 0 10px 20px -10px rgb(11 59 69 / .8); animation: hint-in .5s cubic-bezier(.3, 1.4, .5, 1) .6s both; }
.hint::after { content: ""; position: absolute; bottom: -5px; inset-inline-end: 22px; width: 10px; height: 10px; background: var(--color-deep); transform: rotate(45deg); border-radius: 2px; }
.hint :deep(svg) { width: 15px; height: 15px; animation: point 1.4s ease-in-out infinite; }
@keyframes hint-in { from { opacity: 0; transform: translateY(6px) scale(.9); } }
@keyframes point { 50% { transform: translateX(-5px) rotate(-12deg); } }
.drophere { display: inline-flex; align-items: center; gap: 6px; color: var(--color-primary-ink) !important; font-weight: 600; }
.drophere :deep(svg) { width: 16px; height: 16px; animation: drop-bob 1s ease-in-out infinite; }
@keyframes drop-bob { 50% { transform: translateY(4px); } }
.drop.ready .tray { box-shadow: inset 0 0 0 1.5px rgb(14 116 144 / .25); animation: tray-pulse 1.6s ease-in-out infinite; }
@keyframes tray-pulse { 50% { box-shadow: inset 0 0 0 1.5px rgb(14 116 144 / .55); } }
@media (prefers-reduced-motion: reduce) { .crate.nudge, .hint, .hint :deep(svg), .drophere :deep(svg), .drop.ready .tray { animation: none; } }
.crate-ghost :deep(svg) { width: 18px; height: 18px; vertical-align: -4px; margin-inline-end: 6px; }
/* persistent drag cues */
.howto { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; height: 22px; padding: 0 9px; border-radius: 999px; background: rgb(14 116 144 / .1); color: var(--color-primary-ink); font-size: 11.5px; font-weight: 700; }
.howto :deep(svg) { width: 14px; height: 14px; animation: point 1.4s ease-in-out infinite; }
.howto i { font-style: normal; letter-spacing: -2px; animation: flow 1.2s linear infinite; }
@keyframes flow { 0% { opacity: .25; transform: translateX(3px); } 50% { opacity: 1; } 100% { opacity: .25; transform: translateX(-3px); } }
/* a small chevron on the crate edge pointing to the traders (no badge) */
.pull { position: absolute; top: 50%; inset-inline-end: -15px; z-index: 2; margin-top: -8px; color: color-mix(in srgb, var(--c) 70%, #334); display: grid; place-items: center; opacity: .7; transition: transform .2s, opacity .2s, color .2s; }
.pull :deep(svg) { width: 14px; height: 14px; stroke-width: 2.8; }
.crate:hover:not(:disabled) .pull { opacity: 1; transform: translateX(-3px); color: var(--c); }
.crate.picked .pull { opacity: 1; color: var(--color-primary); animation: nudgel 1s ease-in-out infinite; }
@keyframes nudgel { 50% { transform: translateX(-4px); } }
@media (prefers-reduced-motion: reduce) { .howto :deep(svg), .howto i, .crate.picked .pull { animation: none; } }
.crate-ghost { position: fixed; z-index: 90; pointer-events: none; transform: translate(-50%, -60%) rotate(-4deg); background: var(--color-primary); color: #fff;
  border-radius: 12px; padding: 10px 16px; font-weight: 600; box-shadow: 0 18px 30px -10px rgb(0 0 0 / .5); white-space: nowrap; }
</style>
