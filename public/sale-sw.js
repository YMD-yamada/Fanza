/* 10円ベルの通知用 Service Worker（scope: /sale） */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "10円ベル";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "10円の作品が見つかりました",
      icon: "/sale/icon-192.png",
      badge: "/sale/badge-96.png",
      tag: data.tag || "sale",
      renotify: true,
      data: { url: data.url || "/sale" },
    }),
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
