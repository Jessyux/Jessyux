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

/* ---- a game moved online from one shared screen ---- */
import { convertSeats, claimHosted, hostedSeats, takeOver, ensureSids, publicLobby as lobbyFor } from '../worker/whisker-seat.mjs';

const fresh = () => ({ code: 'sleepy-tuna-42', host: 'H', started: false, seats: [{ pid: 'H', name: 'Mochi', breed: 0 }] });
const cats3 = [{ name: 'Mochi', breed: 0, color: 0 }, { name: 'Tofu', breed: 1, color: 1 }, { name: 'Kiki', breed: 2, color: 2 }];
const converted = () => { const room = fresh(); const r = convertSeats(room, 'H', cats3); room.seats = ensureSids(r.seats); room.started = true; return room; };

test('convertSeats puts every cat on the host, claimable, in player order', () => {
  const r = convertSeats(fresh(), 'H', cats3);
  assert.equal(r.ok, true);
  assert.deepEqual(r.seats.map(s => s.name), ['Mochi', 'Tofu', 'Kiki']);
  assert.ok(r.seats.every(s => s.pid === 'H' && s.hosted === true));
});

test('convertSeats refuses duplicate names, too few cats and a game already running', () => {
  assert.equal(convertSeats(fresh(), 'H', [{ name: 'A' }, { name: 'a' }]).ok, false);
  assert.equal(convertSeats(fresh(), 'H', [{ name: 'A' }]).ok, false);
  const started = fresh(); started.started = true;
  assert.equal(convertSeats(started, 'H', cats3).ok, false);
  const two = fresh(); two.seats.push({ pid: 'X', name: 'Z', breed: 1 });
  assert.equal(convertSeats(two, 'H', cats3).ok, false);
});

test('a friend takes the cat they name; it is theirs and no longer claimable', () => {
  const room = converted();
  const r = claimHosted(room, 'F1', ' tofu ');
  assert.equal(r.ok, true);
  assert.equal(room.seats[1].pid, 'F1');
  assert.equal(room.seats[1].hosted, undefined);
  assert.deepEqual(hostedSeats(room).map(s => s.name), ['Mochi', 'Kiki']);
  assert.equal(claimHosted(room, 'F2', 'Tofu').ok, false);
});

test('the host always keeps at least one cat', () => {
  const room = converted();
  assert.equal(claimHosted(room, 'F1', 'Tofu').ok, true);
  assert.equal(claimHosted(room, 'F2', 'Kiki').ok, true);
  assert.equal(claimHosted(room, 'F3', 'Mochi').ok, false);
  assert.equal(room.seats[0].pid, 'H');
});

test('the host can take a cat back, and it can be claimed again', () => {
  const room = converted(); claimHosted(room, 'F1', 'Tofu');
  const sid = room.seats[1].sid;
  assert.equal(takeOver(room, 'F1', sid).ok, false);   // only the host
  assert.equal(takeOver(room, 'H', sid).ok, true);
  assert.equal(room.seats[1].pid, 'H');
  assert.equal(claimHosted(room, 'F2', 'Tofu').ok, true);
});

test('the lobby lists every seat a device holds, and counts them connected with the device', () => {
  const room = converted(); claimHosted(room, 'F1', 'Tofu');
  const host = lobbyFor(room, ['H', 'F1'], 'H'), friend = lobbyFor(room, ['H'], 'F1');
  assert.deepEqual(host.mine, [0, 2]);
  assert.deepEqual(friend.mine, [1]);
  assert.equal(host.online.length, 3);              // H holds Mochi and Kiki, F1 holds Tofu: all three connected
  assert.equal(friend.online.length, 2);            // only H is online: Mochi and Kiki
  assert.ok(!JSON.stringify(host).includes('"H"') && !JSON.stringify(host).includes('F1'), 'device ids stay private');
});
