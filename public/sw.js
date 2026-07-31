// Service worker mínimo: instalável na tela de início e com casca offline.
// Estratégia: network-first para navegação e API (dado de casal precisa ser
// fresco), cache-first para estáticos com hash e para as fotos enviadas.
// Suba este número sempre que mexer neste arquivo. É o que faz o `activate`
// jogar fora o cache antigo — sem isso os arquivos com hash de versões velhas
// ficam guardados para sempre, e a limpeza aqui embaixo nunca acha nada.
const CACHE = 'chamego-v2';
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

async function networkFirst(request, fallbackToShell) {
  try {
    const res = await fetch(request);
    if (res.ok && request.method === 'GET') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToShell) {
      const shell = await caches.match('/');
      if (shell) return shell;
    }
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
    event.respondWith(networkFirst(request, true));
    return;
  }
  // A sonda de conexão precisa da rede crua: respondida pelo cache, ela diria
  // "tem internet" com o aparelho no modo avião.
  if (url.pathname === '/api/health') return;
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, false));
    return;
  }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request));
  }
});
