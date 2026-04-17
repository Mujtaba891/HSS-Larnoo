const CACHE_NAME = 'hss-id-system-v1';
const ASSETS_TO_CACHE = [
  '/Card/index.html',
  '/Card/css/app.css',
  '/Card/js/app.js',
  '/Card/js/firebase-config.js',
  '/Card/js/student.js',
  '/Card/js/admin.js',
  '/Card/js/attendance.js',
  '/Card/js/reports.js',
  '/Card/js/bulk.js',
  '/Card/logo3.png',
  '/Card/profile.png',
  '/Card/sign2.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});