// Whisker Isles: counter-offers. Pulls the pure offer rules out of whisker-isles.html and checks them.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
function pull(name) {
  const a = html.indexOf(`function ${name}(`);
  assert.ok(a >= 0, `${name} is in whisker-isles.html`);
  return html.slice(a, html.indexOf('\n}\n', a) + 2);
}
const RES = ['litter', 'yarn', 'nip', 'nib', 'fish'];
const lib = new Function('RES', `${pull('counterOffer')}\n${pull('handbackTo')}\nreturn {counterOffer, handbackTo};`)(RES);
const res = (o) => Object.assign({ litter: 0, yarn: 0, nip: 0, nib: 0, fish: 0 }, o);

test('a counter flips who sends and who gets it, and counts the round', () => {
  const o = { from: 0, to: [1], declined: [2], seen: true, give: res({ fish: 2 }), get: res({ yarn: 1 }) };
  const c = lib.counterOffer(o, 1, res({ yarn: 1 }), res({ fish: 3 }), res({ yarn: 4 }));
  assert.equal(c.from, 1);
  assert.deepEqual(c.to, [0]);
  assert.deepEqual(c.declined, []);
  assert.equal(c.seen, false);
  assert.equal(c.round, 1);
  assert.equal(lib.counterOffer(c, 0, res(), res({ yarn: 1 }), res()).round, 2);
});

test('countering an offer sent to several cats goes back only to the sender', () => {
  const o = { from: 0, to: [1, 2], give: res(), get: res() };
  assert.deepEqual(lib.counterOffer(o, 2, res(), res({ nib: 1 }), res()).to, [0]);
});

test('a counter cannot give cards the counterer does not hold, or ask on both sides', () => {
  const o = { from: 0, to: [1], give: res(), get: res() };
  const c = lib.counterOffer(o, 1, res({ fish: 5 }), res({ fish: 2, nip: 12 }), res({ fish: 3 }));
  assert.equal(c.give.fish, 3);
  assert.equal(c.get.fish, 0);
  assert.equal(c.get.nip, 9);
});

test('the screen goes back to the turn cat, unless they already hold it', () => {
  assert.equal(lib.handbackTo({ from: 1 }, 0, 0), null);
  assert.equal(lib.handbackTo({ from: 1 }, 2, 0), 0);
  assert.equal(lib.handbackTo({ from: 0 }, 1, 0), 0);
});

const lib2 = new Function('RES', `${pull('counterOffer')}\n${pull('handbackTo')}\n${pull('handbackDealFor')}\n${pull('counterStart')}\n${pull('sameOffer')}\nreturn {handbackDealFor, counterStart, sameOffer};`)(RES);

test('the celebrating cats only go on a hand-back card that is actually shown', () => {
  assert.equal(lib2.handbackDealFor({ from: 1 }, 0, 0), null);
  assert.deepEqual(lib2.handbackDealFor({ from: 0 }, 1, 0), [0, 1]);
});

test('a counter mat opens with no more cards than the counterer holds', () => {
  const o = { from: 0, to: [1], give: res({ yarn: 1 }), get: res({ fish: 3, nip: 1 }) };
  const m = lib2.counterStart(o, res({ fish: 1 }));
  assert.equal(m.give.fish, 1);
  assert.equal(m.give.nip, 0);
  assert.equal(m.get.yarn, 1);
});

test('an answer only goes through if the offer is still the one that was tapped', () => {
  const a = { from: 0, to: [1], round: 0, give: res({ fish: 2 }), get: res({ yarn: 1 }) };
  assert.equal(lib2.sameOffer(a, { ...a, to: [1] }), true);
  assert.equal(lib2.sameOffer(a, { ...a, give: res({ fish: 3 }) }), false);
  assert.equal(lib2.sameOffer(a, { ...a, round: 1 }), false);
  assert.equal(lib2.sameOffer(a, null), false);
});
