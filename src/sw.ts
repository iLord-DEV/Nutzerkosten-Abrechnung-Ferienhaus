/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Take control immediately
self.skipWaiting();
clientsClaim();

// Clean up old caches
cleanupOutdatedCaches();

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);

// Push Event Handler
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options: NotificationOptions = {
      body: data.body || '',
      icon: data.icon || '/pwa-192x192.png',
      badge: data.badge || '/pwa-192x192.png',
      tag: data.tag || 'default',
      data: {
        url: data.url || '/'
      },
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Wüstenstein', options)
    );
  } catch (error) {
    console.error('Push event error:', error);
  }
});

// Notification Click Handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});

// Notification Close Handler (optional logging)
self.addEventListener('notificationclose', (event: NotificationEvent) => {
  console.log('Notification closed:', event.notification.tag);
});
