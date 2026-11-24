# Cat Emotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap, hiss or groom any cat from its pop-up, with fal flip-book art, a notification to the target's owner, and no game effect.

**Architecture:** `S.emote = {id, from, to, kind}` rides in game state. Each client plays an emote once per new `id` by flipping the target avatar through two recoloured poses. The worker alerts the target's device when `emote.id` changes.

**Tech Stack:** single-file `whisker-isles.html`, `worker/whisker-notify.mjs`, fal image edit, node tests.

**Spec:** `docs/superpowers/specs/2026-11-24-cat-emotes-design.md`

## Global Constraints
- Kinds are exactly `tap`, `hiss`, `groom`. Cooldown 4000 ms per sender. Animation about 1400 ms. Reduced motion: one still pose, no bounce.
- Works in person and online. No effect on game rules, score or log.
- Back up `whisker-isles.html` before editing. Never delete backups. Show the ginger art in the Browser pane before generating other breeds.
- Art names: `cat-<breed>-<kind>-1`, `cat-<breed>-<kind>-2`.

## Review Focus
- A sender spamming the buttons inside the cooldown plays and notifies once.
- An emote on your own cat plays but sends no notification.
- A reconnect or reload does not replay an old emote (`id` already seen).
- A breed with no emote art yet falls back to the plain cat with the bounce only.
- A cat with no collar match in an emote pose keeps its base colours, never a broken image.

---

### Task 1: Rules and notification (pure, tested)
**Files:** Modify `whisker-isles.html`, `worker/whisker-notify.mjs`; Test `tests/whisker-emote.test.cjs`, `tests/whisker-notify.test.mjs`
**Interfaces:**
- Produces: `emoteMake(from, to, kind, id) -> {id, from, to, kind} | null` (null for an unknown kind); `emoteReady(lastAt, now) -> boolean` (true when `now - lastAt >= 4000`); `emoteIsNew(seenId, emote) -> boolean`.
- Worker: `moveAlerts` adds a payload `{title:'Whisker Isles', body:'<from> <tapped|hissed at|groomed> you'}` for the target seat's pid when `next.emote.id` differs from `prev.emote.id`, `to !== from`, and the target seat has a pid different from the sender's.
- [ ] Step 1: write failing tests: `emoteMake` rejects `'bite'`; `emoteReady(0, 3999)` is false and `(0, 4000)` true; `emoteIsNew` false for the same id; worker test for each of: new emote alerts the target, same id alerts nobody, self-emote alerts nobody.
- [ ] Step 2: run `node --test tests/*.mjs tests/*.cjs`. Expected: new tests FAIL.
- [ ] Step 3: implement the three functions (pull them in tests with the `new Function` pattern in `tests/whisker-trade.test.cjs`) and the worker rule.
- [ ] Step 4: run the suite. Expected: all pass.
- [ ] Step 5: commit.

### Task 2: Ginger art (fal) and approval
**Files:** Create `assets-source/emotes/`; Modify `ART_FILES`/`ART_DATA` handling in `whisker-isles.html`
- [ ] Step 1: edit the base ginger picture with fal into `tap-1/2`, `hiss-1/2`, `groom-1/2`, same size and framing as `cat-ginger`, transparent background, same outline style. Save sources in `assets-source/emotes/`.
- [ ] Step 2: add them to the art table as webp. Show a contact sheet in the Browser pane and wait for the user's OK on the look.
- [ ] Step 3: commit.

### Task 3: Recolouring the emote poses and the avatar animation
**Files:** Modify `whisker-isles.html`
**Interfaces:**
- Consumes: `catMasks(bid, variant)` (variant is `false`, `true` for happy, or an art suffix string such as `'groom-1'`), `tintedImg`, `playerArt`.
- Produces: `playerArt(x, 'groom-1')` returns the recoloured pose when the art exists, otherwise the plain cat.
- [ ] Step 1: generalise the `win` flag of `catMasks`/`tintCat`/`tintedImg` into an art suffix, keeping happy as `'win'`. Emote poses use the same collar-by-colour search as the happy pose.
- [ ] Step 2: add `ui.emotes[i] = {kind, t}` and `playEmote(emote)`, which flips the target avatar through pose 1 and pose 2 with a bounce for 1400 ms, and one still pose when `reducedMotion()`.
- [ ] Step 3: verify in the browser that all ten breeds recolour (ginger first), including a grey cat.
- [ ] Step 4: commit.

### Task 4: Pop-up buttons, state and notify
**Files:** Modify `whisker-isles.html` (`catPopHTML`, `G`, `applyRemote`)
- [ ] Step 1: three buttons in `catPopHTML`, disabled for the rest of the cooldown. `G.emote(to, kind)` sets `S.emote = emoteMake(...)`, commits, and plays it locally.
- [ ] Step 2: `applyRemote` plays an emote when `emoteIsNew(ui.emoteSeen, S.emote)`; for a target that is mine and not the sender, `toast('Whisker Isles', '<from> <verb> you')`. Set `ui.emoteSeen` on first load so a reload never replays.
- [ ] Step 3: verify in person and with two online tabs (localhost and 127.0.0.1).
- [ ] Step 4: run the suite, commit.

### Task 5: Remaining nine breeds
- [ ] Step 1: generate the other nine breeds the same way as the approved ginger set. Check contact sheets.
- [ ] Step 2: add them, rebuild with `node build-game.mjs`, run the suite, verify one recoloured cat per breed plays each emote.
- [ ] Step 3: commit. Deploy only when Jessy says so.
