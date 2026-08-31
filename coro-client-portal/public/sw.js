const CACHE_NAME = 'coro-sentinelle-v1';

// Ressources à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/dashboard',
  '/offline',
];

// ── Installation ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activation (nettoyage anciens caches) ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── File d'attente hors ligne pour check-ins ──────────────────────────────────
const OFFLINE_QUEUE_KEY = 'coro-offline-checkins';

// ── Fetch — stratégie Network First avec fallback cache ───────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Requêtes API check-in/checkout → mise en file si hors ligne (seulement si même domaine)
  if (
    url.hostname !== 'api.getcoro.io' &&
    url.hostname !== 'localhost' &&
    (url.pathname.includes('/api/occupancy/checkin') ||
    url.pathname.includes('/api/occupancy/checkout'))
  ) {
    event.respondWith(
      fetch(event.request.clone()).catch(async () => {
        // Hors ligne → sauvegarder dans IndexedDB via message au client
        const body = await event.request.clone().json().catch(() => ({}));
        await saveOfflineCheckin(body, url.pathname);
        return new Response(
          JSON.stringify({
            success: true,
            offline: true,
            message: 'Enregistré hors ligne — sera synchronisé dès reconnexion',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // Requêtes vers api.getcoro.io → toujours passer directement, jamais intercepter
  if (url.hostname === 'api.getcoro.io' || url.hostname === 'localhost') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Autres requêtes API → Network First, pas de cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Hors ligne', offline: true }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    );
    return;
  }

  // Pages et assets → Network First avec fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET') {
            cache.put(event.request, clone);
          }
        });
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(
          (cached) => cached || caches.match('/offline')
        )
      )
  );
});

// ── Sync en arrière-plan (quand connexion revient) ───────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    event.waitUntil(syncOfflineCheckins());
  }
});

// ── Sauvegarde locale d'un check-in hors ligne ───────────────────────────────
async function saveOfflineCheckin(data, endpoint) {
  const db = await openDB();
  const tx = db.transaction('offline-checkins', 'readwrite');
  tx.objectStore('offline-checkins').add({
    data,
    endpoint,
    timestamp: new Date().toISOString(),
    synced: false,
  });
}

// ── Synchronisation des check-ins en attente ─────────────────────────────────
async function syncOfflineCheckins() {
  const db = await openDB();
  const tx = db.transaction('offline-checkins', 'readwrite');
  const store = tx.objectStore('offline-checkins');
  const all = await store.getAll();

  for (const item of all) {
    if (item.synced) continue;
    try {
      await fetch(item.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
      });
      store.delete(item.id);
    } catch {
      // Sera retenté au prochain sync
    }
  }
}

// ── IndexedDB helper ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('coro-offline', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('offline-checkins')) {
        const store = db.createObjectStore('offline-checkins', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('synced', 'synced');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}