// Makes the app open instantly: the app's own files come from the phone's cache and are refreshed
// in the background for the next open (a new release takes over once this file's CACHE changes);
// the Firebase library and fonts are cached after first use.
const CACHE = 'jaybti-v11';
const SHELL = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const CDN = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  let updated = false;
  e.waitUntil(caches.keys()
    .then(keys => { const old = keys.filter(k => k !== CACHE); updated = old.length > 0; return Promise.all(old.map(k => caches.delete(k))); })
    .then(() => self.clients.claim())
    // Pages still showing the previous release reopen on this one, so an update shows on the first open.
    .then(() => updated && self.clients.matchAll({ type: 'window' }))
    .then(cs => (cs || []).forEach(c => c.navigate(c.url).catch(() => {}))));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    const fresh = fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    });
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match(e.request, { ignoreSearch: true })
      .then(r => r || fresh.catch(() => caches.match('./index.html'))));
  } else if (CDN.includes(url.hostname)) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
    })));
  }
});
