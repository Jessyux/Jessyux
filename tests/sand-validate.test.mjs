import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePost } from '../worker/validate.mjs';

const text = (t, extra) => ({ kind: 'text', text: t, ...extra });
const stroke = (n) => Array.from({ length: n }, (_, i) => [i % 1000, i % 1000]);

test('text of 140 characters passes, 141 does not', () => {
  assert.equal(validatePost(text('a'.repeat(140))).ok, true);
  const r = validatePost(text('a'.repeat(141)));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('a name over 30 characters is refused', () => {
  assert.equal(validatePost(text('hi', { name: 'n'.repeat(30) })).ok, true);
  assert.equal(validatePost(text('hi', { name: 'n'.repeat(31) })).status, 400);
});

test('a filled honeypot gets a fake success', () => {
  const r = validatePost(text('hi', { website: 'http://spam' }));
  assert.deepEqual([r.ok, r.status, r.reason], [false, 201, 'spam']);
});

test('blocked words are refused, in text or name, plain, spaced or leetspeak', () => {
  for (const bad of ['fuck off', 'f u c k', 'fvck', 'sh1t', 'F.U.C.K']) {
    assert.equal(validatePost(text(bad)).status, 422, bad);
  }
  assert.equal(validatePost(text('hello', { name: 'shit' })).status, 422);
});

test('innocent words containing a blocked word pass', () => {
  for (const ok of ['a classic design', 'Scunthorpe', 'class assignment', 'shiitake']) {
    assert.equal(validatePost(text(ok)).ok, true, ok);
  }
});

test('empty text is refused', () => {
  assert.equal(validatePost(text('   ')).status, 400);
  assert.equal(validatePost({ kind: 'text' }).status, 400);
});

test('a drawing needs a stroke of at least 2 points', () => {
  assert.equal(validatePost({ kind: 'draw' }).status, 400);
  assert.equal(validatePost({ kind: 'draw', strokes: [] }).status, 400);
  assert.equal(validatePost({ kind: 'draw', strokes: [[[1, 1]]] }).status, 400);
  assert.equal(validatePost({ kind: 'draw', strokes: [[[1, 1], [2, 2]]] }).ok, true);
});

test('drawing size limits hold', () => {
  assert.equal(validatePost({ kind: 'draw', strokes: Array(61).fill(stroke(2)) }).status, 400);
  assert.equal(validatePost({ kind: 'draw', strokes: [stroke(2001)] }).status, 400);
  assert.equal(validatePost({ kind: 'draw', strokes: [stroke(2000)] }).ok, true);
});

test('bad coordinates are refused', () => {
  for (const p of [[1.5, 2], [1001, 0], [-1, 0], ['1', 2], [1], [1, 2, 3]]) {
    assert.equal(validatePost({ kind: 'draw', strokes: [[[0, 0], p]] }).status, 400, JSON.stringify(p));
  }
});

test('html is stored as written, because escaping happens on display', () => {
  const r = validatePost(text('<script>alert(1)</script>'));
  assert.equal(r.ok, true);
  assert.equal(r.value.text, '<script>alert(1)</script>');
});

test('only known fields survive, and non-objects are refused', () => {
  const r = validatePost(text('hi', { name: ' Sam ', admin: true }));
  assert.deepEqual(r.value, { name: 'Sam', kind: 'text', text: 'hi', strokes: null });
  for (const bad of [null, 'x', 5, [], { kind: 'video' }]) {
    assert.equal(validatePost(bad).status, 400);
  }
});
