/**
 * Service Worker for Dot Music Player
 * 100% Offline Asset Caching
 * Developed by S. M. Mahmud Iqbal
 */

const CACHE_NAME = 'dot-music-player-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './ndot.css',
  './ndot57.woff',
  './ndot57.ttf',
  './app.js',
  './visualizer.js',
  './audio-engine.js',
  './scanner.js',
  './id3-parser.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
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

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback for offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
