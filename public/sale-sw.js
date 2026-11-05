/* 10円ベルの通知用 Service Worker（scope: /sale） */
const META_CACHE = "sale-meta";
const LAST_PUSH_KEY = "/sale/__last-push";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

async function recordReceived(tag) {
  const at = new Date().toISOString();
  try {
    const cache = await caches.open(META_CACHE);
    await cache.put(LAST_PUSH_KEY, new Response(JSON.stringify({ at, tag }), { headers: { "Content-Type": "application/json" } }));
  } catch (e) {
    // 記録できなくても通知は出す
  }
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) client.postMessage({ type: "sale-push-received", at, tag });
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "10円ベル";
  const tag = data.tag || "sale";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body: data.body || "10円の作品が見つかりました",
        icon: "/sale/icon-192.png",
        badge: "/sale/badge-96.png",
        tag,
        renotify: true,
        data: { url: data.url || "/sale" },
      }),
      recordReceived(tag),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/sale", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin + "/sale") && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
