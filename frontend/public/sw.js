const CACHE_NAME = 'ajo-v1'
const URLS_TO_CACHE = [
  '/',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {
        // Ignore errors for optional URLs
      })
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('/offline')
          }
          return new Response('Offline', { status: 503 })
        })
    }),
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-contributions') {
    event.waitUntil(syncContributions())
  }
})

async function syncContributions() {
  try {
    const db = await openIndexedDB()
    const pending = await getPendingContributions(db)
    
    for (const contribution of pending) {
      try {
        await fetch('/api/contributions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contribution),
        })
        await removePendingContribution(db, contribution.id)
      } catch {
        // Retry on next sync
      }
    }
  } catch {
    // Ignore errors
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ajo', 1)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'id' })
      }
    }
  })
}

function getPendingContributions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly')
    const store = tx.objectStore('pending')
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
  })
}

function removePendingContribution(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite')
    const store = tx.objectStore('pending')
    const req = store.delete(id)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(undefined)
  })
}
