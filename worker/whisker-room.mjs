// Whisker Isles online games. Each cat code (like sleepy-tuna-42) is one Durable Object room that keeps the
// lobby and the game state in its own storage, so the code opens the same game again at any time.
//
// Client to server (WebSocket messages, JSON):
//   hello {pid, name, breed}   join the lobby, or take your seat again (same device id, or same name on a new device)
//   breed {breed}              change your cat while in the lobby
//   seat {name?, breed?, tint?} change your name, cat or colours while in the lobby
//   host {pid}                 host only: hand the host role to another cat (pid here is the seat's public id)
//   kick {pid, base?, state?}  host only: remove a cat by public id (in a game, with the state that has them taken out)
//   start {state}              host only: start the game with this first state
//   state {base, state}        the state after your move; accepted when base matches the room's version
//   convert {cats, you, state} host, right after hello in a new room: bring a game played on one screen online. The host
//                              plays cats[you]; every other cat is an open seat that a friend takes by joining with its
//                              name. The game waits until every cat has a device.
//   release {pid}              host only: free a friend's cat (pid is the seat's public id) so someone else can take it
//   detach {base, state}       host only: move the game back to one screen; everyone else is disconnected and the room closes
// Server to client:
//   lobby {lobby, online, you, state?, ver?}   who is in, who is connected, your seat, and the game once started.
//     Seats, host and online use each seat's public id; a device's own pid is never sent to anyone else.
// HTTP: POST /api/whisker-isles/delete/<code> {pid}  the host deletes the game for everyone
//   pick {cats}                you joined a started game without a name: these are the cats you can take, send hello with one
//   detached {state}           the host moved the game back to one screen (sent to the host; others get error {detached})
//   error {message, kicked?}   the connection ends
//   oops {message}             a lobby change was refused; the connection stays
import { DurableObject } from 'cloudflare:workers';
import { sendPush, cleanSub } from './webpush.mjs';
import { moveAlerts, startAlerts } from './whisker-notify.mjs';
import { takeOverByName, cleanTint, renameSeat, pickColor, ensureSids, publicLobby, convertSeats, openSeats, claimOpen, releaseSeat, pickList } from './whisker-seat.mjs';

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
  if (pathname === '/api/whisker-isles/push-key') return json(200, { key: env.VAPID_PUBLIC || null });
  const m = pathname.match(/^\/api\/whisker-isles\/ws\/([a-z0-9-]{1,40})$/);
  if (m) {
    if (!CODE_RE.test(m[1])) return json(400, { error: 'Game codes look like sleepy-tuna-42.' });
    if (request.headers.get('Upgrade') !== 'websocket') return json(426, { error: 'Open this with a WebSocket.' });
    return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(new Request(`https://room/ws?code=${m[1]}`, request));
  }
  const d = pathname.match(/^\/api\/whisker-isles\/delete\/([a-z0-9-]{1,40})$/);
  if (d) {
    if (request.method !== 'POST') return json(405, { error: 'Not allowed.' });
    if (!CODE_RE.test(d[1])) return json(400, { error: 'Game codes look like sleepy-tuna-42.' });
    let pid = ''; try { pid = String((await request.json()).pid || '').slice(0, 64); } catch (e) { /* no body */ }
    return env.ROOMS.get(env.ROOMS.idFromName(d[1])).fetch('https://room/delete', { method: 'POST', body: JSON.stringify({ pid }) });
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
    if (url.pathname === '/delete') {
      const room = await this.room();
      if (!room) return json(404, { error: 'This game is already gone.' });
      const { pid } = await request.json();
      if (!pid || room.host !== pid) return json(403, { error: 'Only the host can delete this game.' });
      for (const w of this.ctx.getWebSockets()) {
        this.send(w, { type: 'error', deleted: true, message: 'The host deleted this game.' });
        w.serializeAttachment({ pid: null }); try { w.close(1000, 'deleted'); } catch (e) { /* closed */ }
      }
      await this.ctx.storage.deleteAll(); this._room = null;
      return json(200, { ok: true });
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
  lobbyMsg(room, withState, forPid) {
    const msg = { type: 'lobby', ...publicLobby(room, this.online(), forPid) };
    if (withState && room.started) { msg.state = room.state; msg.ver = room.ver; }
    return msg;
  }
  broadcast(room, withState, except) {
    for (const ws of this.ctx.getWebSockets()) {
      const pid = (ws.deserializeAttachment() || {}).pid;
      if (ws !== except && pid) this.send(ws, this.lobbyMsg(room, withState, pid));
    }
  }
  fail(ws, message) { this.send(ws, { type: 'error', message }); try { ws.close(1000, 'error'); } catch (e) { /* closed */ } }

  /* push notifications: a phone with the browser closed still hears it is its turn. Subscriptions are kept per device, never sent to other players. */
  vapid() {
    if (this._vapid === undefined) {
      try { this._vapid = this.env.VAPID_PRIVATE && this.env.VAPID_PUBLIC ? { publicKey: this.env.VAPID_PUBLIC, privateJwk: JSON.parse(this.env.VAPID_PRIVATE), subject: 'https://whisker.jessyux.com' } : null; } catch (e) { this._vapid = null; }
    }
    return this._vapid;
  }
  notify(room, alerts) {
    if (!alerts.length) return;
    const v = this.vapid();
    if (!v) { console.log('push skipped: no VAPID keys'); return; }
    if (!room.push) return;
    this.ctx.waitUntil((async () => { try {
      let dead = false;
      for (const a of alerts) {
        const sub = room.push[a.pid]; if (!sub) continue;
        const r = await sendPush(sub, a.payload, v);
        console.log(`push ${a.payload.tag} ${r}`);
        if (r === 'gone') { delete room.push[a.pid]; dead = true; }
      }
      if (dead) await this.put(room);
    } catch (e) { console.log('push error', String(e && e.stack || e)); } })());
  }

  /* closes every connection a device has open, telling it why */
  signOut(pid, message) {
    for (const w of this.ctx.getWebSockets()) if ((w.deserializeAttachment() || {}).pid === pid) {
      this.send(w, { type: 'error', replaced: true, message });
      w.serializeAttachment({ pid: null }); try { w.close(1000, 'replaced'); } catch (e) { /* closed */ }
    }
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > MAX_STATE) return this.fail(ws, 'That move was too big to send.');
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    const room = await this.room();
    if (!room) return this.fail(ws, 'There is no game with that code. Check the code, or create a new game.');
    const me = (ws.deserializeAttachment() || {}).pid;
    ensureSids(room.seats);

    if (m.type === 'push') {
      if (!room.seats.some(s => s.pid === me)) return;
      room.push = room.push || {};
      // null turns notifications off; a malformed subscription is ignored and changes nothing
      if (m.sub === null) delete room.push[me];
      else { const sub = cleanSub(m.sub); if (!sub) return; room.push[me] = sub; }
      await this.put(room); return;
    }
    if (m.type === 'hello') {
      const pid = String(m.pid || '').slice(0, 64), name = String(m.name || '').trim().slice(0, MAX_NAME);
      if (!pid) return this.fail(ws, 'Something went wrong joining. Reload and try again.');
      if ((room.banned || []).includes(pid)) return this.fail(ws, 'The host removed you from this game.');
      let seat = room.seats.find(s => s.pid === pid);
      // a player on a new laptop or phone takes their seat back by typing the same name
      // a game moved online from one screen: a friend takes one of the cats still waiting for a device
      // no name on this device (a Home Screen app keeps its own storage): show every cat to pick from, including
      // ones playing on another device, so a player can carry their cat over to here
      if (!seat && room.started && !name) return this.send(ws, { type: 'pick', code: room.code, cats: pickList(room, this.online()) });
      if (!seat && room.started && openSeats(room).length) {
        const claim = claimOpen(room, pid, name);
        if (claim.ok) seat = claim.seat;
        else if (!room.seats.some(s => key(s.name) === key(name))) return this.fail(ws, `There is no cat called ${name} in this game.`);
      }
      if (!seat && name) {
        // a device this cat moved away from, reconnecting on its own (a tab waking up): it doesn't take the cat back.
        // Tapping Join or picking the cat there does, on purpose
        if (m.auto && (room.moved || []).includes(pid)) {
          return this.send(ws, { type: 'error', replaced: true, message: `${name} is playing on another device now, so this one was signed out. Join again with the code to play here instead.` });
        }
        // the same name from another browser takes the cat over; the old browser is signed out
        const t = takeOverByName(room, pid, name);
        if (t.ok) {
          seat = t.seat;
          if (t.oldPid) { room.moved = [...(room.moved || []).filter(x => x !== t.oldPid), t.oldPid].slice(-40); this.signOut(t.oldPid, `${seat.name} moved to another device, so this one was signed out. Join again with the code to play here instead.`); }
        }
      }
      if (seat && room.moved && room.moved.includes(pid)) room.moved = room.moved.filter(x => x !== pid);
      if (!seat) {
        if (room.started) return this.fail(ws, 'This game has already started. Only the cats who started it can rejoin, using the same name.');
        if (!name) return this.fail(ws, 'Add your name so friends know who you are.');
        if (room.seats.length >= MAX_SEATS) return this.fail(ws, `This game is full: ${MAX_SEATS} cats is the most.`);
        seat = { pid, name, breed: clampBreed(m.breed) };
        room.seats.push(seat); ensureSids(room.seats);
        if (!room.host) room.host = pid;
      }
      ws.serializeAttachment({ pid });
      await this.put(room);
      this.send(ws, this.lobbyMsg(room, true, pid));
      this.broadcast(room, false, ws);
      return;
    }
    if (!me) return this.fail(ws, 'Say hello first.');

    if (m.type === 'ready') {
      if (room.started) return;
      const seat = room.seats.find(s => s.pid === me); if (!seat || room.host === me) return;
      seat.ready = !!m.ready;
      await this.put(room); this.broadcast(room, false); return;
    }
    if (m.type === 'breed') {
      if (room.started) return;
      const seat = room.seats.find(s => s.pid === me); if (!seat) return;
      if (seat.ready) return this.send(ws, { type: 'oops', message: 'Uncheck ready before editing your cat.' });
      seat.breed = clampBreed(m.breed);
      await this.put(room); this.broadcast(room, false); return;
    }
    if (m.type === 'seat') {
      if (room.started) return;
      const seat = room.seats.find(s => s.pid === me); if (!seat) return;
      if (seat.ready) return this.send(ws, { type: 'oops', message: 'Uncheck ready before editing your cat.' });
      if ('name' in m) { const r = renameSeat(room.seats, me, m.name); if (!r.ok) return this.send(ws, { type: 'oops', message: r.error }); seat.name = r.name; }
      if ('breed' in m) seat.breed = clampBreed(m.breed);
      if ('tint' in m) seat.tint = cleanTint(m.tint);
      if ('color' in m) { const r = pickColor(room.seats, me, m.color); if (!r.ok) return this.send(ws, { type: 'oops', message: r.error }); seat.color = r.color; }
      await this.put(room); this.broadcast(room, false); return;
    }
    if (m.type === 'host') {
      const to = room.seats.find(s => s.sid === m.pid);
      if (room.host !== me || !to) return;
      room.host = to.pid; to.ready = false;
      await this.put(room); this.broadcast(room, room.started); return;
    }
    if (m.type === 'kick') {
      const k = room.seats.findIndex(s => s.sid === m.pid);
      if (room.host !== me || k < 0 || room.seats[k].pid === me) return;
      const out = room.seats[k].pid;
      if (room.started) {
        if (room.seats.length <= 2 || m.base !== room.ver || !validState(m.state, room.seats.length - 1)) { this.send(ws, this.lobbyMsg(room, true, me)); return; }
        room.state = m.state; room.ver++;
      }
      room.seats.splice(k, 1); room.banned = [...(room.banned || []), out];
      await this.put(room);
      for (const w of this.ctx.getWebSockets()) if (out && (w.deserializeAttachment() || {}).pid === out) {
        this.send(w, { type: 'error', kicked: true, message: 'The host removed you from this game.' });
        w.serializeAttachment({ pid: null }); try { w.close(1000, 'removed'); } catch (e) { /* closed */ }
      }
      this.broadcast(room, room.started); return;
    }
    if (m.type === 'convert') {
      if (room.host !== me || room.started || room.seats.length !== 1) return;
      const r = convertSeats(room, me, m.cats, m.you);
      if (!r.ok) return this.send(ws, { type: 'oops', message: r.error });
      if (!validState(m.state, r.seats.length)) return this.send(ws, { type: 'oops', message: 'That game could not be moved online.' });
      room.seats = r.seats; ensureSids(room.seats);
      room.started = true; room.state = m.state; room.ver = 1;
      await this.put(room); this.broadcast(room, true); return;
    }
    if (m.type === 'release') {
      if (!room.started) return;
      const r = releaseSeat(room, me, m.pid); if (!r.ok) return;
      await this.put(room); this.broadcast(room, true); return;
    }
    if (m.type === 'detach') {
      if (!room.started || room.host !== me) return;
      if (m.base !== room.ver || !validState(m.state, room.seats.length)) { this.send(ws, this.lobbyMsg(room, true, me)); return; }
      for (const w of this.ctx.getWebSockets()) {
        const pid = (w.deserializeAttachment() || {}).pid;
        if (w === ws) this.send(w, { type: 'detached', state: m.state });
        else this.send(w, { type: 'error', detached: true, message: 'The host moved the game back to one screen.' });
        w.serializeAttachment({ pid: null }); try { w.close(1000, 'detached'); } catch (e) { /* closed */ }
      }
      await this.ctx.storage.deleteAll(); this._room = null; return;
    }
    if (m.type === 'start') {
      if (room.started || room.host !== me || room.seats.length < 2 || !validState(m.state, room.seats.length)) return;
      room.started = true; room.state = m.state; room.ver = 1;
      await this.put(room); this.broadcast(room, true);
      this.notify(room, startAlerts(room.seats, me, room.code)); return;
    }
    if (m.type === 'state') {
      if (!room.started || !room.seats.some(s => s.pid === me)) return;
      // nobody moves until every cat has a device
      if (openSeats(room).length) { this.send(ws, this.lobbyMsg(room, true, me)); return; }
      if (m.base !== room.ver || !validState(m.state, room.seats.length)) { this.send(ws, this.lobbyMsg(room, true, me)); return; }
      const prev = room.state;
      room.state = m.state; room.ver++;
      await this.put(room); this.broadcast(room, true, ws);
      this.notify(room, moveAlerts(prev, m.state, room.seats, room.code)); return;
    }
  }

  async webSocketClose(ws) { const room = await this.room(); if (room) this.broadcast(room, false, ws); }
  async webSocketError(ws) { const room = await this.room(); if (room) this.broadcast(room, false, ws); }
}

function clampBreed(b) { b = Math.floor(+b || 0); return b >= 0 && b < 40 ? b : 0; }
/* seats and players share one order, so a player coming back on a new device needs no change inside the game */
function validState(s, n) { return s && typeof s === 'object' && Array.isArray(s.players) && s.players.length === n && s.online === true; }
