// Builds dist-game/, the static side of the Whisker Isles Worker (whisker.jessyux.com):
// the game page as index.html plus the few files it loads by path. Run before a deploy:
//   node build-game.mjs && npx --yes wrangler@4 deploy                      (live)
//   node build-game.mjs && npx --yes wrangler@4 deploy -c wrangler.preview.jsonc   (preview)
import { mkdirSync, copyFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, 'dist-game');

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

function copy(from, to = from) {
  const dest = resolve(OUT, to);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(resolve(ROOT, from), dest);
}

copy('whisker-isles.html', 'index.html');
// the shared Home floatie's styles and picture, and Jessy's photo in the top bar
['a11y/home-float.css', 'img/floaties/home.webp', 'img/jessy-avatar.webp', 'favicon.svg'].forEach((f) => copy(f));

// most art is inlined in ART_DATA; anything the page would fetch from assets/ instead is copied if it exists
const html = readFileSync(resolve(ROOT, 'whisker-isles.html'), 'utf8');
const inlined = new Set(Object.keys(JSON.parse(html.match(/const ART_DATA = (\{.*?\});\n/s)[1])));
const named = new Set([...html.matchAll(/artSrc\('([\w-]+)'\)/g)].map((m) => m[1]));
const missing = [...named].filter((n) => !inlined.has(n));
for (const n of missing) {
  const f = `assets/${n}.webp`;
  if (existsSync(resolve(ROOT, f))) copy(f);
  else console.warn(`  no inline art or ${f} for "${n}"`);
}

// every path the page asks for from its own site must be in dist-game
const paths = [...html.matchAll(/(?:href|src)="\/([^"#?]+)"/g)].map((m) => m[1]);
const gone = paths.filter((p) => !existsSync(resolve(OUT, p)));
if (gone.length) { console.error('dist-game is missing: ' + gone.join(', ')); process.exit(1); }

console.log(`dist-game/index.html + ${4 + missing.length} files`);
