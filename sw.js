/* Service worker — Aplikasi Kesiswaan.
   • Cangkang aplikasi (JS/CSS/ikon): tampil dari cache seketika, diperbarui di latar (stale-while-revalidate).
   • index.html & config.js: jaringan dulu (maks 3 detik) lalu cache → perubahan alamat API/versi cepat terbaca.
   • Pustaka & font CDN: stale-while-revalidate.
   • API Apps Script (script.google.com / googleusercontent.com): TIDAK PERNAH disimpan (data pribadi, selalu segar).
   Naikkan VERSI setiap kali berkas frontend diubah agar perangkat mengambil versi baru. */
const VERSI = 'kesiswaan-v2.0.5';
const CANGKANG = ['./', 'index.html', 'app.js', 'style.css', 'config.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
const API = /(^|\.)script\.google(usercontent)?\.com$/;

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSI).then(c => c.addAll(CANGKANG)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI && k.indexOf('kesiswaan-') === 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function jaringanDulu(req, ms) {
  const cache = await caches.open(VERSI), net = fetch(req).then(r => { if (r.ok) cache.put(req, r.clone()); return r; });
  try { return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('lambat')), ms))]); }
  catch (e) { const m = await cache.match(req); if (m) return m; return net; }
}
async function basiBaru(req) {
  const cache = await caches.open(VERSI), m = await cache.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') cache.put(req, r.clone()); return r; }).catch(() => null);
  return m || (await net) || Response.error();
}
async function navigasi(req) {
  try { return await jaringanDulu(req, 3000); } catch (e) {}
  const c = await caches.open(VERSI);
  return (await c.match('index.html')) || (await c.match('./')) || Response.error();
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (API.test(u.hostname)) return; // API: langsung ke jaringan, tanpa cache
  if (u.origin === location.origin) {
    if (req.mode === 'navigate') return void e.respondWith(navigasi(req));
    if (/\/config\.js$/.test(u.pathname)) return void e.respondWith(jaringanDulu(req, 3000).catch(() => caches.match(req)));
    return void e.respondWith(basiBaru(req));
  }
  if (/(^|\.)cdn\.jsdelivr\.net$|(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(basiBaru(req));
});
