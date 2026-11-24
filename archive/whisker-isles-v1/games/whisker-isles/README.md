# Whisker Isles

A chibi cat hex settlement game for 2 to 10 players. Live at `jessyux.com/games/whisker-isles/` once deployed.

- **Play on one device:** hot-seat, 2 to 10 cats. 5+ cats switches to the Big Island board (37 tiles).
- **Play online:** create a game, share the cat code (e.g. `sleepy-tuna-42`) or invite link, friends join on their own devices, the host starts.

## Files

- `index.html`: page and styles
- `game.js`: rules, board, rendering and the online client
- `assets/`: art from the art thread, converted to 256px WebP (masters in the project files `cat-game-art/` folder). Any missing file falls back to a built-in SVG drawing.
- `../../worker/index.js`: Cloudflare Worker + `GameRoom` Durable Object that makes codes and syncs online games. Rooms delete themselves after 3 days idle.

## Run locally

```
node build-home.mjs && node redesign-2026/build.mjs
npx wrangler dev          # http://localhost:8787/games/whisker-isles/
```

Hot-seat also works from a plain static server; online play needs `wrangler dev` (or the deployed Worker).

## Deploy

Same as the rest of the site: build, then `npx wrangler deploy`. The first deploy creates the `GameRoom` Durable Object (migration `v1`). Netlify serves the static files only, so online play works on the Cloudflare deployment, not on the Netlify URL.
