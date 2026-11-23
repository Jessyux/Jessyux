# Trade with a cat: trading mat and counter-offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stepper trade form with a playful trading mat, with cats perched on the dialog, and add counter-offers that work in person and online.

**Architecture:** Everything client-side lives in `whisker-isles.html`, following its existing pattern: HTML-returning render functions, actions on `G`, state in `S` / `ui`, `commit()` to save and sync. Offer rules go into small pure functions so tests can pull them out of the HTML with `new Function`, as `tests/whisker-carry.test.cjs` does. The server change is one rule in `worker/whisker-notify.mjs`.

**Tech Stack:** Plain JS/CSS in one HTML file, WAAPI for animation, `node --test`, Cloudflare Worker module for push rules.

**Spec:** `docs/superpowers/specs/2026-11-24-cat-trade-mat-design.md`

## Global Constraints
- The work happens only in the `whisker-isles` worktree. Back up first as `whisker-isles.before-trade-mat.html`, and never delete backups.
- Every feature works both in person (hot-seat, `!S.online`) and online.
- In person, no cat's cards show before their "Pass the screen to …" tap.
- Copy, exactly:
  - "Trade with a cat", "You give", "You get", "Your cards", "Ask for", "Close", "Offer to {names}", "Pick a cat".
  - "No thanks", "Counter", "Accept trade", "Counter to {name}", "{name}'s counter-offer", "Deal!".
  - Push: "{name} countered your offer".
- The `S.offer` shape is kept and extended: `{from, to, declined, give, get, seen, round}`. `give`/`get` are always from `from`'s side.
- Python edits keep LF line endings (`open(..., newline='')`).
- Reduced motion means no flying cards and no bouncing cats.
- Nothing is committed and nothing is deployed unless Jessy asks.

## Review Focus
- **Counter on a multi-cat offer (online):** the other invited cats' offer cards close, and only the turn's cat sees the counter. Test: `counterOffer` returns `to:[turnCat]`.
- **Accept after a counter (in person):** the hand-back goes to the turn's cat (`S.cur`), not to `o.from`. Test: `handbackTo(o, who, cur)` returns `cur`.
- **Declining a counter as the turn's cat:** no "pass the screen back" card shows, because the turn's cat already holds the screen. Test: `handbackTo` returns `null` when `who === cur`.
- **Countering with cards you no longer have:** the counter mat caps "Your cards" at the counterer's own hand. Test: `counterOffer` clamps `give` to the counterer's resources.
- **Push on counter but not on unrelated moves:** `moveAlerts` fires when `round` grows and stays quiet on the same round. Test in `tests/whisker-notify.test.mjs`.

---

### Task 1: Offer rules as pure functions, and counter-offers in state

**Files:**
- Modify: `whisker-isles.html`, next to `offerTo` / `describe` (around line 2246)
- Modify: `whisker-isles.html`, the `G.tradeOffer`, `tradeDecline`, `tradeAccept` and `tradeCancel` actions (around lines 4709-4732)
- Test: `tests/whisker-trade.test.cjs` (new; extracts the functions like `whisker-carry.test.cjs`)

**Interfaces:**
- Produces:
  - `counterOffer(o, who, give, get, res)`:
    - Returns a new offer `{from:who, to:[o.from], declined:[], give, get, seen:false, round:(o.round||0)+1}`.
    - `give[r]` is clamped to `res[r]`, and `get[r]` is clamped to 0..9.
    - Any `r` set on both sides keeps only the side that was set last; the caller passes clean data, so the function zeroes `get[r]` where `give[r]>0`.
  - `handbackTo(o, who, cur)`: returns `null` when `who===cur`, otherwise `cur`.
  - `G.tradeCounter()`:
    - Opens the counter mat: `ui.modal={kind:'counter', give:{...o.get}, get:{...o.give}}`, flipped to the counterer's side.
    - `G.counterSend()` sets `S.offer = counterOffer(...)`, logs "{who} counters {other}'s offer.", then calls `commit()`.

- [ ] **Step 1: Write the failing tests** in `tests/whisker-trade.test.cjs`:
  - `counterOffer` flips `from`/`to`, bumps `round` from `undefined` to 1 and from 1 to 2, and resets `declined` and `seen`.
  - `counterOffer` of an offer to `[1,2]` countered by 2 gives `to: [0]`.
  - `counterOffer` clamps `give.fish` 5 to 3 when the counterer holds 3 fish, and zeroes `get.fish` when `give.fish>0`.
  - `handbackTo({from:1}, 0, 0) === null`, and `handbackTo({from:1}, 2, 0) === 0`.
- [ ] **Step 2: Run** `node --test tests/whisker-trade.test.cjs`. Expected: FAIL, "counterOffer is in whisker-isles.html".
- [ ] **Step 3: Implement** both functions. Then:
  - `tradeAccept` and `tradeDecline` use `handbackTo` instead of `S.handback=o.from`.
  - `tradeCancel` only acts when `o.from===S.cur`.
  - `tradeOffer` sets `round:0`.
- [ ] **Step 4: Run** `node --test tests/*.mjs tests/*.cjs`. Expected: all pass (107 + new).

### Task 2: Push notification for counters

**Files:**
- Modify: `worker/whisker-notify.mjs:21`
- Test: `tests/whisker-notify.test.mjs`

- [ ] **Step 1: Add tests.**
  - `moveAlerts(st({offer:{from:0,to:[1],round:0}}), st({offer:{from:1,to:[0],round:1}}), …)` returns one alert to `'a'`, with title `'Trade offer'` and body `'Tofu countered your offer'`.
  - The same state twice returns `[]`.
- [ ] **Step 2: Run** `node --test tests/whisker-notify.test.mjs`. Expected: the new test fails.
- [ ] **Step 3: Implement.** Alert when `next.offer && (!prev?.offer || (next.offer.round||0) > (prev.offer.round||0))`, using the counter body when `round>0`.
- [ ] **Step 4: Run** all tests. Expected: PASS.

### Task 3: The trading mat (shared renderer) and the trade dialog

**Files:**
- Modify: `whisker-isles.html`, the `m.kind==='trade'` branch of `modalHTML` (around line 4096), plus new CSS next to the barter CSS (around line 790)

**Interfaces:**
- Consumes: `portrait(x, mood)` (`mood` is `'win'` for the happy pose), `resIcon(r)`, `flyIcon(r, from, to, delay, land)`, `reducedMotion()` (from the Captain Whiskers work).
- Produces:
  - `tradeMatHTML({left, right, give, get, edit, leftLabel, rightLabel, mood})` returns the perched cats plus the two-sided mat.
    - `left` is a player index, and `right` is an array of up to 3 player indexes, shown with "+N" after that.
    - With `edit` true, the piles are buttons calling `G.matTake(side, r)`.
  - `matRowsHTML(hand, side)` returns the "Your cards" row (`side='give'`, capped at `hand[r]`) or the "Ask for" row (`side='get'`, capped at 9).
    - Rows call `G.matAdd(side, r)`.
  - `G.matAdd(side, r)` and `G.matTake(side, r)` edit `ui.modal.give` / `ui.modal.get` with the existing clear-the-other-side rule, then `renderOverlay()`.
    - `matAdd` flies the icon from the tapped row card to its pile unless `reducedMotion()`.
- [ ] **Step 1: Back up** to `whisker-isles.before-trade-mat.html`.
- [ ] **Step 2: Build `tradeMatHTML`, `matRowsHTML` and the `matAdd`/`matTake` actions.** Rewrite the trade branch to use them:
  - Partner chips stay.
  - Remove the `stepperRows` calls from the trade dialog only. Discard still uses them.
  - Add a polite live line: "You give …, you get …", using `describe`.
- [ ] **Step 3: Style it.**
  - `.trade-mat` is quilted, using the existing `--fw`/`--frame`/`--stitch` panel tokens, with two halves side by side down to 375px.
  - Perched cats sit on the top edge, like `.barter .captain`, with a gentle `capBob`.
  - The modal gets top margin for the perch.
- [ ] **Step 4: Check in a background browser tab** at 1440, 800 and 375 wide.
  - Pick a cat, tap 2 Fish and 1 Yarn, and take one Fish back.
  - Confirm the piles read ×1 Fish and ×1 Yarn, the live line updates, and nothing scrolls sideways.

### Task 4: Offer card, counter mat, waiting card and reactions

**Files:**
- Modify: `whisker-isles.html`:
  - `offerHTML` (around line 3968), `offerWaitHTML` (around line 3996) and `handbackHTML` (around line 3989).
  - A new `m.kind==='counter'` branch in `modalHTML`.
  - `applyRemote` (around line 3189), for the online "Deal!".

**Interfaces:**
- Consumes: `tradeMatHTML`, `matRowsHTML`, `counterOffer`, `handbackTo`, `G.tradeCounter`, `G.counterSend`.
- Produces: `ui.deal = {a, b, until}`, which drives a short "Deal!" card with both cats in the `'win'` pose.

- [ ] **Step 1: Rework `offerHTML`.**
  - Read-only mat with the sender's cat on the left and the recipient on the right.
  - Labels are "{who} gives" / "{who} gets", written from the recipient's side.
  - When `round>0`, show "{from}'s counter-offer".
  - Buttons are "No thanks", "Counter" and "Accept trade".
  - The in-person pass-the-screen step stays as it is, and so do "Your cards" and the not-enough hint.
- [ ] **Step 2: Add the counter branch.**
  - It uses the editable mat with the counterer's hand in "Your cards".
  - Buttons are "Close" (back to the offer card) and "Counter to {name}", which calls `G.counterSend()`.
- [ ] **Step 3: Rework `offerWaitHTML`.**
  - Read-only mat with the invited cats bobbing on top. Cats in `o.declined` are greyed.
  - The text is "Waiting for {names} to answer".
  - "Cancel offer" only shows when `o.from===S.cur`.
- [ ] **Step 4: Add the reactions.** Each skips its motion under reduced motion.
  - **Accept:** both perched cats swap to `'win'` and bounce, and the pile icons fly across, via `flyIcon`, before the state commits.
    - In person, `handbackHTML` shows both cats in `'win'` when its note came from an accept.
    - Online, `applyRemote` sets `ui.deal` for about 1.5s when the previous state had an offer from one of `ON.mine`, the new one has none, and `log[0]` matches `/ trades /`.
    - Also in `applyRemote`: when one of `ON.mine` was in the old offer's `to`, isn't in the new one, and `round` grew, call `toast('Trade', '{from} is countering')`.
  - **No thanks:** the recipient's cat gets `.turn-away` (scaleX(-1) plus a droop) for about 450ms before `tradeDecline()` commits.
  - **Counter:** the countering cat gets a `.hmm` head-tilt as the mat opens.
- [ ] **Step 5: Run** `node build-game.mjs` and `node --test tests/*.mjs tests/*.cjs`. Expected: the build is OK and all tests pass.
- [ ] **Step 6: Check in a background tab, in person with 3 cats.**
  - Ann offers to Bob and Cat.
  - Bob counters, and Ann sees the pass-the-screen card first, then "Bob's counter-offer".
  - Ann counters back, and Bob accepts.
  - Confirm resources moved correctly, the hand-back goes to Ann, and Cat never saw the counter.
  - Then repeat with Ann declining Bob's counter: no hand-back card should show.
- [ ] **Step 7: Check online** against the local worker (`whisker-game-worker` preview config), with two tabs. Run offer → counter → accept, and confirm the sender's tab shows "Deal!" with the happy cats.
