/* ==========================================================================
   build.mjs — inline everything into dist/ as single self-contained files
   node build.mjs

   Why: the deployed site is a handful of standalone HTML files with no
   external requests except Google Fonts. That keeps hosting trivial
   (Netlify / Cloudflare / a published artifact) and keeps the site fast.
   Source stays split into real files so it is editable; dist/ is generated.
   Never hand-edit anything in dist/.
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, cpSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* fileURLToPath, not URL.pathname: the pathname form breaks on Windows and on folders with spaces */
const ROOT = dirname(fileURLToPath(import.meta.url));
/* The live site is served from ../dist (see ../wrangler.jsonc assets.directory
   and ../netlify.toml publish). The redesign builds into a subfolder of it, so it
   deploys to jessyux.com/redesign/ without touching the current home page. */
const OUT = resolve(ROOT, '../dist/redesign');

const PAGES = [
  { src: 'work/multi-shipping-options.html', out: 'work/multi-shipping-options.html' },
  { src: 'work/westpac-youth.html',          out: 'work/westpac-youth.html' },
  { src: 'work/admin-redesign.html',         out: 'work/admin-redesign.html' }
];

const MIME = {
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.svg':'image/svg+xml', '.gif':'image/gif',
  '.mp4':'video/mp4'
};  /* PDFs are copied through as real files, never inlined */

function dataUri(file){
  const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
  const mime = MIME[ext];
  if(!mime) return null;
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

function build({ src, out }){
  const srcPath = resolve(ROOT, src);
  const base = dirname(srcPath);
  let html = readFileSync(srcPath, 'utf8');

  // 1. inline local stylesheets
  html = html.replace(/<link[^>]+rel="stylesheet"[^>]+href="((?!https?:)[^"]+)"[^>]*>/g, (m, href) => {
    const css = readFileSync(resolve(base, href), 'utf8');
    return `<style>\n${css}\n</style>`;
  });

  // 2. inline local scripts
  html = html.replace(/<script[^>]+src="((?!https?:)[^"]+)"[^>]*><\/script>/g, (m, s) => {
    const js = readFileSync(resolve(base, s), 'utf8');
    return `<script>\n${js}\n</script>`;
  });

  // 3. inline local images, favicons and any other asset referenced by src/href
  html = html.replace(/(src|href)="((?!https?:|#|data:|mailto:)[^"]+\.(?:png|jpe?g|webp|svg|gif|mp4))"/g, (m, attr, p) => {
    const file = resolve(base, p);
    if(!existsSync(file)){ console.warn(`  missing asset: ${p}`); return m; }
    const uri = dataUri(file);
    return uri ? `${attr}="${uri}"` : m;
  });

  const dest = join(OUT, out);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log(`  ${out}  ${kb} KB`);
}

if(existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
console.log('building jessyux redesign -> ../dist/redesign');
PAGES.forEach(build);

// copy the resume through as a real file so the download link works
const cv = join(ROOT, 'assets', 'Jessy-Chappell-CV.pdf');
if(existsSync(cv)){
  mkdirSync(join(OUT, 'assets'), { recursive: true });
  cpSync(cv, join(OUT, 'assets', 'Jessy-Chappell-CV.pdf'));
  console.log('  assets/Jessy-Chappell-CV.pdf');
} else {
  console.warn('  no resume at assets/Jessy-Chappell-CV.pdf, the link will 404');
}
console.log('done');
