// Guarda só a "casca" do app (não tem dados aqui) para abrir mesmo sem internet.
const VERSAO = 'brc-casca-1';
const ARQUIVOS = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf('brc-casca-') === 0 && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  // tenta a internet primeiro (para pegar atualizações) e cai no que está guardado se estiver offline
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const copia = res.clone(); caches.open(VERSAO).then(c => c.put(r, copia)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || caches.match('index.html'))));
});
