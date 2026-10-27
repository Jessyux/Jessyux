# jessyux brand and typography guide

Use this file as the brief when you make anything new for the portfolio: slides, social images, case study art, a CV layout, a LinkedIn banner, a new floatie icon. If an asset follows this guide it will sit next to the site without looking out of place.

Source of truth in the code, if a value here ever drifts:

* `index.html` (home, About me, Recommendations): the "Shoreline theme" block and the "About me elements" block in the `<style>`.
* `redesign-2026/assets/css/tokens.css` and `base.css` (case studies).
* `redesign-2026/assets/js/dive.js` (the depth colours).

---

## 1. The idea

The whole site is one dive. The beach is the surface (0 m). Each case study goes deeper, and the page gets darker as you scroll.

* **Beach and sand:** warm, sunny, handmade. Home hero, About me.
* **Shallow water:** turquoise, rippling, sunlit. The home page water, floaties.
* **Deep water:** navy, quiet, glowing teal details. The case studies.

Everything is a toy. People, icons, fish, shells and starfish are glossy 3D vinyl or inflatable toys, as if they were photographed in a pool. Interfaces are calm and tidy so the toys can be the playful part.

Personality in three words: curious, warm, precise. The designer is a person you would enjoy working with who also sweats the numbers.

---

## 2. Colour

### Core palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Primary accent in water | Glow | `#5EF2C8` | Links, numbers, eyebrows, dots, focus rings on dark |
| Primary accent on sand | Kelp bright | `#078A72` | Links, buttons, highlighted words on light |
| Dark teal text on paper | Kelp | `#0A6354` | Small teal text on sand and paper (passes contrast) |
| Warm warning | Signal | `#FFB26B` | Misses, targets, warnings, "before" numbers. Never decoration |
| Second data colour | Beam | `#6FD0FF` | Second line in a chart, step numbers |
| Sand | Sand | `#F3E3C6` | Beach backgrounds |
| Paper | Paper | `rgba(255,247,230,.9)` | Cards on sand (solid version `#FBEFD5`) |
| Deep navy | Deep | `#03222E` | Favicon background, iframe background, darkest brand surface |
| Abyss | Abyss | `#010A12` | Bottom of the dive |
| Lagoon | Lagoon | `#06323F` | Dark panels |

The bright teal and the kelp teal are the same colour for different backgrounds. Use **Glow on dark**, **Kelp bright on light**. Do not use Glow as text on sand, it is too pale to read.

### Text colours

| On dark water | Hex |
|---|---|
| Foam (main text) | `#EAF7F8` |
| Silt (secondary text) | `#9DB9C4` |
| Faint (captions, sources, axis labels) | `#6B8E9C` |

| On sand and paper | Hex |
|---|---|
| Ink (main text and titles) | `#042B38` |
| Ink 2 (body) | `#2F5660` |
| Ink 3 (captions) | `#5D7A80` |
| Teal text on paper | `#0A5A4C` |

### Surfaces and lines

* Deep water card ("plate"): fill `rgba(3,22,34,.44)` on case studies, `rgba(3,22,34,.66)` on the home page. Border `rgba(255,255,255,.07)`, stronger rule `rgba(255,255,255,.14)`.
* Paper card on sand: fill `rgba(255,247,230,.9)`, border `rgba(120,84,40,.22)`.
* Floating pill (labels on the water): fill `rgba(3,34,46,.8)`, border `rgba(255,255,255,.14)`.

### The depth gradient

The page background changes with depth. Use these when you make a full-bleed background. Each row is the top colour and the bottom colour, as RGB.

| Depth | Zone | Top | Bottom |
|---|---|---|---|
| 0 m | Surface | 18, 106, 132 | 10, 74, 102 |
| 200 m | Sunlit | 13, 95, 126 | 7, 64, 92 |
| 1,000 m | Twilight | 7, 64, 92 | 4, 42, 68 |
| 4,000 m | Midnight | 4, 34, 58 | 2, 20, 36 |
| 6,000 m | Abyss | 2, 16, 30 | 1, 10, 19 |
| 10,994 m | Trench | 1, 8, 15 | 0, 5, 8 |

For a single static background use the 200 m to 1,000 m range (`#0D5F7E` to `#042A44`). It reads as water without going black.

Sand gradient for light assets: `#EDD4B6` to `#FAE1C1` to `#F3D9B4`.

### Partner colours

Only inside that partner's own case study, never on the site chrome.

* Westpac red `#D5002B` (the Westpac Youth floatie, the Westpac screens).
* Montu uses the teal and cream of its own rings.

### Colour rules

* One accent at a time. Teal is the accent. Do not add purple, pink gradients or rainbow. (The very first version of the site used purple and pink. It is retired.)
* Pink is allowed only in toys (the avatar's hair, the pink swim ring, the Recommendations quote marks).
* Never put Glow on a light background, or Kelp on a very dark one, unless it is a large shape.
* Text contrast must be at least 4.5 to 1.

---

## 3. Typography

Three families, all from Google Fonts. Load them like this:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gabarito:wght@400..800&family=Hanken+Grotesk:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

| Job | Family | Why |
|---|---|---|
| Titles and numbers | **Gabarito** | Round, heavy, a little bouncy, like an inflatable |
| Body and UI | **Hanken Grotesk** | Friendly and very readable at small sizes |
| Labels, depths, sources | **IBM Plex Mono** | A dive computer. Small, spaced, uppercase |

Fallbacks: Gabarito, then Hanken Grotesk, then system sans. Never use Fraunces, Inter, Plus Jakarta Sans or JetBrains Mono (older versions of the site used them).

### Weights

| Where | Titles (h1, h2) | h3, h4 | Body |
|---|---|---|---|
| Beach pages (home, About me) | Gabarito 800, tracking -0.03em, line-height 1.04 | Gabarito 700, tracking -0.02em | Hanken Grotesk 350 |
| Case studies | Gabarito 600 | Gabarito 500 | Hanken Grotesk 350 |
| Pull quotes | Gabarito 400 | | |

Case studies are lighter on purpose, so long reading does not feel shouty.

### Scale (fluid)

| Style | Size | Notes |
|---|---|---|
| h1 | `clamp(2.4rem, 6.2vw, 4.7rem)` | line-height 1.02, tracking -0.03em |
| h2 | `clamp(1.85rem, 4vw, 3.1rem)` | line-height 1.08 |
| h3 | `clamp(1.3rem, 2.3vw, 1.75rem)` | line-height 1.2 |
| h4 | `1.06rem` | line-height 1.35 |
| Lede | `clamp(1.12rem, 1.7vw, 1.32rem)` | line-height 1.52 |
| Body | `17px`, line-height 1.62 | weight 350 |
| Small text in cards | `.85rem` to `.95rem` | |
| Caption and source (mono) | `.64rem` to `.7rem` | tracking `.06em` to `.08em` |
| Eyebrow and labels (mono) | `.6rem` to `.72rem` | uppercase, tracking `.14em` to `.2em` |

### Typography rules

* Titles and headings in **sentence case**. Never Title Case, never all caps (all caps is only for mono labels).
* Titles balance their lines (`text-wrap: balance`). Keep titles to two or three lines.
* Numbers in big stat tiles are Gabarito, tabular figures, in Glow (or Signal for a bad "before" number).
* Mono labels are always uppercase and spaced. A section label reads like this: `1,000–4,000 M  BEHIND THE TAP ———` (depth range in teal, section title in faint grey, then a thin rule).
* Straight quotes only (`"` and `'`). No curly quotes. Use en dashes in ranges (`200–1,000 m`).
* On sand, titles get a soft "light on vinyl" highlight: `text-shadow: 0 2px 0 rgba(255,255,255,.55), 0 8px 16px rgba(110,72,28,.16)`.
* One emphasised word per heading at most. On dark it is Glow, on sand it is Kelp bright.

---

## 4. Shape, depth and surface

* **Corner radius:** cards and plates `14px`. Anything nested inside a card (images, icon tiles, logo tiles) `10px`. Modals `16px`. Pills and chips are fully round (`999px`). Never square cards.
* **Borders:** always one hairline. No thick borders. An accent border (`rgba(94,242,200,.5)`) only marks "current" or "win".
* **Shadows:** soft, wide and low. Dark: `0 30px 50px -28px rgba(0,10,16,.7)`. Sand: `0 18px 34px -20px rgba(110,72,28,.5)` plus a 2px white inner highlight on top. Never a hard black drop shadow.
* **Glass:** cards on water use a light blur (`backdrop-filter: blur(3px)` to `8px`).
* **Toys cast a soft ellipse shadow** on the water, not a rectangle.
* **Layout width:** content max `1060px`, reading column `68ch`, side gutter `16px`. Sections breathe: `clamp(72px, 11vw, 148px)` top and bottom.
* **Grids:** 2 and 3 column card grids with `18px` gaps. Cards in a row are always the same width and height.

---

## 5. Components

* **Plate (card):** deep-water glass, 14px radius, hairline border. Padding 22 to 34px. Contains a mono label, a Gabarito title, then body text.
* **Stat tile:** big Gabarito number in Glow, one line of description underneath. Sits in a row of equal cards.
* **Eyebrow:** the depth label above each section (see typography).
* **Chip:** a small round pill, mono text, glowing status dot (`Shipped`).
* **Floating label pill:** the label under each floatie. Hanken Grotesk 13px, weight 500, on `rgba(3,34,46,.8)`.
* **Short version card:** a wide plate. Text on the left (chip, kicker, big title, two paragraphs), a toy or phone image on the right that floats up past the top edge of the card.
* **Previous / Next cards:** two equal plates at the end of a study, mono "Previous" or "Next", title in Gabarito, a short descriptor.
* **Buttons:** round pill, one hairline, Glow text on dark, Kelp bright on sand. Text only, no heavy fills.
* **Home button:** a small round button with the house toy icon. Dark glass in a case study, cream paper on About me.

---

## 6. Motion

* Easing: `cubic-bezier(.22, .9, .3, 1)` (a quick start and a soft landing).
* Reveal: fade up 16px over 0.8s as sections enter. Card grids rise in 80ms apart. Headlines arrive word by word, 45ms apart. Numbers count up for 1s.
* Water: slow, always on, never busy. Caustic light on the home page, bubbles and light rays in the dive transition.
* The dive transition: a foam-edged wall of water rises over the screen, goes from turquoise to navy with bubbles, then fades to reveal the study. Leaving plays the reverse.
* Playful moments are earned. Personas wave when hovered or tapped. Cards do not move on hover, because they are not links.
* Everything respects reduced motion: no animation, but all content still shows.

---

## 7. Imagery

### The toy style (most important)

Every illustration is a **glossy 3D vinyl toy**. Think of a collectible figure or a pool inflatable:

* Chibi proportions: a big head, small body, simple dot eyes, a small smile.
* Smooth plastic surface with soft highlights. Soft studio lighting from the top left.
* Hair, clothes and props are chunky and simplified, with no fine fabric detail.
* Inflatables show their seams, a small valve, and a high gloss.
* Plain pure white background when you generate it, then cut it out. No floor shadow.
* No logos, no text, no brand marks on clothes (the Westpac-style shirt logo was removed on purpose).

### Prompt recipe (for fal nano-banana-2 or similar)

Always attach an existing toy as the style reference (the avatar or a floatie from `img/`). Then:

```
Use the reference image as the exact style guide: a glossy 3D vinyl toy figure,
chibi proportions with a big head, simple dot eyes, soft studio lighting, smooth
plastic surface, shown from the chest up, isolated on a plain pure white background
with no shadow on the floor. Create a NEW character: [who, age, hair, clothes, prop].
Same rendering style, lighting, framing and size as the reference.
```

For an icon or object: "a glossy inflatable pool toy in the shape of [thing], vinyl seams, a small white valve, soft studio lighting, plain flat dark navy background". Do not ask for stripes or white lines (they were removed on purpose).

Then cut the background out with `fal-ai/birefnet/v2`. Check the result over a dark teal background: pale or very dark parts (cream, dark green) can be lost. If a part goes missing, cut it by colour instead.

Export as webp, longest side about 420 to 560px for icons and 560px tall for figures.

### Characters

* **Jessy (the avatar):** straight black hair fading to pink ends, a white shirt, a pink swim ring and a drink with a lime and a yellow straw. Appears floating on the home page and pointing on About me.
* **Westpac personas:** Sophie (17, brown ponytail, white tee, phone), Liam (13 or 14, messy dark hair, blue hoodie, game controller), Emily (43, auburn mom bun, cream cardigan, coffee mug). No swim rings. Each has two waving poses for the hover.

### Floatie icons (the navigation)

Each project is an inflatable pool toy floating on the water. No white stripes.

| Floatie | What it is | Colour |
|---|---|---|
| Home | A small cream house with a coral roof and green door | cream, coral |
| uMeds | An inflatable letter U with a cream ball on top | coral red |
| Westpac Youth | An inflatable letter W | Westpac red `#D5002B` |
| Montu admin | Stacked swim rings | mint green, cream, deep green |
| Recommendations | Two inflatable quotation marks | pink |

New floaties follow the same recipe: one bold inflatable object, one colour family, no text.

### Scenery

* **Beach:** top-down real beach, soft foam line, warm sand. Starfish, scallop and conch shells as small vinyl toys scattered on the sand.
* **Water:** sunlit turquoise with moving caustic light.
* **Reef:** soft, deeper and less saturated than the floaties (so the icons lead). Corals are vinyl toys seen from above.
* **Fish:** small vinyl fish (clown, yellow, blue, puffer, mint) swimming under the water. Smaller than the corals.
* **Foam edge:** an irregular white foam line with lace and loose bubbles, never scallops or circles.

### Photography

The real photo of Jessy (a bright office with plants, white shirt, pink hair ends) sits in a cream paper frame with a 10px radius and a soft warm shadow. A small status chip overlaps the top left.

---

## 8. Logo and favicon

* **Wordmark:** `jessy` in the main text colour and `ux` in teal. Set in Hanken Grotesk, lowercase.
* **Mark:** a round "j": a solid teal circle with the letter j cut out of it, and a small teal dot above for the tittle. Teal `#078A72`, on a transparent background (`favicon.svg`). It works on light and dark tabs.
* On sand or white, use it as is. On deep navy you can use Glow `#5EF2C8` for the same shape.
* Leave clear space equal to the width of the "j" stem on every side.

---

## 9. Voice and writing

First person, plain English, curious and honest. Tell it as a story: what I found, what I did, what happened, what I would change.

* Say "I", not "we", unless it really was a team action.
* Short sentences. Concrete numbers. Show a miss as clearly as a win (the uMeds study says it missed both launch targets).
* Label estimates as estimates and illustrative numbers as illustrative.
* Headings in sentence case. No emoji. Straight quotes. Use commas or brackets instead of long dashes.
* Do not use these words: delve, underscore, highlight (as a verb), foster, cultivate, maximize, leverage, ensure, bridge, tapestry, landscape, realm, testament, synergy, hub, ecosystem, pivotal, crucial, vibrant, intricate, nuanced, dynamic, transformative.
* No "not only X but also Y", no lists of exactly three adjectives, no closing line about the future.
* Section names say what the section is ("Before", "Behind the tap", "What we shipped", "So what"). Not "Overview and Context".

---

## 10. Case study structure

Every study has the same spine so a reader always knows where they are:

1. Overview: kicker, a one-line story title, a lede, six facts (Why, How, What, Role, Team or Users, Timeline).
2. The short version: one card with the result and an image.
3. Sections at increasing depth, each starting with an eyebrow label (`0–200 m` and so on).
4. Evidence: charts, quotes, screens, stat tiles.
5. What I would change.
6. Previous and Next cards.

A depth map on the right (desktop) shows metres and the current section title. It can be dragged.

---

## 11. Do and do not

Do

* Use toys for people and objects, real photography only for Jessy.
* Keep one teal accent and plenty of space.
* Match radii: 14px cards, 10px inside, pills round.
* Keep text left-aligned on a 68ch column.
* Put a real caption or source under every chart and image.

Do not

* Use purple, hot pink gradients, neon or stock illustration.
* Use flat vector people, emoji, or stock photos.
* Put stripes, logos or text on toys.
* Make cards hover or lift when they are not links.
* Use hard shadows, thick borders or square corners.
* Set long text in the mono face.

---

## 12. Quick tokens (copy and paste)

```css
:root{
  /* water */
  --ink:#EAF7F8; --ink-dim:#9DB9C4; --ink-faint:#6B8E9C;
  --glow:#5EF2C8; --signal:#FFB26B; --beam:#6FD0FF;
  --plate:rgba(3,22,34,.44); --hull:rgba(255,255,255,.07); --hull-2:rgba(255,255,255,.14);
  --deep:#03222E; --abyss:#010A12; --lagoon:#06323F;
  /* beach */
  --sand:#F3E3C6; --paper:rgba(255,247,230,.9); --paper-solid:#FBEFD5; --paper-line:rgba(120,84,40,.22);
  --sand-ink:#042B38; --sand-ink-2:#2F5660; --sand-ink-3:#5D7A80;
  --kelp-bright:#078A72; --kelp:#0A6354;
  /* type */
  --display:"Gabarito","Hanken Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --body:"Hanken Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  /* shape */
  --r-plate:14px; --r-inner:10px;
  --ease:cubic-bezier(.22,.9,.3,1);
}
```

---

## 13. Asset checklist

Before you hand an asset over, check it:

* Colours come from section 2, with one teal accent.
* Titles are Gabarito in sentence case, labels are Plex Mono in uppercase.
* Cards have 14px corners and one hairline border.
* Any character or object is a glossy vinyl toy on a transparent background.
* The copy is first person, plain English and free of the banned words.
* Text passes contrast, and nothing important is only in teal on sand.
* The file name is lowercase with hyphens (`persona-sophie-idle.webp`), and images are webp.
