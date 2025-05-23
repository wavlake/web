// Minimal Service Worker for PWA compliance
// No caching - just enough to meet PWA requirements

console.log('[SW] Minimal service worker loaded - no caching');

// Install event - activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing minimal service worker');
  self.skipWaiting();
});

// Activate event - take control immediately  
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating minimal service worker');
  event.waitUntil(self.clients.claim());
});

// Fetch event - pass everything through to network (no caching)
self.addEventListener('fetch', (event) => {
  // Just let all requests pass through to the network normally
  // No caching, no offline support - pure pass-through
});

console.log('[SW] Minimal service worker ready - PWA compliant without caching');
EOF 2>&1
