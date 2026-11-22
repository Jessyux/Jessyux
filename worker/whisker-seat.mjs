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

/* the lobby as one player sees it: pids swapped for sids, and which seats are theirs. A device that took a game
   over from one screen can hold several seats (the cats nobody else has claimed), so `mine` lists them all and
   `online` counts a seat as connected whenever the device holding it is. */
export function publicLobby(room, onlinePids, forPid) {
  const sidOf = pid => (room.seats.find(s => s.pid === pid) || {}).sid || null;
  const mine = [];
  room.seats.forEach((s, i) => { if (forPid && s.pid === forPid) mine.push(i); });
  return {
    lobby: { code: room.code, host: sidOf(room.host), started: room.started,
      seats: room.seats.map(({ pid, sid, ...rest }) => ({ ...rest, pid: sid })) },
    online: room.seats.filter(s => onlinePids.includes(s.pid)).map(s => s.sid),
    you: sidOf(forPid),
    mine,
  };
}

/* ---- moving a game from one shared screen to online ----
   The host's device holds every cat to begin with (pid = the host's pid, hosted = true). A friend who joins with
   a cat's name takes that cat over; the host keeps playing the rest. Seats and the game's players share one order. */
export const MIN_SEATS = 2, MAX_SEATS = 10;

/* the cats from an in-person game: [{name, breed, color?, tint?}] in player order, all held by the host */
export function convertSeats(room, hostPid, cats) {
  if (room.started || room.seats.length > 1 || (room.seats[0] && room.seats[0].pid !== hostPid)) return { ok: false, error: 'This game is already set up.' };
  if (!Array.isArray(cats) || cats.length < MIN_SEATS || cats.length > MAX_SEATS) return { ok: false, error: `A game needs 2 to ${MAX_SEATS} cats.` };
  const seen = new Set(), seats = [];
  for (const c of cats) {
    const name = String((c && c.name) || '').trim().slice(0, MAX_NAME);
    if (!name || seen.has(key(name))) return { ok: false, error: 'Every cat needs its own name.' };
    seen.add(key(name));
    const seat = { pid: hostPid, name, breed: Math.max(0, Math.min(39, Math.floor(+c.breed || 0))), hosted: true };
    if (Number.isInteger(c.color) && c.color >= 0 && c.color < COLOR_COUNT) seat.color = c.color;
    const tint = cleanTint(c.tint); if (tint) seat.tint = tint;
    seats.push(seat);
  }
  return { ok: true, seats };
}

/* the cats a friend could still take over: held by the host and flagged hosted */
export const hostedSeats = room => room.seats.filter(s => s.hosted && s.pid === room.host);

/* a friend with this device id takes the cat called `name`; the host must keep at least one cat */
export function claimHosted(room, pid, name) {
  const seat = hostedSeats(room).find(s => key(s.name) === key(name));
  if (!seat) return { ok: false, error: 'That cat is already taken.' };
  if (room.seats.filter(s => s.pid === room.host).length <= 1) return { ok: false, error: 'The host has to keep at least one cat, so not every cat can go to a friend.' };
  seat.pid = pid; delete seat.hosted;
  return { ok: true, seat };
}

/* the host takes a cat back (a friend left, or someone gave up): it goes back to being claimable */
export function takeOver(room, hostPid, sid) {
  const seat = room.seats.find(s => s.sid === sid);
  if (!seat || room.host !== hostPid || seat.pid === hostPid) return { ok: false };
  seat.pid = hostPid; seat.hosted = true;
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
