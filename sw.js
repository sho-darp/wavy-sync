self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('ggwave-app').then((cache) => {
      return cache.addAll(['/', 'index.html', 'style.css', 'main.js']);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((response) => response || fetch(e.request)));
});
