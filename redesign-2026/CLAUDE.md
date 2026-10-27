# jessyux

Portfolio site for Jessica Chappell. Product designer and product manager at Montu
(uMeds ordering and fulfilment, FSC and OEX squads). Currently targeting mid-level
Product Manager and senior product design roles.

**Live site:** jessyux.com, served by Cloudflare Workers from `../dist`
(see `../wrangler.jsonc`, `assets.directory`). Netlify publishes the same folder.

**This folder** holds the redesigned case studies. It builds into `../dist/redesign/`,
so it deploys to **jessyux.com/redesign/** alongside the current site without touching it.

## DIRECTION CHANGE, 27 Oct 2026, read this first

The home page is NOT being replaced. Jessy's existing `../index.html` stays: a single
non-scrolling view with WebGL shader water, floaties as navigation, ripples on
interaction. That page already carried the dive metaphor ("tap a floatie to dive in"),
so it is the surface and it stays the surface.

What changes instead:

- The water shader is recoloured from navy and purple to sunlit beach shallows.
  Done. **Promoted on 27 Oct 2026: `../index.html` is now the beach version.** The previous
  home page is kept as `../index.pre-beach.html`. The uMeds floatie opens the new HTML study
  (`work/multi-shipping-options.html`) in an iframe; Westpac and Circuit open their rewritten
  HTML studies the same way (see "other two case studies" below). **`work/multi-shipping-options.html` is the one main uMeds study.**
  Earlier versions are kept, not deleted: `work/multi-shipping-options.before-rewrite.html`
  (backup of the original copy, always keep), `../archive/case-study-dive/` (the first
  standalone version, archived 27 Oct 2026) and the original inline study in `../index.old.html`.
  `../case-study-versions.html` shows them side by side.
- Typography: Gabarito for every title (home and case studies), Hanken Grotesk for body, IBM Plex Mono for readings and sources.
- The purple gradient on "move real numbers" becomes coral to pink, matching the floatie.
- Clicking a floatie descends. Each destination gets its own depth, so the dive happens
  between pages rather than down a scrolling home page.

**The scrolling home-page draft that lived in this folder is archived** at
`../archive/redesign-index-vertical/index.html` (not deleted). Case study Home links, the top
nav and the Recommendations card point to `../../index.html`, the beach home page. To change
the home page, edit `../index.html`.

**Deploy:** run `node build-home.mjs` in the project root, then `node redesign-2026/build.mjs`,
then `npx wrangler deploy`. The first copies the home page and only the images it uses into
`dist/`; the second builds the case studies into `dist/redesign/`, where the home page's
uMeds frame loads the study from. Netlify runs both through `netlify.toml`.

### Depth per destination

| Tap | Depth | Water |
|---|---|---|
| About me | 200 m | Still lit, kelp and reef |
| Recommendations | 600 m | Twilight, a school of fish |
| Westpac Youth | 1,000 m | Twilight floor |
| Circuit admin | 6,000 m | Abyssal |
| Multi shipping options | 10,994 m | Trench |

### Where the beach colours live

Five `vec3` constants in the fragment shader in `../index.html`, plus
`#poolwrap{background}`, `--bg`, and the two CSS grid patterns. They are the whole
water palette. Changing the water means changing those, not swapping an image.

### Shoreline theme (home page)

Titles, Jessy's pick (7 of `../fonts-explore.html`): every title on `../index.html`
(hero, section headings, timeline roles, popup, recommendation names) is Gabarito, 800 for
h1/h2 and 700 for h3 and card titles, tight tracking, with a soft white highlight under titles
on sand. Body stays Hanken Grotesk and numbers stay Plex Mono. The case studies in this
folder use it too (set once in `assets/css/tokens.css`, `--display`). Run `node build.mjs` before deploying. `fonts-explore.html` can be deleted.

`../index.html` ends its `<style>` with a "Shoreline theme" block. It sets the home
page's tokens to match `assets/css/tokens.css`, so home and the case studies read as one
site. The legacy names (`--accent`, `--surface`, `--g-*`) are kept as aliases of the new
tokens, so older rules pick up the theme without being rewritten.

- **One UI accent:** `--glow` teal. On sand it darkens to `--kelp` `#0A6354` for contrast.
  `--signal` amber stays reserved for misses. The old hot pink and purple are gone from
  the UI. Pink lives only in the 3D floatie art.
- **Type:** Gabarito for headings. The home page uses 800 for h1/h2 and 700 for h3; the case
  studies are lighter (600 for h1/h2, 500 for h3/h4 and the key numbers), tight tracking, no gradient text. Hanken 350 body,
  Plex Mono only for numbers: dates, counts, depths.
- **Two element families:** plates are deep water (`--plate`, hairline border, 4px
  corners): cards, timeline, icon links, modal. Pills are things that float: floatie
  tags, hint, home button. Don't mix the two.
- **Depth on the floatie tags:** on the surface view each tag shows how deep that
  destination dives (the Depth per destination table above). Hidden in the compact
  rows. Keep the two in sync.

### Picture style: 3D vinyl toy

All home page imagery is moving to one material: glossy soft PVC vinyl inflatables with
puffy edges, heat-sealed seams, thin white stripe bands and a tiny air valve, lit from
the top left. The palette is the theme's: coral `#FF7B6E`, flamingo `#F48FB1`, mint
`#5EF2C8`, kelp `#0A6354`, sky `#6FD0FF`, sand `#F3E3C6`.

- Floatie icons (home, uMeds, Westpac, Montu admin, recommendations) are done. Sources
  are in `../img/floaties/`, inlined as data URIs in `../index.html`. Made with
  `fal-ai/nano-banana-2`, each old icon passed in as the shape reference, then cut out
  with birefnet. Floatie waterline sits at 84% so the toys ride high.
- The beach is `#shore`, a full-width shoreline image (`../img/shore-beach.webp`, from
  `fal-ai/nano-banana-2`, source in `../img/vinyl-examples/shore-beach.png`): dry sand under
  the hero text, wet sand, foam, then shallows. A CSS mask fades its bottom edge into the
  reef water. The fit script sets its height from the hero text. Keep dry sand bright so the
  dark ink stays above 4.5:1. Exception, Jessy's call: the rotating hero word is bold `#078A72` on the sand (about 3.4:1, below AA) because the About me mint is unreadable there. The old SVG blob is gone. Starfish and shells sit in
  `#beachdeco` on the dry sand; check them if the image changes.
- About me has its own beach: `#abpan` in `#palmsbg`, using `../img/about-beach.webp` (fal
  `nano-banana-2`, sources in `../img/vinyl-examples/about-flat-1*.png`). Sand with palm
  shadows on top, a thin shoreline lower down. The image is tiled with a mirrored copy and
  extended upward so it always reaches the top, and a small script pans it in step with the
  horizontal scroll of `#v-about`. `#palmsbg` is masked away at the bottom so the same
  shader water as the index page (`#poolwrap` in bar mode: reef, shader, fish) shows where
  the floaties float. Corals are deliberately faint there. Text on that scene uses the dark
  ink and `#078A72` rotating word, and the plates are near-solid deep water.
- About me elements follow the sand: cards, buttons, photo frame, status chip and the
  experience popup are warm paper plates (`--paper`, hairline warm border, soft warm shadow)
  with dark ink and kelp-teal `#078A72` accents. Floatie tags stay dark because they sit in
  the water. No fish and no corals in About me: `#fish` is hidden there, the panorama water
  is plain (corals edited out on fal, source `../img/vinyl-examples/about-nocoral-1.png`),
  and the bar's reef layer shows only the clear top of the reef image. The 3D Jessy drop shadow
  is warm and unmasked there, so it does not clip into a box.
- Depth order, back to front: reef (`#poolwrap::before`, darkened, blurred, desaturated so
  it reads deeper) > fish canvas (tinted with the water colour) > shader water > floaties.
  Floaties have no drop shadow on the masked image (the waterline mask clipped it into a
  box); their shadow is the unmasked `.shadow` ellipse.
- Reef backdrop is `../img/reef-topdown.webp`: a straight-down view with small vinyl coral
  colonies, so camera angle and scale match the beach. A depth gradient is laid over it in
  `#poolwrap::before` (clear next to the shore, deeper teal lower down). Earlier angled
  versions (`reef-vinyl*`) are kept in `../img/vinyl-examples/` but unused. Swimming fish are
  sprites from `../img/vinyl/fish-*.webp` on the `#fish` canvas; they face left in the files
  and the canvas flips them to stay upright. The canvas samples the shore image to find the
  water's edge per column and turns fish back before they reach the foam, so keep the shore
  image's water a clear turquoise (the sampler looks for blue over red). Sand starfish and
  shells use `../img/vinyl/starfish|shell-*.webp`. `img/beach/` holds the earlier flat
  stickers, now unused.
- `<body data-max-depth="1200">` caps how deep that page goes. Omit for a full dive.
- Each `<section data-depth="N">` declares the depth **at its top**. `dive.js`
  interpolates between them as you scroll and extrapolates to max over the last one.
- Eyebrows show the depth range and the section name only, no zone names (no "Epipelagic",
  "Twilight" and so on). The study ends with Previous / Next cards (`nav.pn`, `data-nav`):
  Previous is Home for uMeds, Next is Westpac Youth. In the home page's frame they post to the parent.
- Give each depth section a `data-title="..."`. The side map (`#rail`) shows the title of the
  section you are in under the depth reading (falls back to the zone name if missing). The map
  also has a **Home** button at its top (`#railHome`); inside the home page's frame it posts
  `{jux:'home'}` to the parent, on its own it links to `../index.html`.
- In the home page's frame (`html.embed`) the page's own nav and native scrollbar are hidden;
  the home page also hides the scrollbar in the old inline studies. Scrolling still works.
- `.rv` fades an element up once. `[data-draw]` triggers chart fills and line draws.
- `[data-count]` counts a number up once. `[data-float="0.05"]` adds parallax.
- `#chain` plus `#track` is the horizontal scroll-jack. It only engages above 900px.

---

## Hard rules

**Stats.** Never publish a number without a named source. Every case study ends with a
numbered References list and every chart carries a `.src` line pointing at it. Modelled
or estimated figures must say so in the same sentence. If a source cannot be found, cut
the number rather than approximating.

**Patient-facing copy.** The term "medical cannabis" must not appear anywhere in
patient-facing material. TGA regulated. Case study screens have product names masked
already. Flag anything patient-facing so Jessy can check the compliance language.

**Confidential material.** Montu internal screens, participant data and admin UIs are
de-identified. Keep it that way. Do not add a figure from an internal doc that is not
already in the published case study.

**Voice.** Lead with the point, then the context. Short and scannable. No em dashes.
Never use: "I was hoping", "just wanted to", "circling back", "as I mentioned",
"Hey [name]", or "Also" as a sentence connector. Sound like a smart colleague who has
done the homework, not a consultant.

---

## Design constraints

- **Single theme, on purpose.** Deep water only. There is no light mode. Every colour is
  set explicitly and `color-scheme: dark` is pinned on `:root`.
- **Type:** Gabarito (display, playful rounded sans), Hanken Grotesk (body), IBM Plex Mono
  (depth readings, data labels, sources). Mono carries the instrument-panel feel. Keep
  all three roles distinct and do not add a fourth face.
- **Accent discipline:** `--glow` teal is the win and the primary accent. `--signal`
  amber is reserved for misses, targets and warnings. `--beam` blue is the second data
  series. Do not use them decoratively.
- **Complete at rest.** Everything readable must be visible without scrolling to trigger
  it. Reveals animate from a visible resting state, and `prefers-reduced-motion`
  disables motion while keeping all content.
- **Phone width.** Must work at 390px with no horizontal page scroll. The column chart
  flips to horizontal bars under 700px. The chain stacks under 900px.

---

## Open decisions

1. **Where the playful brand goes.** The old site was pool floaties and 3D Jessy
   characters. The dive direction keeps the water but is much more serious. Right now
   only the pool-ring character survives, in the hero at the waterline. Decide whether
   to bring more of the 3D character work back into the deeper sections or let the work
   carry it.
2. **Home page depth range.** Home currently stops at 1,200 m so it stays bright and
   readable for recruiters. The alternative is a full descent on the home page too,
   which is more dramatic but makes the contact section nearly black.
3. **The other two case studies.** Done on 27 Oct 2026. `work/westpac-youth.html` and
   `work/admin-redesign.html` are rewritten in first-person story form in the uMeds format and
   open from the home page through `NEW_CASE`. Images were extracted from `../index.old.html`
   into `assets/img/case/westpac/` and `case/circuit/`. The old stubs are kept as
   `work/*.stub-backup.html`. The Westpac 90-day numbers are labelled illustrative, as in the
   source, and the Circuit hours-saved figures are labelled as a modelled estimate. Circuit's
   Next card posts `recommendations` to the home page.
4. **The chain section.** Currently cards sliding sideways. It could instead light each
   link in sequence and dim the previous one, which would land the "no one owns it end
   to end" point harder.
5. **Pocket-Sized Me and the full timeline.** Dropped from this draft. Decide whether
   they return as a section or as a separate page.

---

## Content sources

Case study figures come from Montu internal documents, listed per study:

- SDD Portfolio Snapshot, Montu Product Analytics, 12 Jun 2026
- SDD Impact Tracker, 12 Jun 2026
- SDD Churn Infographic
- Survicate discharge survey (script-release reasons)
- Google Looker, uMeds Post Delivery NPS, CSat and Awaiting Collection / Delivery Attempted
- Q2 2025 Shipping Options: Data and Insights (FigJam), 7 de-identified participants

Recommendations: 15 on LinkedIn at linkedin.com/in/jessyux. Names and roles are in the
old `index.html` `window.RECS` block alongside the avatar images.

## Dive transition

Entering a case study from the beach, About or Recommendations plays a dive in `../index.html`: a foam-edged water layer (`#dive`) rises over the screen, deepens to navy with light rays and bubbles, then fades to reveal the study. Leaving a study plays it in reverse as a surfacing. Code: the "dive transition" CSS block and `dive()` in `../index.html`, called from `go()`. It is skipped for `prefers-reduced-motion`.
