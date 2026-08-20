// 小零 — Service Worker (PWA 离线支持)
const CACHE_NAME = 'xiaoling-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) as Promise<Response>
    }),
  )
})
