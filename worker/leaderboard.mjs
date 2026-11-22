/* Whisker Isles shared leaderboard. A finished game sends each player's name and place;
   the Worker turns places into points (3, 2, 1) so a page can't pick its own score.
   Each game id counts once. Rows are keyed by lower-case name. */
import { isBlocked } from './blocklist.mjs';

export const MAX_NAME = 14;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const BOARD_SIZE = 100;
const PLACE_POINTS = [3, 2, 1];

export const pointsFor = (place) => PLACE_POINTS[place - 1] || 0;
const refuse = (status, reason) => ({ ok: false, status, reason });

/* returns {ok:true,value:{gid,results}} or {ok:false,status,reason} */
export function validateResult(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refuse(400, 'That result could not be read.');
  if (typeof body.gid !== 'string' || !/^[a-z0-9-]{6,64}$/i.test(body.gid)) return refuse(400, 'That game could not be read.');
  const list = body.results;
  if (!Array.isArray(list) || list.length < MIN_PLAYERS || list.length > MAX_PLAYERS) return refuse(400, `A game has ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`);

  const results = [];
  for (const r of list) {
    if (!r || typeof r.name !== 'string' || !Number.isInteger(r.place)) return refuse(400, 'That result could not be read.');
    const name = r.name.trim();
    if (!name) return refuse(400, 'Every player needs a name.');
    if ([...name].length > MAX_NAME) return refuse(400, `Names can be up to ${MAX_NAME} characters.`);
    if (isBlocked(name)) return refuse(422, `"${name}" can't go on the leaderboard. Try another name.`);
    results.push({ name, key: name.toLowerCase(), place: r.place, points: pointsFor(r.place) });
  }
  if (new Set(results.map((r) => r.key)).size !== results.length) return refuse(400, 'Each player needs their own name.');
  if (results.filter((r) => r.place === 1).length !== 1) return refuse(400, 'A game has one winner.');
  if (results.some((r) => r.place < 1 || r.place > results.length)) return refuse(400, 'Those places don\'t add up.');
  return { ok: true, value: { gid: body.gid, results } };
}

export async function listBoard(db) {
  const { results } = await db
    .prepare('SELECT name, points, wins, games, last FROM players ORDER BY points DESC, wins DESC, games ASC, name ASC LIMIT ?')
    .bind(BOARD_SIZE).all();
  return results;
}

/* adds a game's points once; a repeat of the same game id changes nothing */
export async function recordGame(db, { gid, results }, now) {
  const seen = await db.prepare('SELECT gid FROM games WHERE gid = ?').bind(gid).first();
  if (seen) return false;
  await db.batch([
    db.prepare('INSERT INTO games (gid, at) VALUES (?, ?)').bind(gid, now),
    ...results.map((r) => db.prepare(
      `INSERT INTO players (key, name, points, wins, games, last) VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET name = excluded.name, points = points + excluded.points,
         wins = wins + excluded.wins, games = games + 1, last = excluded.last`,
    ).bind(r.key, r.name, r.points, r.place === 1 ? 1 : 0, now)),
  ]);
  return true;
}
