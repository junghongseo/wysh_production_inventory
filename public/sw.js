// WYSHBOARD Service Worker for Instant Load & PWA Badging
// 캐시 이름을 바꾸면 activate 때 이전 버전 캐시가 모두 지워진다.
// 이 파일이 바뀌면 켜 둔 예전 앱도 다시 화면에 띄울 때 새 버전으로 한 번 새로고침된다 (main.jsx controllerchange).
const CACHE_NAME = 'wyshboard-v4';
const NAVIGATION_TIMEOUT_MS = 4000;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
  return response;
};

// 페이지(index.html): 항상 서버 우선. 오프라인이거나 응답이 너무 늦을 때만 캐시 사용.
// (캐시 우선이면 새 배포 후에도 예전 index.html → 예전 화면 코드가 계속 뜬다)
const networkFirst = (request) => new Promise((resolve) => {
  let settled = false;
  const fallback = () => caches.match(request)
    .then((cached) => cached || caches.match('/'))
    .then((cached) => cached || null);

  const timer = setTimeout(() => {
    fallback().then((cached) => {
      if (cached && !settled) { settled = true; resolve(cached); }
    });
  }, NAVIGATION_TIMEOUT_MS);

  fetch(request)
    .then((response) => {
      clearTimeout(timer);
      putInCache(request, response);
      if (!settled) { settled = true; resolve(response); }
    })
    .catch(() => {
      clearTimeout(timer);
      fallback().then((cached) => {
        if (!settled) { settled = true; resolve(cached || Response.error()); }
      });
    });
});

// /assets/*: 빌드마다 파일 이름(해시)이 바뀌므로 캐시 우선이어도 예전 코드가 섞이지 않는다.
const cacheFirst = (request) => caches.match(request).then((cached) =>
  cached || fetch(request).then((response) => putInCache(request, response))
);

// 그 밖의 정적 파일(아이콘, manifest 등): 캐시를 먼저 보여 주고 뒤에서 갱신
const staleWhileRevalidate = (request) => caches.match(request).then((cached) => {
  const fetchPromise = fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => cached);
  return cached || fetchPromise;
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET이 아닌 요청, 다른 도메인(Supabase 등 실시간 데이터)은 건드리지 않는다
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // 서비스 워커 파일과 버전 확인 파일은 항상 서버에서 직접 받게 둔다
  if (url.pathname === '/sw.js' || url.pathname === '/version.json') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
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
