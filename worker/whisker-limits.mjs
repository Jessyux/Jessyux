/* Whisker Isles limits that keep the game server healthy as more people play. Pure rules, so they can be tested.
   whisker-room.mjs uses them for the idle sweep, the connection cap and the heartbeat. */

const DAY = 24 * 3600 * 1000;

/* a room nobody has touched for this long is deleted, so abandoned codes don't pile up in storage forever */
export const IDLE_MS = 60 * DAY;
/* a room with devices still connected is checked again a day later instead of being deleted under them */
export const RECHECK_MS = DAY;
/* 10 cats, each with a couple of tabs or devices, fits well under this; it stops one code soaking up connections */
export const MAX_SOCKETS = 40;
/* new game codes one address can make an hour; a family or classroom on one Wi-Fi stays well under it */
export const NEW_PER_HOUR = 30;
/* the page sends PING every HEARTBEAT_MS and the room answers PONG without waking up (setWebSocketAutoResponse) */
export const PING = 'ping', PONG = 'pong';
export const HEARTBEAT_MS = 25 * 1000;

/* when the alarm fires: delete the room, or the time to look again */
export function sweep(room, now, connected) {
  if (!room) return { action: 'none' };
  const last = room.updated || room.created || 0;
  if (now - last < IDLE_MS) return { action: 'wait', at: last + IDLE_MS };
  if (connected > 0) return { action: 'wait', at: now + RECHECK_MS };
  return { action: 'delete' };
}
