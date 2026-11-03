const test = require('node:test');
const assert = require('node:assert/strict');
const { strokesToPath, simplify, toUnits } = require('../a11y/sand.js');

test('a stroke becomes an SVG path starting where it started', () => {
  assert.ok(strokesToPath([[[0, 0], [10, 10]]]).startsWith('M0 0'));
});

test('no strokes make an empty path', () => {
  assert.equal(strokesToPath([]), '');
  assert.equal(strokesToPath(null), '');
});

test('several strokes each get their own move', () => {
  const d = strokesToPath([[[0, 0], [1, 1]], [[5, 5], [6, 6]]]);
  assert.equal(d.match(/M/g).length, 2);
});

test('a path can only hold numbers and path letters, whatever it is given', () => {
  const d = strokesToPath([[['"><script>', 0], [1, 1]]]);
  assert.match(d, /^[MLQ0-9 .\-]*$/);
});

test('pointer positions normalise to whole units from 0 to 1000 and stay in range', () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };
  assert.deepEqual(toUnits(200, 100, box), [500, 500]);
  assert.deepEqual(toUnits(0, 500, box), [0, 1000]);
});

test('points closer than the step are dropped, the last point is kept', () => {
  const out = simplify([[0, 0], [1, 1], [2, 2], [50, 50], [51, 51]], 8);
  assert.deepEqual(out, [[0, 0], [50, 50], [51, 51]]);
});
