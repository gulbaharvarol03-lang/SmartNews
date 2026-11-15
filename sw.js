const CACHE_NAME = 'smartnews-v2';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/config.js',
    './js/routes/router.js',
    './js/models/User.js',
    './js/models/News.js',
    './js/controllers/NewsController.js',
    './js/controllers/UserController.js',
    './js/services/NewsService.js',
    './js/services/SearchNewsService.js',
    './js/services/RecommendationService.js',
    './js/db/database.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    // API veya dış kaynak istekleri haricindeki yerel varlıkları önbellekten sun
    e.respondWith(
        caches.match(e.request, { ignoreSearch: true }).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(e.request).catch(() => {
                // Çevrimdışı durumunda kök sayfaya dön
                if (e.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
