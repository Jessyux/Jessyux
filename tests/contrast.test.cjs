const test = require('node:test');
const assert = require('node:assert');
const { ratio, level, score, surfaceFor, SURFACES } = require('../a11y/contrast.js');

test('ratio of black on white is about 21', () => {
  assert.ok(Math.abs(ratio('#000', '#fff') - 21) < 0.01);
});

test('the teal word on sand measures about 3.4:1', () => {
  const r = ratio('#078A72', '#F3E3C6');
  assert.ok(r > 3.3 && r < 3.7, 'got ' + r);
});

test('level treats large text more generously', () => {
  assert.strictEqual(level(3.4, true), 'AA');
  assert.strictEqual(level(3.4, false), 'Below AA');
  assert.strictEqual(level(7, false), 'AAA');
  assert.strictEqual(level(4.5, true), 'AAA');
});

test('Personality About me scores AA because of the accent word', () => {
  const s = score('personality.about.std');
  assert.strictEqual(s.level, 'AA');
  assert.match(s.lowest.label, /accent/i);
});

test('every Classic and high contrast surface has AAA body text and is at least AA', () => {
  const keys = Object.keys(SURFACES).filter(k => k.startsWith('classic.') || k.endsWith('.high'));
  assert.ok(keys.length >= 4);
  keys.forEach(k => {
    const s = score(k);
    assert.notStrictEqual(s.level, 'Below AA', k);
    assert.strictEqual(s.rows[0].level, 'AAA', k + ' body text');
  });
});

test('surfaceFor picks theme in Classic and view in Personality', () => {
  assert.strictEqual(surfaceFor({ style: 'classic', contrast: 'std' }, 'dark', 'about'), 'classic.dark.std');
  assert.strictEqual(surfaceFor({ style: 'personality', contrast: 'high' }, 'dark', 'recs'), 'personality.recs.high');
});
