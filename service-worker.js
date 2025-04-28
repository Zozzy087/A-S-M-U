// Cache version - increment when updating content
const CACHE_NAME = 'flipbook-cache-v1';
const OFFLINE_URL = '/offline.html';

// Static assets that should be cached immediately
const STATIC_ASSETS = [
    '/',
    'index.html',
    'offline.html',
    'manifest.json',
    'common-styles.css',
    'flipbook-engine.js',
    'auth.js',
    'sounds/pageturn-102978.mp3',
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
    '/images/logo.png',
    '/images/favicon.ico'
];

// Dynamic page generation
const totalPages = 4; // Updated to match the actual number of pages
const PAGE_ASSETS = [
    'pages/borito.html',
    'pages/1 kockás példaoldal.html',
    'pages/3 kockás példaoldal.html',
    'pages/KARAKTER GENERÁLÓ.html',
    'pages/6.html'
];

// Critical images and icons
const IMAGE_ASSETS = [
    'images/d1.png', 'images/d2.png', 'images/d3.png',
    'images/d4.png', 'images/d5.png', 'images/d6.png',
    'files/icon-192.png', 'files/icon-512.png'
];

// Combine all resources
const RESOURCES_TO_CACHE = STATIC_ASSETS
    .concat(IMAGE_ASSETS)
    .concat(PAGE_ASSETS);

// Install event - cache all resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(RESOURCES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Helper function to check if a request is for a page
const isPageRequest = url => {
    return url.pathname.startsWith('/pages/') || 
           url.pathname === '/' || 
           url.pathname === '/index.html';
};

// Helper function to check if a request is for a static asset
const isStaticAsset = url => {
    return url.pathname.startsWith('/images/') || 
           url.pathname.startsWith('/files/') ||
           url.pathname.startsWith('/sounds/') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.js');
};

// Fetch event - handle all requests
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the fetched response
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // If the request is for a page, return the offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match(OFFLINE_URL);
                        }
                        
                        // For other requests, return a fallback response
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

// Handle messages from the client
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
