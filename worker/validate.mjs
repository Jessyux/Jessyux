import { isBlocked } from './blocklist.mjs';

export const MAX_TEXT = 140;
export const MAX_NAME = 30;
export const MAX_STROKES = 60;
export const MAX_POINTS = 2000;
export const MAX_BYTES = 32 * 1024;
export const COORD_MAX = 1000;

const refuse = (status, reason) => ({ ok: false, status, reason });
const length = (s) => [...s].length;

function checkStrokes(strokes) {
  if (!Array.isArray(strokes) || !strokes.length) return 'Draw something first.';
  if (strokes.length > MAX_STROKES) return 'That drawing has too many strokes. Try something simpler.';
  let points = 0;
  for (const stroke of strokes) {
    if (!Array.isArray(stroke) || !stroke.length) return 'That drawing could not be read.';
    points += stroke.length;
    for (const p of stroke) {
      const good = Array.isArray(p) && p.length === 2
        && p.every((n) => Number.isInteger(n) && n >= 0 && n <= COORD_MAX);
      if (!good) return 'That drawing could not be read.';
    }
  }
  if (points < 2) return 'Draw something first.';
  if (points > MAX_POINTS) return 'That drawing is too long. Try something simpler.';
  return null;
}

/* returns {ok:true,value} or {ok:false,status,reason}. Text is stored as written: the page escapes on display. */
export function validatePost(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return refuse(400, 'That message could not be read.');
  if (body.website) return refuse(201, 'spam');
  if (body.kind !== 'text' && body.kind !== 'draw') return refuse(400, 'Choose to type or draw a message.');

  let name = null;
  if (body.name != null && body.name !== '') {
    if (typeof body.name !== 'string') return refuse(400, 'That name could not be read.');
    name = body.name.trim() || null;
    if (name && length(name) > MAX_NAME) return refuse(400, `Names can be up to ${MAX_NAME} characters.`);
    if (name && isBlocked(name)) return refuse(422, 'That name includes a word the sand won\'t take. Try another.');
  }

  if (body.kind === 'text') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return refuse(400, 'Write something first.');
    if (length(text) > MAX_TEXT) return refuse(400, `Messages can be up to ${MAX_TEXT} characters.`);
    if (isBlocked(text)) return refuse(422, 'That message includes a word the sand won\'t take. Try rewording it.');
    return { ok: true, value: { name, kind: 'text', text, strokes: null } };
  }

  const problem = checkStrokes(body.strokes);
  if (problem) return refuse(400, problem);
  return { ok: true, value: { name, kind: 'draw', text: null, strokes: body.strokes } };
}
