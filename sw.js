// Guarda só a "casca" do app (não tem dados aqui) para abrir mesmo sem internet.
const VERSAO = 'brc-casca-2';
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

// ---------- Avisos (push) ----------
// O Google manda só um "toque" (sem texto). Aqui perguntamos à ponte o que mostrar, usando a chave e o link
// guardados neste aparelho na hora de ativar os avisos. Se não der (sem internet, demora), mostra um aviso genérico.
function mostrarAviso() {
  var padrao = { titulo: 'Gestão Brcinema', corpo: 'Você tem lembretes para hoje. Toque para abrir.' };
  var ler = function (nome) { return caches.open('brc-dados').then(function (c) { return c.match(nome); }).then(function (r) { return r ? r.text() : ''; }).catch(function () { return ''; }); };
  return Promise.all([ler('/__chave'), ler('/__ponte')]).then(function (v) {
    if (!v[0] || !v[1]) return padrao;
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 7000);
    return fetch(v[1], { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ chave: v[0], fn: '__pushConteudo', args: [] }), signal: ctl.signal })
      .then(function (r) { return r.json(); })
      .then(function (o) { clearTimeout(timer); return o && o.ok && o.msg && o.msg.titulo ? o.msg : padrao; })
      .catch(function () { clearTimeout(timer); return padrao; });
  }).catch(function () { return padrao; }).then(function (m) {
    return self.registration.showNotification(String(m.titulo || padrao.titulo), { body: String(m.corpo || ''), icon: 'icon-192.png', badge: 'icon-192.png', tag: 'brc-dia', renotify: true });
  });
}
self.addEventListener('push', function (e) { e.waitUntil(mostrarAviso()); });
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) { if ('focus' in lista[i]) return lista[i].focus(); }
    return self.clients.openWindow(new URL('./', self.registration.scope).href);
  }));
});
