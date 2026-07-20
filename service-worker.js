const CACHE_NAME='videira-shell-v3';
const APP_SHELL=[
  './','./index.html','./styles.css','./logo-videira.png','./manifest.webmanifest',
  './pwa-install.css','./pwa-install.js','./assets/icons/app-icon-192.png','./assets/icons/app-icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.headers.has('authorization')||event.request.url.includes('/functions/')||event.request.url.includes('/rest/'))return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        if(response.ok&&response.type==='basic'&&!response.headers.get('cache-control')?.includes('no-store')){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>{
        if(cached)return cached;
        if(event.request.mode==='navigate')return caches.match('./index.html');
        return Response.error();
      }))
  );
});
