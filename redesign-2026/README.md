# jessyux

Portfolio site. Plain HTML, CSS and JS. No framework, no package manager, no install.

## Work on it

```bash
# serve the source so relative paths resolve (run from redesign-2026/)
python -m http.server 8080
# then open http://localhost:8080
```

Edit the real files. `dist/` is generated and should never be hand-edited.

## Build

```bash
node build.mjs
```

Inlines CSS, JS and images into standalone pages in `../dist/redesign/`. Google Fonts
stays as an external link. The resume PDF is copied through as a real file so the
download works.

## Deploy

```bash
node build.mjs          # from redesign-2026/
cd .. && npx wrangler deploy
```

Lands at **jessyux.com/redesign/**. The current site at jessyux.com is untouched: it is
still built from `../index.html` into `../dist/`. To make the redesign the live site,
change `OUT` in `build.mjs` to `../dist` and update `netlify.toml`.

## Files

| Path | What it is |
|---|---|
| `../index.html` | Home (beach version, one level up). The old scrolling draft is in `../archive/redesign-index-vertical/` |
| `work/*.html` | One file per case study |
| `assets/css/tokens.css` | Colour, type and layout tokens. Start here for a visual change |
| `assets/css/base.css` | Shared components |
| `assets/js/dive.js` | Depth engine, water canvas, scroll behaviour |
| `build.mjs` | The inliner |
| `CLAUDE.md` | Design concept, rules and open decisions. Read before changing anything |
| `../dist/redesign/` | Generated output. Never hand-edit |
