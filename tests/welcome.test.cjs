const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldShow, markSeen, KEY } = require('../a11y/welcome.js');

function store(init) {
  const m = new Map(Object.entries(init || {}));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
const blocked = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

test('shows on the beach landing for someone new', () => {
  assert.equal(shouldShow(store(), 'intro'), true);
});

test('does not show once seen', () => {
  assert.equal(shouldShow(store({ [KEY]: '1' }), 'intro'), false);
});

test('does not show on any other view', () => {
  for (const view of ['about', 'kind', 'umeds', 'westpac', 'circuit']) {
    assert.equal(shouldShow(store(), view), false, view);
  }
});

test('does not nag when storage is blocked', () => {
  assert.equal(shouldShow(blocked, 'intro'), false);
});

test('markSeen makes it stop showing, and survives blocked storage', () => {
  const s = store();
  markSeen(s);
  assert.equal(shouldShow(s, 'intro'), false);
  assert.doesNotThrow(() => markSeen(blocked));
});
