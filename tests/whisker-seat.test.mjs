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
