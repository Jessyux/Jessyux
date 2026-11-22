// jessyux.com/whisker-isles is only a handoff to the game's own address, whisker.jessyux.com.
// It keeps invite links working (?game=CODE) and carries the game's saved data across,
// since the new address can't read what jessyux.com saved in the browser.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function run(search, saved, opts = {}) {
  let went = null;
  const keys = Object.keys(saved);
  const localStorage = opts.blocked
    ? { get length() { throw new Error('blocked'); } }
    : { length: keys.length, key: (i) => keys[i], getItem: (k) => saved[k] };
  vm.runInNewContext(script, { localStorage, location: { search, replace: (u) => { went = u; } }, JSON, Object, encodeURIComponent });
  return went;
}
const carried = (url) => JSON.parse(decodeURIComponent(url.split('#carry=')[1]));

test('goes to the game address with nothing saved', () => {
  assert.strictEqual(run('', {}), 'https://whisker.jessyux.com/');
});

test('keeps an invite link code', () => {
  assert.strictEqual(run('?game=ABCD', {}), 'https://whisker.jessyux.com/?game=ABCD');
});

test('carries only the game saved data, in the fragment', () => {
  const url = run('?game=ABCD', { 'whisker-isles-name': 'Mochi', 'whisker-isles-pid-ABCD': 'p1', 'jux-a11y': 'x' });
  assert.ok(url.startsWith('https://whisker.jessyux.com/?game=ABCD#carry='));
  assert.deepStrictEqual(carried(url), { 'whisker-isles-name': 'Mochi', 'whisker-isles-pid-ABCD': 'p1' });
});

test('still goes when the browser blocks saved data', () => {
  assert.strictEqual(run('', {}, { blocked: true }), 'https://whisker.jessyux.com/');
});

test('links there without JavaScript too', () => {
  assert.match(html, /<meta http-equiv="refresh" content="0;url=https:\/\/whisker\.jessyux\.com\/">/);
  assert.match(html, /<a href="https:\/\/whisker\.jessyux\.com\/">/);
});
