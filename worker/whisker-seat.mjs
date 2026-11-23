// Whisker Isles lobby seats: the rules for a cat's name and custom colours, kept apart from the Durable Object so
// they can be tested in Node.
export const MAX_NAME = 14;
const SLOTS = ['coat', 'mark', 'iris', 'collar'];
const HEX = /^#[0-9a-f]{6}$/i;
const key = s => String(s || '').trim().toLowerCase();

/* a cat's colours: each slot is a #rrggbb colour or '' for the original; null when nothing is changed */
export function cleanTint(t) {
  if (!t || typeof t !== 'object') return null;
  const out = {};
  for (const k of SLOTS) out[k] = typeof t[k] === 'string' && HEX.test(t[k]) ? t[k] : '';
  return SLOTS.some(k => out[k]) ? out : null;
}

/* Each device's pid is its secret: it proves who is host and takes a seat back. Other players only ever see a
   seat's public sid, so nobody can copy someone else's pid from a lobby message. */
export function ensureSids(seats) {
  const used = new Set(seats.map(s => s.sid).filter(Boolean));
  for (const s of seats) if (!s.sid) {
    let id; do { id = Math.random().toString(36).slice(2, 10); } while (used.has(id));
    s.sid = id; used.add(id);
  }
  return seats;
}

/* the lobby as one player sees it: pids swapped for sids, and which seat is theirs. A seat nobody holds yet
   (pid null, open true) has no sid-matching device, so it is never counted online. */
export function publicLobby(room, onlinePids, forPid) {
  const sidOf = pid => (pid && (room.seats.find(s => s.pid === pid) || {}).sid) || null;
  const mine = [];
  room.seats.forEach((s, i) => { if (forPid && s.pid === forPid) mine.push(i); });
  return {
    lobby: { code: room.code, host: sidOf(room.host), started: room.started,
      seats: room.seats.map(({ pid, sid, ...rest }) => ({ ...rest, pid: sid })) },
    online: onlinePids.map(sidOf).filter(Boolean),
    you: sidOf(forPid),
    mine,
  };
}

/* ---- moving a game from one shared screen to online ----
   Every cat needs its own device. The host keeps the cat whose turn it is; every other cat is an open seat, and a
   friend who joins with that cat's name takes it over. The game waits until no seat is open. Seats and the game's
   players share one order. */
export const MIN_SEATS = 2, MAX_SEATS = 10;

/* the cats from an in-person game: [{name, breed, color?, tint?}] in player order; the host plays cats[you] */
export function convertSeats(room, hostPid, cats, you) {
  if (room.started || room.seats.length > 1 || (room.seats[0] && room.seats[0].pid !== hostPid)) return { ok: false, error: 'This game is already set up.' };
  if (!Array.isArray(cats) || cats.length < MIN_SEATS || cats.length > MAX_SEATS) return { ok: false, error: `A game needs 2 to ${MAX_SEATS} cats.` };
  if (!Number.isInteger(you) || you < 0 || you >= cats.length) return { ok: false, error: 'Pick which cat you are.' };
  const names = cats.map(c => String((c && c.name) || '').trim().slice(0, MAX_NAME));
  if (names.some(n => !n) || new Set(names.map(key)).size !== names.length) return { ok: false, error: 'Every cat needs its own name.' };
  const seats = cats.map((c, i) => {
    const seat = { pid: i === you ? hostPid : null, name: names[i], breed: Math.max(0, Math.min(39, Math.floor(+c.breed || 0))) };
    if (i !== you) seat.open = true;
    if (Number.isInteger(c.color) && c.color >= 0 && c.color < COLOR_COUNT) seat.color = c.color;
    const tint = cleanTint(c.tint); if (tint) seat.tint = tint;
    return seat;
  });
  return { ok: true, seats };
}

/* the cats still waiting for a device */
export const openSeats = room => room.seats.filter(s => s.open);

/* a friend with this device id takes the open cat called `name` */
export function claimOpen(room, pid, name) {
  const seat = openSeats(room).find(s => key(s.name) === key(name));
  if (!seat) return { ok: false, error: 'That cat is already taken.' };
  seat.pid = pid; delete seat.open;
  return { ok: true, seat };
}

/* the host frees a friend's cat (a friend left for good): it is open again for someone else */
export function releaseSeat(room, hostPid, sid) {
  const seat = room.seats.find(s => s.sid === sid);
  if (!seat || room.host !== hostPid || !seat.pid || seat.pid === hostPid) return { ok: false };
  seat.pid = null; seat.open = true;
  return { ok: true, seat };
}

/* a board colour for the seat with this pid: one of the game's 10, and not one another cat has picked */
export const COLOR_COUNT = 10;
export function pickColor(seats, pid, c) {
  if (!Number.isInteger(c) || c < 0 || c >= COLOR_COUNT) return { ok: false, error: 'That colour is not in the game.' };
  const other = seats.find(s => s.pid !== pid && s.color === c);
  if (other) return { ok: false, error: `${other.name} already has that colour. Pick another.` };
  return { ok: true, color: c };
}

/* a new name for the seat with this pid: not empty, at most 14 letters, and not a name another cat uses */
export function renameSeat(seats, pid, name) {
  const n = String(name || '').trim().slice(0, MAX_NAME).trim();
  if (!n) return { ok: false, error: 'Add a name so friends know who you are.' };
  const other = seats.find(s => s.pid !== pid && key(s.name) === key(n));
  if (other) return { ok: false, error: `${other.name} is already in this game. Pick another name.` };
  return { ok: true, name: n };
}

/* Joining again with the same name from another browser takes that cat over: the seat moves to the new device
   (and the host role with it), and the caller closes the old device. Seats nobody holds are left to claimOpen. */
export function takeOverByName(room, newPid, name) {
  const same = room.seats.find(s => key(s.name) === key(name));
  if (!same || !same.pid) return { ok: false };
  if (same.pid === newPid) return { ok: true, seat: same, oldPid: null };
  const oldPid = same.pid;
  if (room.host === oldPid) room.host = newPid;
  same.pid = newPid;
  if (room.push && room.push[oldPid]) delete room.push[oldPid];   // the old device no longer gets this cat's alerts
  return { ok: true, seat: same, oldPid };
}
