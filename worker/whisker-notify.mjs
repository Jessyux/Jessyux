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
  return out;
}

/* the host started the game: tell everyone else */
export function startAlerts(seats, hostPid, code) {
  return seats.filter((s) => s.pid && s.pid !== hostPid).map((s) => ({
    pid: s.pid, payload: { title: 'The game has started', body: 'Your cats are on the island.', url: '/' + code, tag: 'start-' + code },
  }));
}
