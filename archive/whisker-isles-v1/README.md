# Whisker Isles v1 (archived 24 Nov 2026)

The first version of Whisker Isles, archived from the `add-whisker-isles-game` branch (last commit `ee4b40d`, 22 Nov 2026). Kept for reference only. It is not built or deployed.

**The live game** is `whisker-isles.html` plus `worker/game.mjs` and `worker/whisker-room.mjs` on the `whisker-isles` branch, served at `whisker.jessyux.com`.

## What's here

- `games/whisker-isles/`: the v1 page (`index.html`), game code (`game.js`) and 256px WebP art.
- `worker/index.js`: the v1 portfolio Worker with the `GameRoom` Durable Object (rooms deleted after 3 days idle).
- `img/float-whisker-isles.webp`: the home page floatie that linked to `jessyux.com/wi`.

## Why it was replaced

- v1 ran inside the portfolio Worker, so a game deploy touched jessyux.com.
- The live version has its own Worker, a shared leaderboard (D1), push turn alerts, taking a seat back on a new device, and moving a one-screen game online.
