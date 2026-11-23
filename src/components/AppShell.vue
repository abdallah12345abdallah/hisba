<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { AGENCY, USER, TOTALS } from '../data/demo.js'
import { can, signOut } from '../data/auth.js'

// Every page in the sidebar; each one shows only to users allowed to open it (perm).
const ALL_NAV = [
  { icon: 'home', label: 'الرئيسية', to: '/', perm: 'home' },
  { icon: 'sheet', label: 'البيانات اليومية', to: '/sheet', perm: 'sheet', count: () => TOTALS.drafts.length },
  { icon: 'traders', label: 'التجار', to: '/traders', perm: 'traders' },
  { icon: 'farm', label: 'الموردين', to: '/suppliers', perm: 'suppliers' },
  { icon: 'feed', label: 'العلف', group: 'الحسابات', to: '/feed', perm: 'feed' },
  { icon: 'safe', label: 'الخزنة', group: 'الحسابات', to: '/safe', perm: 'safe' },
  { icon: 'receipt', label: 'المصاريف', group: 'الحسابات', to: '/expenses', perm: 'expenses' },
  { icon: 'staff', label: 'الموظفين', group: 'الناس', to: '/staff', perm: 'staff' },
  { icon: 'share', label: 'المساهمين', group: 'الناس', to: '/investors', perm: 'investors' },
  { icon: 'report', label: 'التقارير', group: 'الناس', to: '/reports', perm: 'reports' },
  { icon: 'gear', label: 'الإعدادات', group: 'النظام', to: '/settings', perm: 'settings' },
]
// a group title shows once, above the first allowed item of that group
const NAV = computed(() => {
  let last = null
  return ALL_NAV.filter((n) => can(n.perm)).map((n) => { const g = n.group && n.group !== last ? n.group : null; if (n.group) last = n.group; return { ...n, group: g } })
})
const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const active = computed(() => NAV.value.findIndex((n) => n.to && (n.to === '/' ? route.path === '/' : route.path.startsWith(n.to))))
const bubble = ref(null)

function go(item) {
  menuOpen.value = false
  router.push(item.to)
}
// someone who may open only one page (the scale clerk) gets no sidebar: a slim top bar with the logo, who they are and sign-out
const solo = computed(() => NAV.value.length <= 1)
function logout() { menuOpen.value = false; signOut(); router.replace('/login') }
// each page starts at the top of the bubble
watch(() => route.matched[0]?.path, () => bubble.value?.scrollTo({ top: 0 }))
</script>

<template>
  <div class="shell" :class="{ solo }">
    <aside v-if="!solo" class="nav" :class="{ open: menuOpen }" aria-label="القائمة">
      <div class="brand" aria-label="حِسبة">
        <img src="/logo-full.webp" alt="حِسبة" width="200" height="61" />
      </div>
      <template v-for="(item, i) in NAV" :key="item.label">
        <div v-if="item.group" class="grp">{{ item.group }}</div>
        <a :href="item.to || '#'" :class="{ on: i === active, soon: !item.to }" :aria-current="i === active ? 'page' : undefined" @click.prevent="go(item)">
          <AppIcon :name="item.icon" />{{ item.label }}
          <span v-if="item.count && item.count()" class="cnt num">{{ item.count() }}</span>
        </a>
      </template>
      <div class="user">
        <div class="me">
          <span class="av"><AppIcon name="user" /><i class="online" aria-label="متصل" /></span>
          <div class="who">
            <b>{{ USER.name }}</b>
            <span class="agency" :title="`${AGENCY.name} · ${AGENCY.place}`">{{ USER.role }} · {{ AGENCY.name }}</span>
          </div>
          <button type="button" class="out" title="تسجيل خروج" aria-label="تسجيل خروج" @click="logout"><AppIcon name="logout" /></button>
        </div>
      </div>
    </aside>

    <main ref="bubble" class="bubble">
      <div v-if="solo" class="topbar">
        <span class="tlogo"><img src="/logo-full.webp" alt="حِسبة" width="120" height="36" /></span>
        <span class="tme"><span class="tav"><AppIcon name="user" /></span><span><b>{{ USER.name }}</b><small>{{ USER.role }} · {{ AGENCY.name }}</small></span>
          <button type="button" class="tout" title="تسجيل خروج" aria-label="تسجيل خروج" @click="logout"><AppIcon name="logout" />خروج</button></span>
      </div>
      <div v-else class="mbar">
        <img src="/logo-full.webp" alt="حِسبة" width="120" height="36" />
        <button class="menu" aria-label="القائمة" @click="menuOpen = !menuOpen"><AppIcon name="menu" /></button>
      </div>
      <slot />
    </main>
  </div>
</template>

<style scoped>
/* solo: the page takes the full width and the shell keeps only a slim bar on top */
.shell.solo { grid-template-columns: minmax(0, 1fr); padding-inline-start: 14px; }
.topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: -10px 0 18px; padding-bottom: 14px; border-bottom: 1px solid rgb(11 59 69 / .08); }
.tlogo { display: inline-grid; padding: 5px 12px; border-radius: 14px; background: linear-gradient(140deg, #0a4652, #0e6b69); box-shadow: 0 10px 20px -14px rgb(11 59 69 / .7); }
.tlogo img { width: 110px; height: auto; display: block; }
.tme { display: flex; align-items: center; gap: 10px; }
.tav { width: 38px; height: 38px; border-radius: 12px; background: var(--color-primary-pale); color: var(--color-primary-ink); display: grid; place-items: center; } .tav :deep(svg) { width: 20px; height: 20px; }
.tme > span:nth-child(2) { display: grid; line-height: 1.35; } .tme b { font-size: 14px; color: var(--color-deep); } .tme small { font-size: 11.5px; color: var(--color-muted); }
.tout { display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 14px; border: 0; border-radius: 11px; background: rgb(255 255 255 / .7); color: var(--color-deep); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: background .15s, color .15s; }
.tout:hover { background: #ff7a5c; color: #fff; } .tout :deep(svg) { width: 17px; height: 17px; }
@media (max-width: 900px) { .shell.solo { padding: 0; } .topbar { margin-top: 0; } }
@media (max-width: 520px) { .tme > span:nth-child(2) small { display: none; } .tout { padding: 0 10px; } }
</style>
