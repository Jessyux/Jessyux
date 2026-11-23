# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Jessy's portfolio repo (jessyux.com) with a second product in it: **Whisker Isles**, a cat-themed Catan-style board game at whisker.jessyux.com. This worktree is the `whisker-isles` branch, and the game is its own Cloudflare Worker (configured in `wrangler.jsonc`). The portfolio is a separate Worker deployed from the `accessibility-playground` branch, so a deploy from either branch never touches the other. Do not deploy the game from any other branch.

## Commands

```powershell
node build-game.mjs                                   # copy whisker-isles.html (+ a few files) into dist-game/
npx --yes wrangler@4 dev --port 8795                  # local game + Durable Object rooms, serves dist-game/
node --test tests/*.mjs tests/*.cjs                   # all tests (Node's built-in runner, no package.json)
node --test tests/whisker-seat.test.mjs               # one test file
node --test --test-name-pattern "skipTurn" tests/whisker-drop.test.cjs   # one test by name
```

Rebuild (`node build-game.mjs`) after every edit to `whisker-isles.html` or wrangler serves the old copy; the browser may also hold the old page, so reload with a new query string.

Deploy only when Jessy says so, from a clean copy so stray local files are not shipped:

```bash
D=$(mktemp -d) && git archive HEAD | tar -x -C "$D" && cd "$D" && node build-game.mjs && npx --yes wrangler deploy
# preview on a phone, without touching the live domain: add  -c wrangler.preview.jsonc
```

Commit first (the archive uses HEAD). Ask before deploying and before committing anything outside the request.

## Architecture

**The whole client is one file, `whisker-isles.html` (~4,400 lines):** CSS, markup templates, game rules, rendering, sound and music, and all art as inlined base64. There is no bundler or framework. Code lives in sections in this rough order: art and palette tables, rules and state helpers, `render()` and its parts, the online client, then the `G` object at the end, which holds every action that `onclick="G.something()"` calls from the markup.

- **State:** one global `S` (players, buildings `S.bld`, roads `S.roads`, `S.phase` of `setup`/`play`/`over`, `S.cur`, `S.dice`, `S.log`, and `S.setup` for the setup phase). `commit()` saves and, online, sends the state to the server. Every change goes through `S`, then `render()`, which calls `renderBoard`, `renderPanel`, `renderRollbar`, `renderCats` (avatars on the map), `renderDock` (the paws), `renderOverlay`, and the pop-up syncs (`turnPromptSync`, `setupPromptSync`). UI-only state is in `ui`; online connection state is in `ON`.
- **Turn order:** setup rolls decide a ranking (`S.turnOrder`, highest roll first). Use `nextCat(cur)`, never `(cur+1)%n`. `catOrder()` gives the same order for the avatar row. Removing a cat (`dropCat`) must remap `S.turnOrder`, `S.setup.first` and every player index.
- **Art:** `ART_FILES` lists names and `ART_DATA` holds them as base64 webp data URIs; use `artSrc(name)`. Source images and generation notes live in `assets-source/`. Paws are recoloured per cat at runtime (`pawTint`, base colours in `PAW_BASE`), so new paw art needs an entry there.
- **Layout helpers that measure the DOM:** `arrangeNooks()` positions lobby cats on a ring (a `MutationObserver` on `#root` re-runs it and `placeRoomProps()` after every render), `placeCats()`, `placeDock()`, `placeLogo()`.
- **Sound:** all synthesised with Web Audio, no audio files. `SFX`/`sfx()` for effects (triggered from new `S.log` lines by `sfxFor`), `MUS` for the lo-fi music and its 10 tracks.

**Server (`worker/`):** `game.mjs` is the Worker entry (only `/api/*` reaches it; everything else is the static `dist-game/`). `whisker-room.mjs` is the `WhiskerRoom` Durable Object, one per game code, with the WebSocket message protocol documented at the top of that file. It owns the lobby and the saved game state and accepts a move only when its `base` version matches. `whisker-seat.mjs` holds the pure seat rules (rename, colour, take over by name, public ids), `leaderboard.mjs` and `validate.mjs` the D1 leaderboard. Seat data sent to clients uses a public `sid`, never the device `pid`. Client lobby fields such as `ready` ride along in the seat object, so adding a seat field is a change in the room handler plus the client.

**Tests:** there is no module system in the client, so `tests/whisker-*.test.cjs` read `whisker-isles.html` as text and pull out named functions (`grab('dropCat')`, regexes for one-liners) into a `new Function`. If you add a function that an extracted function calls, add it to that test's loader or the test will fail with a ReferenceError. Server tests import `worker/*.mjs` directly.

## Conventions that are not obvious

- **Every online feature also has to work in person (hot-seat) play, and the other way round.** Check both paths.
- Only the portfolio pages (`index.html`, `pm.html`, `bps.html`, ...) follow `BRAND-GUIDE.md`; the game has its own palette (plum outline, butter, milk) defined at the top of its CSS.
- Keep backups: when rewriting a page, leave the previous version as `<name>.before-<change>.html` rather than deleting it, and show visual rewrites in the browser pane first.
- Testing online play locally needs two origins for two players (`localhost:8795` and `127.0.0.1:8795`), since each stores its device id in its own localStorage. The browser pane runs at phone width by default, which is the layout to check first. Timers and animations pause in a background tab, so make sure the tab you test is the fronted one.
