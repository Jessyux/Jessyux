const test = require('node:test');
const assert = require('node:assert');
const { makeSettings, DEFAULTS, sanitize } = require('../a11y/settings.js');

function memStore(initial) {
  const m = new Map(initial ? [['jux-a11y', initial]] : []);
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}
const brokenStore = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); }
};
function fakeRoot() {
  const added = [];
  return {
    dataset: {},
    added,
    ownerDocument: {
      head: { appendChild: el => added.push(el) },
      querySelector: () => null,
      createElement: () => ({})
    }
  };
}

test('sanitize drops unknown keys and invalid values', () => {
  assert.deepStrictEqual(sanitize({ size: '9', evil: 1, font: 'lexend' }), { ...DEFAULTS, font: 'lexend' });
});

test('load returns defaults when storage holds junk', () => {
  assert.deepStrictEqual(makeSettings({ storage: memStore('{bad') }).load(), DEFAULTS);
});

test('load and save survive storage that throws', () => {
  const s = makeSettings({ storage: brokenStore });
  assert.deepStrictEqual(s.load(), DEFAULTS);
  assert.strictEqual(s.save({ size: '2' }).size, '2');
  assert.strictEqual(s.load().size, '2');
});

test('save keeps other values and persists them', () => {
  const store = memStore();
  const s = makeSettings({ storage: store });
  s.save({ font: 'atkinson' });
  s.save({ size: '2' });
  const fresh = makeSettings({ storage: store }).load();
  assert.strictEqual(fresh.size, '2');
  assert.strictEqual(fresh.font, 'atkinson');
});

test('reset returns to defaults', () => {
  const s = makeSettings({ storage: memStore() });
  s.save({ size: '3' });
  assert.deepStrictEqual(s.reset(), DEFAULTS);
});

test('subscribers hear saves and can unsubscribe', () => {
  const s = makeSettings({ storage: memStore() });
  const heard = [];
  const off = s.subscribe(v => heard.push(v.size));
  s.save({ size: '2' });
  off();
  s.save({ size: '3' });
  assert.deepStrictEqual(heard, ['2']);
});

test('isCalm is true for the calm setting or device reduced motion', () => {
  assert.strictEqual(makeSettings({ storage: memStore(), prefersReduced: () => false }).isCalm(), false);
  const calm = makeSettings({ storage: memStore(), prefersReduced: () => false });
  calm.save({ motion: 'calm' });
  assert.strictEqual(calm.isCalm(), true);
  assert.strictEqual(makeSettings({ storage: memStore(), prefersReduced: () => true }).isCalm(), true);
});

test('resolvedTheme uses the stored choice, then the device', () => {
  const s = makeSettings({ storage: memStore(), prefersDark: () => true });
  assert.strictEqual(s.resolvedTheme(), 'dark');
  s.save({ theme: 'light' });
  assert.strictEqual(s.resolvedTheme(), 'light');
});

test('apply writes data attributes and loads no extra font at defaults', () => {
  const root = fakeRoot();
  const s = makeSettings({ storage: memStore(), prefersDark: () => false });
  s.save({ size: '2' });
  s.apply(root);
  assert.strictEqual(root.dataset.juxSize, '2');
  assert.strictEqual(root.dataset.juxStyle, 'personality');
  assert.strictEqual(root.dataset.juxTheme, 'light');
  assert.strictEqual(root.added.length, 0);
});

test('apply loads a font only when the setting needs it', () => {
  const root = fakeRoot();
  const s = makeSettings({ storage: memStore() });
  s.save({ font: 'lexend' });
  s.apply(root);
  assert.strictEqual(root.added.length, 1);
  assert.match(root.added[0].href, /Lexend/);
});
