# Cat emotes: tap, hiss, groom (design)

## Intent
Let players poke at each other's cats for fun. No effect on the game. The cat's owner is told.

## Goals
- Three emotes on any cat: **Tap** (startled blink), **Hiss** (arched back, bared teeth), **Groom** (licking a paw).
- Cute fal-made art that keeps each cat's own collar colour.
- Works in person and online. The other player is told, including with a push notification when away.

## Non-goals / anti-goals
- No game effect, no score, no log spam, no sound-on-spam. A feature that lets one player annoy another endlessly is a failure, so there is a cooldown.

## Approaches considered
- **A. Flip-book stills from fal, recoloured in the browser** (chosen). Recolouring already works on stills, the same way the happy face does.
- B. fal video per breed. Can't be recoloured, so collars would lose their colour.
- C. One shared overlay effect. Cheapest, least cute.

## Design
- **Art:** per breed, per emote, 2 poses made by editing the base cat picture with fal (`cat-<breed>-<emote>-1`, `-2`). 10 breeds x 3 emotes x 2 poses = 60 images. Make **ginger first** for approval of the look, then the rest. Recoloured through the existing `catMasks`/`tintCat` with the same collar detection used for the happy pose.
- **UI:** the cat pop-up (`catPopHTML`) gets three buttons. Anyone can target any cat, including their own (self-groom is cute, no notification).
- **Animation:** the target's avatar flips through the two poses with a small bounce, about 1.4 s, then returns. Honours reduced motion (a single still pose, no bounce).
- **State:** `S.emote = {id, from, to, kind}` travels with the game state. Each client plays an emote once per new `id`.
- **Notify:** online, the target's owner gets a toast ("Bo groomed you"). `worker/whisker-notify.mjs` also sends a push when the target's seat is another device and the emote id is new. In person, it plays on screen only.
- **Cooldown:** 4 seconds per sender, client side; the buttons show as resting.
- **Tests:** pure rule for the cooldown and for who gets notified, plus a worker alert test.

## Left to the builder
Exact wording of the toast and push, pose prompts, bounce timing.
