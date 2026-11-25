import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as seat from '../worker/whisker-seat.mjs';
const { cleanTint, renameSeat } = seat;

test('publicLobby swaps every private device id for the seat\'s public id', () => {
  assert.equal(typeof seat.publicLobby, 'function');
  const room = { code: 'sleepy-tuna-42', host: 'secret-a', started: false,
    seats: [{ pid: 'secret-a', sid: 'pa', name: 'Mochi', breed: 1 }, { pid: 'secret-b', sid: 'pb', name: 'Bean', breed: 2 }] };
  const out = seat.publicLobby(room, ['secret-b'], 'secret-b');
  assert.ok(!JSON.stringify(out).includes('secret-'), 'no private id leaks');
  assert.equal(out.lobby.host, 'pa');
  assert.deepEqual(out.lobby.seats.map(s => s.pid), ['pa', 'pb']);
  assert.deepEqual(out.online, ['pb']);
  assert.equal(out.you, 'pb');
  assert.equal(room.seats[0].pid, 'secret-a', 'the room itself is unchanged');
});

test('ensureSids gives every seat a distinct public id and keeps existing ones', () => {
  assert.equal(typeof seat.ensureSids, 'function');
  const seats = [{ pid: 'a', sid: 'keep' }, { pid: 'b' }, { pid: 'c' }];
  seat.ensureSids(seats);
  assert.equal(seats[0].sid, 'keep');
  assert.ok(seats[1].sid && seats[2].sid && seats[1].sid !== seats[2].sid && seats[1].sid !== 'b');
});

test('pickColor accepts a free board colour and refuses a taken or unknown one', () => {
  assert.equal(typeof seat.pickColor, 'function');
  const seats = [{ pid: 'a', name: 'Mochi', color: 2 }, { pid: 'b', name: 'Bean', color: 5 }];
  assert.deepEqual(seat.pickColor(seats, 'a', 3), { ok: true, color: 3 });
  assert.deepEqual(seat.pickColor(seats, 'a', 2), { ok: true, color: 2 });
  assert.match(seat.pickColor(seats, 'a', 5).error, /Bean/);
  assert.equal(seat.pickColor(seats, 'a', 99).ok, false);
  assert.equal(seat.pickColor(seats, 'a', 'x').ok, false);
});

test('cleanTint keeps only the four colour slots as #rrggbb', () => {
  assert.deepEqual(cleanTint({ coat: '#FFF1DC', mark: 'red', iris: '#4c93dc', collar: '', x: '#000000' }),
    { coat: '#FFF1DC', mark: '', iris: '#4c93dc', collar: '' });
});

test('cleanTint returns null when nothing is changed or input is junk', () => {
  assert.equal(cleanTint({ coat: '', mark: '', iris: '', collar: '' }), null);
  assert.equal(cleanTint('nope'), null);
  assert.equal(cleanTint(null), null);
});

test('renameSeat trims, caps at 14 and accepts a free name', () => {
  const seats = [{ pid: 'a', name: 'Mochi' }, { pid: 'b', name: 'Bean' }];
  assert.deepEqual(renameSeat(seats, 'a', '  Biscuit the Great Cat  '), { ok: true, name: 'Biscuit the Gr' });
});

test('renameSeat refuses an empty name and a name another cat has', () => {
  const seats = [{ pid: 'a', name: 'Mochi' }, { pid: 'b', name: 'Bean' }];
  assert.equal(renameSeat(seats, 'a', '   ').ok, false);
  assert.match(renameSeat(seats, 'a', 'bean').error, /Bean/);
  assert.equal(renameSeat(seats, 'a', 'MOCHI').ok, true);
});

/* ---- a game moved online from one shared screen: every cat needs its own device ---- */
import { convertSeats, claimOpen, openSeats, releaseSeat, ensureSids, publicLobby as lobbyFor } from '../worker/whisker-seat.mjs';

const fresh = () => ({ code: 'sleepy-tuna-42', host: 'H', started: false, seats: [{ pid: 'H', name: 'Mochi', breed: 0 }] });
const cats3 = [{ name: 'Mochi', breed: 0, color: 0 }, { name: 'Tofu', breed: 1, color: 1 }, { name: 'Kiki', breed: 2, color: 2 }];
const converted = (you = 0) => { const room = fresh(); const r = convertSeats(room, 'H', cats3, you); room.seats = ensureSids(r.seats); room.started = true; return room; };

test('convertSeats keeps the host on their own cat and leaves every other cat open, in player order', () => {
  const r = convertSeats(fresh(), 'H', cats3, 1);
  assert.equal(r.ok, true);
  assert.deepEqual(r.seats.map(s => s.name), ['Mochi', 'Tofu', 'Kiki']);
  assert.deepEqual(r.seats.map(s => s.pid), [null, 'H', null]);
  assert.deepEqual(r.seats.map(s => !!s.open), [true, false, true]);
});

test('convertSeats refuses duplicate names, too few cats, a bad host cat and a game already running', () => {
  assert.equal(convertSeats(fresh(), 'H', [{ name: 'A' }, { name: 'a' }], 0).ok, false);
  assert.equal(convertSeats(fresh(), 'H', [{ name: 'A' }], 0).ok, false);
  assert.equal(convertSeats(fresh(), 'H', cats3, 5).ok, false);
  assert.equal(convertSeats(fresh(), 'H', cats3, undefined).ok, false);
  const started = fresh(); started.started = true;
  assert.equal(convertSeats(started, 'H', cats3, 0).ok, false);
  const two = fresh(); two.seats.push({ pid: 'X', name: 'Z', breed: 1 });
  assert.equal(convertSeats(two, 'H', cats3, 0).ok, false);
});

test('a friend takes the open cat they name; it is theirs and no longer open', () => {
  const room = converted();
  assert.deepEqual(openSeats(room).map(s => s.name), ['Tofu', 'Kiki']);
  const r = claimOpen(room, 'F1', ' tofu ');
  assert.equal(r.ok, true);
  assert.equal(room.seats[1].pid, 'F1');
  assert.equal(room.seats[1].open, undefined);
  assert.deepEqual(openSeats(room).map(s => s.name), ['Kiki']);
  assert.equal(claimOpen(room, 'F2', 'Tofu').ok, false);
  assert.equal(claimOpen(room, 'F2', 'Mochi').ok, false);   // the host's own cat is never open
});

test('the game is ready only when no cat is open', () => {
  const room = converted();
  claimOpen(room, 'F1', 'Tofu'); assert.equal(openSeats(room).length, 1);
  claimOpen(room, 'F2', 'Kiki'); assert.equal(openSeats(room).length, 0);
});

test("the host can free a friend's cat, and it can be claimed again", () => {
  const room = converted(); claimOpen(room, 'F1', 'Tofu');
  const sid = room.seats[1].sid;
  assert.equal(releaseSeat(room, 'F1', sid).ok, false);   // only the host
  assert.equal(releaseSeat(room, 'H', room.seats[0].sid).ok, false);   // not their own cat
  assert.equal(releaseSeat(room, 'H', sid).ok, true);
  assert.equal(room.seats[1].pid, null);
  assert.equal(claimOpen(room, 'F2', 'Tofu').ok, true);
});

test('the lobby marks open cats and which seat is yours; open cats are never online', () => {
  const room = converted(); claimOpen(room, 'F1', 'Tofu');
  const host = lobbyFor(room, ['H', 'F1'], 'H'), friend = lobbyFor(room, ['H'], 'F1');
  assert.deepEqual(host.mine, [0]);
  assert.deepEqual(friend.mine, [1]);
  assert.equal(host.online.length, 2);
  assert.equal(friend.online.length, 1);
  assert.equal(host.lobby.seats.filter(s => s.open).length, 1);
  assert.ok(!JSON.stringify(host).includes('"H"') && !JSON.stringify(host).includes('F1'), 'device ids stay private');
});

import { takeOverByName } from '../worker/whisker-seat.mjs';
test('joining again with the same name moves the cat to the new device', () => {
  const room = { host: 'old', seats: [{ pid: 'old', name: 'Jess' }, { pid: 'p2', name: 'Mochi' }], push: { old: { endpoint: 'x' } } };
  const r = takeOverByName(room, 'new', ' jess ');
  assert.equal(r.ok, true);
  assert.equal(r.oldPid, 'old');
  assert.equal(room.seats[0].pid, 'new');
  assert.equal(room.host, 'new');
  assert.equal(room.push.old, undefined);
});
test('taking over keeps the host with someone else when the cat was not the host', () => {
  const room = { host: 'p2', seats: [{ pid: 'old', name: 'Jess' }, { pid: 'p2', name: 'Mochi' }] };
  takeOverByName(room, 'new', 'Jess');
  assert.equal(room.host, 'p2');
});
test('the same device saying hello again changes nothing', () => {
  const room = { host: 'a', seats: [{ pid: 'a', name: 'Jess' }] };
  const r = takeOverByName(room, 'a', 'Jess');
  assert.equal(r.ok, true); assert.equal(r.oldPid, null);
});
test('an unknown name, or an open seat, is not taken over', () => {
  const room = { host: 'a', seats: [{ pid: 'a', name: 'Jess' }, { pid: null, name: 'Tofu' }] };
  assert.equal(takeOverByName(room, 'new', 'Nobody').ok, false);
  assert.equal(takeOverByName(room, 'new', 'Tofu').ok, false);
});

test('pickList shows every cat, which are free and which are on a device now, and never a device id', () => {
  const room = { code: 'sleepy-tuna-42', started: true, seats: [
    { pid: 'secret-a', sid: 'pa', name: 'Mochi', breed: 1, color: 2 },
    { pid: 'secret-b', sid: 'pb', name: 'Bean', breed: 2, tint: { coat: '#ffffff' } },
    { pid: null, sid: 'pc', name: 'Tofu', breed: 3, open: true }] };
  const out = seat.pickList(room, ['secret-a']);
  assert.ok(!JSON.stringify(out).includes('secret-'), 'no private id leaks');
  assert.deepEqual(out.map(c => c.name), ['Mochi', 'Bean', 'Tofu']);
  assert.deepEqual(out.map(c => c.open), [false, false, true]);
  assert.deepEqual(out.map(c => c.online), [true, false, false]);
  assert.equal(out[0].color, 2);
});

test('a cat picked from the list on a new device moves there by name', () => {
  const room = { host: 'secret-a', seats: [{ pid: 'secret-a', name: 'Mochi', breed: 1 }, { pid: 'secret-b', name: 'Bean', breed: 2 }] };
  const t = seat.takeOverByName(room, 'home-screen', 'mochi');
  assert.equal(t.ok, true); assert.equal(t.oldPid, 'secret-a');
  assert.equal(room.seats[0].pid, 'home-screen'); assert.equal(room.host, 'home-screen');
});

test('rematch puts a finished room back in the lobby with every cat, name and colour kept', () => {
  assert.equal(typeof seat.rematchRoom, 'function');
  const tint = { coat: '#fff', mark: '', iris: '', collar: '' };
  const room = { code: 'sleepy-tuna-42', host: 'a', started: true, ver: 40, state: { phase: 'over', players: [{}, {}] },
    seats: [{ pid: 'a', sid: 'pa', name: 'Mochi', breed: 1, color: 3, tint, ready: true }, { pid: 'b', sid: 'pb', name: 'Bean', breed: 2, color: 5, ready: true }] };
  assert.equal(seat.rematchRoom(room), true);
  assert.equal(room.started, false);
  assert.equal(room.state, null);
  assert.equal(room.code, 'sleepy-tuna-42');
  assert.equal(room.host, 'a');
  assert.ok(room.ver > 40, 'the version keeps climbing');
  assert.deepEqual(room.seats.map(s => [s.name, s.breed, s.color, s.ready]), [['Mochi', 1, 3, false], ['Bean', 2, 5, false]]);
  assert.deepEqual(room.seats[0].tint, tint);
});

test('rematch only works on a finished game, and a second tap changes nothing', () => {
  const live = { started: true, ver: 3, state: { phase: 'play' }, seats: [{ pid: 'a' }] };
  assert.equal(seat.rematchRoom(live), false);
  assert.equal(live.started, true);
  const lobby = { started: false, ver: 3, state: null, seats: [] };
  assert.equal(seat.rematchRoom(lobby), false);
});

test('leaveSeat: a cat leaves a started game for good, and the host role moves on', () => {
  const room = { started: true, host: 'a', seats: [{ pid: 'a', name: 'Jessy' }, { pid: 'b', name: 'Bo' }, { pid: 'c', name: 'Mo' }] };
  const r = seat.leaveSeat(room, 'a');
  assert.equal(r.ok, true);
  assert.deepEqual(r.gone, [0]);
  assert.deepEqual(room.seats.map((s) => s.pid), ['b', 'c']);
  assert.equal(room.host, 'b');
  assert.deepEqual(room.left, ['a']);
});

test('leaveSeat lets a cat leave down to the last cat, but never empties the game', () => {
  const two = { started: true, host: 'a', seats: [{ pid: 'a' }, { pid: 'b' }] };
  assert.equal(seat.leaveSeat(two, 'a').ok, true);
  assert.deepEqual(two.seats.map((s) => s.pid), ['b']);
  assert.equal(two.host, 'b');
  assert.equal(seat.leaveSeat(two, 'b').ok, false);
  const solo = { started: true, host: 'a', seats: [{ pid: 'a' }, { pid: 'a' }] };
  assert.equal(seat.leaveSeat(solo, 'a').ok, false);
  const three = { started: true, host: 'a', seats: [{ pid: 'a' }, { pid: 'b' }, { pid: 'c' }] };
  assert.equal(seat.leaveSeat(three, 'zz').ok, false);
  assert.equal(seat.leaveSeat({ started: false, host: 'a', seats: [{ pid: 'a' }, { pid: 'b' }, { pid: 'c' }] }, 'b').ok, false);
});

test('leaveSeat takes every cat this device plays, and a non-host leaving keeps the host', () => {
  const room = { started: true, host: 'a', seats: [{ pid: 'a' }, { pid: 'b' }, { pid: 'c' }, { pid: 'b' }] };
  const r = seat.leaveSeat(room, 'b');
  assert.deepEqual(r.gone, [1, 3]);
  assert.deepEqual(room.seats.map((s) => s.pid), ['a', 'c']);
  assert.equal(room.host, 'a');
});

import { rematchRoom as rematchKeep } from '../worker/whisker-seat.mjs';
import test2 from 'node:test';
import assert2 from 'node:assert/strict';
test2('rematch keeps the finished game as room.last', () => {
  const fin = { phase: 'over', winner: 0 };
  const room = { started: true, state: fin, seats: [{ ready: true }], ver: 1 };
  assert2.equal(rematchKeep(room), true);
  assert2.equal(room.started, false); assert2.equal(room.state, null); assert2.equal(room.last, fin);
});
