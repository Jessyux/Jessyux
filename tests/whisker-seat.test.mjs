import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanTint, renameSeat } from '../worker/whisker-seat.mjs';

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
