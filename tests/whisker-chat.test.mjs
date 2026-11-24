import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanChat, chatReady, chatPush, CHAT_MAX, CHAT_KEEP } from '../worker/whisker-chat.mjs';

test('chat text is trimmed, tidied and cut to 140 characters', () => {
  assert.equal(cleanChat('  hello   there \n friend '), 'hello there friend');
  assert.equal(cleanChat('a\u0000b‮c'), 'a b c');
  assert.equal(cleanChat('x'.repeat(500)).length, CHAT_MAX);
  assert.equal(CHAT_MAX, 140);
});
test('empty or non-text messages are dropped', () => {
  assert.equal(cleanChat('   '), null);
  assert.equal(cleanChat(null), null);
  assert.equal(cleanChat(undefined), null);
});
test('swearing is allowed: nothing is filtered', () => {
  assert.equal(cleanChat('well fuck that, shit trade'), 'well fuck that, shit trade');
});
test('a device can send one message every 700 ms', () => {
  assert.equal(chatReady(0, 5000), true);
  assert.equal(chatReady(undefined, 5000), true);
  assert.equal(chatReady(1000, 1699), false);
  assert.equal(chatReady(1000, 1700), true);
});
test('the room keeps only the last 30 messages', () => {
  const log = [];
  for (let i = 0; i < 45; i++) chatPush(log, { id: i });
  assert.equal(log.length, CHAT_KEEP);
  assert.equal(CHAT_KEEP, 30);
  assert.equal(log[0].id, 15);
  assert.equal(log[29].id, 44);
});
