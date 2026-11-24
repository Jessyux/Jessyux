/* ==========================================================================
   worker/index.js — the small server behind Whisker Isles online play.

   Everything on jessyux.com is still a static file served from ./dist.
   This Worker only answers /api/whisker-isles/*; any other request that
   is not a static file falls through to the normal asset 404.

   POST /api/whisker-isles/new        -> { code: "sleepy-tuna-42" }
   GET  /api/whisker-isles/ws/<code>  -> WebSocket into that game's room

   Each game code maps to one Durable Object (GameRoom). The room keeps
   the lobby and the latest game state, and relays every change to the
   other players. The game rules run in the players' browsers; the room
   only checks who is allowed to send what, and keeps the treat card deck
   and each cat's cards hidden from the other players. Rooms delete themselves after
   3 days without activity.
   ========================================================================== */
import { DurableObject } from 'cloudflare:workers';

const ADJ = ['sleepy','fluffy','sneaky','chonky','purry','toasty','zoomy','tiny','velvet','fuzzy','sunny','cozy','silly','snuggly','bouncy','dozy','floofy','sparkly','squishy','wiggly'];
const NOUN = ['tuna','whisker','paws','mittens','biscuit','kitten','meow','tabby','beans','yarn','nibble','catnip','purr','socks','noodle','mochi','pudding','sardine','toebean','furball'];
const CODE_RE = /^[a-z]+-[a-z]+-\d{2}$/;
const MAX_CATS = 10;
const IDLE_MS = 3 * 24 * 60 * 60 * 1000;
const BREEDS = 10;

const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Treat cards are private. Each player gets their own copy of the game with
// the other cats' cards and the deck hidden. Everything shows once it's over.
function redact(game, seat) {
  if (!game || game.phase === 'over') return game;
  return {
    ...game,
    deck: (game.deck || []).map(() => 'hidden'),
    players: game.players.map((pl, i) => i === seat ? pl : { ...pl, cards: pl.cards.map(c => ({ t: 'hidden', turn: c.turn })) })
  };
}

// Put a player's push together with what only the server knows. Other cats'
// cards and the deck come from storage; the sender's own cards must be ones
// they already hold, plus { t: 'new' } for each card they just bought.
function merge(stored, inc, seat) {
  if (!Array.isArray(inc.players) || inc.players.length !== stored.players.length) return null;
  const deck = stored.deck.slice();
  let drew = false;
  for (let j = 0; j < inc.players.length; j++) {
    if (!inc.players[j] || typeof inc.players[j] !== 'object') return null;
    if (j !== seat) { inc.players[j].cards = stored.players[j].cards; continue; }
    const pool = stored.players[j].cards.slice(), out = [];
    for (const c of Array.isArray(inc.players[j].cards) ? inc.players[j].cards : []) {
      if (c && c.t === 'new') {
        if (!deck.length) return null;
        out.push({ t: deck.pop(), turn: c.turn }); drew = true; continue;
      }
      const k = pool.findIndex(o => c && o.t === c.t && o.turn === c.turn);
      if (k < 0) return null;
      out.push(pool.splice(k, 1)[0]);
    }
    inc.players[j].cards = out;
  }
  inc.deck = deck;
  return { game: inc, drew };
}

const pick = a => a[Math.floor(Math.random() * a.length)];
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/whisker-isles/new' && request.method === 'POST') {
      for (let tries = 0; tries < 8; tries++) {
        const code = `${pick(ADJ)}-${pick(NOUN)}-${String(Math.floor(Math.random() * 90) + 10)}`;
        const room = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await room.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code }) });
        if (res.ok) return json({ code });
      }
      return json({ error: 'Could not make a game code. Try again.' }, 503);
    }

    // short link: jessyux.com/wi opens the game, jessyux.com/wi/<code> joins that game
    const wi = url.pathname.match(/^\/wi(?:\/([a-z0-9-]{3,40}))?\/?$/i);
    if (wi) {
      const to = new URL('/games/whisker-isles/', url);
      if (wi[1]) to.searchParams.set('game', wi[1].toLowerCase());
      return Response.redirect(to.toString(), 302);
    }

    const m = url.pathname.match(/^\/api\/whisker-isles\/ws\/([a-z0-9-]{3,40})$/);
    if (m) {
      if (!CODE_RE.test(m[1])) return json({ error: 'Bad game code' }, 400);
      if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected a WebSocket' }, 426);
      const room = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return room.fetch(request);
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  }
};

export class GameRoom extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      if (await this.ctx.storage.get('room')) return new Response('taken', { status: 409 });
      const { code } = await request.json();
      await this.ctx.storage.put('room', { code, host: null, seats: [], started: false, ver: 0 });
      await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
      return new Response('ok');
    }
    const room = await this.ctx.storage.get('room');
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    if (!room) {
      pair[1].send(JSON.stringify({ type: 'error', message: 'No game with that code. Check the spelling, or ask your friend for a fresh code.' }));
      pair[1].close(1000, 'no such game');
    }
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  onlinePids(except) {
    return this.ctx.getWebSockets().filter(ws => ws !== except).map(ws => (ws.deserializeAttachment() || {}).pid).filter(Boolean);
  }
  lobbyMsg(room, except) {
    return { type: 'lobby', lobby: { code: room.code, host: room.host, seats: room.seats, started: room.started }, online: this.onlinePids(except) };
  }
  seatOf(ws, room) {
    const pid = (ws.deserializeAttachment() || {}).pid;
    return pid ? room.seats.findIndex(s => s.pid === pid) : -1;
  }
  // send each player their own view of the game
  broadcastGame(room, game, extra, except) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try { ws.send(JSON.stringify({ ...extra, ver: room.ver, state: redact(game, this.seatOf(ws, room)) })); } catch (e) {}
    }
  }
  broadcast(msg, except) {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) { if (ws !== except) { try { ws.send(s); } catch (e) {} } }
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 500000) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const room = await this.ctx.storage.get('room');
    if (!room) return;
    const me = (ws.deserializeAttachment() || {}).pid;
    const send = msg => ws.send(JSON.stringify(msg));

    if (m.type === 'hello') {
      const pid = typeof m.pid === 'string' ? m.pid.slice(0, 64) : '';
      if (!pid) return;
      let seat = room.seats.find(s => s.pid === pid);
      if (!seat) {
        if (room.started) { send({ type: 'error', message: 'That game has already started. Ask the host to make a new one.' }); return; }
        if (room.seats.length >= MAX_CATS) { send({ type: 'error', message: 'That game is full (10 cats).' }); return; }
        const taken = room.seats.map(s => s.breed);
        let breed = Number.isInteger(m.breed) && m.breed >= 0 && m.breed < BREEDS ? m.breed : 0;
        if (taken.includes(breed)) breed = [...Array(BREEDS).keys()].find(b => !taken.includes(b));
        const name = String(m.name || '').replace(/[<>]/g, '').trim().slice(0, 14) || 'Cat ' + (room.seats.length + 1);
        seat = { pid, name, breed };
        room.seats.push(seat);
        if (!room.host) room.host = pid;
        await this.ctx.storage.put('room', room);
      }
      ws.serializeAttachment({ pid });
      this.broadcast(this.lobbyMsg(room), ws);
      const hello = this.lobbyMsg(room);
      if (room.started) { hello.state = redact(await this.ctx.storage.get('game'), room.seats.findIndex(s => s.pid === pid)); hello.ver = room.ver; }
      send(hello);
    }

    else if (m.type === 'breed' && me && !room.started) {
      const seat = room.seats.find(s => s.pid === me);
      const b = m.breed;
      if (seat && Number.isInteger(b) && b >= 0 && b < BREEDS && !room.seats.some(s => s !== seat && s.breed === b)) {
        seat.breed = b;
        await this.ctx.storage.put('room', room);
        this.broadcast(this.lobbyMsg(room));
      }
    }

    else if (m.type === 'start' && me && me === room.host && !room.started && room.seats.length >= 2 && m.state && typeof m.state === 'object') {
      const game = m.state;
      if (!Array.isArray(game.deck) || !Array.isArray(game.players)) return;
      game.players.forEach(pl => { pl.cards = []; });
      shuffle(game.deck); // the host's browser made the deck, so shuffle it again where nobody can see
      room.started = true; room.ver = 1;
      await this.ctx.storage.put('game', game);
      await this.ctx.storage.put('room', room);
      const lobby = this.lobbyMsg(room); delete lobby.online;
      for (const ws of this.ctx.getWebSockets()) {
        try { ws.send(JSON.stringify({ ...lobby, online: this.onlinePids(), ver: 1, state: redact(game, this.seatOf(ws, room)) })); } catch (e) {}
      }
    }

    else if (m.type === 'state' && me && room.started && room.seats.some(s => s.pid === me) && m.state && typeof m.state === 'object') {
      const seat = room.seats.findIndex(s => s.pid === me);
      const stored = await this.ctx.storage.get('game');
      const merged = m.base === room.ver ? merge(stored, m.state, seat) : null;
      if (!merged) {
        // someone else moved first, or the push didn't add up: send this player the current game
        send({ type: 'state', ver: room.ver, state: redact(stored, seat) });
        return;
      }
      room.ver++;
      await this.ctx.storage.put('game', merged.game);
      await this.ctx.storage.put('room', room);
      // the sender only needs it back if a card was drawn for them or the game just ended
      const echo = merged.drew || merged.game.phase === 'over';
      this.broadcastGame(room, merged.game, { type: 'state' }, echo ? null : ws);
    }

    await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
  }

  async webSocketClose(ws) {
    try { ws.close(); } catch (e) {}
    const room = await this.ctx.storage.get('room');
    if (room) this.broadcast(this.lobbyMsg(room, ws), ws);
  }

  async alarm() {
    for (const ws of this.ctx.getWebSockets()) { try { ws.close(1001, 'game expired'); } catch (e) {} }
    await this.ctx.storage.deleteAll();
  }
}
