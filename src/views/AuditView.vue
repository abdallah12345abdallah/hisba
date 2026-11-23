<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import SoftButton from '../components/ui/SoftButton.vue'
import SearchPill from '../components/ui/SearchPill.vue'
import SelectMenu from '../components/ui/SelectMenu.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import PagerBar from '../components/ui/PagerBar.vue'
import { AUDIT, KINDS } from '../data/audit.js'
import { toast } from '../composables/useToast.js'

// The change log — who approved, reopened, changed or deleted what, and when. Read only: nothing here can be edited.
const q = ref('')
const kind = ref('all')
const counts = computed(() => Object.fromEntries(Object.keys(KINDS).map((k) => [k, AUDIT.filter((a) => a.kind === k).length])))
const KIND_OPTS = computed(() => [{ value: 'all', label: 'كل الحركات', hint: AUDIT.length }, ...Object.entries(KINDS).map(([k, v]) => ({ value: k, label: v.label, hint: counts.value[k] })).filter((o) => o.hint)])
const list = computed(() => AUDIT
  .filter((a) => kind.value === 'all' || a.kind === kind.value)
  .filter((a) => !q.value || `${a.title} ${a.detail} ${a.user}`.includes(q.value.trim())))
const page = ref(1)
const size = ref(10)
watch([q, kind, size], () => { page.value = 1 })
const paged = computed(() => list.value.slice((page.value - 1) * size.value, page.value * size.value))
/* group the page by day, keeping order */
const groups = computed(() => {
  const g = []
  paged.value.forEach((a) => { const last = g[g.length - 1]; if (last && last.day === a.day) last.items.push(a); else g.push({ day: a.day, items: [a] }) })
  return g
})
const CHIPS = [{ k: 'reopen', label: 'انفتحت للتعديل' }, { k: 'edit', label: 'سطور اتغيّرت' }, { k: 'delete', label: 'انحذفت' }]

function exportIt() {
  const rows = [['اليوم', 'الساعة', 'مين', 'النوع', 'الحركة', 'التفاصيل'], ...list.value.map((a) => [a.day, a.time, a.user, KINDS[a.kind].label, a.title, a.detail])]
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const el = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: `سجل التعديلات-${new Date().toISOString().slice(0, 10)}.csv` })
  el.click(); URL.revokeObjectURL(el.href)
  toast('انصدّر السجل', `${list.value.length} حركة · بيفتح بالإكسل`)
}
</script>

<template>
  <div class="page audit">
    <nav class="crumb" aria-label="مسار الصفحة"><RouterLink to="/sheet">شيت البيع</RouterLink><AppIcon name="next" /><span>سجل التعديلات</span></nav>
    <header class="dhead">
      <div class="hello">
        <h1>سجل التعديلات</h1>
        <p class="num">كل اعتماد وفتح وتعديل وحذف بيتسجّل هون باسم اللي عمله. السجل ما بينمسح ولا بيتعدّل.</p>
      </div>
      <div class="actions"><SoftButton icon="out" @click="exportIt">تصدير</SoftButton></div>
    </header>

    <div class="grid">
      <div class="s12 chiprow">
        <button v-for="c in CHIPS" :key="c.k" type="button" class="kc" :class="[KINDS[c.k].tone, { on: kind === c.k }]" @click="kind = kind === c.k ? 'all' : c.k">
          <span class="ki"><AppIcon :name="KINDS[c.k].icon" /></span><b class="num">{{ counts[c.k] }}</b><small>{{ c.label }}</small>
        </button>
      </div>

      <div class="s12 findbar">
        <SearchPill v-model="q" placeholder="دوّر على مورد أو تاجر أو اسم" />
        <SelectMenu v-model="kind" :options="KIND_OPTS" class="fsel" aria-label="نوع الحركة" />
      </div>

      <div class="s12">
        <EmptyState v-if="!list.length" icon="search" title="ما في حركات هون" text="جرّب كلمة تانية أو نوع تاني." />
        <div v-else class="days">
          <section v-for="g in groups" :key="g.day" class="day">
            <h2>{{ g.day }}</h2>
            <TransitionGroup name="list" tag="ol" class="tl">
              <li v-for="a in g.items" :key="a.id" :class="KINDS[a.kind].tone">
                <span class="dot"><AppIcon :name="KINDS[a.kind].icon" /></span>
                <div class="body">
                  <div class="top"><b>{{ a.title }}</b><span class="tag">{{ KINDS[a.kind].label }}</span></div>
                  <p v-if="a.detail" class="num">{{ a.detail }}</p>
                  <div class="meta num"><span><AppIcon name="user" />{{ a.user }}</span><span><AppIcon name="clock" />{{ a.time }}</span>
                    <RouterLink v-if="a.link" :to="a.link" class="open">افتح<AppIcon name="next" /></RouterLink></div>
                </div>
              </li>
            </TransitionGroup>
          </section>
        </div>
      </div>
      <div v-if="list.length" class="s12"><PagerBar v-model:page="page" v-model:size="size" :total="list.length" noun="حركة" /></div>
    </div>
  </div>
</template>

<style scoped>
.audit .grid > * { min-width: 0; }
.crumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--color-muted); margin-bottom: 6px; }
.crumb a { color: var(--color-primary-ink); font-weight: 500; text-decoration: none; } .crumb a:hover { text-decoration: underline; text-underline-offset: 3px; }
.crumb :deep(svg) { width: 15px; height: 15px; }
.chiprow { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.kc { --c: var(--color-primary); --bg: #e6f4f7; display: grid; grid-template-columns: 40px auto 1fr; gap: 10px; align-items: center; border: 0; border-radius: 18px; padding: 12px 14px; background: linear-gradient(150deg, var(--bg), #fff 80%); font: inherit; color: inherit; text-align: right; cursor: pointer; transition: transform .2s, box-shadow .2s; }
.kc:hover { transform: translateY(-2px); } .kc.on { box-shadow: inset 0 0 0 2px var(--c); }
.kc.warn { --c: #b07a12; --bg: #fff4dc; } .kc.bad { --c: var(--color-negative); --bg: #ffecea; }
.ki { width: 40px; height: 40px; border-radius: 12px; background: #fff; color: var(--c); display: grid; place-items: center; } .ki :deep(svg) { width: 19px; height: 19px; }
.kc b { font-size: 24px; color: var(--c); } .kc small { color: var(--color-muted); font-size: 12.5px; }
.findbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; position: relative; z-index: 5; }
.findbar .search { width: 340px; max-width: 100%; } .findbar :deep(.spill) { max-width: none; background: #fff; }
.fsel { width: 220px; } .fsel :deep(.trig) { height: 42px; border-radius: 999px; padding: 0 16px; background: #fff; }
.days { display: grid; gap: 18px; }
.day h2 { margin: 0 0 8px; font-size: 14px; color: var(--color-deep); }
.tl { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; position: relative; }
.tl::before { content: ""; position: absolute; inset-inline-start: 19px; top: 20px; bottom: 20px; width: 2px; background: rgb(11 59 69 / .1); }
.tl li { --c: var(--color-primary); --bg: #e6f4f7; position: relative; display: grid; grid-template-columns: 40px minmax(0, 1fr); gap: 12px; align-items: start; }
.tl li.ok { --c: var(--color-positive); --bg: var(--pos-bg); } .tl li.warn { --c: #b07a12; --bg: #fff4dc; } .tl li.bad { --c: var(--color-negative); --bg: var(--neg-bg); }
.dot { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--bg); color: var(--c); box-shadow: 0 0 0 4px rgb(255 255 255 / .6); position: relative; z-index: 1; } .dot :deep(svg) { width: 18px; height: 18px; }
.body { background: #fff; border-radius: 16px; padding: 10px 14px; display: grid; gap: 4px; }
.top { display: flex; justify-content: space-between; gap: 10px; align-items: center; } .top b { font-size: 14px; }
.tag { font-size: 11px; font-weight: 700; color: var(--c); background: var(--bg); border-radius: 999px; padding: 1px 9px; white-space: nowrap; }
.body p { margin: 0; font-size: 13px; color: var(--color-ink); }
.meta { display: flex; gap: 14px; align-items: center; font-size: 12px; color: var(--color-muted); flex-wrap: wrap; }
.meta span { display: inline-flex; align-items: center; gap: 4px; } .meta :deep(svg) { width: 13px; height: 13px; }
.open { margin-inline-start: auto; display: inline-flex; align-items: center; gap: 2px; color: var(--color-primary-ink); font-weight: 600; text-decoration: none; }
.open:hover { text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 720px) { .chiprow { grid-template-columns: minmax(0, 1fr); } }
</style>
