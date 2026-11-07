const CACHE_NAME = 'pos-app-cache-v77';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  /* v66: the clock check (and anything that is not a normal GET) always goes to the network, never the cache */
  if (event.request.method !== 'GET' || event.request.url.indexOf('clock=') !== -1) return;
  /* v72: only the app's own files and the Firebase library files are kept for offline use.
     The live cloud connection (Firestore, sign-in) goes straight to the network and is never copied or stored,
     before v72 every one of those long streaming requests was copied into the phone's cache. */
  let url;
  try { url = new URL(event.request.url); } catch (e) { return; }
  const sameOrigin = url.origin === self.location.origin;
  const firebaseLib = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') !== -1;
  if (!sameOrigin && !firebaseLib) return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
