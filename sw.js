self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("ggwave-app").then((cache) => {
      return cache.addAll([
        "/",
        "index.html",
        "style.css",
        "app.js",
        "https://unpkg.com/vue@3/dist/vue.global.js",
        "https://cdn.jsdelivr.net/npm/ggwave@0.4.0/ggwave.js",
      ]);
    }),
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
