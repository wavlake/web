// Service Worker for PWA and Push Notifications
// Enhanced to handle web push notifications as per PRD

const CACHE_NAME = 'wavlake-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon-96x96.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first strategy for static assets, network-first for dynamic content
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Handle static assets with cache-first strategy
  if (request.url.includes('.png') || request.url.includes('.ico') || request.url.includes('manifest.json')) {
    event.respondWith(
      caches.match(request)
        .then(response => response || fetch(request))
        .catch(() => caches.match('/favicon-96x96.png')) // Fallback icon
    );
    return;
  }
  
  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/'))
    );
    return;
  }
  
  // Default: network-first for other requests
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push event received:', event);

  let notificationData = {
    title: 'New activity',
    body: 'You have new activity on Wavlake',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData
      };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const showNotificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.data.eventId || 'default',
      requireInteraction: false,
      silent: false,
      actions: notificationData.actions || []
    }
  );

  // Notify any open tabs about the new notification
  const notifyTabsPromise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NEW_NOTIFICATION',
        data: notificationData
      });
    });
  });

  event.waitUntil(
    Promise.all([showNotificationPromise, notifyTabsPromise])
  );
});

// Notification click event - handle clicks on notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click event:', event);

  event.notification.close();

  const notificationData = event.notification.data || {};

  // Determine the URL to open based on notification data
  let urlToOpen = '/notifications';

  if (notificationData.groupId) {
    urlToOpen = `/group/${notificationData.groupId}`;

    // Add specific parameters based on notification type
    if (notificationData.eventId) {
      urlToOpen += `?post=${notificationData.eventId}`;
    }

    if (notificationData.type === 'join_request') {
      urlToOpen += '#members?membersTab=requests';
    } else if (notificationData.type === 'report') {
      urlToOpen += `#reports?reportId=${notificationData.eventId}`;
    }
  }

  const openWindowPromise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(clientList => {
    // Check if there's already a window open
    for (const client of clientList) {
      if (client.url.includes(self.location.origin)) {
        // Focus the existing window and navigate to the notification URL
        client.postMessage({
          type: 'NAVIGATE_TO',
          url: urlToOpen
        });
        return client.focus();
      }
    }

    // No window open, open a new one
    const fullUrl = new URL(urlToOpen, self.location.origin).href;
    return self.clients.openWindow(fullUrl);
  });

  event.waitUntil(openWindowPromise);
});

// Background sync for offline notification handling (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  // This could be used to sync notifications when coming back online
  // For now, just log that sync was requested
  console.log('Background sync for notifications requested');
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed:', event);

  const resubscribePromise = self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: null // Will need to be set with VAPID key
  }).then(subscription => {
    // Send the new subscription to the server
    return fetch('/api/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription.toJSON())
    });
  });

  event.waitUntil(resubscribePromise);
});
