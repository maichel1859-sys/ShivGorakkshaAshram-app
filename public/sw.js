const CACHE_NAME = "ashram-v1.2.0";
const STATIC_CACHE = "ashram-static-v1.2.0";
const DYNAMIC_CACHE = "ashram-dynamic-v1.2.0";
const API_CACHE = "ashram-api-v1.2.0";
const IMAGE_CACHE = "ashram-images-v1.2.0";
const IOS_CACHE = "ashram-ios-v1.2.0";

// Files to cache immediately
const STATIC_FILES = [
  "/",
  "/manifest.json",
  "/offline.html",
  "/browserconfig.xml",
  "/icons/icon-72x72.svg",
  "/icons/icon-96x96.svg",
  "/icons/icon-128x128.svg",
  "/icons/icon-144x144.svg",
  "/icons/icon-152x152.svg",
  "/icons/icon-180x180.svg",
  "/icons/icon-192x192.svg",
  "/icons/icon-384x384.svg",
  "/icons/icon-512x512.svg",
  "/icons/maskable-192x192.svg",
  "/icons/maskable-512x512.svg"
];

// Cache strategies
const CACHE_STRATEGIES = {
  NETWORK_FIRST: 'network-first',
  CACHE_FIRST: 'cache-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Install event - cache static files
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Caching static files");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log("Service Worker installed");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker install failed:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if ([
              STATIC_CACHE, 
              DYNAMIC_CACHE, 
              API_CACHE, 
              IMAGE_CACHE
            ].indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - handle different caching strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Handle different types of requests with improved strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first with short cache fallback
    event.respondWith(handleAPIRequest(request));
  } else if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.includes('.') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  ) {
    // Static assets - Cache first with network fallback
    event.respondWith(handleStaticRequest(request));
  } else {
    // HTML pages - Network first with cache fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle static assets with improved caching
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  
  // Check cache first for static assets
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Determine which cache to use based on content type
      let targetCache = STATIC_CACHE;
      const contentType = networkResponse.headers.get('content-type') || '';
      
      if (contentType.startsWith('image/')) {
        targetCache = IMAGE_CACHE;
      }
      
      const cache = await caches.open(targetCache);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Static asset not available offline:', request.url);
    
    // For images, return a placeholder
    if (url.pathname.includes('image') || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em">Image Offline</text></svg>',
        {
          headers: new Headers({
            'Content-Type': 'image/svg+xml'
          })
        }
      );
    }
    
    return new Response('Not found', { status: 404 });
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("Network failed for page request, trying cache:", request.url);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // For other requests, return a generic offline response
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Handle API requests with network-first strategy and short cache
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Always try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses for short duration
      const cache = await caches.open(API_CACHE);
      const responseToCache = networkResponse.clone();
      
      // Add timestamp for cache invalidation
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-timestamp', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cached response is still valid (within 5 minutes)
      const cacheTimestamp = cachedResponse.headers.get('sw-cache-timestamp');
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (cacheTimestamp && (now - parseInt(cacheTimestamp)) < maxAge) {
        // Add offline indicator header
        const headers = new Headers(cachedResponse.headers);
        headers.set('sw-offline-response', 'true');
        
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: headers
        });
      }
    }
    
    // Return offline API response
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Offline - Please try again when connected',
      offline: true 
    }), {
      status: 503,
      headers: new Headers({
        'Content-Type': 'application/json',
        'sw-offline-response': 'true'
      })
    });
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  const options = {
    body: event.data ? event.data.text() : "You have a new notification",
    icon: "/icons/icon-192x192.svg",
    badge: "/icons/badge-72x72.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/icons/checkmark.svg",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icons/xmark.svg",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("Aashram Notification", options)
  );
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
