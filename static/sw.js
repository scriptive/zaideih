(()=>{"use strict";!function(){const e="offline";self.addEventListener("install",(t=>{t.waitUntil((async()=>{const t=await caches.open(e);await t.add(new Request("/",{cache:"reload"}))})()),self.skipWaiting()})),self.addEventListener("activate",(e=>{e.waitUntil((async()=>{"navigationPreload"in self.registration&&await self.registration.navigationPreload.enable()})()),self.clients.claim()})),self.addEventListener("fetch",(t=>{"navigate"===t.request.mode&&t.respondWith((async()=>{try{const e=await t.preloadResponse;return e||await fetch(t.request)}catch(t){console.log("Fetch failed; returning offline page instead.",t);const a=await caches.open(e);return await a.match("/")}})())}))}()})();
//# sourceMappingURL=sw.js.map