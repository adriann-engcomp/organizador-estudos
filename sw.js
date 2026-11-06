// Service worker: deixa o app funcionando offline (inclusive instalado no Android).
// Ao mudar qualquer arquivo do app, aumente a VERSAO para os celulares baixarem a nova versão.
const VERSAO = "v2";
const ARQUIVOS = [
  "./", "./index.html", "./css/style.css", "./manifest.webmanifest",
  "./js/data-curriculo.js", "./js/data-catalogo.js", "./js/data-conteudo.js", "./js/expr.js", "./js/app.js",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (pega atualizações quando online); cache quando offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("./index.html")))
  );
});
