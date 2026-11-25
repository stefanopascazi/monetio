// MonetIO service worker: caches the app shell and static assets, shows web push notifications.
// Data pages are always fetched from the network (household finances must be fresh);
// when offline, navigations fall back to the cached offline page.
const SHELL_CACHE = "monetio-shell-v2";
const STATIC_CACHE = "monetio-static-v2";
const SHELL = ["/offline.html", "/icons/icon.svg", "/icons/icon-192.png"];
// Build chunks change name on every deploy: without a cap the static cache grows forever.
const STATIC_MAX = 300;

self.addEventListener("install", (event) => {
  // Static Routing API (Chromium 123+): requests the worker does not handle skip it entirely,
  // so RSC payloads, prefetches and server actions never wait for the worker to boot.
  if (event.addRoutes && typeof URLPattern !== "undefined") {
    event
      .addRoutes([
        { condition: { requestMode: "navigate" }, source: "fetch-event" },
        { condition: { urlPattern: new URLPattern({ pathname: "/_next/static/*" }) }, source: "fetch-event" },
        { condition: { urlPattern: new URLPattern({ pathname: "/icons/*" }) }, source: "fetch-event" },
        { condition: { urlPattern: new URLPattern({}) }, source: "network" },
      ])
      .catch(() => {});
  }
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      // Navigation preload: the page request starts while the worker boots, not after.
      .then(() => self.registration.navigationPreload?.enable())
      .then(() => self.clients.claim()),
  );
});

// Drops the oldest entries (insertion order) beyond the cap.
async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return (await event.preloadResponse) || (await fetch(req));
        } catch {
          return caches.match("/offline.html");
        }
      })(),
    );
    return;
  }
  // Immutable build assets and icons: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(
                caches
                  .open(STATIC_CACHE)
                  .then((c) => c.put(req, copy))
                  .then(() => trimCache(STATIC_CACHE, STATIC_MAX)),
              );
            }
            return res;
          }),
      ),
    );
  }
});

// Web push (#28): payload is JSON { title, body, url, tag } queued by the VPS worker.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "MonetIO";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || undefined,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Same-origin paths only ("//host" would leave the app).
      data: { url: typeof data.url === "string" && /^\/(?!\/)/.test(data.url) ? data.url : "/" },
    }),
  );
});

// Focuses an open MonetIO window (navigating it to the target) or opens a new one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) return open.navigate(target).then((w) => (w || open).focus());
      return self.clients.openWindow(target);
    }),
  );
});
