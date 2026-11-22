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

/* a new name for the seat with this pid: not empty, at most 14 letters, and not a name another cat uses */
export function renameSeat(seats, pid, name) {
  const n = String(name || '').trim().slice(0, MAX_NAME).trim();
  if (!n) return { ok: false, error: 'Add a name so friends know who you are.' };
  const other = seats.find(s => s.pid !== pid && key(s.name) === key(n));
  if (other) return { ok: false, error: `${other.name} is already in this game. Pick another name.` };
  return { ok: true, name: n };
}
