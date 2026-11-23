<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'
import AgencySettings from '../components/settings/AgencySettings.vue'
import GradesSettings from '../components/settings/GradesSettings.vue'
import DefaultsSettings from '../components/settings/DefaultsSettings.vue'
import CatsSettings from '../components/settings/CatsSettings.vue'
import SplitSettings from '../components/settings/SplitSettings.vue'
import UsersSettings from '../components/settings/UsersSettings.vue'
import { USERS, can } from '../data/auth.js'
import { AGENCY, PRICES } from '../data/demo.js'
import { CATS } from '../data/expenses.js'
import { SPLIT } from '../data/investors.js'
import { SETTINGS } from '../data/settings.js'
import { AUDIT } from '../data/audit.js'

// Settings — the sheet's tab track (title + a live line under it), one section at a time; each section saves on its own and is logged.
const TABS = computed(() => [
  { value: 'agency', label: 'الوكالة', sub: AGENCY.name, comp: AgencySettings },
  { value: 'grades', label: 'أصناف السمك', sub: `${PRICES.length} أصناف`, comp: GradesSettings },
  { value: 'defaults', label: 'الموردين والتجار', sub: `عمولة ${SETTINGS.defaultRate}% · حد ${SETTINGS.defaultLimit.toLocaleString('en-US')}`, comp: DefaultsSettings },
  { value: 'cats', label: 'بنود المصاريف', sub: `${CATS.length} بنود`, comp: CatsSettings },
  { value: 'split', label: 'توزيع الأرباح', sub: `إدارة ${SPLIT.mgmt}% · ${SPLIT.owner}/${100 - SPLIT.owner}`, comp: SplitSettings },
  ...(can('users') ? [{ value: 'users', label: 'المستخدمين', sub: `${USERS.filter((u) => u.active).length} فعّالين`, comp: UsersSettings }] : []),
])
const tab = ref('agency')
const current = computed(() => TABS.value.find((t) => t.value === tab.value))
const changes = computed(() => AUDIT.filter((a) => a.kind === 'settings').length)

const tabsEl = ref(null)
const thumb = ref({ left: '0px', width: '0px', opacity: 0 })
function placeThumb() { const b = tabsEl.value?.querySelector('button.on'); if (b) thumb.value = { left: b.offsetLeft + 'px', width: b.offsetWidth + 'px', opacity: 1 } }
watch(tab, () => nextTick(placeThumb))
onMounted(() => { nextTick(placeThumb); document.fonts?.ready.then(placeThumb); window.addEventListener('resize', placeThumb) })
onBeforeUnmount(() => window.removeEventListener('resize', placeThumb))
</script>

<template>
  <div class="page settings">
    <header class="dhead">
      <div class="hello">
        <h1>الإعدادات</h1>
        <p>كل قسم بينحفظ لحاله، وكل تغيير بيتسجّل باسمك.</p>
      </div>
      <div class="actions">
        <RouterLink to="/audit" class="alink"><AppIcon name="clock" />سجل التعديلات<span v-if="changes" class="num">{{ changes }}</span></RouterLink>
      </div>
    </header>

    <nav ref="tabsEl" class="mtabs" role="tablist" aria-label="أقسام الإعدادات">
      <span class="thumb" :style="thumb" aria-hidden="true" />
      <button v-for="t in TABS" :key="t.value" type="button" role="tab" :aria-selected="tab === t.value" :class="{ on: tab === t.value }" @click="tab = t.value">
        <b>{{ t.label }}</b><small class="num">{{ t.sub }}</small>
      </button>
    </nav>

    <Transition name="swap" mode="out-in">
      <component :is="current.comp" :key="tab" />
    </Transition>
  </div>
</template>

<style scoped>
.mtabs { margin-top: 0; }
.mtabs button b { white-space: nowrap; } .mtabs button small { white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
.alink { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 16px; border-radius: 12px; background: rgb(255 255 255 / .7); color: var(--color-primary-ink); font-weight: 600; font-size: 13.5px; text-decoration: none; transition: background .15s; }
.alink:hover { background: #fff; } .alink :deep(svg) { width: 17px; height: 17px; }
.alink span { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--color-primary); color: #fff; font-size: 11.5px; display: grid; place-items: center; }
</style>
