// Hisba service worker: keeps the app opening when the market's internet drops.
// Pages: network first, the saved app when offline. Files (scripts, styles, fonts, images): served from the cache,
// refreshed in the background. Other sites (WhatsApp links…) are never touched.
const CACHE = 'hisba-v1'
const SHELL = ['/', '/index.html', '/favicon.png', '/icon-192.png', '/logo-full.webp', '/logo-mark.png', '/manifest.webmanifest']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // a page (any route of the app): try the network, fall back to the saved app
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone()
      caches.open(CACHE).then((c) => c.put('/index.html', copy))
      return res
    }).catch(() => caches.match('/index.html')))
    return
  }

  // files: from the cache right away, refreshed in the background
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req)
    const fresh = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res }).catch(() => hit)
    return hit || fresh
  }))
})
