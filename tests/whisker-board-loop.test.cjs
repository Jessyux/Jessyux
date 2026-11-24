// Whisker Isles: the board's tinted piece pictures must not set off a storm of re-draws.
// Each picture still being tinted used to add one more "draw the board again" per draw, so a late game with beds, towers
// and paths in three colours re-drew the board thousands of times and froze the phone.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'whisker-isles.html'), 'utf8');
function pull(name) {
  const a = html.indexOf(`function ${name}(`);
  assert.ok(a >= 0, `${name} is in whisker-isles.html`);
  return html.slice(a, html.indexOf('\n}\n', a) + 2);
}
test('tinting nine piece pictures re-draws the board a handful of times, not thousands', async () => {
  let draws = 0;
  const env = { ICONS: {}, S: {}, document: { getElementById: () => ({}) }, artSrc: (a) => a, requestAnimationFrame: (f) => setTimeout(f, 0) };
  const pending = [];
  env.icTint = (art, color) => { const key = art + '|' + color; const job = env.ICONS[key] = { url: null };
    job.p = new Promise((ok) => pending.push(() => { job.url = 'data:' + key; ok(job.url); })); return job.p; };
  const lib = new Function(...Object.keys(env), 'renderBoardHook', `
    function renderBoard(){ renderBoardHook(); ${['ic-bed','ic-tower','ic-path-h'].map(a=>['#a','#b','#c'].map(c=>`icHref('${a}','${c}');`).join('')).join('')} }
    ${pull('icHref')}\n${pull('boardSoon')}\nreturn {renderBoard};`)(...Object.values(env), () => { draws++; });
  lib.renderBoard(); lib.renderBoard(); lib.renderBoard();
  for (const done of pending.splice(0)) { done(); await new Promise((r) => setTimeout(r, 2)); }
  await new Promise((r) => setTimeout(r, 20));
  assert.ok(draws <= 15, `board drawn ${draws} times`);
});
