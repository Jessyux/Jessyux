/* Whisker Isles feedback: game ideas and bug reports. Write-only from the game, so nobody can read
   other people's messages through the site; read them from the database. */
import { isBlocked } from './blocklist.mjs';

export const FEEDBACK_TYPES = ['game', 'bug'];
export const MAX_MESSAGE = 1000;
export const MAX_SENDER = 14;
const MAX_INFO = 300;
export const FEEDBACK_PER_HOUR = 6;
const HOUR = 3600 * 1000;

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
});
const fail = (status, error) => json(status, { error });
async function sha256hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const refuse = (status, reason) => ({ ok: false, status, reason });
const clip = (s, n) => [...s].slice(0, n).join('');

/* returns {ok:true,value} or {ok:false,status,reason}. Swearing is allowed in the message (it is private); a blocked name is dropped. */
export function validateFeedback(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refuse(400, 'That could not be read.');
  if (!FEEDBACK_TYPES.includes(body.type)) return refuse(400, 'Pick game feedback or bug report.');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return refuse(400, 'Write a message first.');
  if ([...message].length > MAX_MESSAGE) return refuse(400, `Keep it under ${MAX_MESSAGE} characters.`);
  let name = typeof body.name === 'string' ? clip(body.name.trim(), MAX_SENDER) : '';
  if (name && isBlocked(name)) name = '';
  const info = typeof body.info === 'string' ? clip(body.info, MAX_INFO) : '';
  return { ok: true, value: { type: body.type, message, name: name || null, info: info || null } };
}

export async function saveFeedback(db, f, now) {
  await db.prepare('INSERT INTO feedback (at, type, name, message, info) VALUES (?, ?, ?, ?, ?)')
    .bind(now, f.type, f.name, f.message, f.info).run();
}

/* POST /api/feedback. IPs are only kept as a salted hash, to cap messages an hour (same table as the leaderboard). */
export async function handleFeedback(request, env) {
  const db = env.WHISKER_DB;
  if (!db) return fail(503, 'Feedback isn\'t set up yet.');
  if (request.method !== 'POST') return fail(405, 'Not allowed.');
  const raw = await request.text();
  if (raw.length > 8192) return fail(413, 'That message is too big.');
  let body;
  try { body = JSON.parse(raw); } catch { return fail(400, 'That could not be read.'); }
  const checked = validateFeedback(body);
  if (!checked.ok) return fail(checked.status, checked.reason);

  const now = Date.now();
  const hash = 'fb:' + await sha256hex((request.headers.get('cf-connecting-ip') || 'local') + (env.WHISKER_SALT || ''));
  await db.prepare('DELETE FROM rate WHERE at < ?').bind(now - 2 * HOUR).run();
  const { count } = await db.prepare('SELECT COUNT(*) AS count FROM rate WHERE hash = ? AND at > ?').bind(hash, now - HOUR).first();
  if (count >= FEEDBACK_PER_HOUR) return fail(429, 'That\'s a lot of messages for one hour. Try again a little later.');
  await db.prepare('INSERT INTO rate (hash, at) VALUES (?, ?)').bind(hash, now).run();

  await saveFeedback(db, checked.value, now);
  return json(201, { saved: true });
}
