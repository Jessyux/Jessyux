/* The Whisker Isles Worker (whisker.jessyux.com): the online game rooms, the shared leaderboard
   and the game page. Only /api/* reaches this code (assets.run_worker_first); everything else
   is the static game in dist-game/ (built by build-game.mjs). */
import { validateResult, listBoard, recordGame } from './leaderboard.mjs';
import { whiskerIsles } from './whisker-room.mjs';
export { WhiskerRoom } from './whisker-room.mjs';

const GAMES_PER_HOUR = 20;
const HOUR = 3600 * 1000;

const json = (status, data) => new Response(data == null ? null : JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const fail = (status, error) => json(status, { error });

async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* IPs are only kept as a salted hash, to cap how many games one place can record an hour.
   WHISKER_SALT is a secret on this Worker; without it the hash is unsalted. */
async function leaderboard(request, env) {
  const db = env.WHISKER_DB;
  if (!db) return fail(503, 'The shared leaderboard isn\'t set up yet.');
  if (request.method === 'GET') return cachedBoard(request, db);
  if (request.method !== 'POST') return fail(405, 'Not allowed.');

  const raw = await request.text();
  if (raw.length > 4096) return fail(413, 'That result is too big.');
  let body;
  try { body = JSON.parse(raw); } catch { return fail(400, 'That result could not be read.'); }
  const checked = validateResult(body);
  if (!checked.ok) return fail(checked.status, checked.reason);

  const now = Date.now();
  const hash = await sha256hex((request.headers.get('cf-connecting-ip') || 'local') + (env.WHISKER_SALT || ''));
  await db.prepare('DELETE FROM rate WHERE at < ?').bind(now - 2 * HOUR).run();
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM rate WHERE hash = ? AND at > ?').bind(hash, now - HOUR).first();
  if (count >= GAMES_PER_HOUR) return fail(429, 'That\'s a lot of games for one hour. Scores will count again a little later.');
  await db.prepare('INSERT INTO rate (hash, at) VALUES (?, ?)').bind(hash, now).run();

  const added = await recordGame(db, checked.value, now);
  if (added) await forgetBoard(request);
  return json(added ? 201 : 200, { added, rows: await listBoard(db) });
}

/* the board is read far more than it changes: keep it in Cloudflare's edge cache for 30 seconds so each page view
   doesn't query the database. A newly recorded game clears it, and the POST reply carries the fresh board anyway. */
const BOARD_TTL = 30;
const boardKey = (request) => new Request(new URL('/api/leaderboard', request.url).toString());
async function cachedBoard(request, db) {
  const cache = globalThis.caches && caches.default;
  // a cached copy goes back out as no-store: the zone's Browser Cache TTL would otherwise turn max-age=30 into hours
  if (cache) { const hit = await cache.match(boardKey(request)); if (hit) return json(200, await hit.json()); }
  const res = json(200, { rows: await listBoard(db) });
  if (cache) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('cache-control', `public, max-age=${BOARD_TTL}`);
    await cache.put(boardKey(request), copy);
  }
  return res;
}
async function forgetBoard(request) {
  try { if (globalThis.caches && caches.default) await caches.default.delete(boardKey(request)); } catch (e) { /* cache is best effort */ }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) {
      // an invite link is whisker.jessyux.com/<code>: the game page opens and reads the code from the address
      if (/^\/[a-z]+-[a-z]+(-\d{2})?\/?$/i.test(pathname)) return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
      return env.ASSETS.fetch(request);
    }
    if (pathname.startsWith('/api/whisker-isles/')) {
      try { return await whiskerIsles(request, env, pathname); } catch (e) { console.error(e); return fail(503, 'Online games can\'t be reached right now.'); }
    }
    if (pathname === '/api/leaderboard') {
      try { return await leaderboard(request, env); } catch (e) { console.error(e); return fail(503, 'The leaderboard can\'t be reached right now.'); }
    }
    return fail(404, 'Not found.');
  },
};
