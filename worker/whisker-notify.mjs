/* Who should get a push notification after a move? Pure rules, so they can be tested.
   Seats and state.players share one order, so seat i is player i. */

const name = (p) => String((p && p.name) || 'A cat').slice(0, 14);
const offerTo = (o) => (!o ? [] : Array.isArray(o.to) ? o.to : [o.to]);

/* turn moved on, or a trade was offered. prev and next are game states, seats are the room's seats */
export function moveAlerts(prev, next, seats, code) {
  const out = [];
  if (!next || !Array.isArray(next.players) || next.phase === 'over') return out;
  const url = '/' + code;
  const turnMoved = !prev || prev.cur !== next.cur || prev.turn !== next.turn;
  if (turnMoved && seats[next.cur] && seats[next.cur].pid) {
    const setup = next.phase === 'setup';
    out.push({ pid: seats[next.cur].pid, payload: {
      title: `Your turn, ${name(next.players[next.cur])}`,
      body: setup ? 'Time to place your cat bed and yarn path.' : 'Roll the dice.',
      url, tag: 'turn-' + code,
    } });
  }
  /* a new offer, or a counter-offer (its round goes up) */
  const round = (o) => (o && o.round) || 0;
  if (next.offer && (!(prev && prev.offer) || round(next.offer) > round(prev.offer))) {
    const from = name(next.players[next.offer.from]);
    const body = round(next.offer) > 0 ? `${from} countered your offer` : `${from} wants to trade with you.`;
    for (const i of offerTo(next.offer)) {
      if (i === next.offer.from || !seats[i] || !seats[i].pid) continue;
      out.push({ pid: seats[i].pid, payload: { title: 'Trade offer', body, url, tag: 'offer-' + code } });
    }
  }
  /* a cat was tapped, hissed at or groomed: only the cat's own device hears about it, and once per emote */
  const em = next.emote, was = prev && prev.emote;
  if (em && (!was || was.id !== em.id) && em.to !== em.from && seats[em.to] && seats[em.to].pid && !(seats[em.from] && seats[em.from].pid === seats[em.to].pid)) {
    const verb = { tap: 'tapped', hiss: 'hissed at', groom: 'groomed' }[em.kind];
    if (verb) out.push({ pid: seats[em.to].pid, payload: { title: 'Whisker Isles', body: `${name(next.players[em.from])} ${verb} you`, url, tag: 'emote-' + code } });
  }
  return out;
}

/* the host started the game: tell everyone else */
export function startAlerts(seats, hostPid, code) {
  return seats.filter((s) => s.pid && s.pid !== hostPid).map((s) => ({
    pid: s.pid, payload: { title: 'The game has started', body: 'Your cats are on the island.', url: '/' + code, tag: 'start-' + code },
  }));
}

/* a chat message: every other cat at the table hears about it (the service worker stays quiet if the game is on screen) */
export function chatAlerts(seats, fromPid, fromName, text, code) {
  const pids = [...new Set(seats.map((s) => s && s.pid).filter((p) => p && p !== fromPid))];
  const t = String(text || ''), body = t.length > 88 ? t.slice(0, 87) + '…' : t;
  return pids.map((pid) => ({ pid, payload: { title: `${name({ name: fromName })} in the chat`, body, url: '/' + code, tag: 'chat-' + code } }));
}
