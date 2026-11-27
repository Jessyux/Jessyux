/* Whisker Isles shared leaderboard. A finished game sends each player's name and place;
   the Worker turns places into points (3, 2, 1) so a page can't pick its own score.
   Each game id counts once. Rows are keyed by lower-case name. */
import { isBlocked } from './blocklist.mjs';

export const MAX_NAME = 14;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const BOARD_SIZE = 100;
export const HISTORY_SIZE = 20;
const PLACE_POINTS = [3, 2, 1];

export const pointsFor = (place) => PLACE_POINTS[place - 1] || 0;
const refuse = (status, reason) => ({ ok: false, status, reason });

/* the cat each player last played as: a premade breed plus optional colours. Anything unknown is dropped, never refused. */
export const BREED_IDS = ['ginger', 'tuxedo', 'calico', 'siamese', 'grey', 'black', 'persian', 'tortie', 'fold', 'bengal'];
const TINT_KEYS = ['coat', 'mark', 'iris', 'collar'];
export function cleanCat(c) {
  if (!c || typeof c !== 'object' || !BREED_IDS.includes(c.b)) return null;
  const t = c.t && typeof c.t === 'object' ? c.t : {};
  const out = {};
  for (const k of TINT_KEYS) {
    const v = t[k] == null ? '' : t[k];
    if (v !== '' && !(typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))) return null;
    out[k] = v.toLowerCase();
  }
  return { b: c.b, t: out };
}
const readCat = (text) => { try { return cleanCat(JSON.parse(text)); } catch (e) { return null; } };

const TILE_TYPES = ['litter', 'yarn', 'nip', 'nib', 'fish', 'nap'];
const DOCK_TYPES = ['any', 'litter', 'yarn', 'nip', 'nib', 'fish'];
const int = (n, max) => Number.isInteger(n) && n >= 0 && n <= max;
const rows = (list, max, ok) => Array.isArray(list) && list.length <= max && list.every((r) => Array.isArray(r) && ok(r));
/* the finished island. Anything unexpected drops the board, never the result */
export function cleanBoard(n) {
  if (!n || typeof n !== 'object' || !int(n.r, 9) || n.r < 2 || !int(n.v, 99)) return null;
  if (!Array.isArray(n.c) || n.c.length > MAX_PLAYERS || !n.c.every((c) => int(c, 9))) return null;
  const seat = (p) => int(p, n.c.length - 1);
  if (!rows(n.t, 99, ([type, num]) => TILE_TYPES.includes(type) && int(num, 12))) return null;
  if (!rows(n.d, 30, ([e, type]) => int(e, 399) && DOCK_TYPES.includes(type))) return null;
  if (!rows(n.b, 100, ([v, p, t]) => int(v, 299) && seat(p) && int(t, 1))) return null;
  if (!rows(n.y, 200, ([e, p]) => int(e, 399) && seat(p))) return null;
  const two = (list) => list.map(([a, b]) => [a, b]);
  return { r: n.r, v: n.v, c: [...n.c], t: two(n.t), d: two(n.d), b: n.b.map(([v, p, t]) => [v, p, t]), y: two(n.y) };
}

/* returns {ok:true,value:{gid,results,board}} or {ok:false,status,reason} */
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
    const vp = Number.isInteger(r.vp) && r.vp >= 0 && r.vp <= 99 ? r.vp : null;
    results.push({ name, key: name.toLowerCase(), place: r.place, points: pointsFor(r.place), cat: cleanCat(r.cat), vp });
  }
  if (new Set(results.map((r) => r.key)).size !== results.length) return refuse(400, 'Each player needs their own name.');
  if (results.filter((r) => r.place === 1).length !== 1) return refuse(400, 'A game has one winner.');
  if (results.some((r) => r.place < 1 || r.place > results.length)) return refuse(400, 'Those places don\'t add up.');
  return { ok: true, value: { gid: body.gid, results, board: cleanBoard(body.board) } };
}

export async function listBoard(db) {
  const { results } = await db
    .prepare('SELECT name, points, wins, games, last, cat FROM players ORDER BY points DESC, wins DESC, games ASC, name ASC LIMIT ?')
    .bind(BOARD_SIZE).all();
  return results.map((r) => ({ ...r, cat: r.cat ? readCat(r.cat) : null }));
}

/* adds a game's points once; a repeat of the same game id changes nothing */
export async function recordGame(db, { gid, results, board }, now) {
  const seen = await db.prepare('SELECT gid FROM games WHERE gid = ?').bind(gid).first();
  if (seen) return false;
  await db.batch([
    db.prepare('INSERT INTO games (gid, at) VALUES (?, ?)').bind(gid, now),
    ...results.map((r) => db.prepare(
      `INSERT INTO players (key, name, points, wins, games, last, cat) VALUES (?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT(key) DO UPDATE SET name = excluded.name, points = points + excluded.points,
         wins = wins + excluded.wins, games = games + 1, last = excluded.last, cat = COALESCE(excluded.cat, cat)`,
    ).bind(r.key, r.name, r.points, r.place === 1 ? 1 : 0, now, r.cat ? JSON.stringify(r.cat) : null)),
    ...results.map((r) => db.prepare('INSERT INTO game_players (gid, key, name, place, points, vp, cat) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(gid, r.key, r.name, r.place, r.points, r.vp ?? null, r.cat ? JSON.stringify(r.cat) : null)),
    ...(board ? [db.prepare('INSERT INTO game_boards (gid, board) VALUES (?, ?)').bind(gid, JSON.stringify(board))] : []),
  ]);
  return true;
}

const readBoard = (text) => { try { return cleanBoard(JSON.parse(text)); } catch (e) { return null; } };

/* the latest finished games, newest first, each with its players in finishing order.
   Games recorded before player history was kept have no rows, so they are not listed. */
export async function listGames(db) {
  const { results } = await db.prepare(
    `SELECT g.gid, g.at, b.board, p.name, p.place, p.points, p.vp, p.cat
       FROM (SELECT gid, at FROM games AS x WHERE EXISTS (SELECT 1 FROM game_players WHERE gid = x.gid) ORDER BY at DESC LIMIT ?) g
       JOIN game_players p ON p.gid = g.gid LEFT JOIN game_boards b ON b.gid = g.gid ORDER BY g.at DESC, g.gid, p.place`,
  ).bind(HISTORY_SIZE).all();
  const games = new Map();
  for (const { gid, at, board, cat, ...p } of results) {
    if (!games.has(gid)) games.set(gid, { gid, at, board: readBoard(board), players: [] });
    games.get(gid).players.push({ ...p, cat: cat ? readCat(cat) : null });
  }
  return [...games.values()];
}
