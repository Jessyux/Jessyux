# Trade with a cat: the trading mat

## Why
Trading with another cat should feel fun and interactive, like Barter with Captain Whiskers. Today it is a plain form: a row of portrait buttons and two columns of +/- steppers.

## Goals
- The cats are on the dialog. Your cat sits on the top-left edge and the cat you trade with sits on the top-right, facing each other.
- Building an offer feels like laying cards on a table, not filling in a form.
- Cats react: both are happy when a deal is made, and the other cat turns away on "no thanks".
- It works the same in person (hot-seat) and online.

## Non-goals
- No change to trade rules, the "No trades with me" switch, or who a first offer goes to.
- No new fal art. The existing breed portraits (`cat-<breed>`, `cat-<breed>-win`) are used.

## Anti-goals
- Nothing hints at a cat's hidden cards. No cat reacts while you build an offer, and the in-person "pass the screen" step still hides cards until the cat taps.

## Approaches
- **A. Same controls, cats on top.** Keep the steppers and add the cats and animations. This is the smaller change, but the form feel stays.
- **B. A trading mat (picked).** As A, plus the middle becomes a quilted mat with your side and their side. You tap resource cards to stack them in piles. The offer card uses the same mat.
- Dropped: invited cats nodding or shaking their heads while you build. It would leak what they hold.

## Design
**Trade dialog (your turn)**
- The heading is "Trade with a cat".
- Partner chips: the same choice as today, one or several cats; with 2 players the other cat is picked automatically. The top-right perch shows the picked cat. With several picked they overlap, up to 3, then "+N".
- The mat has two halves:
  - Left, "You give", sits under your cat.
  - Right, "You get", sits under theirs.
  - Each half shows piles of resource cards: card art with a ×N count.
- Below the mat are two tap rows:
  - **Your cards:** your hand with counts. Tap one to add it to your pile. It is greyed out when you have none left.
  - **Ask for:** all 5 resources. Tap one to add it to their pile, up to 9.
- Tap a card in a pile to take one back.
- The same resource can't be on both sides: adding it to one side clears it from the other, as today.
- A card flies from the row to the pile when added.
- Buttons are "Close" and "Offer to Bob" (or "Pick a cat").

**The offer card (the other cat)**
- In person, "Pass the screen to Bob" comes first, unchanged, and no cards show until Bob taps.
- Then the same mat shows, read-only:
  - The sender's cat is top-left and Bob's cat is top-right.
  - "Bob gives" and "Bob gets" are written from Bob's side.
- Bob's own cards stay listed below in person, as today, and the "not enough" hint stays.
- Buttons are "No thanks", "Counter" and "Accept trade".

**Counter-offers** (added at Jessy's request)
- On "Counter", the mat becomes editable from the countering cat's side, with their own hand in "Your cards". The piles start from the offer they got, so they only tweak it. The send button reads "Counter to Ann".
- A counter goes only to the other cat in the deal. If the first offer went to several cats, the others drop out: online their offer card closes with "Bob is countering", and in person they never see it.
- Whoever gets a counter sees the same offer card, with "No thanks", "Counter" and "Accept trade".
- It can go back and forth with no cap. Either cat ends it with "No thanks", and the turn's cat can still withdraw.
- Every round in person starts with "Pass the screen to …", which keeps cards hidden until the cat taps.
- Online, a counter sends a push notification: "Bob countered your offer".
- The countering cat tilts its head ("hmm") as the piles slide into their new counts.
- A round line on the card, e.g. "Bob's counter-offer", shows it isn't the first offer.

**Waiting (online sender)**
- The mat is read-only with the invited cats on top, gently bobbing, and "Waiting for Bob to answer".
- Cats that said no turn grey.

**When it resolves**
- **Accept:** both cats swap to their happy pose and bounce, and the piles fly across the mat to each other. The dialog then closes.
  - In person, the "pass the screen back" card shows both cats happy.
  - Online, the accepting cat sees the full animation. The sender's waiting card shows the happy cats and "Deal!" for about 1.5s before it closes.
- **No thanks:** the other cat flips to face away and droops, then the dialog moves on, as today.

**Access and motion**
- Piles and cards are buttons with labels like "Take one Fish back from what you give".
- A polite live line sums up the offer, e.g. "You give 2 Fish, you get 1 Yarn".
- With reduced motion, nothing flies or bounces.

## Left to the builder
- The exact mat colours and stitching (following the cosy theme tokens), the card sizes and the phone layout. The two halves stay side by side down to 375px wide.
- Back up first as `whisker-isles.before-trade-mat.html`. Keep the trade state shape (`give`, `get`, `partners`, `S.offer`) so online sync and tests are unaffected.
- For counters:
  - `S.offer` gains a `round` number, and `from`/`to` flip to whoever sent the current version, with `give`/`get` from the sender's side.
  - Accept and the in-person hand-back must still return the screen to the turn's cat.
  - `worker/whisker-notify.mjs` sends the push when `round` changes, not only when an offer first appears. Add a test.
