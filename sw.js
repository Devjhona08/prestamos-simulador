const CACHE = "prestamo-pwa-v2"; // CAMBIA VERSION
const STATIC_ASSETS = ["./styles.css", "./manifest.json"];

// INSTALACIÓN
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// ACTIVACIÓN
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", (e) => {
  const req = e.request;

  //  NO cachear JS ni HTML (lógica crítica)
  if (req.url.endsWith(".js") || req.url.endsWith(".html")) {
    return;
  }

  //  Cache solo assets estáticos
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
