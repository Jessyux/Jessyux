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

/* the lobby as one player sees it: pids swapped for sids, and which seat is theirs */
export function publicLobby(room, onlinePids, forPid) {
  const sidOf = pid => (room.seats.find(s => s.pid === pid) || {}).sid || null;
  return {
    lobby: { code: room.code, host: sidOf(room.host), started: room.started,
      seats: room.seats.map(({ pid, sid, ...rest }) => ({ ...rest, pid: sid })) },
    online: onlinePids.map(sidOf).filter(Boolean),
    you: sidOf(forPid),
  };
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
