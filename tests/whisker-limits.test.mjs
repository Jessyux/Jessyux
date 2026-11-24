import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sweep, IDLE_MS, RECHECK_MS } from '../worker/whisker-limits.mjs';

const DAY = 24 * 3600 * 1000;

test('idle sweep is 60 days', () => assert.equal(IDLE_MS, 60 * DAY));

test('a room touched recently waits until 60 days after its last change', () => {
  const now = 1_000 * DAY;
  assert.deepEqual(sweep({ updated: now - 5 * DAY }, now, 0), { action: 'wait', at: now + 55 * DAY });
});

test('a room idle for 60 days with nobody connected is deleted', () => {
  const now = 1_000 * DAY;
  assert.deepEqual(sweep({ updated: now - IDLE_MS }, now, 0), { action: 'delete' });
  assert.deepEqual(sweep({ updated: now - 400 * DAY }, now, 0), { action: 'delete' });
});

test('an idle room with a device still connected is checked again a day later', () => {
  const now = 1_000 * DAY;
  assert.deepEqual(sweep({ updated: now - 90 * DAY }, now, 2), { action: 'wait', at: now + RECHECK_MS });
});

test('a room saved before updated existed falls back to created; an empty room does nothing', () => {
  const now = 1_000 * DAY;
  assert.deepEqual(sweep({ created: now - 61 * DAY }, now, 0), { action: 'delete' });
  assert.deepEqual(sweep(null, now, 0), { action: 'none' });
});
