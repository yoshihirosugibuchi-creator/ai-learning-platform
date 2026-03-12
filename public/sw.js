/// <reference lib="webworker" />

const CACHE_NAME = 'ale-v2'
const OFFLINE_URL = '/offline'

// ユーザー向けページをプリキャッシュ（管理者ページは除外）
const PRECACHE_URLS = [
  '/',
  '/login',
  '/offline',
  '/quiz',
  '/quiz-packs',
  '/learning',
  '/case-study',
  '/case-study/history',
  '/collection',
  '/analytics',
  '/categories',
  '/profile',
  '/settings',
  '/skp-history',
  '/onboarding',
]

// Pre-cache on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // プリキャッシュは失敗してもインストールを続行
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('SW: Failed to precache:', url, err)
          })
        )
      )
    })
  )
  self.skipWaiting()
})

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip API routes - always network
  if (url.pathname.startsWith('/api/')) return

  // Skip sync API (WatermelonDB同期用、将来)
  if (url.pathname.startsWith('/sync/')) return

  // Skip Supabase requests - always network
  if (url.hostname.includes('supabase')) return

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return

  // Navigation requests (HTML pages) - Network first, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful navigation responses
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_URL)
          })
        })
    )
    return
  }

  // Next.js chunks and static assets - Cache first, fallback to network
  // チャンクファイルはハッシュ付きなのでキャッシュ優先で問題ない
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      })
    )
    return
  }

  // Next.js dynamic chunks (_next/data/) - Network first, fallback to cache
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request)
        })
    )
    return
  }

  // Static assets (icons, images, fonts) - Stale-while-revalidate
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|css)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
            return response
          })
          .catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }
})
