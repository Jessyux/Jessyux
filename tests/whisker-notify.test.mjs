import test from 'node:test';
import assert from 'node:assert/strict';
import { moveAlerts, startAlerts } from '../worker/whisker-notify.mjs';

const seats = [{ pid: 'a' }, { pid: 'b' }, { pid: 'c' }];
const st = (over) => ({ phase: 'play', cur: 0, turn: 1, players: [{ name: 'Mochi' }, { name: 'Tofu' }, { name: 'Bean' }], offer: null, ...over });

test('the next cat is told it is their turn', () => {
  const r = moveAlerts(st(), st({ cur: 1, turn: 2 }), seats, 'cosy-bean-62');
  assert.equal(r.length, 1);
  assert.equal(r[0].pid, 'b');
  assert.equal(r[0].payload.title, 'Your turn, Tofu');
  assert.equal(r[0].payload.url, '/cosy-bean-62');
});

test('a move that keeps the same turn sends nothing', () => {
  assert.deepEqual(moveAlerts(st(), st(), seats, 'x-y-11'), []);
});

test('setup turns ask for a bed and path, not a roll', () => {
  const r = moveAlerts(st({ phase: 'setup' }), st({ phase: 'setup', cur: 2, turn: 2 }), seats, 'x-y-11');
  assert.match(r[0].payload.body, /bed/);
});

test('nothing is sent when the game is over', () => {
  assert.deepEqual(moveAlerts(st(), st({ phase: 'over', cur: 1, turn: 2 }), seats, 'x-y-11'), []);
});

test('a new trade offer notifies the cats it is offered to, once', () => {
  const prev = st(), next = st({ offer: { from: 0, to: [1, 2] } });
  const r = moveAlerts(prev, next, seats, 'x-y-11');
  assert.deepEqual(r.map((x) => x.pid), ['b', 'c']);
  assert.equal(r[0].payload.body, 'Mochi wants to trade with you.');
  assert.deepEqual(moveAlerts(next, st({ offer: { from: 0, to: [1, 2] }, rollN: 5 }), seats, 'x-y-11'), []);
});

test('a counter-offer tells the cat it goes back to, once', () => {
  const prev = st({ offer: { from: 0, to: [1], round: 0 } }), next = st({ offer: { from: 1, to: [0], round: 1 } });
  const r = moveAlerts(prev, next, seats, 'x-y-11');
  assert.deepEqual(r.map((x) => x.pid), ['a']);
  assert.equal(r[0].payload.title, 'Trade offer');
  assert.equal(r[0].payload.body, 'Tofu countered your offer');
  assert.deepEqual(moveAlerts(next, st({ offer: { from: 1, to: [0], round: 1 } }), seats, 'x-y-11'), []);
});

test('an offer to a single cat given as a number works', () => {
  const r = moveAlerts(st(), st({ offer: { from: 2, to: 0 } }), seats, 'x-y-11');
  assert.deepEqual(r.map((x) => x.pid), ['a']);
});

test('an open seat (no device yet) is skipped', () => {
  const r = moveAlerts(st(), st({ cur: 1, turn: 2 }), [{ pid: 'a' }, { pid: null }, { pid: 'c' }], 'x-y-11');
  assert.deepEqual(r, []);
});

test('game start tells everyone but the host', () => {
  assert.deepEqual(startAlerts(seats, 'a', 'x-y-11').map((x) => x.pid), ['b', 'c']);
});

import { publicLobby } from '../worker/whisker-seat.mjs';
test('push subscriptions never appear in what is sent to players', () => {
  const room = { code: 'x-y-11', host: 'a', started: true, seats: [{ pid: 'a', name: 'Mochi', breed: 0 }], push: { a: { endpoint: 'https://push.example.com/secret-endpoint', keys: { p256dh: 'k', auth: 'a' } } } };
  const out = JSON.stringify(publicLobby(room, ['a'], 'a'));
  assert.ok(!out.includes('secret-endpoint') && !out.includes('push'));
});
