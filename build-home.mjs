/* ==========================================================================
   build-home.mjs — prepare dist/ for the live site (home page + its images)
   node build-home.mjs          then:  node redesign-2026/build.mjs   (new case study)

   The home page (index.html) is one file, but the beach scene loads a few
   images from img/. This copies index.html and only the images it actually
   references, so the 100+ MB of source art in img/vinyl-examples stays out of
   the deploy. Never hand-edit dist/.
   ========================================================================== */
import { readFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(ROOT, 'dist');

mkdirSync(DIST, { recursive: true });

function copy(rel){
  const from = resolve(ROOT, rel), to = resolve(DIST, rel);
  if (!existsSync(from)) { console.warn('  missing: ' + rel); return false; }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  return true;
}

// the page itself, favicon and CV if they are in the project root
['index.html', 'favicon.svg', 'Jessy_Chappell_CV.pdf'].forEach(f => { if (existsSync(resolve(ROOT, f))) copy(f); });

// images the page references by path
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const refs = new Set(html.match(/img\/[\w\-./]+\.(?:webp|png|jpe?g|svg)/g) || []);

// the swimming fish sprites are named in script (img/vinyl/fish-<name>.webp), so take the whole folder
const vinyl = resolve(ROOT, 'img/vinyl');
if (existsSync(vinyl)) readdirSync(vinyl).forEach(f => refs.add('img/vinyl/' + f));

let n = 0;
[...refs].sort().forEach(rel => { if (copy(rel)) n++; });
console.log(`dist/index.html + ${n} images copied.`);
