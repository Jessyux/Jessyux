// Whisker Isles chat rules. Messages are live only: the room relays them and keeps a short backlog in memory,
// never in the saved game. Swearing is allowed on purpose, so there is no word filter here.
export const CHAT_MAX = 140, CHAT_GAP = 700, CHAT_KEEP = 30;

/* tidy what a player typed: no control or direction-changing characters, one space between words, 140 at most */
export function cleanChat(t) {
  const s = String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX).trim();
  return s || null;
}
/* one message per device every 700 ms */
export function chatReady(lastAt, now) { return !lastAt || now - lastAt >= CHAT_GAP; }
/* the backlog a late joiner or a reconnect gets */
export function chatPush(log, msg) { log.push(msg); while (log.length > CHAT_KEEP) log.shift(); return log; }
