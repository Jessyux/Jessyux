// Whisker Isles: cat emotes. Pulls the pure rules out of whisker-isles.html and checks them.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
function pull(name) {
  const a = html.indexOf(`function ${name}(`);
  assert.ok(a >= 0, `${name} is in whisker-isles.html`);
  return html.slice(a, html.indexOf('\n}\n', a) + 2);
}
const lib = new Function(`${pull('emoteMake')}\n${pull('emoteReady')}\n${pull('emoteIsNew')}\nreturn {emoteMake, emoteReady, emoteIsNew};`)();

test('only tap, hiss and groom make an emote', () => {
  assert.deepEqual(lib.emoteMake(0, 1, 'groom', 7), { id: 7, from: 0, to: 1, kind: 'groom' });
  assert.equal(lib.emoteMake(0, 1, 'bite', 7), null);
});

test('the cooldown is four seconds', () => {
  assert.equal(lib.emoteReady(0, 3999), false);
  assert.equal(lib.emoteReady(0, 4000), true);
});

test('an emote already seen is not played again', () => {
  assert.equal(lib.emoteIsNew(7, { id: 7 }), false);
  assert.equal(lib.emoteIsNew(7, { id: 8 }), true);
  assert.equal(lib.emoteIsNew(7, null), false);
});
