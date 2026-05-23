const CACHE_NAME = 'yt-viewer-v2-cache-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json'
];

// 설치 시 정적 자산 캐싱
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 활성화 시 오래된 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API 요청: Network First
  if (url.pathname.startsWith('/api/library')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 썸네일 및 비디오: Cache First, then Network (Range 요청 지원 포함)
  if (url.pathname.startsWith('/thumbnails/') || url.pathname.startsWith('/videos/')) {
    event.respondWith(
      caches.match(event.request).then(async cachedResponse => {
        if (cachedResponse) {
          // Range 요청 처리
          const range = event.request.headers.get('range');
          if (range) {
            const buffer = await cachedResponse.arrayBuffer();
            const pos = range.match(/bytes=(\d+)-(\d+)?/);
            const start = parseInt(pos[1], 10);
            const end = pos[2] ? parseInt(pos[2], 10) : buffer.byteLength - 1;
            
            return new Response(buffer.slice(start, end + 1), {
              status: 206,
              statusText: 'Partial Content',
              headers: {
                'Content-Type': cachedResponse.headers.get('Content-Type'),
                'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': end - start + 1
              }
            });
          }
          return cachedResponse;
        }
        
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
            return response;
          }
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        });
      })
    );
    return;
  }

  // 기본 전략: Cache Match -> Network
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
