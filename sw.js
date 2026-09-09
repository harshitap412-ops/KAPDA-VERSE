const CACHE_NAME = "kapda-verse-v2";
const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./supabase-client.js",
    "./install.js",
    "./manifest.webmanifest",
    "./icon.svg",
    "./pages/dashboard.html",
    "./pages/almirah.html",
    "./pages/budget.html",
    "./pages/chat.html",
    "./pages/outfit-picker.html",
    "./pages/share.html",
    "./pages/shopping.html",
    "./pages/styling.html",
    "./pages/tryon.html",
    "./pages/clothes/mens.html",
    "./pages/clothes/womens.html"
];

self.addEventListener("install", function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(APP_FILES);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys
                    .filter(function(key) { return key !== CACHE_NAME; })
                    .map(function(key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", function(event) {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, copy);
                });
                return response;
            })
            .catch(function() {
                return caches.match(event.request);
            })
    );
});
