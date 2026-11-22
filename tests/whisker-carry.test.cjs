// Whisker Isles: players arriving from jessyux.com/whisker-isles bring their saved games in
// #carry=<JSON>. Pulls importCarry out of whisker-isles.html and runs it on a fake store.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
const a = html.indexOf('function importCarry(');
assert.ok(a >= 0, 'importCarry is in whisker-isles.html');
const importCarry = new Function(`${html.slice(a, html.indexOf('\n}\n', a) + 2)}\nreturn importCarry;`)();

function fakeStore(init) {
  const m = new Map(Object.entries(init || {}));
  return { get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, v), all: () => Object.fromEntries(m) };
}
const carry = (obj) => '#carry=' + encodeURIComponent(JSON.stringify(obj));

test('importCarry sets whisker-isles keys this browser does not have yet', () => {
  const st = fakeStore();
  const n = importCarry(carry({ 'whisker-isles-name': 'Mochi', 'whisker-isles-games': '[{"code":"sleepy-tuna-42"}]' }), st);
  assert.equal(n, 2);
  assert.deepEqual(st.all(), { 'whisker-isles-name': 'Mochi', 'whisker-isles-games': '[{"code":"sleepy-tuna-42"}]' });
});

test('importCarry keeps keys already set here', () => {
  const st = fakeStore({ 'whisker-isles-name': 'Tofu' });
  assert.equal(importCarry(carry({ 'whisker-isles-name': 'Mochi', 'whisker-isles-breed': '3' }), st), 1);
  assert.equal(st.get('whisker-isles-name'), 'Tofu');
  assert.equal(st.get('whisker-isles-breed'), '3');
});

test('importCarry ignores other keys and values that are not strings', () => {
  const st = fakeStore();
  assert.equal(importCarry(carry({ 'jessyux-theme': 'dark', token: 'x', 'whisker-isles-x': 5, 'whisker-isles-ok': 'y' }), st), 1);
  assert.deepEqual(st.all(), { 'whisker-isles-ok': 'y' });
});

test('importCarry survives bad JSON, wrong shapes and other hashes', () => {
  const st = fakeStore();
  for (const h of ['#carry=%7Bnot-json', '#carry=%E0%A4%A', carry(['whisker-isles-a']), carry(null), carry('whisker-isles'), '#about', '', undefined]) {
    assert.equal(importCarry(h, st), 0, String(h));
  }
  assert.deepEqual(st.all(), {});
});
