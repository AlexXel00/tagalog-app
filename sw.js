// Service Worker: macht die App offline-faehig und speichert Audios.
const VERSION = "v0.3.0";
const SHELL_CACHE = "shell-" + VERSION;
const AUDIO_CACHE = "audio-v1";
const SHELL_FILES = [
  "./",
  "index.html",
  "css/app.css",
  "js/config.js",
  "js/app.js",
  "content/woche1.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Audios aus Supabase: einmal laden, danach immer aus dem Speicher
  if (url.pathname.includes("/storage/v1/object/public/audio/")) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // Eigene Dateien: zuerst Netz (immer beim Server nachfragen, damit Updates sofort ankommen),
  // ohne Netz aus dem Speicher
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req, { cache: "no-cache" })
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
    );
  }
});
