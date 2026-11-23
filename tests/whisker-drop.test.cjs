// Whisker Isles: the host removes a cat mid-game. Pulls dropCat and skipTurn out of whisker-isles.html and runs
// them on a small hand-made state.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
function grab(name) {
  const a = html.indexOf(`function ${name}(`);
  assert.ok(a >= 0, `${name} is in whisker-isles.html`);
  return html.slice(a, html.indexOf('\n}\n', a) + 2);
}
function load() {
  const logs = [];
  const make = new Function('logs', `let S; const log = m => logs.push(m); const pname = i => S.players[i].name; const updateLongest = () => {};
    ${html.match(/function offerTo\(o\)\{.*\}/)[0]}\n${html.match(/function nextCat\(c\)\{.*\}/)[0]}
${grab('dropCat')}\n${grab('skipTurn')}\nreturn { set(s){ S = s; }, get(){ return S; }, dropCat, skipTurn };`);
  return Object.assign(make(logs), { logs });
}
const P = n => ({ name: n, res: {}, cards: [], zoomies: 0, pieces: {} });
function state(extra) {
  return Object.assign({
    players: [P('Ann'), P('Bea'), P('Cal')],
    bld: { 3: { p: 0, t: 'bed' }, 7: { p: 1, t: 'tower' }, 9: { p: 2, t: 'bed' } },
    roads: { 10: 0, 11: 1, 12: 2, 13: 1 },
    cur: 2, turn: 5, phase: 'play', rolled: true, playedTreat: true, sub: null, subData: null,
    setup: { i: 6, step: 'done', order: [0, 1, 2, 2, 1, 0], first: { rolls: [7, 5, 9], live: [0, 1, 2] } },
    discardQ: [], offer: null, longest: 2, army: 1, winner: -1, handoff: false, online: true,
  }, extra || {});
}

test('dropCat takes the cat\'s beds and yarn off the island and renumbers the rest', () => {
  const g = load(); g.set(state()); g.dropCat(1); const S = g.get();
  assert.deepEqual(S.players.map(p => p.name), ['Ann', 'Cal']);
  assert.deepEqual(S.bld, { 3: { p: 0, t: 'bed' }, 9: { p: 1, t: 'bed' } });
  assert.deepEqual(S.roads, { 10: 0, 12: 1 });
  assert.equal(S.cur, 1);
  assert.equal(S.longest, 1);
  assert.equal(S.army, -1);
  assert.match(g.logs.at(-1), /Bea/);
});

test('dropCat on the cat whose turn it is passes the turn to the next cat', () => {
  const g = load(); g.set(state({ cur: 1 })); g.dropCat(1); const S = g.get();
  assert.equal(S.cur, 1); assert.equal(S.players[S.cur].name, 'Cal');
  assert.equal(S.rolled, false); assert.equal(S.playedTreat, false);
  const g2 = load(); g2.set(state({ cur: 2 })); g2.dropCat(2);
  assert.equal(g2.get().cur, 0);
});

test('dropCat clears a trade and a discard that involve the cat', () => {
  const g = load(); g.set(state({ offer: { from: 2, to: 1, give: {}, get: {} }, discardQ: [1, 2] })); g.dropCat(1);
  assert.equal(g.get().offer, null); assert.deepEqual(g.get().discardQ, [1]);
});

test('dropCat keeps a trade offered to several cats for the ones still in the game', () => {
  const g = load(); g.set(state({ cur: 0, offer: { from: 0, to: [1, 2], give: {}, get: {} } })); g.dropCat(1);
  assert.deepEqual(g.get().offer.to, [1]);
});

test('dropCat during setup removes their placements from the order', () => {
  const g = load(); g.set(state({ phase: 'setup', cur: 2, setup: { i: 2, step: 'bed', lastBed: null, order: [0, 1, 2, 2, 1, 0], first: { rolls: [7, 5, 9], live: [0, 1, 2] } } }));
  g.dropCat(1); const S = g.get();
  assert.deepEqual(S.setup.order, [0, 1, 1, 0]);
  assert.equal(S.setup.i, 1); assert.equal(S.cur, 1);
});

test('dropCat while rolling for first starts the roll again', () => {
  const g = load(); g.set(state({ phase: 'setup', cur: 2, setup: { i: 0, step: 'roll', lastBed: null, order: [], first: { rolls: [7, 5, null], live: [0, 1, 2] } } }));
  g.dropCat(0); const S = g.get();
  assert.deepEqual(S.setup.first, { rolls: [null, null], live: [0, 1] }); assert.equal(S.cur, 0);
});

test('skipTurn moves play on to the next cat', () => {
  const g = load(); g.set(state({ cur: 2, sub: 'spree', offer: { from: 2, to: 0 } })); g.skipTurn(); const S = g.get();
  assert.equal(S.cur, 0); assert.equal(S.turn, 6); assert.equal(S.rolled, false); assert.equal(S.sub, null); assert.equal(S.offer, null);
  assert.match(g.logs.at(-1), /Cal/);
});
