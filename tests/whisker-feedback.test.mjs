import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { validateResult, recordGame, listGames } from '../worker/leaderboard.mjs';
import { handleFeedback } from '../worker/feedback.mjs';
import { handleAdmin } from '../worker/admin.mjs';

/* the real schema in an in-memory SQLite, behind the few D1 calls the Worker makes */
function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../worker/whisker-schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) || null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => db.prepare(sql).run(...args),
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); } };
}
const call = (env, body) => handleFeedback(new Request('https://x.test/api/feedback', body ? { method: 'POST', body: JSON.stringify(body) } : {}), env);

test('a finished game keeps its players, once, in finishing order', async () => {
  const db = d1();
  const { value } = validateResult({ gid: 'abc123def', results: [{ name: 'Mo', place: 2, vp: 7 }, { name: 'JT', place: 1, vp: 10 }] });
  assert.equal(await recordGame(db, value, 1000), true);
  assert.equal(await recordGame(db, value, 2000), false);
  const games = await listGames(db);
  assert.equal(games.length, 1);
  assert.deepEqual(games[0].players.map((p) => [p.name, p.place, p.points, p.vp]), [['JT', 1, 3, 10], ['Mo', 2, 2, 7]]);
});

test('feedback of both types is saved, with the name optional', async () => {
  const env = { WHISKER_DB: d1() };
  assert.equal((await call(env, { type: 'game', message: ' More cats ', name: 'Jessy' })).status, 201);
  assert.equal((await call(env, { type: 'bug', message: 'Stuck' })).status, 201);
  const rows = env.WHISKER_DB.raw.prepare('SELECT type, name, message FROM feedback ORDER BY id').all().map((r) => ({ ...r }));
  assert.deepEqual(rows, [{ type: 'game', name: 'Jessy', message: 'More cats' }, { type: 'bug', name: null, message: 'Stuck' }]);
});

test('empty, oversized or unknown feedback is refused, it cannot be read back, and it is capped per hour', async () => {
  const env = { WHISKER_DB: d1() };
  for (const bad of [{ type: 'bug', message: '  ' }, { type: 'other', message: 'x' }, { type: 'bug', message: 'x'.repeat(1001) }]) {
    assert.equal((await call(env, bad)).status, 400);
  }
  assert.equal((await call(env)).status, 405);
  for (let i = 0; i < 6; i++) assert.equal((await call(env, { type: 'bug', message: 'x' })).status, 201);
  assert.equal((await call(env, { type: 'bug', message: 'x' })).status, 429);
});

test('a finished board is kept with the game, and anything but numbers and tile names is dropped', async () => {
  const results = [{ name: 'A', place: 1 }, { name: 'B', place: 2 }];
  const board = { r: 2, v: 0, c: [0, 1], t: [['nap', 0]], d: [[3, 'any']], b: [[4, 1, 1]], y: [[5, 0]] };
  const db = d1();
  await recordGame(db, validateResult({ gid: 'board-game', results, board }).value, 1);
  assert.deepEqual((await listGames(db))[0].board, board);
  for (const bad of [{ ...board, t: [['<img>', 0]] }, { ...board, y: [[5, 7]] }, { ...board, d: [['"x', 'any']] }]) {
    const r = validateResult({ gid: 'board-game', results, board: bad });
    assert.equal(r.ok, true);
    assert.equal(r.value.board, null);
  }
});

test('the admin page stays shut without the right key, and wrong tries are capped', async () => {
  const db = d1(), KEY = 'a-long-test-key';
  const ask = (env, key, body) => handleAdmin(new Request('https://x.test/api/admin/feedback', { method: body ? 'POST' : 'GET', headers: key ? { authorization: 'Bearer ' + key } : {}, body: body ? JSON.stringify(body) : undefined }), env);
  assert.equal((await ask({ WHISKER_DB: db }, KEY)).status, 503);
  assert.equal((await ask({ WHISKER_DB: db, WHISKER_ADMIN_KEY: 'short' }, 'short')).status, 503);
  const env = { WHISKER_DB: db, WHISKER_ADMIN_KEY: KEY };
  await call(env, { type: 'bug', message: 'Stuck' });
  assert.equal((await ask(env)).status, 401);
  const { items } = await (await ask(env, KEY)).json();
  assert.deepEqual(items.map((i) => [i.message, i.done]), [['Stuck', 0]]);
  assert.equal((await ask(env, KEY, { id: items[0].id, done: true })).status, 200);
  assert.equal((await (await ask(env, KEY)).json()).items[0].done, 1);
  for (let i = 0; i < 9; i++) assert.equal((await ask(env, 'wrong')).status, 401);
  assert.equal((await ask(env, KEY)).status, 429);
});
