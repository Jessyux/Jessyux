# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Jessy's portfolio repo (jessyux.com) with a second product in it: **Whisker Isles**, a cat-themed Catan-style board game at whisker.jessyux.com. This worktree is the `whisker-isles` branch, and the game is its own Cloudflare Worker (configured in `wrangler.jsonc`). The portfolio is a separate Worker deployed from the `accessibility-playground` branch, so a deploy from either branch never touches the other. Do not deploy the game from any other branch.

## Every session: start and finish

Run these checks when Jessy names Whisker Isles at the start of the chat. A chat that names no project skips them.

**Start, before any change:**

1. Confirm you are in the whisker-isles worktree, on branch `whisker-isles`.
2. `git fetch origin whisker-isles`, then `git status -sb`.
3. Tell Jessy in one line: in sync, GitHub ahead (list the commits), or this folder ahead. If behind, pull before editing. If the branches have diverged, stop and ask.

**Finish, in the last message of any session that changed files:**

- Commits made (SHA and subject), and the test result.
- Pushed? `origin/whisker-isles` SHA against local HEAD.
- Deployed? The Cloudflare version ID and the SHA it was built from, or "not deployed".
- Live against GitHub: in sync, or what live is missing.
- Anything left uncommitted or untracked.

## Commands

```powershell
node build-game.mjs                                   # build dist-game/ from whisker-isles.html (see Art below)
npx --yes wrangler@4 dev --port 8795 --local          # local game + Durable Object rooms, serves dist-game/
node --test tests/*.mjs tests/*.cjs                   # all tests (Node's built-in runner, no package.json)
node --test tests/whisker-seat.test.mjs               # one test file
node --test --test-name-pattern "skipTurn" tests/whisker-drop.test.cjs   # one test by name
```

Rebuild (`node build-game.mjs`) after every edit to `whisker-isles.html` or wrangler serves the old copy; the browser may also hold the old page, so reload with a new query string. On Windows the rebuild deletes `dist-game/` under wrangler's file watcher (EPERM), so restart `wrangler dev` after each rebuild. Stop only that wrangler process (match its command line or port), never all node or python processes. `.claude/launch.json` has no game entry; its configs are for the portfolio.

To sanity-check that the page's script still parses without a browser, run `new Function(...)` over the longest `<script>` block with `node -e`.

Deploy only when Jessy says so, from a clean copy so stray local files are not shipped:

```bash
D=$(mktemp -d) && git archive HEAD | tar -x -C "$D" && cd "$D" && node build-game.mjs && npx --yes wrangler deploy
# preview on a phone, without touching the live domain: add  -c wrangler.preview.jsonc
```

**When Jessy says "Deploy", that also means commit and push, unless she says otherwise (for example "deploy only").** Do it in this order without asking again: pull (merge if GitHub is ahead, never force), run the tests, commit the work, push to `origin/whisker-isles`, then deploy from the clean copy. Stage named files only, not `git add -A`. Ask first only if the commit would include something outside what she asked for. End with the version ID and the SHA it was built from.

## Architecture

**The whole client is one file, `whisker-isles.html` (~5,800 lines, ~3 MB because of inlined art):** CSS, markup templates, game rules, rendering, sound and music, and all art as inlined base64. There is no bundler or framework. Code lives in sections in this rough order: art and palette tables, rules and state helpers, `render()` and its parts, the online client, then the `G` object at the end, which holds every action that `onclick="G.something()"` calls from the markup.

- **State:** one global `S` (players, buildings `S.bld`, roads `S.roads`, `S.phase` of `setup`/`play`/`over`, `S.cur`, `S.dice`, `S.log`, and `S.setup` for the setup phase). `commit()` saves and, online, sends the state to the server. Every change goes through `S`, then `render()`, which calls `renderBoard`, `renderPanel`, `renderRollbar`, `renderCats` (avatars on the map), `renderDock` (the paws), `renderOverlay`, and the pop-up syncs (`turnPromptSync`, `setupPromptSync`). UI-only state is in `ui`; online connection state is in `ON`.
- **Turn order:** setup rolls decide a ranking (`S.turnOrder`, highest roll first). Use `nextCat(cur)`, never `(cur+1)%n`. `catOrder()` gives the same order for the avatar row. Removing a cat (`dropCat`) must remap `S.turnOrder`, `S.setup.first` and every player index.
- **Art:** `ART_FILES` lists names and `ART_DATA` holds them as base64 webp data URIs; use `artSrc(name)`. The source page keeps everything inlined, but `build-game.mjs` keeps only the names in `ART_CORE` (what the first screen needs) inside the built page. Every other picture becomes a content-hashed `dist-game/assets/<name>.<hash>.webp`, cached as immutable, and `ART_DATA` is rewritten to point at it. New art that must show before anything else loads goes in `ART_CORE`. Because the file is huge, edit `ART_DATA` entries with a small Python/Node script rather than Read/Edit, and grep with long lines cut (`cut -c1-200`). Source images and generation notes live in `assets-source/`. Paws are recoloured per cat at runtime (`pawTint`, base colours in `PAW_BASE`), so new paw art needs an entry there.
- **Board geometry:** hexes have `HR=60`. `V` holds the vertices and `HEX` the tile centres. Ports are drawn in `renderBoard`'s dock layer before the tiles, so the tiles cover the piers' shore ends. `pierTips(d)` places each port's two bent piers (`PIER`, art `port-pier`). `boatSpot(d)` places the boat (`BOAT`, art `port-boat`), whose sail shows the ratio and resource. The board's viewBox grows to fit the boats, and its bottom margin depends on `ui.boardWide` (`innerWidth > 920`, where the paws and tabs sit on the map's bottom edge).
- **Layout helpers that measure the DOM:** `arrangeNooks()` positions lobby cats on a ring (a `MutationObserver` on `#root` re-runs it and `placeRoomProps()` after every render), `placeCats()`, `placeDock()`, `placeLogo()`.
- **Sound:** all synthesised with Web Audio, no audio files. `SFX`/`sfx()` for effects (triggered from new `S.log` lines by `sfxFor`), `MUS` for the lo-fi music and its 10 tracks.

**Server (`worker/`):** `game.mjs` is this Worker's entry (only `/api/*` reaches it; everything else is the static `dist-game/`). `worker/index.mjs` is the *portfolio* Worker's entry (the Sand messages API, deployed from `accessibility-playground`). It imports the same `whisker-room.mjs` and `leaderboard.mjs`, so changes to those shared modules affect both Workers' code. `whisker-room.mjs` is the `WhiskerRoom` Durable Object, one per game code, with the WebSocket message protocol documented at the top of that file. It owns the lobby and the saved game state and accepts a move only when its `base` version matches. `whisker-seat.mjs` holds the pure seat rules (rename, colour, take over by name, public ids), `leaderboard.mjs` and `validate.mjs` the D1 leaderboard. Seat data sent to clients uses a public `sid`, never the device `pid`. Client lobby fields such as `ready` ride along in the seat object, so adding a seat field is a change in the room handler plus the client.

**Tests:** there is no module system in the client, so `tests/whisker-*.test.cjs` read `whisker-isles.html` as text and pull out named functions (`grab('dropCat')`, regexes for one-liners) into a `new Function`. If you add a function that an extracted function calls, add it to that test's loader or the test will fail with a ReferenceError. Server tests import `worker/*.mjs` directly.

## Conventions that are not obvious

- **Every online feature also has to work in person (hot-seat) play, and the other way round.** Check both paths.
- Only the portfolio pages (`index.html`, `pm.html`, `bps.html`, ...) follow `BRAND-GUIDE.md`; the game has its own palette (plum outline, butter, milk) defined at the top of its CSS.
- Keep backups: when rewriting a page (or a worker module), leave the previous version as `<name>.before-<change>.<ext>` rather than deleting it, and show visual rewrites in the browser pane first. Jessy often asks to go back to an earlier look, and these backups are how. Backups are committed alongside the change.
- Don't commit the untracked raw generation files in `assets-source/emotes/` (`raw-*`, `chk*`). Add `assets-source/<topic>/` folders explicitly rather than `git add -A`.
- Testing online play locally needs two origins for two players (`localhost:8795` and `127.0.0.1:8795`), since each stores its device id in its own localStorage. The browser pane runs at phone width by default, which is the layout to check first. Timers and animations pause in a background tab, so make sure the tab you test is the fronted one.

# jessyux repo

## Whisker Isles deploy rule (read before any deploy)

**Always commit and push before deploying Whisker Isles. Deploy only from `whisker-isles`, after pulling.**

1. `git checkout whisker-isles && git pull origin whisker-isles`
2. Make the change, run `node --test tests/*.cjs tests/*.mjs`
3. `git commit` and `git push origin whisker-isles`, and confirm `git status` shows nothing ahead or uncommitted
4. Only then: `node build-game.mjs && npx --yes wrangler@4 deploy`

**Why:** `wrangler deploy` uploads whatever files are on the machine, not what's on GitHub. On 24 Nov 2026 a session deployed commits that were never pushed. A later session then deployed from GitHub, which was a day behind, and wiped chat, rematch and the loading fix off the live game until it was rolled back.

- Never deploy from another branch, a worktree that isn't up to date with `origin/whisker-isles`, or uncommitted files.
- If a push is rejected because GitHub has newer commits, merge them in and test again before deploying. Never force-push.
- After deploying, report the Cloudflare version ID and the commit SHA it was built from.
- Live site: `whisker.jessyux.com` (Worker `whisker-isles`). To undo a bad deploy: `npx wrangler deployments list --name whisker-isles`, then `npx wrangler rollback <previous version id> --name whisker-isles`.

## Starting a new chat about Whisker Isles

The game is not in the JessyUX/portfolio folder or on `main`. A chat that opens in the main checkout will see no game files. Open the chat in this folder instead:

`C:\Users\User\Documents\portfolio\portoflio 2026\.claude\worktrees\whisker-isles` (branch `whisker-isles`, file `whisker-isles.html`, live at whisker.jessyux.com).

- In the Claude desktop app, start the new chat with this folder as the project folder.
- If a chat starts anywhere else, say "Whisker Isles" in the first message. The chat should then switch to this folder and run the start checks above.
- "Whisker Isles" means this git branch, never the published Artifact of the same name.
