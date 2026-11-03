const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const read = (f) => fs.readFileSync(f, 'utf8');
/* image data can spell anything by chance, so only the words on the page count */
const words = (s) => s.replace(/data:[a-z]+\/[\w+.-]+;base64,[A-Za-z0-9+/=]+/g, 'DATA');

test('the PM page names nothing that identifies Karmo', () => {
  const hits = words(read('product-manager.html')).match(/karmo|eagers|simplr|vehicle|car subscription/gi);
  assert.equal(hits, null);
});

test('slide footers run 2 to 12 of 12 in order (the cover has no footer)', () => {
  const nums = [...words(read('product-manager.html')).matchAll(/class="n">\s*(\d+) \/ (\d+)/g)];
  assert.deepEqual(nums.map((m) => +m[1]), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.ok(nums.every((m) => m[2] === '12'));
});

test('the last slide is the general version', () => {
  const s = read('product-manager.html');
  assert.ok(s.includes('In a new role'));
  assert.ok(s.includes('I&#39;d like to hear what&#39;s slowing your product down.') || s.includes("I'd like to hear what's slowing your product down."));
});

test('the page carries the playground', () => {
  const s = read('product-manager.html');
  for (const inc of ['/a11y/a11y.css', '/a11y/classic-case.css', '/a11y/settings.js', '/a11y/contrast.js', '/a11y/panel.js']) {
    assert.ok(s.includes(inc), inc);
  }
  assert.ok(s.includes("view:'pm'"));
});

test('/pm and /bps are untouched', () => {
  for (const f of ['pm.html', 'bps.html']) {
    const committed = execFileSync('git', ['show', 'b720f98:' + f], { maxBuffer: 1 << 27 });
    assert.ok(committed.equals(fs.readFileSync(f)), f);
  }
});
