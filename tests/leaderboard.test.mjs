import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResult, pointsFor, listBoard } from '../worker/leaderboard.mjs';

const game = (results, extra) => ({ gid: 'abc123def', results, ...extra });

test('places score 3, 2 and 1, and 4th place and below score nothing', () => {
  assert.deepEqual([1, 2, 3, 4, 10].map(pointsFor), [3, 2, 1, 0, 0]);
});

test('a finished game with a winner and named players passes, with names trimmed', () => {
  const r = validateResult(game([{ name: ' Jessy ', place: 1 }, { name: 'Kai', place: 2 }, { name: 'Mo', place: 2 }]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.results, [
    { name: 'Jessy', key: 'jessy', place: 1, points: 3, cat: null },
    { name: 'Kai', key: 'kai', place: 2, points: 2, cat: null },
    { name: 'Mo', key: 'mo', place: 2, points: 2, cat: null },
  ]);
});

test('a game needs 2 to 10 players', () => {
  assert.equal(validateResult(game([{ name: 'Solo', place: 1 }])).status, 400);
  const eleven = Array.from({ length: 11 }, (_, i) => ({ name: 'P' + i, place: i + 1 }));
  assert.equal(validateResult(game(eleven)).status, 400);
});

test('exactly one winner, and places run from 1 to the number of players', () => {
  assert.equal(validateResult(game([{ name: 'A', place: 1 }, { name: 'B', place: 1 }])).status, 400);
  assert.equal(validateResult(game([{ name: 'A', place: 2 }, { name: 'B', place: 3 }])).status, 400);
  assert.equal(validateResult(game([{ name: 'A', place: 1 }, { name: 'B', place: 3 }])).status, 400);
  assert.equal(validateResult(game([{ name: 'A', place: 1 }, { name: 'B', place: 1.5 }])).status, 400);
});

test('names are required, up to 14 characters, and unique in a game ignoring case', () => {
  assert.equal(validateResult(game([{ name: ' ', place: 1 }, { name: 'B', place: 2 }])).status, 400);
  assert.equal(validateResult(game([{ name: 'n'.repeat(15), place: 1 }, { name: 'B', place: 2 }])).status, 400);
  assert.equal(validateResult(game([{ name: 'n'.repeat(14), place: 1 }, { name: 'B', place: 2 }])).ok, true);
  assert.equal(validateResult(game([{ name: 'Jessy', place: 1 }, { name: 'JESSY', place: 2 }])).status, 400);
});

test('a name with a blocked word is refused', () => {
  assert.equal(validateResult(game([{ name: 'shithead', place: 1 }, { name: 'B', place: 2 }])).status, 422);
});

test('a game id is required so the same game only counts once', () => {
  assert.equal(validateResult({ results: [{ name: 'A', place: 1 }, { name: 'B', place: 2 }] }).status, 400);
  assert.equal(validateResult(game([{ name: 'A', place: 1 }, { name: 'B', place: 2 }], { gid: 'has spaces!' })).status, 400);
});

test("a player's cat is kept as its breed and colours, with unchanged colours left blank", () => {
  const r = validateResult(game([{ name: 'A', place: 1, cat: { b: 'ginger', t: { coat: '#F8AD69', iris: '#3a8fe0' } } }, { name: 'B', place: 2, cat: { b: 'tuxedo' } }]));
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.results[0].cat, { b: 'ginger', t: { coat: '#f8ad69', mark: '', iris: '#3a8fe0', collar: '' } });
  assert.deepEqual(r.value.results[1].cat, { b: 'tuxedo', t: { coat: '', mark: '', iris: '', collar: '' } });
});

test('an unknown cat or colour is dropped and the game still counts', () => {
  const r = validateResult(game([{ name: 'A', place: 1, cat: { b: 'dragon' } }, { name: 'B', place: 2, cat: { b: 'grey', t: { coat: 'red;}' } } }]));
  assert.equal(r.ok, true);
  assert.equal(r.value.results[0].cat, null);
  assert.equal(r.value.results[1].cat, null);
});

test("the board sends each player's cat back as an object, or null when there is none", async () => {
  const stored = [{ name: 'A', points: 3, wins: 1, games: 1, last: 1, cat: '{"b":"grey","t":{"coat":"","mark":"","iris":"","collar":""}}' },
    { name: 'B', points: 2, wins: 0, games: 1, last: 1, cat: null }, { name: 'C', points: 1, wins: 0, games: 1, last: 1, cat: 'not json' }];
  const db = { prepare: () => ({ bind: () => ({ all: async () => ({ results: stored.map((r) => ({ ...r })) }) }) }) };
  const rows = await listBoard(db);
  assert.deepEqual(rows.map((r) => r.cat), [{ b: 'grey', t: { coat: '', mark: '', iris: '', collar: '' } }, null, null]);
});
