/* The private feedback page's API. Locked with the WHISKER_ADMIN_KEY secret, set by the owner:
     npx wrangler secret put WHISKER_ADMIN_KEY
   Without that secret (or with a short one) it stays shut. Wrong keys are capped per address each hour. */
export const MIN_KEY = 12;
export const TRIES_PER_HOUR = 10;
const HOUR = 3600 * 1000;
const LIST_SIZE = 200;

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const fail = (status, error) => json(status, { error });
const sha256 = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

/* compares hashes, looking at every byte, so the time taken says nothing about the key */
async function sameKey(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  return x.reduce((diff, v, i) => diff | (v ^ y[i]), 0) === 0;
}

/* GET lists feedback, newest first. POST {id, done} ticks one off or reopens it. */
export async function handleAdmin(request, env, now = Date.now()) {
  const db = env.WHISKER_DB, key = env.WHISKER_ADMIN_KEY;
  if (!db || typeof key !== 'string' || key.length < MIN_KEY) return fail(503, 'The admin page isn\'t set up yet.');
  if (request.method !== 'GET' && request.method !== 'POST') return fail(405, 'Not allowed.');

  const hash = 'adm:' + hex(await sha256((request.headers.get('cf-connecting-ip') || 'local') + (env.WHISKER_SALT || '')));
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM rate WHERE hash = ? AND at > ?').bind(hash, now - HOUR).first();
  if (count >= TRIES_PER_HOUR) return fail(429, 'Too many wrong tries. Wait an hour.');
  const given = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!(await sameKey(given, key))) {
    await db.prepare('INSERT INTO rate (hash, at) VALUES (?, ?)').bind(hash, now).run();
    return fail(401, 'Wrong password.');
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return fail(400, 'That could not be read.'); }
    if (!body || !Number.isInteger(body.id) || typeof body.done !== 'boolean') return fail(400, 'That could not be read.');
    await db.prepare('UPDATE feedback SET done = ? WHERE id = ?').bind(body.done ? 1 : 0, body.id).run();
    return json(200, { saved: true });
  }
  const { results } = await db.prepare('SELECT id, at, type, name, message, info, done FROM feedback ORDER BY at DESC, id DESC LIMIT ?').bind(LIST_SIZE).all();
  return json(200, { items: results });
}
