// Builds dist-game/, the static side of the Whisker Isles Worker (whisker.jessyux.com):
// the game page as index.html plus the few files it loads by path. Run before a deploy:
//   node build-game.mjs && npx --yes wrangler@4 deploy                      (live)
//   node build-game.mjs && npx --yes wrangler@4 deploy -c wrangler.preview.jsonc   (preview)
import { mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

// index.html is written further down: the happy faces and emote poses leave the page and become cached files
// the shared Home floatie's styles and picture, and Jessy's photo in the top bar
['a11y/home-float.css', 'img/floaties/home.webp', 'img/jessy-avatar.webp', 'favicon.svg'].forEach((f) => copy(f));
// the service worker that shows push notifications has to sit at the site root
copy('whisker-sw.js', 'sw.js');
// so Add to Home Screen installs the game as an app (and iPhone allows push notifications from it)
copy('whisker-manifest.webmanifest', 'manifest.webmanifest');
['icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'].forEach((f) => copy('icons-game/' + f, 'icons/' + f));

// most art is inlined in ART_DATA; anything the page would fetch from assets/ instead is copied if it exists
let html = readFileSync(resolve(ROOT, 'whisker-isles.html'), 'utf8');

// The page is mostly pictures written into it (about 2.4 MB). Every picture the first screen does not need becomes a separate file named by their content, so a phone loads the first screen sooner and keeps them
// for good (see _headers). The page then holds their address instead of the picture.
const artMatch = html.match(/const ART_DATA = (\{.*?\});\n/s);
const art = JSON.parse(artMatch[1]);
// the pictures the first screen needs stay inside the page: the list is ART_CORE in the page
const core = new Set([...html.match(/const ART_CORE = \[([^\]]*)\]/)[1].matchAll(/'([\w-]+)'/g)].map((m) => m[1]));
let moved = 0, movedBytes = 0;
for (const [name, uri] of Object.entries(art)) {
  if (core.has(name)) continue;
  const m = /^data:image\/webp;base64,(.+)$/.exec(uri); if (!m) continue;
  const buf = Buffer.from(m[1], 'base64');
  const file = `assets/${name}.${createHash('sha1').update(buf).digest('hex').slice(0, 8)}.webp`;
  mkdirSync(dirname(resolve(OUT, file)), { recursive: true });
  writeFileSync(resolve(OUT, file), buf);
  art[name] = '/' + file; moved++; movedBytes += buf.length;
}
html = html.replace(artMatch[0], () => 'const ART_DATA = ' + JSON.stringify(art) + ';\n');
writeFileSync(resolve(OUT, 'index.html'), html);
writeFileSync(resolve(OUT, '_headers'), '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n');
console.log(`  ${moved} pictures moved out of the page (${Math.round(movedBytes / 1024)} KB)`);
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
