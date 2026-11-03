# Accessibility Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live accessibility playground, Classic Portfolio (light and dark), a first-visit routing screen, a generic PM case study and a shared sand message wall to jessyux.com, on a separate branch.

**Architecture:** A new `a11y/` folder of plain scripts and CSS is shared by every page. `settings.js` holds visitor settings in `localStorage` and writes them as `data-jux-*` attributes on `<html>`, so CSS does most of the work and frames stay in sync through the `storage` event. Sand messages use a small Cloudflare Worker and D1 database that only handle `/api/sand`; everything else stays static.

**Tech Stack:** Vanilla JS and CSS with no bundler, matching the site. Cloudflare Workers and D1 through `npx wrangler`. Tests use Node's built-in `node --test`, with no dependencies. UI checks run in the Browser pane.

**Spec:** `docs/superpowers/specs/2026-11-04-accessibility-playground-design.md`. Numbers like "call 14" refer to that document.

## Global Constraints

- Work only on branch `accessibility-playground` in its own worktree. No merge to `main`, no deploy, no creating the real D1 database or secret without Jessy's go-ahead.
- `pm.html`, `bps.html` and `index.pre-*`/`*.before-*` backups are not modified. Back up any other rewritten page as `<name>.before-playground.html` first and never delete it.
- At default settings, Personality Portfolio must match live jessyux.com apart from the ducky and first-visit screen.
- Copy: no em dashes. Never "medical cannabis". No statistic without a named source, so accessibility notes carry no prevalence figures.
- Style names are exactly "Personality Portfolio" and "Classic Portfolio". Keep `dist/` generated and never hand-edit it.
- New UI works at 390px with no sideways page scroll, and with keyboard alone.

## Review Focus

1. Corrupt or blocked `localStorage` (private window, junk JSON, unknown values): the site uses defaults and never throws.
2. Changing style, motion or size while a case study frame is open: the frame updates without losing its scroll position, and returning to Personality restarts the water.
3. Largest text on About me's fixed layout: nothing is clipped out of reach, and everything can still be scrolled to.
4. Hostile sand input (HTML in a name or message, oversized drawing, empty drawing): stored safely, shown only as text or SVG path data, rejected with a readable reason.
5. Drawing on a phone: the stroke draws rather than scrolling the page, and a quick tap doesn't post an empty message.

---

### Task 1: Worktree, test setup and shared settings

**Files:**
- Create: `a11y/settings.js`, `tests/settings.test.cjs`
- Modify: `.claude/launch.json`

**Interfaces:**
- Produces, as a classic script setting `window.juxA11y` and `module.exports`:
  - `DEFAULTS = {style:'personality',theme:null,size:'1',contrast:'std',motion:'full',space:'std',font:'std',lens:'off'}`
  - `sanitize(obj) -> settings`, dropping unknown keys and values. Valid: style `personality|classic`; theme `light|dark|null`; size `1|2|3`; contrast `std|high`; motion `full|calm`; space `std|roomy`; font `std|lexend|atkinson`; lens `off|low|deut|prot|trit|kbd`
  - `load() -> settings`, `save(partial) -> settings`, `reset() -> settings`, `subscribe(fn) -> unsubscribe`, `isCalm() -> boolean` (calm setting or device reduced motion), `resolvedTheme() -> 'light'|'dark'` (stored theme, otherwise device preference)
  - `apply(root)`: writes `data-jux-style`, `-theme`, `-size`, `-contrast`, `-motion`, `-space`, `-font`, `-lens` on `root`, and adds Google Fonts links only when needed (Outfit in Classic, Lexend, Atkinson Hyperlegible)
- Storage key: `jux-a11y`.

- [ ] **Step 1:** Create the worktree with `git worktree add ../portfolio-playground -b accessibility-playground`, and work there. Add a `portfolio-worker` config to `.claude/launch.json`: `npx wrangler dev --port 8787`, port 8787.
- [ ] **Step 2: Write failing tests** in `tests/settings.test.cjs`, with a fake storage:
  - `sanitize({size:'9',evil:1,font:'lexend'})` deep-equals defaults with `font:'lexend'`
  - `load()` returns `DEFAULTS` when storage holds `'{bad'`
  - `load()` and `save()` don't throw when storage access throws
  - `save({size:'2'})` keeps other values and persists
  - `apply` sets `data-jux-size="2"`, and adds no font link at defaults
- [ ] **Step 3:** Run `node --test tests/`. Expected: FAIL, module not found.
- [ ] **Step 4:** Implement `a11y/settings.js` as an IIFE like `dive.js`. `subscribe` listens to `storage` events and local saves.
- [ ] **Step 5:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 6:** Commit: `git add a11y tests .claude/launch.json && git commit -m "Add shared playground settings"`.

### Task 2: Contrast scoring

**Files:**
- Create: `a11y/contrast.js`, `tests/contrast.test.cjs`

**Interfaces:**
- Produces `window.juxContrast`: `ratio(hexA,hexB) -> number`, `level(ratio,large) -> 'AAA'|'AA'|'Below AA'`, `SURFACES`, `score(surfaceKey) -> {level,lowest:{label,ratio},rows:[{label,ratio,level}]}`.
- `surfaceKey` is `style.theme-or-view.contrast`, for example `personality.about.std` or `classic.dark.high`. Built by `surfaceFor(settings, view)`, where view is `about|recs|case|intro|pm|sand`.
- Each surface lists `bg`, `ink`, `soft`, `accent` and `accentLarge`, taken from the real tokens. Case and PM surfaces use the brightest water stop, `#0a4a66`, as the worst case. Task 5 finalises Classic values and Task 4 finalises Personality high-contrast values.

- [ ] **Step 1: Write failing tests:** `ratio('#000','#fff')` is about 21; `ratio('#078A72','#F3E3C6')` is between 3.3 and 3.7; `level(3.4,true)` is `'AA'`; `level(3.4,false)` is `'Below AA'`; `score('personality.about.std').level` is `'AA'` with the accent as lowest; every Classic surface and every `.high` surface scores at least AA, with body text at AAA.
- [ ] **Step 2:** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3:** Implement `a11y/contrast.js`.
- [ ] **Step 4:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 5:** Commit: `Add contrast scoring`.

### Task 3: Panel and setting effects on case studies

Case studies come first because they use rem sizes and are the easiest place to prove the settings.

**Files:**
- Create: `a11y/a11y.css`, `a11y/panel.js`
- Modify: `redesign-2026/work/multi-shipping-options.html`, `westpac-youth.html`, `admin-redesign.html` (add includes), `redesign-2026/assets/js/dive.js:18`, `redesign-2026/build.mjs`

**Interfaces:**
- Consumes: `juxA11y`, `juxContrast`.
- Produces `window.juxPanel`: `mount({view:string|()=>string, showFloatingButton:boolean})`, `open()`, `close()`, `addAction(label, fn)`. Panel root and buttons carry class `jux-ui`.
- Include block for every page, in `<head>`: `<link rel="stylesheet" href="/a11y/a11y.css"><script src="/a11y/settings.js"></script><script>juxA11y.apply(document.documentElement)</script>`, and before `</body>`: `<script src="/a11y/contrast.js"></script><script src="/a11y/panel.js"></script>`.

- [ ] **Step 1:** Update the two regexes in `build.mjs` that inline stylesheets and scripts so they skip paths starting with `/`. Run `node redesign-2026/build.mjs` and confirm `/a11y/` tags stay as tags in `dist/redesign/work/*.html`.
- [ ] **Step 2:** Write `a11y/a11y.css`:
  - Size: `html[data-jux-size="2"]{font-size:125%}` and `"3"` at 150%.
  - Spacing: roomy sets line height 1.95, letter spacing .03em, word spacing .1em on body text.
  - Typeface: overrides `--display`, `--body` and body text when `lexend` or `atkinson`. IBM Plex Mono readings follow it too.
  - Lens: `body>*:not(.jux-ui){filter:var(--jux-lens)}` using `#jux-deut`, `#jux-prot`, `#jux-trit` and, for low vision, `blur(2.2px) contrast(.82)`. Skip all filters under `html.embed`, so frames aren't filtered twice.
  - Calm: animation none and transition duration near zero.
- [ ] **Step 3:** Write `a11y/panel.js`.
  - Controls in the spec's table order, using `aria-pressed` buttons. Light/dark only shows in Classic.
  - Exact copy for the intro: "Accessibility is part of how I design, not a last step. Change anything here and the whole site responds, and I've noted who each setting helps." Take the notes from the prototype, rewriting the deuteranopia note as "Greens and reds move closer together."
  - Score card with expandable checks and the line "Measured against each colour's solid background. It isn't a full audit: that takes people and assistive tech too."
  - Reset everything, Done, Esc to close. Keyboard only lens: Esc turns it off first. Focus moves into the panel on open and returns on close.
  - Injects the three Machado 2009 colour matrices (values are in the prototype and copied into `panel.js`).
  - Bottom sheet under 760px.
- [ ] **Step 4:** In `dive.js:18`, change to `var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches||(window.juxA11y&&juxA11y.isCalm());`. Add the include block to the three studies. In the frame, mount with no floating button under `html.embed`, and with one otherwise. On a motion or style change, save scroll position to `sessionStorage`, reload the frame and restore it.
- [ ] **Step 5: Check in the Browser pane** at `/redesign-2026/work/multi-shipping-options.html`: each control changes the page; `juxA11y.save({size:'3'})` run in another tab updates this one; a reload keeps settings; Calm plus scroll keeps position; Largest text, Lexend and Roomy together leave `scrollWidth<=innerWidth` at 1280 and 390.
- [ ] **Step 6:** Commit: `Add playground panel and apply settings to case studies`.

### Task 4: Ducky and settings on the home page

**Files:**
- Backup: `index.html` to `index.before-playground.html`
- Create: `img/floaties/ducky.webp`
- Modify: `index.html` (lines 11, 543-578, 685-691, 696, 1121, 1146-1152, 1166-1180, 1281, 1327, 1375), `build-home.mjs`, `a11y/a11y.css`

**Interfaces:**
- Consumes: `juxPanel.mount`, `juxPanel.open`, `juxA11y.isCalm`.
- Produces: `window.juxHome = {go, view:()=>view}`, used by Tasks 5 and 6.
- Home view to surface: `about` to `about`, `kind` to `recs`, `umeds|westpac|circuit` to `case`, `intro` to `intro`.

- [ ] **Step 1:** Convert the cutout at `C:\Users\User\AppData\Local\Temp\claude\80b86dd6a9f406e2\ad8c3c94-cab6-4bf7-b586-2d6aa42555e1\scratchpad\ducky-floatie-cutout.png` with `npx --yes sharp-cli`: trim, resize to 420px wide, and output `img/floaties/ducky.webp`. Open it to confirm a transparent background.
- [ ] **Step 2:** Add to `ITEMS` after `kind`: `{id:'duck',label:'Accessibility playground',icon:'quote',img:'img/floaties/ducky.webp',c:'#F4C542',action:'a11y'}`. In the float's `onclick`, when `it.action==='a11y'`, ripple and call `juxPanel.open()` instead of `go`. Make sure `it.view` undefined never marks it current.
- [ ] **Step 3:** In `layout()`, add a fifth entry to `spots`: `spot(0,0,dyB+s*1.05)`, centred below Jessy. Check at 1280x800, 1440x900 and 390x844 that the duck overlaps neither the character nor another floatie. If it does on phones, adjust only the duck's spot.
- [ ] **Step 4:** Add the include block. Update `build-home.mjs` to copy the whole `a11y/` folder, `product-manager.html`, `sand.html` and `sand-admin.html` when present.
- [ ] **Step 5:** Replace the three reduce checks (lines 696, 1121, 1327) with `juxA11y.isCalm()`-aware versions. Pause the water loop at a still frame when calm: `frame` draws once then stops, and resumes through `subscribe`. Add `html[data-jux-motion="calm"]` mirrors of the page's existing reduced-motion CSS rules at lines 99, 100, 110, 124, 220, 290, 318, 324 and 558.
- [ ] **Step 6:** Home text is mostly px, so size can't rely on rem. In `a11y.css`, use `zoom:1.25` and `zoom:1.5` on these home text containers: `.about-hero .txt`, `.tl-head`, `.timeline`, `.tl-m-body`, `.pk-wrap-inner .tl-head`, `#kw .card` and the intro hero text. Fix any fit or clip problem this causes on About me at Largest.
- [ ] **Step 7:** Sand titles: add a `.sandt` span with the alt text next to each `.sandh` image, in Gabarito 800. In CSS, hide the span at defaults and swap image for span when `data-jux-size` isn't 1, `data-jux-font` isn't std, or `data-jux-contrast` is high (call 6).
- [ ] **Step 8:** High contrast: override `#palmsbg`, `#shore` and `#abpan` text backgrounds with solid colours, and set accents so `personality.about.high` and `personality.intro.high` in `contrast.js` match the real page (call 8).
- [ ] **Step 9: Regression check in the Browser pane:** with `localStorage` empty, compare intro, About me, Recommendations and all three studies with live jessyux.com side by side at 1280x800 and 390x844, with the first-visit screen not yet present. Only the ducky may differ. Save screenshots.
- [ ] **Step 10: Settings check:** Largest text on About me: everything can be reached by scrolling (Review Focus 3). Calm freezes water, fish and floaties, and opening a study plays no dive. Device reduced motion still wins over Full. Keyboard: Tab reaches the ducky and Enter opens the panel.
- [ ] **Step 11:** Commit: `Add ducky floatie and playground to the home page`. Include the backup file.

### Task 5: Classic Portfolio

**Files:**
- Create: `a11y/classic.css`, `a11y/classic-home.js`, `a11y/classic-case.css`
- Modify: `index.html` (includes, and `juxHome` hooks), the three studies (include `classic-case.css`), `a11y/contrast.js`

**Interfaces:**
- Consumes: page-level `TIMELINE`, `RECS`, `POCKET_PHOTOS`, `NEW_CASE`, `CASES`; `juxHome`; `juxA11y.resolvedTheme`.
- Produces: `window.juxClassic = {render(), remove()}`, and a `#classic` element with class `jux-ui`. `jux-ui` here means it's excluded from the lens rule, so `#classic` applies the lens filter to its own `<main>`.

- [ ] **Step 1: Palette.** Dark: bg `#1E1A24`, ink `#F6EFE8`, soft `#C9BFC4`, accent `#F2C9A8`, plate `#2A2531`. Light: bg `#FFFFFF`, ink `#1E1A24`, soft `#4F4855`, accent `#8A3F1E`, plate `#F6EFE8`. High contrast, dark: bg `#000`, ink `#FFF`. High contrast, light: bg `#FFF`, ink `#000`. Add these to `SURFACES`, then run `node --test tests/`. Expected: PASS.
- [ ] **Step 2:** Write `classic-home.js`. Render from the data constants, never duplicating copy:
  - Header: "Jessy Chappell" with "Product designer & manager"; About me, Recommendations, Case studies; Resume; Accessibility playground; Light/dark shortcut that calls `juxA11y.save({theme})`.
  - About me is the landing view (call 11): hero with lead, bio, links, photo, status; timeline as rows that open the existing bullet content inline; pocket photos as a plain grid with alt text.
  - Recommendations as a vertical card list. Case studies as three cards that open the study frame in `#classic`, using the same frame source as `NEW_CASE`.
- [ ] **Step 3:** Write `classic.css` using Outfit, rounded cards and pill buttons. While `data-jux-style="classic"`, hide `#poolwrap`, `#cartoon`, floaties, `#kw`, `.view`, `#beachdeco`, `#shore`, `#palmsbg`. Stop the water `frame` loop and the fish `tick` loop, and restart them on return to Personality (Review Focus 2). `juxHome.go` state is preserved so going back returns to the same view.
- [ ] **Step 4:** Write `classic-case.css` (call 12): hide `#rail`, depth eyebrows, particles and water canvas; one background; Outfit; `--glow` and related tokens remapped; depth colours overridden with `!important`, since `dive.js` paints `sea.style.background`. Keep all content, charts and references readable in both themes.
- [ ] **Step 5: Check in the Browser pane:** switch style on each view, and in an open study without a reload; toggle theme from the panel and header and confirm they stay in sync; check the score updates; first load follows device theme using `resize_window` colour scheme; return to Personality and confirm water moves; test at 390px at Largest in both themes.
- [ ] **Step 6:** Commit: `Add Classic Portfolio with light and dark themes`.

### Task 6: First-visit screen

**Files:**
- Create: `a11y/welcome.js`
- Modify: `index.html` (include), `a11y/panel.js` (hooks up action), `a11y/a11y.css`

**Interfaces:**
- Consumes: `juxHome`, `juxPanel`, `juxA11y`.
- Produces: `window.juxWelcome = {open(), shouldShow(storage, view)}`. Storage key: `jux-welcome-seen`.

- [ ] **Step 1: Write failing test** in `tests/welcome.test.cjs`: `shouldShow` returns true for empty storage on `intro`, false once seen, false for any other view, false when storage throws (no nagging when storage is blocked, per Review Focus 1).
- [ ] **Step 2:** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3:** Implement `welcome.js` using a native `<dialog>` with `showModal()`, opened after `#jx-loading` clears. Heading: "What brings you here?". Buttons in order: "I'm hiring a senior designer" (closes to the current home), "I'm hiring a product manager" (goes to `/product-manager`), "I'm building or fixing a team", "I'm a fellow designer". A visible "Skip" closes it. Esc equals Skip. Mark seen on any choice.
- [ ] **Step 4:** Message panels inside the dialog, with a Back link to the question:
  - Team: "Building a team or fixing one? I'd be glad to talk through what's getting in the way. Send me a note about where things are at and we can work out whether I can help." Buttons: Email Jessy (`mailto:jessyuxer@gmail.com`), LinkedIn (`https://www.linkedin.com/in/jessyux`), Back to the beach.
  - Fellow designer: "Hello, fellow designer. Have a poke around. The accessibility playground shows how I think about inclusive design, and I'd love to swap notes." Buttons: Write in the sand (`/sand`), Open the playground, See the work, LinkedIn.
- [ ] **Step 5:** Add panel actions: "Change what brought you here" (`juxWelcome.open`) and "Messages in the sand" (`/sand`).
- [ ] **Step 6:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 7: Check in the Browser pane:** shows on first visit and not on reload; each route works; Tab stays inside and Esc closes; focus returns to the page; legible at Largest text on 390px; styled for both Personality and Classic; doesn't appear on `/pm`, `/bps` or `/product-manager`.
- [ ] **Step 8:** Commit: `Add first-visit routing screen`.

### Task 7: Generic PM case study

**Files:**
- Create: `product-manager.html` (start from `pm.html` in the worktree, which is the committed version and matches live `/pm`), `tests/pm-page.test.cjs`

**Interfaces:**
- Consumes: the include block; `juxPanel.mount({view:'pm',showFloatingButton:true})`; `classic-case.css`.

- [ ] **Step 1: Write failing test:**
  - The file exists and contains none of `/karmo|eagers|simplr|vehicle|car subscription/i`.
  - Every slide footer matches `n / 12` in order, 1 to 12.
  - `git show HEAD:pm.html` and `git show HEAD:bps.html` equal the working files.
- [ ] **Step 2:** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3:** Copy `pm.html` and edit it (call 18):
  - Remove the `data-slide="Karmo"` section and its CSS rule at line 97.
  - Rewrite the last slide with the eyebrow "In a new role", heading "In a new role, I'd start by measuring the **current journey**.", and "I'd take a data-led approach to continuous retention: find the frictions, then make the journey as easy and seamless as possible, so the business keeps its customers and wins new ones."
  - Keep the five habits, with habit two as "Map the whole lifecycle. Audit the product at its high-friction points, from first use through to renewal."
  - Closing line: "I'd like to hear what's slowing your product down."
  - Renumber footers. Update title and metadata to "Jessy Chappell, product manager". Remove any `noindex` only if Jessy asks.
- [ ] **Step 4:** Add the include block and make the slides fit-free at larger sizes: slides may grow past one screen rather than clip (call 19). Check depth stops still work with one fewer slide.
- [ ] **Step 5:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 6: Check in the Browser pane:** scroll all 12 slides in Personality and Classic light and dark, at default and Largest, at 1280 and 390. Every remaining figure still shows its source.
- [ ] **Step 7:** Commit: `Add generic PM case study`.

### Task 8: Sand message API

**Files:**
- Create: `worker/index.mjs`, `worker/validate.mjs`, `worker/blocklist.mjs`, `worker/schema.sql`, `tests/sand-validate.test.mjs`
- Modify: `wrangler.jsonc`

**Interfaces:**
- `validate.mjs` exports `validatePost(body) -> {ok:true,value}|{ok:false,status,reason}`.
- Message shape: `{id,name,kind:'text'|'draw',text?,strokes?,created}`. Strokes are arrays of `[x,y]` integers from 0 to 1000.
- `GET /api/sand` returns newest 100, `no-store`.
- `POST /api/sand`: 201 with the message; 400 invalid; 422 word filter; 429 rate limit; 413 over 32 KB.
- `DELETE /api/sand/:id`, with `Authorization: Bearer <SAND_ADMIN_SECRET>` compared in constant time: 204 or 401.
- Env: binding `SAND_DB`; secrets `SAND_ADMIN_SECRET`, `SAND_SALT`.

- [ ] **Step 1: Write failing tests** for `validatePost`:
  - Text of 140 characters passes; 141 returns 400.
  - Name of 31 characters returns 400.
  - A filled `website` honeypot returns `{ok:false,status:201,reason:'spam'}`, so bots get a fake success.
  - A blocked word in text or name returns 422, including spaced and leetspeak variants.
  - Empty text returns 400; `kind:'draw'` with no strokes or under 2 points returns 400.
  - More than 60 strokes or 2000 points returns 400; non-integers or out-of-range coordinates return 400.
  - `<script>` text passes through unchanged, because escaping happens on display.
- [ ] **Step 2:** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3:** Implement `validate.mjs` and `blocklist.mjs`.
- [ ] **Step 4:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 5:** Write `schema.sql` (tables `messages`, `rate`) and `index.mjs`. Rate limit: 5 posts per hour per SHA-256 of IP plus `SAND_SALT`; delete rate rows older than 2 hours on each post. Set in `wrangler.jsonc`: `main`, the `SAND_DB` D1 binding with a placeholder ID and a comment that it's set at deploy, and `assets.run_worker_first: ["/api/*"]`.
- [ ] **Step 6: Local integration check.** Build, apply the schema with `npx wrangler d1 execute SAND_DB --local --file worker/schema.sql`, put secrets in an uncommitted `.dev.vars` (add to `.gitignore`), run `npx wrangler dev --port 8787`, then use curl to confirm: POST then GET returns it; a sixth post in an hour returns 429; DELETE without the secret returns 401 and with it 204; `/` still serves the home page.
- [ ] **Step 7:** Commit: `Add sand message API`.

### Task 9: Sand screen and removal page

**Files:**
- Create: `sand.html`, `a11y/sand.js`, `sand-admin.html`

**Interfaces:**
- Consumes: `/api/sand`; the include block; `juxPanel.mount({view:'sand',showFloatingButton:true})`.
- Produces: `strokesToPath(strokes) -> string` in `a11y/sand.js`, also exported for tests.

- [ ] **Step 1: Write failing test** in `tests/sand-draw.test.cjs`: `strokesToPath([[[0,0],[10,10]]])` starts with `M0 0`; an empty array gives an empty string.
- [ ] **Step 2:** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3: Handwriting font.** On a test page, compare Patrick Hand (first choice, for its upright print and serifed I) with Gochi Hand beside `img/sand/hi-im-jessy.webp`, and pick the closer match. Style typed messages in a dark sand brown such as `#5A4326`, with a pressed look: `text-shadow:0 1px 0 rgba(255,255,255,.75),0 -1px 1px rgba(60,35,10,.55)`. Confirm at least 4.5:1 against the sand. The Typeface setting overrides the font. High contrast removes the shadow and uses solid colours.
- [ ] **Step 4:** Build `sand.html`:
  - Heading "Write me a message in the sand" on `img/about-beach.webp` as a sand background.
  - Type or Draw choice, with Type selected by default so keyboard users start ready. Live preview for typed text.
  - Canvas with `touch-action:none`, pointer events normalised to 0 to 1000, Undo and Clear. Post stays disabled until there's content.
  - Optional first name, with a hidden `website` field. Above Post: "Your message is public as soon as you post it. Please don't include personal details."
  - Wall of newest messages, rendered with `textContent` for text and SVG `path` for drawings (`role="img"` with `aria-label="Hand-drawn message"`, plus the name if given). Stroke animation plays only when not calm.
  - Failure state (call 27): "Messages can't be saved right now." Keep what the visitor wrote on screen. The wall shows "Messages can't be loaded right now."
- [ ] **Step 5:** Build `sand-admin.html` with `noindex`: a password input for the secret kept only in memory, a list of messages, and Remove with a confirm step.
- [ ] **Step 6:** Run `node --test tests/`. Expected: PASS.
- [ ] **Step 7: Check against `wrangler dev`:** post typed and drawn messages by mouse; a phone-sized draw doesn't scroll (Review Focus 5); open a second browser tab and see them on load; `<img onerror>` as a name shows as plain text; rate limit message reads well; with the API stopped, the failure state keeps the text; keyboard-only typing and posting works; Calm and high contrast apply; removal page refuses a wrong secret and removes with the right one.
- [ ] **Step 8:** Commit: `Add sand message wall and removal page`.

### Task 10: Whole-site check and handover

**Files:**
- Modify: `redesign-2026/CLAUDE.md` (document `a11y/`, Worker, build, and the unchanged-Personality rule)

- [ ] **Step 1:** Run `node --test tests/`, then `node build-home.mjs && node redesign-2026/build.mjs`. Expected: all pass, and `dist/` has `a11y/`, `product-manager.html`, `sand.html`, `sand-admin.html`.
- [ ] **Step 2:** Against `wrangler dev`, go through every line of "How we'll know it's done" in the spec, including the side-by-side with live jessyux.com. Check console errors on each page and record anything not verified.
- [ ] **Step 3:** Commit: `Document the playground`.
- [ ] **Step 4:** Show Jessy each page in the Browser pane, and state what deploying would require (creating D1, secrets, `wrangler deploy`). Don't merge or deploy.
