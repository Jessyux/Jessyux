/* Whisker Isles service worker: shows a notification when the game server says it's your turn,
   even with the browser closed. If the game is open and on screen the page already shows it, so this stays quiet. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { /* plain text or empty */ }
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.some((w) => w.visibilityState === 'visible')) return;
    await self.registration.showNotification(d.title || 'Whisker Isles', {
      body: d.body || '',
      tag: d.tag || 'whisker-isles',
      renotify: true,
      icon: '/img/jessy-avatar.webp',
      badge: '/img/jessy-avatar.webp',
      vibrate: [140, 70, 140],
      data: { url: d.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (new URL(w.url).pathname === new URL(url).pathname) return w.focus();
    }
    if (wins[0] && 'navigate' in wins[0]) { try { await wins[0].focus(); return await wins[0].navigate(url); } catch (err) { /* fall through */ } }
    return self.clients.openWindow(url);
  })());
});
