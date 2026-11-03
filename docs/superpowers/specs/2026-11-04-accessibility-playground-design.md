# Accessibility playground, visitor routing and Classic Portfolio

Status: draft for Jessy's approval. Nothing here is built yet.

## Why this exists

Visitors to jessyux.com should come away thinking Jessy is an inclusive and thoughtful designer. The playground proves it by letting them change the site and see the reasoning behind each setting. The reference is the accessibility playground on samsiman.com.

A quick first-visit question also sends different visitors to the most useful place: design hiring, PM hiring, team building, or fellow designers.

## Goals

- A live accessibility playground across About me, Recommendations and the case studies.
- Two portfolio styles: **Personality Portfolio** (the current beach) and **Classic Portfolio** (a clean look that follows samsiman.com).
- Light and dark versions of Classic Portfolio, with the choice in the playground.
- A first-visit "What brings you here?" screen with four routes.
- A new PM case study based on `/pm`, with nothing specific to Karmo.
- A shared wall where fellow designers can type or draw a message in the sand.
- All of it on a separate version that Jessy can compare, then merge or leave apart.

## Non-goals

- No 1999 "time machine" mode. That's Sam's signature.
- No new design showcase page. Design hiring goes straight to the beach.
- No deploy and no merge to `main` unless Jessy asks.

## What would make this a failure

- Personality Portfolio looks different from live jessyux.com at default settings, apart from the ducky and the first-visit screen.
- The live score implies the site is fully compliant. It only checks colour contrast and must say so.
- A fact about accessibility, such as a prevalence figure, appears without a named source. The site's existing hard rule on stats applies, so cut it instead.
- Karmo, or anything that identifies it, is left on the PM page.
- `/pm` or `/bps` change.

## Decided by Jessy

### Separate version

All work goes on its own git branch in its own folder. `main`, the uncommitted edits to `bps.html` and `pm.html`, and the live site stay untouched. Jessy decides later whether to merge. Backups of any rewritten file are kept, and results are shown in the Browser pane first.

### Personality Portfolio

The base is live jessyux.com. Local `index.html`, `dist/index.html` and the live home page were byte-identical on 4 Nov 2026. The redesigned layout in the prototype is not used.

The only addition is a yellow ducky floatie in the water that opens the playground. Jessy chose ducky 3, the open ring with a valve. Its cutout goes in `img/floaties/` beside the other floaties, in the same format and at a similar size. Its label is "Accessibility playground".

### Classic Portfolio

A clean scrolling layout that follows samsiman.com: Outfit typeface, rounded cards, pill buttons, normal header navigation. It removes the beach, water, fish, floaties and 3D Jessy characters.

It has dark and light versions, switched from the playground. Dark uses an aubergine background (`#1E1A24`) and warm cream text (`#F6EFE8`). Light is white-based, with its own tested palette rather than an automatic inversion.

### Playground controls

| Control | Options |
|---|---|
| Portfolio style | Personality Portfolio, Classic Portfolio |
| Light/dark (only shown in Classic Portfolio) | Light, Dark |
| Text size | Default, Larger, Largest |
| Contrast | Standard, High |
| Motion | Full, Calm |
| Spacing | Standard, Roomy |
| Typeface | Site default, Lexend, Atkinson Hyperlegible |
| See it through someone's eyes | Off, Low vision, Deuteranopia, Protanopia, Blue-yellow, Keyboard only |

### First-visit screen

A skippable screen over the beach asks "What brings you here?"

| Answer | Where it goes |
|---|---|
| I'm hiring a senior designer | Straight to the beach home page, with its floaties leading to the design case studies |
| I'm hiring a product manager | The new generic PM case study |
| I'm building or fixing a team | A consultation message |
| I'm a fellow designer | A short hello that points to the accessibility playground and the work |

### Generic PM case study

A new file based on `pm.html`. It keeps Jessy's career story, the uMeds results and the way of working. It removes the Karmo slide and anything that identifies Karmo. `/pm` and `/bps` stay as they are.

### Messages in the sand

The fellow designer route lets visitors write Jessy a message in the sand, by typing or by drawing with a mouse or finger. Messages save and appear to everyone instantly, with no approval step. Jessy chose this knowing that drawings can't be automatically filtered and that unpleasant content could be seen before she removes it.

## My calls, for Jessy to check

**Prototype choices she has seen**
1. Each control has a one-line note on who it helps. The intro line and notes are drafts in Jessy's voice.
2. A live score shows the WCAG level and the lowest contrast, with the checks expandable. Personality will show AA, not AAA, because of the teal rotating word on sand (3.4:1, Jessy's existing decision). It stays visible as an honest trade-off. The score reads the real colours of the page in view and says photo backgrounds aren't fully measured.
3. Typeface options add Atkinson Hyperlegible alongside Lexend.
4. Eye simulations affect the page, not the panel, so the controls stay usable. Keyboard only turns the mouse off on the page, and Esc turns it back on.

**New choices**
5. **Scope of the ducky:** it appears wherever the floaties do, including the beach home. Settings also apply to the beach home so nothing resets when moving between pages.
6. **Sand titles:** stay images at default settings. They switch to real text in Gabarito when text size, typeface or contrast changes, because images can't respond to those settings.
7. **Motion:** Calm stops the water at a still frame and turns off the fish, bobbing, dive transition, rotating word and reveal animations, with all content still visible. The visitor's device setting still wins.
8. **High contrast in Personality:** solid colour replaces the photo backgrounds behind text.
9. **Classic theme:** follows the visitor's device setting first, then their choice. The Light/dark control is in the playground, with a matching shortcut in the Classic header. The two stay in sync.
10. **Classic content:** comes from the same data as the beach (`TIMELINE`, `RECS`, case study files), so the two can't drift apart. The beach's WebGL and animation stop running while Classic is on.
11. **Classic home:** About me is the landing page, since there's no beach to land on.
12. **Case studies in Classic:** keep their content and order. Depth readings, the side depth map and the changing water background are replaced by a plain scrolling page with one background.
13. **Remembering settings:** saved on the visitor's device, shared between the home page and the case study frames, updated live. If storage is blocked, the site works normally and forgets on leaving.
14. **First-visit screen:** shows once per visitor, on the home page only, and not on direct links to `/pm`, `/bps` or the new PM page. It has a visible Skip, works by keyboard, and keeps focus inside until dismissed. A way back to it sits in the playground panel ("Change what brought you here"). Wording: "I'm hiring a senior designer", "I'm hiring a product manager", "I'm building or fixing a team", "I'm a fellow designer".
15. **Consultation message:** a panel on the first-visit screen, with no invented services or prices. Draft: "Building a team or fixing one? I'd be glad to talk through what's getting in the way. Send me a note about where things are at and we can work out whether I can help." Buttons: Email Jessy (the existing `jessyuxer@gmail.com`), LinkedIn, and Back to the beach.
16. **PM page address:** `product-manager.html`, served at `jessyux.com/product-manager`. Only the first-visit screen links to it.
17. **PM page base:** the committed `pm.html`, which matches what's meant to be live, not the uncommitted "surf" edits. Those stay on `main` for Jessy to finish. If she wants them included, they get brought across deliberately.
18. **PM page edits:**
    - Remove the "Why Karmo" slide with its three Karmo sources, and the styles tied to it.
    - Rewrite the last slide as "In a new role, I'd start by measuring the current journey", keeping the five habits with the My Karmo wording made general. The closing line becomes a general invitation to talk.
    - Renumber slide footers from 13 to 12.
    - Update the title and metadata.
19. **Playground on the PM page:** the whole playground applies, because it's a case study. Slides may grow past one screen at larger text sizes rather than clip. Classic replaces its water and depth styling. `/pm` and `/bps` don't get it.
20. **Mobile panel:** a bottom sheet on phones. All new UI works at 390px wide with no sideways page scroll.
21. **Fellow designer message:** a panel on the first-visit screen, in the same format as the consultation message. Draft: "Hello, fellow designer. Have a poke around. The accessibility playground shows how I think about inclusive design, and I'd love to swap notes." Buttons: Write in the sand, Open the playground (goes to the beach and opens the panel), See the work (goes to the beach), and LinkedIn.
22. **Where sand messages live:** on their own sand screen, reached from the fellow designer route and from the playground panel ("Messages in the sand"). They don't appear on the beach home, About me or the case studies, so recruiters only see them if they go looking, and Personality stays as it is live.
23. **Writing a message:** a Type or Draw choice on the sand. Typed text is up to 140 characters and uses a handwritten font with a pressed-into-sand effect, matched to the "Hi, I'm Jessy" hero lettering (Jessy's request). It stays real text. The Typeface setting overrides it, so Lexend or Atkinson readers still get their choice. The sand titles' text fallback (call 6) stays in Gabarito, because it only appears when someone has asked for easier reading. Drawings are stored as pen strokes, with limits on stroke count and length. An optional first name, up to 30 characters. A line above the Post button says messages are public and shouldn't include personal details.
24. **Accessibility of messages:** typing is a full alternative to drawing, so nobody needs a mouse. Typed messages are real text for screen readers. Drawings are announced as "Hand-drawn message", with the name if given. Calm motion shows drawings finished, without a writing animation. High contrast swaps the sand photo for a solid background.
25. **Safeguards that still allow instant posting:**
    - A limit on posts per visitor per hour, using a hashed address that can't be read back and is not kept long-term.
    - Hidden spam trap and maximum sizes checked on the server.
    - A word filter on typed text and names, which blocks a post rather than holding it for review.
    - A private removal page for Jessy, protected by a secret, so one message can be deleted quickly. Removing a message is permanent, and only she can do it.
    - The wall shows the newest 100 messages.
26. **How it's stored:** a small Cloudflare Worker with a D1 database on Jessy's existing Cloudflare account, handling only `/api/sand`. Everything else stays static. Creating the database and setting the secret are done only with her go-ahead, at deploy time. Local testing uses a local database and never touches the live site.
27. **When saving fails, or on Netlify:** Netlify publishes the same folder but has no Worker. The sand screen says messages can't be saved right now, and keeps what the visitor wrote on screen rather than losing it.

## Left to the builder

- How the shared playground code and styles are organised, and how settings reach the case study frames.
- Exact light palette and high-contrast values, as long as body text reaches AAA and every text colour reaches at least AA.
- How the ducky fits the existing floatie layout at each screen size, without moving the others more than it needs to.
- Build script updates, so `build-home.mjs` and `redesign-2026/build.mjs` ship the new files and `dist/` is still never hand-edited.

## How we'll know it's done

- At default settings in Personality, each view matches live jessyux.com side by side, apart from the ducky and first-visit screen.
- Each control visibly works on About me, Recommendations, all three case studies, the PM page and in both Classic themes, separately and in combination. The tightest case to check is Largest text, Lexend and Roomy together.
- Settings persist across pages, reloads and in and out of the case study frames.
- Keyboard: every control, the first-visit screen and the ducky can be reached and used, with visible focus.
- Device reduced-motion setting is respected in every style.
- Phone width: 390px with no sideways page scroll, in both styles at Largest text.
- PM page: a case-insensitive search for `karmo`, `eagers`, `simplr` and vehicle or car-subscription wording returns nothing, and every remaining figure still has its source.
- `/pm` and `/bps` are byte-identical to their versions on `main`.
- Sand messages: typed and drawn messages (mouse, touch) post, survive a reload and appear in a second browser instantly. Limits are enforced by the server, not only in the page. Blocked posts explain why. The removal page refuses anyone without the secret, and removal works. Typing and posting work with a keyboard alone.
- No console errors. Each page is shown in the Browser pane for Jessy to review.
