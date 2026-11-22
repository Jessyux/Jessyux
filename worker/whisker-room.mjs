// Whisker Isles online games. Each cat code (like sleepy-tuna-42) is one Durable Object room that keeps the
// lobby and the game state in its own storage, so the code opens the same game again at any time.
//
// Client to server (WebSocket messages, JSON):
//   hello {pid, name, breed}   join the lobby, or take your seat again (same device id, or same name on a new device)
//   breed {breed}              change your cat while in the lobby
//   start {state}              host only: start the game with this first state
//   state {base, state}        the state after your move; accepted when base matches the room's version
// Server to client:
//   lobby {lobby, online, state?, ver?}   who is in, who is connected, and the game once it has started
//   error {message}
import { DurableObject } from 'cloudflare:workers';

const MAX_SEATS = 10, MAX_STATE = 400_000, MAX_NAME = 14;
const ADJ = ['sleepy','fluffy','sunny','tiny','bouncy','cosy','purry','silly','snoozy','zoomy','velvet','misty','pebble','honey','maple','minty','cocoa','toasty','sparkly','whisker'];
const NOUN = ['tuna','mochi','biscuit','noodle','muffin','sardine','pudding','dumpling','waffle','pretzel','bean','toffee','button','pickle','sprout','crumpet','nugget','salmon','pancake','tofu'];
const CODE_RE = /^[a-z]+-[a-z]+-\d{2}$/;
const key = s => String(s || '').trim().toLowerCase();

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const newCode = () => `${pick(ADJ)}-${pick(NOUN)}-${String(Math.floor(Math.random() * 90) + 10)}`;

/* routes under /api/whisker-isles: POST /new makes a code, GET /ws/<code> opens the room */
export async function whiskerIsles(request, env, pathname) {
  if (!env.ROOMS) return json(503, { error: 'Online games are not set up here.' });
  if (pathname === '/api/whisker-isles/new') {
    if (request.method !== 'POST') return json(405, { error: 'Not allowed.' });
    for (let i = 0; i < 8; i++) {
      const code = newCode();
      const r = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch('https://room/claim', { method: 'POST', body: JSON.stringify({ code }) });
      if (r.ok) return json(201, { code });
    }
    return json(503, { error: 'Could not make a code. Try again.' });
  }
  const m = pathname.match(/^\/api\/whisker-isles\/ws\/([a-z0-9-]{1,40})$/);
  if (m) {
    if (!CODE_RE.test(m[1])) return json(400, { error: 'Game codes look like sleepy-tuna-42.' });
    if (request.headers.get('Upgrade') !== 'websocket') return json(426, { error: 'Open this with a WebSocket.' });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(new Request(`https://room/ws?code=${m[1]}`, request));
  }
  return json(404, { error: 'Not found.' });
}

export class WhiskerRoom extends DurableObject {
  async room() {
    if (this._room === undefined) this._room = (await this.ctx.storage.get('room')) || null;
    return this._room;
  }
  async put(room) { room.updated = Date.now(); this._room = room; await this.ctx.storage.put('room', room); }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/claim') {
      if (await this.room()) return json(409, { error: 'taken' });
      const { code } = await request.json();
      await this.put({ code, host: null, seats: [], started: false, ver: 0, state: null, created: Date.now() });
      return json(201, { code });
    }
    if (url.pathname === '/ws') {
      const pair = new WebSocketPair(), [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ pid: null });
      return new Response(null, { status: 101, webSocket: client });
    }
    return json(404, { error: 'Not found.' });
  }

  online() { return this.ctx.getWebSockets().map(ws => (ws.deserializeAttachment() || {}).pid).filter(Boolean); }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch (e) { /* closed */ } }
  lobbyMsg(room, withState) {
    const msg = { type: 'lobby', lobby: { code: room.code, host: room.host, seats: room.seats, started: room.started }, online: this.online() };
    if (withState && room.started) { msg.state = room.state; msg.ver = room.ver; }
    return msg;
  }
  broadcast(room, withState, except) {
    const msg = this.lobbyMsg(room, withState);
    for (const ws of this.ctx.getWebSockets()) if (ws !== except && (ws.deserializeAttachment() || {}).pid) this.send(ws, msg);
  }
  fail(ws, message) { this.send(ws, { type: 'error', message }); try { ws.close(1000, 'error'); } catch (e) { /* closed */ } }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_STATE) return this.fail(ws, 'That move was too big to send.');
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    const room = await this.room();
    if (!room) return this.fail(ws, 'There is no game with that code. Check the code, or create a new game.');
    const me = (ws.deserializeAttachment() || {}).pid;

    if (m.type === 'hello') {
      const pid = String(m.pid || '').slice(0, 64), name = String(m.name || '').trim().slice(0, MAX_NAME);
      if (!pid) return this.fail(ws, 'Something went wrong joining. Reload and try again.');
      let seat = room.seats.find(s => s.pid === pid);
      // a player on a new laptop or phone takes their seat back by typing the same name
      if (!seat && name) {
        const same = room.seats.find(s => key(s.name) === key(name));
        if (same && !this.online().includes(same.pid)) { if (room.host === same.pid) room.host = pid; same.pid = pid; seat = same; }
        else if (same) return this.fail(ws, `${name} is already playing in this game. Pick another name to join.`);
      }
      if (!seat) {
        if (room.started) return this.fail(ws, 'This game has already started. Only the cats who started it can rejoin, using the same name.');
        if (!name) return this.fail(ws, 'Add your name so friends know who you are.');
        if (room.seats.length >= MAX_SEATS) return this.fail(ws, `This game is full: ${MAX_SEATS} cats is the most.`);
        seat = { pid, name, breed: clampBreed(m.breed) };
        room.seats.push(seat);
        if (!room.host) room.host = pid;
      }
      ws.serializeAttachment({ pid });
      await this.put(room);
      this.send(ws, this.lobbyMsg(room, true));
      this.broadcast(room, false, ws);
      return;
    }
    if (!me) return this.fail(ws, 'Say hello first.');

    if (m.type === 'breed') {
      if (room.started) return;
      const seat = room.seats.find(s => s.pid === me); if (!seat) return;
      seat.breed = clampBreed(m.breed);
      await this.put(room); this.broadcast(room, false); return;
    }
    if (m.type === 'start') {
      if (room.started || room.host !== me || room.seats.length < 2 || !validState(m.state, room.seats.length)) return;
      room.started = true; room.state = m.state; room.ver = 1;
      await this.put(room); this.broadcast(room, true); return;
    }
    if (m.type === 'state') {
      if (!room.started || !room.seats.some(s => s.pid === me)) return;
      if (m.base !== room.ver || !validState(m.state, room.seats.length)) { this.send(ws, this.lobbyMsg(room, true)); return; }
      room.state = m.state; room.ver++;
      await this.put(room); this.broadcast(room, true, ws); return;
    }
  }

  async webSocketClose(ws) { const room = await this.room(); if (room) this.broadcast(room, false, ws); }
  async webSocketError(ws) { const room = await this.room(); if (room) this.broadcast(room, false, ws); }
}

function clampBreed(b) { b = Math.floor(+b || 0); return b >= 0 && b < 40 ? b : 0; }
/* seats and players share one order, so a player coming back on a new device needs no change inside the game */
function validState(s, n) { return s && typeof s === 'object' && Array.isArray(s.players) && s.players.length === n && s.online === true; }
