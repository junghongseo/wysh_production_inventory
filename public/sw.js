// WYSHBOARD Service Worker for PWA Installation and App Badging support
const CACHE_NAME = 'wyshboard-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// App Badging message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_BADGE') {
    const count = event.data.count || 0;
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch((err) => console.log('App Badge error:', err));
      } else {
        navigator.clearAppBadge().catch((err) => console.log('App Badge error:', err));
      }
    }
  }
});
