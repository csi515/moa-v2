/**
 * Moa v2 W3C Web Push & PWA Service Worker (0-cost VAPID notification)
 */

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Moa 알림', body: event.data.text() };
    }
  }

  const title = data.title || 'Moa 알림';
  const options = {
    body: data.body || '',
    icon: data.icon || '/vite.svg',
    badge: data.badge || '/vite.svg',
    tag: data.tag || 'moa-notification',
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || '/customer/pass',
      ...data.data,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/customer/pass';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
