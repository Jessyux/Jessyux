/* Sand messages API. Only /api/* reaches this Worker (assets.run_worker_first);
   the rest of the site stays static. */
import { validatePost, MAX_BYTES } from './validate.mjs';

const WALL = 100;
const RATE_LIMIT = 5;
const HOUR = 3600 * 1000;

const json = (status, data) => new Response(data == null ? null : JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const fail = (status, error) => json(status, { error });

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return new Uint8Array(buf);
}
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/* hashing first gives both sides one length, then no early exit */
async function secretMatches(given, secret) {
  if (!secret || !given) return false;
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const toMessage = (row) => ({
  id: row.id,
  name: row.name,
  kind: row.kind,
  ...(row.kind === 'text' ? { text: row.text } : { strokes: JSON.parse(row.strokes) }),
  created: row.created,
});

async function list(env) {
  const { results } = await env.SAND_DB
    .prepare('SELECT id, name, kind, text, strokes, created FROM messages ORDER BY created DESC LIMIT ?')
    .bind(WALL).all();
  return json(200, { messages: results.map(toMessage) });
}

async function post(request, env) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BYTES) return fail(413, 'That message is too big to save.');
  let body;
  try { body = JSON.parse(raw); } catch { return fail(400, 'That message could not be read.'); }

  const checked = validatePost(body);
  const now = Date.now();
  /* bots get a success that saved nothing */
  if (!checked.ok && checked.reason === 'spam') return json(201, { id: crypto.randomUUID(), name: null, kind: 'text', text: '', created: now });
  if (!checked.ok) return fail(checked.status, checked.reason);

  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const hash = hex(await sha256(ip + (env.SAND_SALT || '')));
  await env.SAND_DB.prepare('DELETE FROM rate WHERE at < ?').bind(now - 2 * HOUR).run();
  const { count } = await env.SAND_DB
    .prepare('SELECT COUNT(*) AS count FROM rate WHERE hash = ? AND at > ?')
    .bind(hash, now - HOUR).first();
  if (count >= RATE_LIMIT) return fail(429, 'That\'s a lot of messages for one hour. Try again a little later.');

  const { name, kind, text, strokes } = checked.value;
  const id = crypto.randomUUID();
  await env.SAND_DB.batch([
    env.SAND_DB.prepare('INSERT INTO rate (hash, at) VALUES (?, ?)').bind(hash, now),
    env.SAND_DB.prepare('INSERT INTO messages (id, name, kind, text, strokes, created) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, name, kind, text, strokes ? JSON.stringify(strokes) : null, now),
  ]);
  return json(201, { id, name, kind, ...(kind === 'text' ? { text } : { strokes }), created: now });
}

async function remove(request, env, id) {
  const auth = request.headers.get('authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!(await secretMatches(given, env.SAND_ADMIN_SECRET))) return fail(401, 'That secret isn\'t right.');
  await env.SAND_DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
  return json(204);
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (pathname === '/api/sand') {
        if (request.method === 'GET') return await list(env);
        if (request.method === 'POST') return await post(request, env);
        return fail(405, 'Not allowed.');
      }
      const m = pathname.match(/^\/api\/sand\/([\w-]{1,64})$/);
      if (m && request.method === 'DELETE') return await remove(request, env, m[1]);
      return fail(404, 'Not found.');
    } catch (e) {
      console.error(e);
      return fail(503, 'Messages can\'t be saved right now.');
    }
  },
};
