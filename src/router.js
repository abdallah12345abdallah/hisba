import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from './views/DashboardView.vue'
import { me, can, homeFor } from './data/auth.js'
import { PORTAL, pathOf, portalValid } from './data/portal.js'
import { toast } from './composables/useToast.js'

// meta.perm: the permission a page needs. meta.public: opens without signing in (sign-in and the shared statements).
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { bare: true, public: true } },
    { path: '/', name: 'home', component: DashboardView, meta: { perm: 'home' } },
    { path: '/sheet/:id?', name: 'sheet', component: () => import('./views/SaleSheetView.vue'), meta: { perm: 'sheet' } },
    { path: '/traders', name: 'traders', component: () => import('./views/TradersView.vue'), meta: { perm: 'traders' } },
    { path: '/traders/:name', name: 'trader', component: () => import('./views/TraderView.vue'), meta: { perm: 'traders' } },
    { path: '/suppliers', name: 'suppliers', component: () => import('./views/SuppliersView.vue'), meta: { perm: 'suppliers' } },
    { path: '/feed', name: 'feed', component: () => import('./views/FeedView.vue'), meta: { perm: 'feed' } },
    { path: '/safe', name: 'safe', component: () => import('./views/SafeView.vue'), meta: { perm: 'safe' } },
    { path: '/expenses', name: 'expenses', component: () => import('./views/ExpensesView.vue'), meta: { perm: 'expenses' } },
    { path: '/staff', name: 'staff', component: () => import('./views/StaffView.vue'), meta: { perm: 'staff' } },
    { path: '/staff/:id', name: 'staff-one', component: () => import('./views/StaffMemberView.vue'), meta: { perm: 'staff' } },
    { path: '/investors', name: 'investors', component: () => import('./views/InvestorsView.vue'), meta: { perm: 'investors' } },
    { path: '/investors/:id', name: 'investor', component: () => import('./views/InvestorView.vue'), meta: { perm: 'investors' } },
    { path: '/reports', name: 'reports', component: () => import('./views/ReportsView.vue'), meta: { perm: 'reports' } },
    { path: '/audit', name: 'audit', component: () => import('./views/AuditView.vue'), meta: { perm: 'audit' } },
    { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue'), meta: { perm: 'settings' } },
    { path: '/safe/closes', name: 'safe-closes', component: () => import('./views/SafeClosesView.vue'), meta: { perm: 'safe' } },
    { path: '/feed/settlements', name: 'feed-archive', component: () => import('./views/FeedArchiveView.vue'), meta: { perm: 'feed' } },
    { path: '/feed/:name', name: 'feed-account', component: () => import('./views/FeedAccountView.vue'), meta: { perm: 'feed' } },
    { path: '/suppliers/:id', name: 'supplier', component: () => import('./views/SupplierView.vue'), meta: { perm: 'suppliers' } },
    // the read-only statement links for farms and shareholders: no sidebar, no sign-in
    { path: '/i/:token', name: 'investor-share', component: () => import('./views/InvestorShareView.vue'), meta: { bare: true, public: true } },
    { path: '/s/:token', name: 'supplier-share', component: () => import('./views/SupplierShareView.vue'), meta: { bare: true, public: true } },
    // a trader's own page (link + code, or phone + code from the sign-in screen)
    { path: '/t/:token', name: 'trader-share', component: () => import('./views/TraderShareView.vue'), meta: { bare: true, public: true } },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

/* signed out → the sign-in screen (then back to where they were going); no permission → their own first page */
router.beforeEach((to) => {
  if (to.meta.public) {
    if (to.name !== 'login') return true
    if (me.value) return homeFor()
    // a trader or a farm already signed in on this device goes straight back to his own page
    if (portalValid() && !to.query.next) return pathOf(PORTAL.kind, PORTAL.token)
    return true
  }
  if (!me.value) return { name: 'login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  if (to.meta.perm && !can(to.meta.perm)) {
    const home = homeFor()
    if (to.path !== '/') toast('ما عندك صلاحية لهالصفحة', 'اطلبها من صاحب الحلقة من الإعدادات.', { tone: 'info' })
    return home === to.path ? true : home
  }
  return true
})

export default router
