// Service worker mínimo: instalável na tela de início e com casca offline.
// Estratégia: a casca do app abre offline; **a API nunca sai do cache**.
//
// Servir /api do cache parecia gentileza e era mentira: mostrava o check-in de
// ontem como se fosse de hoje e, pior, fazia o app achar que estava online
// durante uma queda (nada falhava, então a faixa de "sem conexão" nunca subia).
// Melhor deixar a chamada falhar e avisar.
const CACHE = 'chamego-v3';
const SHELL = ['/', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Navegação: tenta a rede e cai na casca guardada, para o app abrir offline.
async function navegacao(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const shell = await caches.match('/');
    if (shell) return shell;
    throw err;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navegacao(request));
    return;
  }
  // /api passa direto: sem cache, sem intermediário. Se a rede caiu, a
  // chamada falha e o app mostra a faixa — que é a verdade.
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request));
  }
});
