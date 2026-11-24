import { createApp } from 'vue'
import '@fontsource-variable/noto-kufi-arabic'
import './style.css'
import App from './App.vue'
import router from './router.js'

// wait for the first route (and its page) before showing anything, so a refresh opens straight on the same page
const app = createApp(App).use(router)
router.isReady().then(() => app.mount('#app'))

// keep the app opening when the internet drops (built app only; the dev server reloads on its own)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
