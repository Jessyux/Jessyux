"use strict";
/* =====================================================================
   Whisker Isles: a hex settlement game for 2 to 10 cats.
   Play on one device (hot-seat) or online with friends via a game code.
   Online games sync through a Cloudflare Durable Object (see /worker).
   State is saved to localStorage so a hot-seat game survives a refresh.
   Illustrations load from ./assets/; when a file is missing the built-in
   SVG drawing is used instead.
   ===================================================================== */

/* ---------- content ---------- */
const RES = ['litter','yarn','nip','nib','fish'];
const RINFO = {
  litter:{name:'Litter',  tile:'Litter dunes',   fill:'#EFD9B4', deep:'#C9A46E', art:'res-litter',  tileArt:'tile-litter'},
  yarn:  {name:'Yarn',    tile:'Yarn meadow',    fill:'#F9C6DC', deep:'#F58AB8', art:'res-yarn',    tileArt:'tile-yarn'},
  nip:   {name:'Catnip',  tile:'Catnip patch',   fill:'#C4EAA6', deep:'#6CC04A', art:'res-catnip',  tileArt:'tile-catnip'},
  nib:   {name:'Nibbles', tile:'Nibble bakery',  fill:'#FFD9B8', deep:'#E8935A', art:'res-nibbles', tileArt:'tile-nibbles'},
  fish:  {name:'Fish',    tile:'Fish pond',      fill:'#BFE6F7', deep:'#4FA9D9', art:'res-fish',    tileArt:'tile-fish'},
  nap:   {name:'Nap spot',tile:'Sunny nap spot', fill:'#E8E2FF', deep:'#A99BEF', art:'res-nap',     tileArt:'tile-nap'}
};
const COST = {
  path: {litter:1, yarn:1},
  bed:  {litter:1, yarn:1, nip:1, nib:1},
  tower:{nib:2, fish:3},
  treat:{nip:1, nib:1, fish:1}
};
const BREEDS = [
  {id:'ginger',  label:'Ginger tabby', base:'#FFB067', mark:'#E9853A', muzzle:'#FFE7CC', iris:'#F2A93B', color:'#FF8A3D'},
  {id:'tuxedo',  label:'Tuxedo',       base:'#3D3550', mark:'#3D3550', muzzle:'#FFFFFF', iris:'#8EDB6B', color:'#5B5FC7'},
  {id:'calico',  label:'Calico',       base:'#FFF6EC', mark:'#F2994A', muzzle:'#FFF6EC', iris:'#7CCB5B', color:'#F2607F'},
  {id:'siamese', label:'Siamese',      base:'#F6E8D5', mark:'#7A5A4A', muzzle:'#F6E8D5', iris:'#6FB7FF', color:'#2BA89A'},
  {id:'grey',    label:'British blue', base:'#A9B4C6', mark:'#8592A8', muzzle:'#C3CBD8', iris:'#E89A3C', color:'#6B7A8F'},
  {id:'black',   label:'Black cat',    base:'#2E2838', mark:'#2E2838', muzzle:'#2E2838', iris:'#F2D23B', color:'#D9A400'},
  {id:'persian', label:'Persian',      base:'#FFFFFF', mark:'#F1ECF7', muzzle:'#FFFFFF', iris:'#6FB7FF', color:'#9B5BD4'},
  {id:'tortie',  label:'Tortie',       base:'#5A3D2E', mark:'#E08A3A', muzzle:'#5A3D2E', iris:'#7CCB5B', color:'#8C5A3C'},
  {id:'fold',    label:'Lilac fold',   base:'#D8CCE8', mark:'#BFAED6', muzzle:'#E6DDF0', iris:'#F2A93B', color:'#3D8FE0'},
  {id:'bengal',  label:'Bengal',       base:'#F3C46B', mark:'#9B6A2F', muzzle:'#FBE3B5', iris:'#7CCB5B', color:'#6DAE3A'}
];
const DEFAULT_NAMES = ['Mochi','Biscuit','Sushi','Pudding','Dumpling','Noodle','Tofu','Waffle','Pickles','Bean'];
const TREATS = {
  zoomies:{name:'Zoomies',         art:'treat-zoomies',   text:'Move the Vacuum and take a card from a cat next to it. Counts toward Zoomiest cat.'},
  trophy: {name:'Cat show trophy', art:'treat-trophy',    text:'Worth 1 point. Kept secret until the end.'},
  spree:  {name:'Yarn spree',      art:'treat-yarnspree', text:'Roll out 2 yarn paths for free.'},
  gift:   {name:'Gift basket',     art:'treat-gift',      text:'Take any 2 resources from the supply.'},
  pounce: {name:'Pounce',          art:'treat-pounce',    text:'Name a resource. Every other cat gives you all of theirs.'}
};
const WIN_AT = 10;
const MAX_CLASSIC = 4, MAX_CATS = 10;
const SAVE_KEY = 'whisker-isles-save-v2';
const API = '/api/whisker-isles';

/* ---------- optional illustrations from ./assets ---------- */
const ART = new Set();
const ART_FILES = [
  ...RES.map(r=>RINFO[r].art), RINFO.nap.art, ...RES.map(r=>RINFO[r].tileArt), RINFO.nap.tileArt,
  ...BREEDS.map(b=>'cat-'+b.id), ...BREEDS.map(b=>'cat-'+b.id+'-win'),
  'vacuum', ...Object.values(TREATS).map(t=>t.art), 'logo-art'
];
function artSrc(name){ return 'assets/' + name + '.webp'; }
ART_FILES.forEach(name=>{
  const im = new Image();
  im.onload = ()=>{ ART.add(name); scheduleRender(); };
  im.src = artSrc(name);
});
let renderQueued = false;
function scheduleRender(){ if(renderQueued) return; renderQueued = true; requestAnimationFrame(()=>{ renderQueued=false; render(); }); }

/* ---------- small helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rnd = n => Math.floor(Math.random()*n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }
const total = res => RES.reduce((s,r)=>s+res[r],0);
const emptyRes = () => ({litter:0,yarn:0,nip:0,nib:0,fish:0});
function canPay(res,cost){ return Object.entries(cost).every(([r,n])=>res[r]>=n); }
function pay(res,cost){ Object.entries(cost).forEach(([r,n])=>res[r]-=n); }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} }
};

/* =====================================================================
   SVG drawings (fallbacks for missing illustrations, and board pieces)
   ===================================================================== */
function catSVG(bi, mood){
  const b = BREEDS[bi], P='#3A2341';
  const happy = mood==='win';
  let marks = '';
  if(b.id==='ginger') marks = `<path d="M40 27q10 6 20 0M37 35q13 7 26 0M44 20q6 3 12 0" stroke="${b.mark}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M12 60q8-2 12 4M88 60q-8-2-12 4" stroke="${b.mark}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  if(b.id==='tuxedo') marks = `<path d="M50 40c-14 0-24 14-24 30 0 14 11 21 24 21s24-7 24-21c0-16-10-30-24-30z" fill="${b.muzzle}"/>`;
  if(b.id==='calico') marks = `<path d="M10 52c4-20 20-30 34-28-2 12-14 22-34 28z" fill="${b.mark}"/><path d="M90 50c-3-16-14-26-28-26 4 10 12 20 28 26z" fill="#4A3B47"/><path d="M70 86c8-2 16-8 18-16-8 0-16 6-18 16z" fill="${b.mark}"/>`;
  if(b.id==='siamese') marks = `<ellipse cx="50" cy="70" rx="22" ry="17" fill="${b.mark}" opacity=".55"/>`;
  if(b.id==='grey') marks = `<path d="M42 28q8 4 16 0M40 36q10 5 20 0" stroke="${b.mark}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  if(b.id==='tortie') marks = `<path d="M14 50c6-14 18-22 30-22-4 10-14 18-30 22z M86 66c-6 10-14 16-24 18 2-8 10-16 24-18z" fill="${b.mark}"/>`;
  if(b.id==='bengal') marks = [[30,34],[44,30],[58,32],[70,38],[22,50],[78,50]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="4" ry="3" fill="${b.mark}"/>`).join('');
  const dark = ['tuxedo','black','tortie'].includes(b.id);
  const earIn = b.id==='siamese' ? b.mark : '#FFB3C7';
  const earOut = b.id==='siamese' ? b.mark : b.base;
  const ears = b.id==='fold'
    ? `<path d="M14 40q4-16 22-14-6 8-22 14z M86 40q-4-16-22-14 6 8 22 14z" fill="${b.base}" stroke="${P}" stroke-width="3.5" stroke-linejoin="round"/>`
    : `<path d="M15 48 23 12 47 30Z" fill="${earOut}" stroke="${P}" stroke-width="3.5" stroke-linejoin="round"/><path d="M85 48 77 12 53 30Z" fill="${earOut}" stroke="${P}" stroke-width="3.5" stroke-linejoin="round"/><path d="M22 40 25 21 38 31Z" fill="${earIn}"/><path d="M78 40 75 21 62 31Z" fill="${earIn}"/>`;
  const lid = dark ? '#FFFFFF' : P;
  const eye = x => happy
    ? `<path d="M${x-9} 62q9-11 18 0" stroke="${lid}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${x}" cy="61" rx="9" ry="11" fill="${P}"/><ellipse cx="${x}" cy="63" rx="6.5" ry="8" fill="${b.iris}"/><ellipse cx="${x}" cy="64" rx="3.5" ry="5" fill="${P}"/><circle cx="${x-3}" cy="56.5" r="3.4" fill="#fff"/><circle cx="${x+3}" cy="67" r="1.6" fill="#fff"/>`;
  const mouth = happy
    ? `<path d="M43 73q7 10 14 0z" fill="#FF7A95" stroke="${P}" stroke-width="2.5" stroke-linejoin="round"/>`
    : `<path d="M44 73q3 4 6 0q3 4 6 0" stroke="${dark?'#fff':P}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const cid = 'hc'+bi+(mood||'')+Math.random().toString(36).slice(2,7);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="${cid}"><ellipse cx="50" cy="60" rx="40" ry="33"/></clipPath></defs>
  ${ears}
  <ellipse cx="50" cy="60" rx="40" ry="33" fill="${b.base}"/>
  <g clip-path="url(#${cid})">${marks}</g>
  <ellipse cx="50" cy="60" rx="40" ry="33" fill="none" stroke="${P}" stroke-width="3.5"/>
  ${eye(33)}${eye(67)}
  <ellipse cx="22" cy="73" rx="7" ry="4" fill="#FF8FA8" opacity=".55"/><ellipse cx="78" cy="73" rx="7" ry="4" fill="#FF8FA8" opacity=".55"/>
  <path d="M47.5 69h5l-2.5 3z" fill="#FF7A95" stroke="${P}" stroke-width="1.5" stroke-linejoin="round"/>
  ${mouth}
  <path d="M8 66l12 2M8 74l12-1M92 66l-12 2M92 74l-12-1" stroke="${dark?'#fff':P}" stroke-width="2" stroke-linecap="round" opacity=".7"/>
</svg>`;
}
function catArt(bi, mood){
  const key = 'cat-'+BREEDS[bi].id+(mood==='win'?'-win':'');
  return ART.has(key) ? `<img src="${artSrc(key)}" alt="">` : catSVG(bi,mood);
}
function portrait(bi, mood){
  return `<span class="portrait" style="--pc:${BREEDS[bi].color}">${catArt(bi,mood)}</span>`;
}

/* resource glyphs drawn in a -20..20 box */
function resGlyph(r){
  const P='#3A2341', s=`stroke="${P}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
  switch(r){
    case 'litter': return `<path d="M-17-3h34l-4 16h-26Z" fill="#9FD3F0" ${s}/><path d="M-15-3q5-6 10-2 5-5 10-1 5-4 10 1" fill="#F2DDB2" ${s}/><circle cx="-6" cy="-6" r="1.4" fill="#C9A46E"/><circle cx="4" cy="-7" r="1.4" fill="#C9A46E"/><path d="M8-6 17-17" ${s}/><path d="M14-20l6 6-4 2-4-4Z" fill="#FF9FB8" ${s}/>`;
    case 'yarn': return `<path d="M10 10q8 6 6 12" fill="none" ${s}/><circle r="13" fill="#F58AB8" ${s}/><path d="M-11-5q11 4 22-2M-12 3q12 5 23-1M-6-11q4 12 0 23M3-12q5 10 2 24" fill="none" stroke="#C94F86" stroke-width="2"/>`;
    case 'nip': return `<path d="M0 16V-2" ${s}/><path d="M0 4C-14 4-15-8-13-12-4-12 0-6 0 4Z" fill="#7FD15A" ${s}/><path d="M0 4C14 4 15-8 13-12 4-12 0-6 0 4Z" fill="#6CC04A" ${s}/><path d="M0-2C-6-8-4-16 0-18 4-16 6-8 0-2Z" fill="#8EDB6B" ${s}/>`;
    case 'nib': return `<path d="M-10-4l3-5 3 5-3 4Z M2-6l4-4 3 4-3 4Z M-3-8l3-4 3 4-3 3Z" fill="#C8763F" ${s}/><path d="M-17-3h34q0 17-17 17T-17-3Z" fill="#7FB6F2" ${s}/>`;
    case 'fish': return `<path d="M-15 0C-7-11 7-11 11 0 7 11-7 11-15 0Z" fill="#6FB7FF" ${s}/><path d="M10 0 19-8V8Z" fill="#4F97E8" ${s}/><circle cx="-7" cy="-2" r="2.2" fill="${P}"/><path d="M-1-6q3 6 0 12" fill="none" stroke="${P}" stroke-width="1.8"/>`;
    case 'nap': return `<ellipse cy="6" rx="17" ry="9" fill="#FFB3C7" ${s}/><ellipse cy="3" rx="11" ry="5" fill="#FFD1DD"/><circle cx="8" cy="-11" r="6" fill="#FFD36E" ${s}/>`;
  }
}
function resIcon(r, px){
  const a = RINFO[r].art, st = px?` style="width:${px}px;height:${px}px"`:'';
  if(ART.has(a)) return `<span class="ic"${st}><img src="${artSrc(a)}" alt=""></span>`;
  return `<svg class="ic"${st} viewBox="-21 -21 42 42" aria-hidden="true">${resGlyph(r)}</svg>`;
}
function treatGlyph(t){
  const P='#3A2341', s=`stroke="${P}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"`;
  switch(t){
    case 'zoomies': return `<path d="M-18-6h8M-20 2h10M-17 10h7" ${s}/><ellipse cx="4" cy="4" rx="12" ry="8" fill="#FFB067" ${s}/><circle cx="12" cy="-4" r="7" fill="#FFB067" ${s}/>`;
    case 'trophy': return `<path d="M-11-14h22v6a11 11 0 0 1-22 0Z" fill="#FFD36E" ${s}/><path d="M-11-11h-5a5 5 0 0 0 6 8M11-11h5a5 5 0 0 1-6 8" fill="none" ${s}/><path d="M-3 3h6v6h-6Z" fill="#F6B73C" ${s}/><rect x="-10" y="9" width="20" height="6" rx="2" fill="#F2607F" ${s}/>`;
    case 'spree': return `<circle cx="-6" cy="-4" r="10" fill="#F58AB8" ${s}/><path d="M2 4q8 10 16 4" fill="none" stroke="#C94F86" stroke-width="3" stroke-linecap="round"/>`;
    case 'gift': return `<path d="M-15-2h30l-4 17h-22Z" fill="#E8B27A" ${s}/><path d="M-12-2a12 12 0 0 1 24 0" fill="none" ${s}/>`;
    case 'pounce': return `<circle cx="8" cy="-6" r="9" fill="#F6E8D5" ${s}/><path d="M-18 12q8-24 22-20" fill="none" stroke="${P}" stroke-width="2" stroke-dasharray="3 4"/>`;
  }
}
function treatIcon(t, px){
  const a = TREATS[t].art, st = px?` style="width:${px}px;height:${px}px"`:'';
  if(ART.has(a)) return `<span class="ic"${st}><img src="${artSrc(a)}" alt=""></span>`;
  return `<svg class="ic"${st} viewBox="-21 -21 42 42" aria-hidden="true">${treatGlyph(t)}</svg>`;
}
function costChips(cost){
  return `<span class="cost" aria-label="${Object.entries(cost).map(([r,n])=>n+' '+RINFO[r].name).join(', ')}">` +
    Object.entries(cost).flatMap(([r,n])=>Array(n).fill(resIcon(r))).join('') + `</span>`;
}
function pathIcon(c){ return `<svg viewBox="-20 -20 40 40" width="30" height="30" aria-hidden="true"><path d="M-14 10 14-10" stroke="#3A2341" stroke-width="10" stroke-linecap="round"/><path d="M-14 10 14-10" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/><path d="M-14 10 14-10" stroke="#fff" stroke-width="1.6" stroke-dasharray="2 4" stroke-linecap="round" opacity=".8"/></svg>`; }
function shade(c,f){ const n=parseInt(c.slice(1),16); let r=n>>16,g=n>>8&255,b=n&255; const m=f<0?0:255,t=Math.abs(f); r=Math.round(r+(m-r)*t); g=Math.round(g+(m-g)*t); b=Math.round(b+(m-b)*t); return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1); }
/* cat bed (settlement): a dome cat cave with ears and glowing eyes in the doorway */
function bedShape(c){
  const P='#3A2341', l=shade(c,.35), d=shade(c,-.25);
  return `<ellipse cy="13" rx="17" ry="3.5" fill="${P}" opacity=".18"/>
  <path d="M-13-6-12-19-4-13Z M13-6 12-19 4-13Z" fill="${c}" stroke="${P}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M-11-10-10.5-16-7-13Z M11-10 10.5-16 7-13Z" fill="#FFB3C7"/>
  <path d="M-16 11V0A16 15 0 0 1 16 0V11Z" fill="${c}" stroke="${P}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M-11-4A12 11 0 0 1-2-11" stroke="${l}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M-8 11V4A8 8 0 0 1 8 4V11Z" fill="${P}"/>
  <ellipse cx="-3.5" cy="5" rx="1.9" ry="2.4" fill="#FFE27A"/><ellipse cx="3.5" cy="5" rx="1.9" ry="2.4" fill="#FFE27A"/>
  <rect x="-17" y="9" width="34" height="5" rx="2.5" fill="${d}" stroke="${P}" stroke-width="2.2"/>`;
}
/* cat tower (city): a two-storey cat condo, a cave on a sisal post above a cave base */
function towerShape(c){
  const P='#3A2341', l=shade(c,.35), d=shade(c,-.25);
  return `<ellipse cy="15" rx="19" ry="3.5" fill="${P}" opacity=".18"/>
  <rect x="-3.5" y="-12" width="7" height="12" fill="#E8C99B" stroke="${P}" stroke-width="2.2"/>
  <path d="M-3.5-9h7M-3.5-5h7" stroke="${P}" stroke-width="1.2" opacity=".5"/>
  <rect x="-17" y="-1" width="34" height="13" rx="4" fill="${c}" stroke="${P}" stroke-width="2.6"/>
  <path d="M-6 12V7A6 6 0 0 1 6 7V12Z" fill="${P}"/>
  <ellipse cx="-2.6" cy="8.5" rx="1.5" ry="1.9" fill="#FFE27A"/><ellipse cx="2.6" cy="8.5" rx="1.5" ry="1.9" fill="#FFE27A"/>
  <rect x="-19" y="11" width="38" height="5" rx="2.5" fill="${d}" stroke="${P}" stroke-width="2.2"/>
  <path d="M-11-20-10-31-3-25Z M11-20 10-31 3-25Z" fill="${c}" stroke="${P}" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M-9.4-23-9-28.5-6-26Z M9.4-23 9-28.5 6-26Z" fill="#FFB3C7"/>
  <path d="M-13-10V-17A13 12 0 0 1 13-17V-10Z" fill="${c}" stroke="${P}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M-9-19A9 8 0 0 1-2-24" stroke="${l}" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M-5-10V-14A5 5 0 0 1 5-14V-10Z" fill="${P}"/>
  <rect x="-15" y="-12" width="30" height="4" rx="2" fill="${d}" stroke="${P}" stroke-width="2"/>`;
}
function vacuumSVG(){
  if(ART.has('vacuum')) return `<image href="${artSrc('vacuum')}" x="-32" y="-32" width="64" height="64"/>`;
  const P='#3A2341';
  return `<ellipse cy="4" rx="22" ry="10" fill="#9C97B8" stroke="${P}" stroke-width="3"/>
  <ellipse cy="-1" rx="22" ry="10" fill="#CFCBE6" stroke="${P}" stroke-width="3"/>
  <circle cy="-11" r="2.4" fill="#FF4D6D" stroke="${P}" stroke-width="1.5"/>`;
}

/* =====================================================================
   Board geometry: pointy-top hexes. Classic island has radius 2 (19
   tiles), the Big Island expansion has radius 3 (37 tiles).
   ===================================================================== */
const HR = 60, SQ3 = Math.sqrt(3);
let GEO_R = -1, HEX, V, E, HEXV, HEXN, DOCK_EDGES;
function buildGeo(radius){
  if(GEO_R===radius) return;
  GEO_R = radius; HEX=[]; V=[]; E=[];
  const vIndex = new Map(), eIndex = new Map();
  for(let r=-radius;r<=radius;r++) for(let q=-radius;q<=radius;q++){ if(Math.abs(q+r)<=radius) HEX.push({q,r,x:HR*SQ3*(q+r/2), y:HR*1.5*r}); }
  HEXV = HEX.map(()=>[]);
  HEX.forEach((h,hi)=>{
    for(let i=0;i<6;i++){
      const a = Math.PI/180*(60*i-30);
      const x = h.x + HR*Math.cos(a), y = h.y + HR*Math.sin(a);
      const k = Math.round(x)+','+Math.round(y);
      if(!vIndex.has(k)){ vIndex.set(k,V.length); V.push({x,y,hexes:[],edges:[],adj:[]}); }
      const vi = vIndex.get(k); V[vi].hexes.push(hi); HEXV[hi].push(vi);
    }
    for(let i=0;i<6;i++){
      const a = HEXV[hi][i], b = HEXV[hi][(i+1)%6];
      const k = Math.min(a,b)+'-'+Math.max(a,b);
      if(!eIndex.has(k)){ eIndex.set(k,E.length); E.push({a:Math.min(a,b),b:Math.max(a,b),hexes:[]}); V[a].edges.push(E.length-1); V[b].edges.push(E.length-1); V[a].adj.push(b); V[b].adj.push(a); }
      E[eIndex.get(k)].hexes.push(hi);
    }
  });
  const DIRS = [[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]];
  const at = new Map(HEX.map((h,i)=>[h.q+','+h.r,i]));
  HEXN = HEX.map(h=>DIRS.map(([dq,dr])=>at.get((h.q+dq)+','+(h.r+dr))).filter(i=>i!==undefined));
  const coast = E.map((e,i)=>({i,e})).filter(o=>o.e.hexes.length===1)
    .map(o=>{ const mx=(V[o.e.a].x+V[o.e.b].x)/2, my=(V[o.e.a].y+V[o.e.b].y)/2; return {i:o.i, ang:Math.atan2(my,mx)}; })
    .sort((a,b)=>a.ang-b.ang).map(o=>o.i);
  const n = radius===2 ? 9 : 13;
  DOCK_EDGES = Array.from({length:n},(_,k)=>coast[Math.round(k*coast.length/n)]);
}

/* =====================================================================
   Game state
   ===================================================================== */
let S = null;   // the game. In online games this object is what syncs.
const ui = { mode:null, modal:null, flash:{}, rolling:false, seats:null, view:'home', form:null, discardSel:null };

function makeBoard(radius){
  buildGeo(radius);
  const big = radius===3;
  const per = big ? 7 : null;
  const types = big
    ? shuffle([...RES.flatMap(r=>Array(per).fill(r)), 'nap','nap'])
    : shuffle(['litter','litter','litter','litter','yarn','yarn','yarn','nip','nip','nip','nip','nib','nib','nib','nib','fish','fish','fish','nap']);
  const base = [2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12];
  const tokens = big ? [...base, ...base.slice(1)] : base;   // 35 tokens for 35 producing tiles
  let nums;
  for(let tries=0;tries<800;tries++){
    const pool = shuffle([...tokens]);
    nums = types.map(t=>t==='nap'?0:pool.pop());
    const hot = i => nums[i]===6||nums[i]===8;
    if(!HEX.some((_,i)=>hot(i)&&HEXN[i].some(j=>hot(j)))) break;
  }
  const docks = big
    ? shuffle([...Array(6).fill('any'), ...RES, ...shuffle([...RES]).slice(0,2)])
    : shuffle(['any','any','any','any', ...RES]);
  return { radius, tiles: types.map((t,i)=>({type:t,num:nums[i]})), docks: DOCK_EDGES.map((e,i)=>({e,type:docks[i]})) };
}

function newGame(seats, opts){
  opts = opts || {};
  const n = seats.length;
  const radius = n > MAX_CLASSIC ? 3 : 2;
  const board = makeBoard(radius);
  const big = radius===3;
  const deck = shuffle([...Array(big?20:14).fill('zoomies'),...Array(big?6:5).fill('trophy'),
    ...Array(big?3:2).fill('spree'),...Array(big?3:2).fill('gift'),...Array(big?3:2).fill('pounce')]);
  S = {
    online: !!opts.online, code: opts.code || null,
    board, deck,
    players: seats.map(s=>({name:s.name, breed:s.breed, res:emptyRes(), cards:[], zoomies:0, pieces:{path:15,bed:5,tower:4}})),
    bld:{}, roads:{}, vac: board.tiles.findIndex(t=>t.type==='nap'),
    cur:0, turn:1, phase:'setup',
    setup:{i:0, step:'bed', lastBed:null, order:[...Array(n).keys(), ...[...Array(n).keys()].reverse()]},
    rolled:false, dice:[1,1], rollN:0, hist:Array(13).fill(0), playedTreat:false,
    sub:null, subData:null, discardQ:[], offer:null,
    longest:-1, army:-1,
    log:[], handoff:!opts.online, winner:-1
  };
  log(`A new game begins on ${big?'Big Island':'Whisker Isles'}. ${pname(0)} places first.`);
}

function save(){ if(S && !S.online) store.set(SAVE_KEY, JSON.stringify(S)); }
function loadSave(){ try{ const s = JSON.parse(store.get(SAVE_KEY)); return s && s.players ? s : null; }catch(e){ return null; } }

function log(msg){ S.log.unshift(msg); S.log.length = Math.min(S.log.length, 80); const l=$('#live'); if(l) l.textContent = msg.replace(/<[^>]+>/g,''); }
const P = () => S.players[S.cur];
const pname = i => esc(S.players[i].name);

/* who is looking at this screen */
function me(){ return S.online ? ON.seat : S.cur; }
function myTurn(){ return !S.online || ON.seat===S.cur; }

/* ---------- rules ---------- */
function canBed(p, v, setup){
  if(S.bld[v]!==undefined) return false;
  if(V[v].adj.some(u=>S.bld[u]!==undefined)) return false;
  if(setup) return true;
  return V[v].edges.some(e=>S.roads[e]===p);
}
function canPath(p, e, fromBed){
  if(S.roads[e]!==undefined) return false;
  const {a,b} = E[e];
  if(fromBed!=null) return a===fromBed || b===fromBed;
  return [a,b].some(v=>{
    const bl = S.bld[v];
    if(bl && bl.p===p) return true;
    if(bl && bl.p!==p) return false;
    return V[v].edges.some(x=>x!==e && S.roads[x]===p);
  });
}
const validBeds   = (p,setup) => V.map((_,i)=>i).filter(v=>canBed(p,v,setup));
const validPaths  = (p,fromBed) => E.map((_,i)=>i).filter(e=>canPath(p,e,fromBed));
const validTowers = p => Object.keys(S.bld).map(Number).filter(v=>S.bld[v].p===p && S.bld[v].t==='bed');

function roadLength(p){
  const mine = new Set(Object.keys(S.roads).map(Number).filter(e=>S.roads[e]===p));
  let best = 0;
  const dfs = (v, used, len) => {
    if(len>best) best=len;
    const b = S.bld[v]; if(len>0 && b && b.p!==p) return;
    for(const e of V[v].edges){
      if(mine.has(e) && !used.has(e)){ used.add(e); dfs(E[e].a===v?E[e].b:E[e].a, used, len+1); used.delete(e); }
    }
  };
  mine.forEach(e=>{ dfs(E[e].a,new Set(),0); dfs(E[e].b,new Set(),0); });
  return best;
}
function updateLongest(){
  const lens = S.players.map((_,i)=>roadLength(i));
  const max = Math.max(...lens), prev = S.longest;
  if(max<5) S.longest = -1;
  else if(!(prev>=0 && lens[prev]===max)){
    const top = lens.map((l,i)=>l===max?i:-1).filter(i=>i>=0);
    S.longest = top.length===1 ? top[0] : -1;
  }
  if(S.longest!==prev && S.longest>=0) log(`${pname(S.longest)} takes Longest yarn with a ${max}-path trail.`);
}
function updateArmy(p){
  const n = S.players[p].zoomies, holder = S.army;
  if(n>=3 && holder!==p && (holder<0 || n>S.players[holder].zoomies)){ S.army = p; log(`${pname(p)} is now the Zoomiest cat.`); }
}
function vp(p, hidden){
  let v = 0;
  Object.values(S.bld).forEach(b=>{ if(b.p===p) v += b.t==='tower'?2:1; });
  if(S.longest===p) v+=2;
  if(S.army===p) v+=2;
  if(hidden) v += S.players[p].cards.filter(c=>c.t==='trophy').length;
  return v;
}
function rate(p, r){
  let best = 4;
  S.board.docks.forEach(d=>{
    const e = E[d.e];
    if(![e.a,e.b].some(v=>S.bld[v] && S.bld[v].p===p)) return;
    if(d.type==='any') best = Math.min(best,3);
    else if(d.type===r) best = 2;
  });
  return best;
}
function checkWin(){
  if(S.phase!=='play') return;
  if(vp(S.cur,true)>=WIN_AT){ S.winner = S.cur; S.phase='over'; log(`${pname(S.cur)} wins with ${vp(S.cur,true)} points!`); }
}

/* ---------- actions ---------- */
function placeBed(v){
  const p = S.cur, pl = P();
  if(S.phase==='setup'){
    S.bld[v] = {p, t:'bed'}; pl.pieces.bed--;
    S.setup.lastBed = v; S.setup.step = 'path';
    if(S.setup.i >= S.players.length){
      const got = emptyRes();
      V[v].hexes.forEach(h=>{ const t=S.board.tiles[h].type; if(t!=='nap'){ pl.res[t]++; got[t]++; } });
      log(`${pname(p)} settles in and collects ${describe(got)||'nothing'}.`);
      flash(got);
    } else log(`${pname(p)} places a cat bed.`);
  } else {
    pay(pl.res, COST.bed); S.bld[v] = {p, t:'bed'}; pl.pieces.bed--; ui.mode=null;
    log(`${pname(p)} builds a cat bed.`);
    updateLongest();
  }
  commit();
}
function placePath(e){
  const p = S.cur, pl = P();
  S.roads[e] = p; pl.pieces.path--;
  if(S.phase==='setup'){
    log(`${pname(p)} rolls out a yarn path.`);
    S.setup.i++;
    if(S.setup.i >= S.setup.order.length){
      S.phase='play'; S.cur=0; S.rolled=false; S.handoff=!S.online;
      log(`Setup done. ${pname(0)}, roll the dice to start.`);
    } else { S.cur = S.setup.order[S.setup.i]; S.setup.step='bed'; S.setup.lastBed=null; if(!S.online && S.setup.order[S.setup.i-1]!==S.cur) S.handoff=true; }
  } else if(S.sub==='spree'){
    S.subData.left--; log(`${pname(p)} rolls out a free yarn path.`);
    if(S.subData.left<=0 || pl.pieces.path<=0 || validPaths(p).length===0){ S.sub=null; S.subData=null; ui.mode=null; }
    updateLongest();
  } else {
    pay(pl.res, COST.path); ui.mode=null;
    log(`${pname(p)} rolls out a yarn path.`);
    updateLongest();
  }
  commit();
}
function placeTower(v){
  const pl = P();
  pay(pl.res, COST.tower); S.bld[v].t='tower'; pl.pieces.tower--; pl.pieces.bed++; ui.mode=null;
  log(`${pname(S.cur)} upgrades to a cat tower.`);
  commit();
}
function buyTreat(){
  const pl = P();
  if(!myTurn() || !canPay(pl.res,COST.treat) || !S.deck.length) return;
  pay(pl.res,COST.treat);
  const t = S.deck.pop();
  pl.cards.push({t, turn:S.turn});
  log(`${pname(S.cur)} buys a treat card.`);
  ui.modal = {kind:'bought', t};
  commit();
}
function describe(g){ return RES.filter(r=>g[r]).map(r=>`${g[r]} ${RINFO[r].name}`).join(', '); }
function flash(g){ ui.flash = {}; RES.forEach(r=>{ if(g[r]) ui.flash[r]=true; }); setTimeout(()=>{ ui.flash={}; },700); }

function roll(){
  if(!myTurn() || S.rolled || S.sub || ui.rolling) return;
  const d = [1+rnd(6), 1+rnd(6)];
  const finish = () => {
    ui.rolling=false; S.dice=d; S.rolled=true; S.rollN++;
    const sum = d[0]+d[1]; S.hist[sum]++;
    if(sum===7){
      log(`${pname(S.cur)} rolls 7. The Vacuum switches on!`);
      S.discardQ = S.players.map((p,i)=>i).filter(i=>total(S.players[i].res)>7);
      if(S.discardQ.length){ S.sub='discard'; }
      else { S.sub='vacuum'; S.subData={from:'roll'}; }
    } else produce(sum);
    commit();
  };
  if(reduceMotion){ finish(); return; }
  spinDice(finish, d);
}
function spinDice(done, final){
  ui.rolling = true; render();
  let n=0; const iv = setInterval(()=>{
    const show = [1+rnd(6),1+rnd(6)];
    renderDice(show);
    if(++n>=7){ clearInterval(iv); if(done) done(); else { ui.rolling=false; render(); } }
  }, 65);
}
function produce(sum){
  const gains = S.players.map(()=>emptyRes());
  S.board.tiles.forEach((t,i)=>{
    if(t.num!==sum || i===S.vac) return;
    HEXV[i].forEach(v=>{ const b=S.bld[v]; if(b){ const n = b.t==='tower'?2:1; S.players[b.p].res[t.type]+=n; gains[b.p][t.type]+=n; } });
  });
  const parts = gains.map((g,i)=>describe(g)?`${pname(i)} gets ${describe(g)}`:null).filter(Boolean);
  log(`${pname(S.cur)} rolls ${sum}. ` + (parts.length ? parts.join('; ')+'.' : 'Nobody collects.'));
  if(me()>=0) flash(gains[me()]);
}
function discardSeat(){
  // whose discard this screen should show
  if(S.sub!=='discard') return -1;
  if(!S.online) return S.discardQ[0];
  return S.discardQ.includes(ON.seat) ? ON.seat : -1;
}
function confirmDiscard(){
  const p = discardSeat(); if(p<0) return;
  const pl = S.players[p];
  const need = Math.floor(total(pl.res)/2);
  if(total(ui.discardSel)!==need) return;
  RES.forEach(r=>pl.res[r]-=ui.discardSel[r]);
  log(`${pname(p)} drops ${need} cards for the Vacuum.`);
  S.discardQ = S.discardQ.filter(x=>x!==p); ui.discardSel = null;
  if(!S.discardQ.length){ S.sub='vacuum'; S.subData={from:'roll'}; }
  commit();
}
function moveVacuum(h){
  S.vac = h;
  const t = S.board.tiles[h];
  log(`${pname(S.cur)} sends the Vacuum to the ${t.num?t.num+' ':''}${RINFO[t.type].tile.toLowerCase()}.`);
  const victims = [...new Set(HEXV[h].map(v=>S.bld[v]).filter(b=>b && b.p!==S.cur).map(b=>b.p))].filter(p=>total(S.players[p].res)>0);
  if(victims.length===0){ endVacuum(); }
  else if(victims.length===1){ steal(victims[0]); }
  else { S.sub='steal'; S.subData={...S.subData, victims}; commit(); }
}
function steal(v){
  if(!myTurn()) return;
  const pool = RES.flatMap(r=>Array(S.players[v].res[r]).fill(r));
  const r = pool[rnd(pool.length)];
  S.players[v].res[r]--; P().res[r]++;
  log(`${pname(S.cur)} swipes a card from ${pname(v)}.`);
  ui.modal = {kind:'stolen', r, from:v};
  endVacuum();
}
function endVacuum(){ S.sub=null; S.subData=null; ui.mode=null; commit(); }

function playTreat(idx){
  const pl = P(), c = pl.cards[idx];
  if(!myTurn() || !c || c.t==='trophy' || c.turn>=S.turn || S.playedTreat || S.sub) return;
  if(c.t!=='zoomies' && !S.rolled) return;
  pl.cards.splice(idx,1); S.playedTreat = true;
  log(`${pname(S.cur)} plays ${TREATS[c.t].name}.`);
  if(c.t==='zoomies'){ pl.zoomies++; updateArmy(S.cur); S.sub='vacuum'; S.subData={from:'treat'}; }
  if(c.t==='spree'){ const left = Math.min(2, pl.pieces.path); if(left>0 && validPaths(S.cur).length){ S.sub='spree'; S.subData={left}; ui.mode='path'; } }
  if(c.t==='gift'){ ui.modal={kind:'gift', pick:[]}; }
  if(c.t==='pounce'){ ui.modal={kind:'pounce', pick:null}; }
  commit();
}
function endTurn(){
  if(!myTurn() || !S.rolled || S.sub || S.offer) return;
  ui.mode=null;
  S.cur = (S.cur+1)%S.players.length; S.turn++; S.rolled=false; S.playedTreat=false; S.handoff=!S.online;
  log(`${pname(S.cur)}'s turn.`);
  commit();
}
function commit(){ checkWin(); save(); pushState(); render(); }

/* =====================================================================
   Online play
   ===================================================================== */
const ON = { ws:null, code:null, pid:null, seat:-1, lobby:null, ver:0, status:'idle', err:null, retry:0, online:[] };
const CODE_RE = /^[a-z]+-[a-z]+-\d{2}$/;
function normCode(s){ return String(s||'').trim().toLowerCase().replace(/[\s_]+/g,'-').replace(/[^a-z0-9-]/g,''); }
function pidFor(code){
  const k='whisker-isles-pid-'+code; let p = store.get(k);
  if(!p){ p = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)+Date.now().toString(36)); store.set(k,p); }
  return p;
}
async function createOnline(){
  ON.err=null; ON.status='creating'; render();
  try{
    const r = await fetch(API+'/new', {method:'POST', headers:{'content-type':'application/json'}, body:'{}'});
    if(!r.ok) throw new Error('status '+r.status);
    const {code} = await r.json();
    connect(code);
  }catch(e){ ON.status='idle'; ON.err = `Online games aren't available here right now. Try again, or play on one device.`; render(); }
}
function connect(code){
  code = normCode(code);
  if(!CODE_RE.test(code)){ ON.status='idle'; ON.err = 'Game codes look like sleepy-tuna-42. Check the code and try again.'; render(); return; }
  if(ON.ws){ try{ ON.ws.onclose=null; ON.ws.close(); }catch(e){} }
  ON.code=code; ON.pid=pidFor(code); ON.err=null;
  if(ON.status!=='playing') ON.status='connecting';
  store.set('whisker-isles-last-code', code);
  history.replaceState(null,'','?game='+code);
  render();
  const proto = location.protocol==='https:'?'wss':'ws';
  let ws;
  try{ ws = new WebSocket(`${proto}://${location.host}${API}/ws/${code}`); }
  catch(e){ ON.status='idle'; ON.err = `Couldn't reach the game server.`; render(); return; }
  ON.ws = ws;
  ws.onopen = () => { ON.retry=0; ws.send(JSON.stringify({type:'hello', pid:ON.pid, name:ui.form.name, breed:ui.form.breed})); };
  ws.onmessage = ev => { let m; try{ m=JSON.parse(ev.data); }catch(e){ return; } onMsg(m); };
  ws.onclose = () => {
    if(ON.ws!==ws || !ON.code || ON.status==='error' || ON.status==='idle') return;
    ON.retry++;
    if(ON.retry>6){ ON.status='error'; ON.err=`Lost the connection to the game. Check your internet and rejoin with code ${ON.code}.`; render(); return; }
    ON.offline=true; render();
    setTimeout(()=>{ if(ON.code && ON.ws===ws) connect(ON.code); }, 800*ON.retry);
  };
}
function onMsg(m){
  ON.offline=false;
  if(m.type==='error'){ ON.status='error'; ON.err=m.message; ON.code=null; history.replaceState(null,'',location.pathname); if(ON.ws) ON.ws.close(); render(); return; }
  if(m.type==='lobby'){
    ON.lobby=m.lobby; ON.online=m.online||[];
    ON.seat = m.lobby.seats.findIndex(s=>s.pid===ON.pid);
    if(!m.lobby.started){ ON.status='lobby'; S=null; render(); return; }
  }
  if(m.state){ applyRemote(m.state, m.ver); }
  else render();
}
function applyRemote(state, ver){
  const prevRoll = S && S.online ? S.rollN : null;
  if(!S) setTimeout(()=>window.scrollTo(0,0));
  S = state; ON.ver = ver; ON.status='playing';
  buildGeo(S.board.radius);
  if(ui.modal && ['trade','bank','gift','pounce'].includes(ui.modal.kind) && !myTurn()) ui.modal=null;
  if(prevRoll!==null && S.rollN!==prevRoll && !reduceMotion){ const d=S.dice; spinDice(null, d); return; }
  render();
}
function pushState(){
  if(!S || !S.online || !ON.ws || ON.ws.readyState!==1) return;
  ON.ws.send(JSON.stringify({type:'state', base:ON.ver, state:S}));
  ON.ver++;
}
function leaveOnline(){
  const ws = ON.ws; ON.ws=null; ON.code=null; ON.status='idle'; ON.lobby=null; ON.seat=-1;
  if(ws){ try{ ws.onclose=null; ws.close(); }catch(e){} }
  history.replaceState(null,'',location.pathname);
}

/* =====================================================================
   Rendering
   ===================================================================== */
function render(){
  const root = $('#root');
  if(!S){
    root.innerHTML = ON.status==='lobby' ? lobbyScreen() : startScreen();
    renderOverlay(); return;
  }
  if(!root.querySelector('.app')) root.innerHTML = `<div class="app">
    <header class="topbar">
      <div class="wordmark">${miniMark()}<span>Whisker Isles</span></div>
      <div class="tools" id="tools"></div>
    </header>
    <div class="board-wrap"><svg id="board" role="application" aria-label="Game board"></svg></div>
    <aside class="panel" id="panel"></aside>
  </div>`;
  $('#tools').innerHTML = `${S.online?`<span class="code-chip" title="Friends join with this code">${ON.offline?'Reconnecting… ':''}Code <b>${esc(S.code)}</b></span>`:''}
    <button class="btn small" onclick="G.open('rules')">How to play</button>
    <button class="btn small" onclick="G.open('newgame')">${S.online?'Leave game':'New game'}</button>`;
  renderBoard(); renderPanel(); renderOverlay();
}
function miniMark(){ return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 44 26 8 48 28Z M82 44 74 8 52 28Z" fill="#FF8A3D" stroke="#3A2341" stroke-width="5" stroke-linejoin="round"/><ellipse cx="50" cy="60" rx="40" ry="33" fill="#FFB067" stroke="#3A2341" stroke-width="5"/><circle cx="35" cy="60" r="7" fill="#3A2341"/><circle cx="65" cy="60" r="7" fill="#3A2341"/><circle cx="33" cy="57" r="2.5" fill="#fff"/><circle cx="63" cy="57" r="2.5" fill="#fff"/></svg>`; }

function hexPoints(cx,cy,r,rot){ rot=rot||0; return Array.from({length:6},(_,i)=>{ const a=Math.PI/180*(60*i-30+rot); return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1); }).join(' '); }
function pips(n){ return 6-Math.abs(7-n); }

function boardMode(){
  if((S.handoff && !S.online) || S.phase==='over' || ui.modal || S.offer || !myTurn()) return null;
  if(S.phase==='setup') return S.setup.step;
  if(S.sub==='vacuum') return 'vacuum';
  if(S.sub==='spree') return 'path';
  if(S.sub) return null;
  return ui.mode;
}

function renderBoard(){
  const svg = $('#board');
  const R = S.board.radius;
  const pad = 78;
  const xs = V.map(v=>v.x), ys = V.map(v=>v.y);
  const minX=Math.min(...xs)-pad, minY=Math.min(...ys)-pad, w=Math.max(...xs)-minX+pad, h=Math.max(...ys)-minY+pad;
  svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
  let out = `<defs><pattern id="waves" width="60" height="26" patternUnits="userSpaceOnUse"><path d="M0 13q15-10 30 0t30 0" fill="none" stroke="#B2A5F0" stroke-width="3" stroke-linecap="round"/></pattern></defs>
  <rect x="${minX}" y="${minY}" width="${w}" height="${h}" rx="40" fill="#C7BDF7" stroke="#3A2341" stroke-width="5"/>
  <rect x="${minX}" y="${minY}" width="${w}" height="${h}" rx="40" fill="url(#waves)" opacity=".8"/>
  <polygon points="${hexPoints(0,0,HR*(1.75*R+.2),30)}" fill="#FFF3C9" stroke="#3A2341" stroke-width="4" stroke-linejoin="round"/>`;
  S.board.docks.forEach(d=>{
    const e = E[d.e], a=V[e.a], b=V[e.b], hx = HEX[e.hexes[0]];
    const mx=(a.x+b.x)/2, my=(a.y+b.y)/2, dx=mx-hx.x, dy=my-hx.y, L=Math.hypot(dx,dy);
    const px = mx+dx/L*46, py = my+dy/L*46;
    out += `<g aria-hidden="true">
      <path d="M${a.x} ${a.y}L${px} ${py}L${b.x} ${b.y}" fill="none" stroke="#3A2341" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${a.x} ${a.y}L${px} ${py}L${b.x} ${b.y}" fill="none" stroke="#E8C99B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${px}" cy="${py}" r="22" fill="#fff" stroke="#3A2341" stroke-width="3"/>
      ${d.type==='any'
        ? `<text x="${px}" y="${py+6}" text-anchor="middle" font-family="Mochiy Pop One" font-size="15" fill="#3A2341">3:1</text>`
        : (ART.has(RINFO[d.type].art) ? `<image href="${artSrc(RINFO[d.type].art)}" x="${px-13}" y="${py-18}" width="26" height="26"/>` : `<g transform="translate(${px} ${py-5}) scale(.55)">${resGlyph(d.type)}</g>`)
          + `<text x="${px}" y="${py+16}" text-anchor="middle" font-family="Mochiy Pop One" font-size="10" fill="#3A2341">2:1</text>`}
    </g>`;
  });
  S.board.tiles.forEach((t,i)=>{
    const hx = HEX[i], info = RINFO[t.type];
    out += `<g aria-label="${info.tile}${t.num?', number '+t.num:''}">`;
    if(ART.has(info.tileArt)){
      const ww = SQ3*(HR-2), hh = 2*(HR-2);
      out += `<image href="${artSrc(info.tileArt)}" x="${hx.x-ww/2}" y="${hx.y-hh/2}" width="${ww}" height="${hh}" preserveAspectRatio="none"/>`;
    } else {
      out += `<polygon points="${hexPoints(hx.x,hx.y,HR-3)}" fill="${info.fill}" stroke="#3A2341" stroke-width="3.5" stroke-linejoin="round"/>`;
      out += `<g transform="translate(${hx.x} ${hx.y-(t.num?20:0)}) scale(${t.num?1.05:1.4})">${resGlyph(t.type)}</g>`;
    }
    if(t.num){
      const hot = t.num===6||t.num===8, ty = hx.y+(ART.has(info.tileArt)?24:22);
      out += `<circle cx="${hx.x}" cy="${ty}" r="17" fill="#fff" stroke="#3A2341" stroke-width="2.6"/>
        <text x="${hx.x}" y="${ty+4}" text-anchor="middle" font-family="Mochiy Pop One" font-size="15" fill="${hot?'#E0335A':'#3A2341'}">${t.num}</text>
        ${Array.from({length:pips(t.num)},(_,k)=>`<circle cx="${hx.x+(k-(pips(t.num)-1)/2)*4.2}" cy="${ty+11}" r="1.4" fill="${hot?'#E0335A':'#3A2341'}"/>`).join('')}`;
    }
    out += `</g>`;
  });
  Object.entries(S.roads).forEach(([e,p])=>{
    const a=V[E[e].a], b=V[E[e].b], c=BREEDS[S.players[p].breed].color;
    const x1=a.x+(b.x-a.x)*.16, y1=a.y+(b.y-a.y)*.16, x2=a.x+(b.x-a.x)*.84, y2=a.y+(b.y-a.y)*.84;
    out += `<g aria-hidden="true"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3A2341" stroke-width="12" stroke-linecap="round"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="7" stroke-linecap="round"/>
      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="1.8" stroke-dasharray="2 5" stroke-linecap="round" opacity=".85"/></g>`;
  });
  const vh = HEX[S.vac];
  out += `<g transform="translate(${vh.x} ${vh.y-14})" aria-label="The Vacuum"><g class="vac-bob">${vacuumSVG()}</g></g>`;
  Object.entries(S.bld).forEach(([v,b])=>{
    const c = BREEDS[S.players[b.p].breed].color;
    out += `<g transform="translate(${V[v].x} ${V[v].y}) scale(1.15)" aria-hidden="true">${b.t==='tower'?towerShape(c):bedShape(c)}</g>`;
  });
  const mode = boardMode(), p = S.cur;
  if(mode==='bed') validBeds(p, S.phase==='setup').forEach(v=>{
    out += `<g class="hot-v" data-v="${v}" tabindex="0" role="button" aria-label="Place a cat bed here"><circle cx="${V[v].x}" cy="${V[v].y}" r="9"/><circle class="hit" cx="${V[v].x}" cy="${V[v].y}" r="18"/></g>`;
  });
  if(mode==='tower') validTowers(p).forEach(v=>{
    out += `<g class="hot-v" data-t="${v}" tabindex="0" role="button" aria-label="Upgrade to a cat tower"><circle cx="${V[v].x}" cy="${V[v].y-22}" r="8"/><circle class="hit" cx="${V[v].x}" cy="${V[v].y}" r="22"/></g>`;
  });
  if(mode==='path') validPaths(p, S.phase==='setup'?S.setup.lastBed:null).forEach(e=>{
    const a=V[E[e].a], b=V[E[e].b];
    const x1=a.x+(b.x-a.x)*.2, y1=a.y+(b.y-a.y)*.2, x2=a.x+(b.x-a.x)*.8, y2=a.y+(b.y-a.y)*.8;
    out += `<g class="hot-e" data-e="${e}" tabindex="0" role="button" aria-label="Roll out a yarn path here"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="22"/><line class="show" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></g>`;
  });
  if(mode==='vacuum') HEX.forEach((hx,i)=>{ if(i===S.vac) return;
    out += `<g class="hot-h" data-h="${i}" tabindex="0" role="button" aria-label="Send the Vacuum to ${RINFO[S.board.tiles[i].type].tile}"><polygon points="${hexPoints(hx.x,hx.y,HR-8)}"/></g>`;
  });
  svg.innerHTML = out;
}

const FACES = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
function renderDice(show){
  const el = $('#dice'); if(!el) return;
  const d = show || S.dice;
  const seven = !ui.rolling && S.rolled && d[0]+d[1]===7;
  const die = n => `<span class="die${ui.rolling?' rolling':''}${seven?' seven':''}" aria-hidden="true">${Array.from({length:9},(_,i)=>`<i class="${FACES[n].includes(i)?'on':''}"></i>`).join('')}</span>`;
  el.innerHTML = die(d[0]) + die(d[1]) + `<span class="sum">${!ui.rolling && S.rolled ? d[0]+d[1] : ''}</span>`;
}

function hintText(){
  const cur = pname(S.cur);
  if(!myTurn()){
    if(S.sub==='discard'){
      if(discardSeat()>=0) return {alert:true, t:`The Vacuum! Choose cards to drop.`};
      return {alert:true, t:`Waiting for ${S.discardQ.map(pname).join(', ')} to drop cards.`};
    }
    if(S.offer && S.offer.to===ON.seat) return `${pname(S.offer.from)} sent you a trade offer.`;
    if(S.phase==='setup') return `${cur} is placing a ${S.setup.step==='bed'?'cat bed':'yarn path'}.`;
    if(S.sub==='vacuum') return {alert:true, t:`${cur} is moving the Vacuum.`};
    if(ON.seat<0) return `You're watching. ${cur} is taking a turn.`;
    return `${cur} is taking a turn.`;
  }
  if(S.phase==='setup'){
    const round = S.setup.i < S.players.length ? 'first' : 'second';
    return S.setup.step==='bed'
      ? `Tap a glowing spot to place your ${round} cat bed.${round==='second'?' It collects one card from each tile it touches.':''}`
      : `Now roll out a yarn path from that bed.`;
  }
  if(S.sub==='discard') return {alert:true, t: S.online ? `The Vacuum! Waiting for ${S.discardQ.map(pname).join(', ')} to drop cards.` : `The Vacuum! Cats holding more than 7 cards drop half.`};
  if(S.sub==='vacuum') return {alert:true, t:`Tap a tile to send the Vacuum there. That tile stops producing.`};
  if(S.sub==='steal') return {alert:true, t:`Choose a cat to swipe a card from.`};
  if(S.sub==='spree') return `Yarn spree: place ${S.subData.left} more free path${S.subData.left>1?'s':''}.`;
  if(S.offer) return `Waiting for ${pname(S.offer.to)} to answer your trade.`;
  if(ui.mode==='bed') return `Tap a glowing corner to build a cat bed. It needs to touch your yarn.`;
  if(ui.mode==='path') return `Tap a glowing edge to roll out yarn.`;
  if(ui.mode==='tower') return `Tap one of your cat beds to upgrade it.`;
  if(!S.rolled) return `Roll the dice to see which tiles produce.`;
  return `Build, trade or play a treat, then end your turn.`;
}

function renderPanel(){
  const p = S.cur, cp = P(), br = BREEDS[cp.breed];
  const mine = me(), mp = mine>=0 ? S.players[mine] : null;
  const play = S.phase==='play', mt = myTurn();
  const free = play && mt && S.rolled && !S.sub && !S.offer;
  const h = hintText(); const hObj = typeof h==='string'?{t:h}:h;
  const can = k => free && canPay(cp.res,COST[k]);
  const bedOK = can('bed') && cp.pieces.bed>0 && validBeds(p,false).length>0;
  const pathOK = can('path') && cp.pieces.path>0 && validPaths(p).length>0;
  const towerOK = can('tower') && cp.pieces.tower>0 && validTowers(p).length>0;
  const treatOK = can('treat') && S.deck.length>0;
  const buildBtn = (k,label,sub,ok,icon) => `<button class="build${ui.mode===k?' active':''}" ${ok||ui.mode===k?'':'disabled'} onclick="G.mode('${k}')" aria-pressed="${ui.mode===k}">
      ${icon}<span class="nm">${label}<small>${sub}</small></span>${costChips(COST[k])}</button>`;
  const lens = S.players.map((_,i)=>roadLength(i));
  const youLabel = S.online ? (mine===p ? 'Your turn' : `${pname(p)}'s turn`) : pname(p);
  const pts = vp(p,false);

  let html = `
  <section class="card turn-card" style="--pc:${br.color}">
    <div class="turn">${portrait(cp.breed)}<div><div class="who">${youLabel}</div>
      <div class="sub">${S.phase==='setup'?'Setting up':'Round '+Math.ceil(S.turn/S.players.length)} · ${pts} point${pts===1?'':'s'}</div></div></div>
    <div class="hint${hObj.alert?' alert':''}">${hObj.t}</div>
    ${play ? `<div class="dice-row" style="margin-top:12px"><div id="dice" class="dice-row" style="gap:8px"></div>
      ${mt?`<button class="btn primary" onclick="G.roll()" ${S.rolled||S.sub||ui.rolling?'disabled':''}>Roll dice</button>`:''}</div>` : ''}
    ${ui.mode && !S.sub && mt ? `<div style="margin-top:10px"><button class="btn small" onclick="G.mode(null)">Cancel building</button></div>` : ''}
  </section>`;

  if(mp){
    const hidden = mp.cards.filter(c=>c.t==='trophy').length;
    html += `<section class="card" aria-label="Your cards">
    <h3>${S.online?'Your paws':pname(mine)+"'s paws"}${hidden?` <small class="muted">+${hidden} secret point${hidden>1?'s':''}</small>`:''}</h3>
    <div class="hand">${RES.map(r=>`<div class="res${mp.res[r]?'':' zero'}${ui.flash[r]?' flash':''}" style="--tile:${RINFO[r].fill}">${resIcon(r)}<b>${mp.res[r]}</b><span>${RINFO[r].name}</span></div>`).join('')}</div>
    </section>`;
  }

  if(play && mt){
    html += `<section class="card">
    <h3>Build</h3>
    <div class="builds">
      ${buildBtn('path','Yarn path', `${cp.pieces.path} left · connects your beds`, pathOK, pathIcon(br.color))}
      ${buildBtn('bed','Cat bed', `${cp.pieces.bed} left · 1 point`, bedOK, `<svg viewBox="-19 -21 38 37" width="32" height="31" aria-hidden="true">${bedShape(br.color)}</svg>`)}
      ${buildBtn('tower','Cat tower', `${cp.pieces.tower} left · 2 points, collects double`, towerOK, `<svg viewBox="-21 -33 42 52" width="28" height="35" aria-hidden="true">${towerShape(br.color)}</svg>`)}
      <button class="build" ${treatOK?'':'disabled'} onclick="G.buyTreat()">${treatIcon('gift',30)}<span class="nm">Treat card<small>${S.deck.length} in the jar</small></span>${costChips(COST.treat)}</button>
    </div>
    <div class="row" style="margin-top:10px">
      <button class="btn small" ${free?'':'disabled'} onclick="G.open('bank')">Trade with the shop</button>
      <button class="btn small" ${free?'':'disabled'} onclick="G.open('trade')">Trade with a cat</button>
    </div>
    <div style="margin-top:12px"><button class="btn hot block" ${S.rolled&&!S.sub&&!S.offer?'':'disabled'} onclick="G.endTurn()">End turn</button></div>
    </section>`;
  }

  if(play && mp){
    html += `<section class="card">
    <h3>Treat cards</h3>
    ${mp.cards.length ? `<div class="treats">${mp.cards.map((c,i)=>{
      const fresh = c.turn>=S.turn, vpCard = c.t==='trophy';
      const ok = mt && !vpCard && !fresh && !S.playedTreat && !S.sub && (c.t==='zoomies' || S.rolled);
      return `<button class="treat${fresh?' new':''}" ${ok?'':'disabled'} onclick="G.playTreat(${i})" title="${esc(TREATS[c.t].text)}">${treatIcon(c.t)}${TREATS[c.t].name}${vpCard?'<br><small>secret point</small>':fresh?'<br><small>next turn</small>':''}</button>`; }).join('')}</div>`
      : `<p class="empty">No treats yet. Buy one with Catnip, Nibbles and Fish.</p>`}
    </section>`;
  }

  html += `<section class="card">
    <h3>Cats</h3>
    <div class="players">${S.players.map((q,i)=>`<div class="pl${i===p?' cur':''}">
      ${portrait(q.breed)}
      <div><div class="nm"><span class="dot" style="background:${BREEDS[q.breed].color}"></span>${esc(q.name)}${S.online&&i===ON.seat?' (you)':''}${S.online&&ON.lobby&&!ON.online.includes(ON.lobby.seats[i]&&ON.lobby.seats[i].pid)?' <small class="muted">away</small>':''}${S.longest===i?'<span class="badge">Longest yarn</span>':''}${S.army===i?'<span class="badge" style="background:var(--butter)">Zoomiest</span>':''}</div>
      <div class="meta">${total(q.res)} cards · ${q.cards.length} treats · yarn ${lens[i]} · zoomies ${q.zoomies}</div></div>
      <div class="vp">${vp(i,false)}<small>of ${WIN_AT}</small></div></div>`).join('')}</div>
  </section>`;

  if(play) html += `<section class="card odds"><details><summary>Dice odds</summary>${oddsChart()}</details></section>`;
  html += `<section class="card"><details open><summary>What happened</summary><ul class="log">${S.log.slice(0,30).map(l=>`<li>${l}</li>`).join('')}</ul></details></section>`;
  $('#panel').innerHTML = html;
  if(!ui.rolling) renderDice();
}

function oddsChart(){
  const rolls = S.hist.reduce((a,b)=>a+b,0);
  const max = Math.max(1, ...S.hist, ...Array.from({length:11},(_,k)=>rolls*pips(k+2)/36));
  const W=300,H=120,bw=20,gap=(W-11*bw)/12;
  let bars='';
  for(let s=2;s<=12;s++){
    const x = gap+(s-2)*(bw+gap), exp = rolls*pips(s)/36, act = S.hist[s];
    const he = rolls? exp/max*(H-30):pips(s)/6*(H-30), ha = act/max*(H-30);
    bars += `<rect x="${x}" y="${H-18-he}" width="${bw}" height="${he}" rx="4" fill="#EBE5FF" stroke="#3A2341" stroke-width="1.5" stroke-dasharray="3 2"/>
      <rect x="${x+4}" y="${H-18-ha}" width="${bw-8}" height="${ha}" rx="3" fill="${s===7?'#F2607F':'#8EDFC0'}" stroke="#3A2341" stroke-width="1.5"/>
      <text x="${x+bw/2}" y="${H-4}" text-anchor="middle" font-size="11" font-weight="700" fill="#3A2341">${s}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dice results compared with expected odds after ${rolls} rolls">${bars}</svg>
  <div class="legend"><span><i style="background:#EBE5FF;border-style:dashed"></i>Expected</span><span><i style="background:#8EDFC0"></i>Rolled</span><span>${rolls} roll${rolls===1?'':'s'} so far</span></div>`;
}

/* ---------- overlays ---------- */
let lastOverlay = '';
function renderOverlay(){
  const o = $('#overlay');
  let html = '';
  if(S){
    if(S.phase==='over' && !ui.hideWin) html = winHTML();
    else if(S.handoff && !S.online) html = handoffHTML();
    else if(discardSeat()>=0) html = discardHTML();
    else if(S.sub==='steal' && myTurn()) html = stealHTML();
    else if(S.offer && (!S.online || ON.seat===S.offer.to)) html = offerHTML();
    else if(S.offer && S.online && ON.seat===S.offer.from) html = offerWaitHTML();
    else if(ui.modal) html = modalHTML();
  } else if(ui.modal) html = modalHTML();
  const full = html ? `<div class="overlay" role="dialog" aria-modal="true">${html}</div>` : '';
  if(full===lastOverlay) return;
  const sameKind = lastOverlay && full && lastOverlay.slice(0,120)===full.slice(0,120);
  lastOverlay = full;
  o.innerHTML = full;
  if(!sameKind){ const f = o.querySelector('[autofocus], .modal button:not(:disabled), .modal input'); if(f) f.focus({preventScroll:true}); }
}
function handoffHTML(){
  const pl = P();
  return `<div class="modal handoff">${portrait(pl.breed)}
    <h2>${pname(S.cur)}'s turn</h2>
    <p>${S.phase==='setup'?'Place a cat bed and a yarn path.':'Pass the screen to '+pname(S.cur)+'. Their paws stay hidden until they tap.'}</p>
    <div class="actions center"><button class="btn primary" autofocus onclick="G.startTurn()">I'm ${pname(S.cur)}, let's go</button></div></div>`;
}
function stepperRows(sel, max, fn, showHeld){
  return `<div class="steppers">${RES.map(r=>`<div class="stepper" style="--tile:${RINFO[r].fill}">${resIcon(r)}<span><b>${RINFO[r].name}</b>${showHeld?` <small>(${max[r]} held)</small>`:''}</span>
    <span class="ctrl"><button aria-label="Fewer ${RINFO[r].name}" onclick="${fn}('${r}',-1)" ${sel[r]<=0?'disabled':''}>−</button><b>${sel[r]}</b><button aria-label="More ${RINFO[r].name}" onclick="${fn}('${r}',1)" ${sel[r]>=max[r]?'disabled':''}>+</button></span></div>`).join('')}</div>`;
}
function discardHTML(){
  const p = discardSeat(), pl = S.players[p];
  if(!ui.discardSel || ui.discardFor!==p){ ui.discardSel = emptyRes(); ui.discardFor = p; }
  const need = Math.floor(total(pl.res)/2), got = total(ui.discardSel);
  return `<div class="modal"><div class="turn" style="margin-bottom:8px">${portrait(pl.breed)}<div><h2>${S.online?'The Vacuum is coming':pname(p)+', the Vacuum is coming'}</h2></div></div>
    <p>You hold ${total(pl.res)} cards. ${S.online?'':'Pass the screen to '+pname(p)+' and '}Choose ${need} to drop.</p>
    ${stepperRows(ui.discardSel, pl.res, 'G.discardStep', true)}
    <div class="actions"><button class="btn hot" ${got===need?'':'disabled'} onclick="G.confirmDiscard()">Drop ${got} of ${need}</button></div></div>`;
}
function stealHTML(){
  return `<div class="modal"><h2>Swipe a card</h2><p>These cats live next to the Vacuum. Pick one to take a random card from.</p>
    <div class="partner">${S.subData.victims.map(v=>`<button onclick="G.steal(${v})">${portrait(S.players[v].breed)}${pname(v)} (${total(S.players[v].res)})</button>`).join('')}</div></div>`;
}
function offerHTML(){
  const o = S.offer, q = S.players[o.to];
  const ok = RES.every(r=>q.res[r]>=o.get[r]);
  return `<div class="modal"><div class="turn" style="margin-bottom:8px">${portrait(q.breed)}<div><h2>${S.online?'A trade offer':pname(o.to)+', a trade offer'}</h2></div></div>
    <p><b>${pname(o.from)} gives you:</b> ${describe(o.give)||'nothing'}</p>
    <p><b>You give ${pname(o.from)}:</b> ${describe(o.get)||'nothing'}</p>
    ${ok?'':`<p class="hint alert">You don't have enough to accept this.</p>`}
    <div class="actions"><button class="btn" onclick="G.tradeDecline()">No thanks</button><button class="btn primary" ${ok?'':'disabled'} onclick="G.tradeAccept()">Accept trade</button></div></div>`;
}
function offerWaitHTML(){
  const o = S.offer;
  return `<div class="modal handoff">${portrait(S.players[o.to].breed)}<h2>Offer sent</h2>
    <p>You give ${describe(o.give)||'nothing'} and get ${describe(o.get)||'nothing'}. Waiting for ${pname(o.to)} to answer.</p>
    <div class="actions center"><button class="btn" onclick="G.tradeCancel()">Cancel offer</button></div></div>`;
}
function winHTML(){
  const w = S.winner;
  const order = S.players.map((_,i)=>i).sort((a,b)=>vp(b,true)-vp(a,true));
  return `<div class="modal handoff win">${portrait(S.players[w].breed,'win')}
    <h2>${S.online&&w===ON.seat?'You win!':pname(w)+' wins!'}</h2><p>The comfiest cat on Whisker Isles.</p>
    <div class="scores">${order.map(i=>`<div><span>${pname(i)}</span><b>${vp(i,true)} points</b></div>`).join('')}</div>
    <div class="actions center"><button class="btn small" onclick="G.hideWin()">Look at the board</button><button class="btn primary" onclick="G.toStart()">Play again</button></div></div>`;
}
function modalHTML(){
  const m = ui.modal;
  if(m.kind==='rules') return rulesHTML();
  if(m.kind==='newgame') return S && S.online
    ? `<div class="modal"><h2>Leave this game?</h2><p>You can come back with code <b>${esc(S.code)}</b> while the game is still running.</p><div class="actions"><button class="btn" onclick="G.close()">Stay</button><button class="btn hot" onclick="G.toStart()">Leave game</button></div></div>`
    : `<div class="modal"><h2>Start a new game?</h2><p>This game will be lost.</p><div class="actions"><button class="btn" onclick="G.close()">Keep playing</button><button class="btn hot" onclick="G.toStart()">Start a new game</button></div></div>`;
  if(m.kind==='bought') return `<div class="modal handoff"><div class="big-ic">${treatIcon(m.t,120)}</div><h2>${TREATS[m.t].name}</h2><p>${TREATS[m.t].text}</p><p class="empty">${m.t==='trophy'?'It counts toward your score right away, but stays secret.':'You can play it from your next turn.'}</p><div class="actions center"><button class="btn primary" onclick="G.close()">Got it</button></div></div>`;
  if(m.kind==='stolen') return `<div class="modal handoff"><div class="big-ic">${resIcon(m.r,90)}</div><h2>You swiped ${RINFO[m.r].name}</h2><p>Taken from ${pname(m.from)}.</p><div class="actions center"><button class="btn primary" onclick="G.close()">Nice</button></div></div>`;
  if(m.kind==='gift'){
    return `<div class="modal"><h2>Gift basket</h2><p>Pick 2 resources. You can pick the same one twice.</p>
      <div class="pick">${RES.map(r=>`<button style="--tile:${RINFO[r].fill}" onclick="G.giftPick('${r}')">${resIcon(r)}${RINFO[r].name}</button>`).join('')}</div>
      <p style="margin-top:10px">In the basket: ${m.pick.length?m.pick.map(r=>RINFO[r].name).join(' and '):'nothing yet'}</p>
      <div class="actions"><button class="btn" ${m.pick.length?'':'disabled'} onclick="G.giftReset()">Start over</button><button class="btn primary" ${m.pick.length===2?'':'disabled'} onclick="G.giftTake()">Take them</button></div></div>`;
  }
  if(m.kind==='pounce'){
    return `<div class="modal"><h2>Pounce</h2><p>Name a resource. Every other cat hands over all of theirs.</p>
      <div class="pick">${RES.map(r=>`<button style="--tile:${RINFO[r].fill}" aria-pressed="${m.pick===r}" onclick="G.pouncePick('${r}')">${resIcon(r)}${RINFO[r].name}</button>`).join('')}</div>
      <div class="actions"><button class="btn primary" ${m.pick?'':'disabled'} onclick="G.pounceGo()">Pounce on ${m.pick?RINFO[m.pick].name:'…'}</button></div></div>`;
  }
  if(m.kind==='bank'){
    const pl = P();
    const r = m.give ? rate(S.cur,m.give) : 0;
    return `<div class="modal"><h2>Trade with the shop</h2><p>Swap 4 of one kind for 1 of another. Beds and towers on a dock get a better rate.</p>
      <div class="sec-label">You give</div>
      <div class="pick">${RES.map(x=>{ const rt=rate(S.cur,x); return `<button style="--tile:${RINFO[x].fill}" aria-pressed="${m.give===x}" ${pl.res[x]>=rt?'':'disabled'} onclick="G.bankGive('${x}')">${resIcon(x)}${RINFO[x].name}<br>${rt} for 1</button>`; }).join('')}</div>
      <div class="sec-label">You get</div>
      <div class="pick">${RES.map(x=>`<button style="--tile:${RINFO[x].fill}" aria-pressed="${m.get===x}" ${x===m.give?'disabled':''} onclick="G.bankGet('${x}')">${resIcon(x)}${RINFO[x].name}</button>`).join('')}</div>
      <div class="actions"><button class="btn" onclick="G.close()">Close</button><button class="btn primary" ${m.give&&m.get?'':'disabled'} onclick="G.bankGo()">${m.give&&m.get?`Trade ${r} ${RINFO[m.give].name} for 1 ${RINFO[m.get].name}`:'Pick what to swap'}</button></div></div>`;
  }
  if(m.kind==='trade'){
    const pl = P();
    const others = S.players.map((_,i)=>i).filter(i=>i!==S.cur);
    const big = {litter:9,yarn:9,nip:9,nib:9,fish:9};
    return `<div class="modal wide"><h2>Trade with a cat</h2>
      <div class="sec-label">With</div>
      <div class="partner">${others.map(i=>`<button aria-pressed="${m.partner===i}" onclick="G.tradePartner(${i})">${portrait(S.players[i].breed)}${pname(i)} (${total(S.players[i].res)})</button>`).join('')}</div>
      <div class="cols"><div><div class="sec-label">You give</div>${stepperRows(m.give, pl.res, 'G.tradeGive', true)}</div>
      <div><div class="sec-label">You want</div>${stepperRows(m.get, big, 'G.tradeGet', false)}</div></div>
      <div class="actions"><button class="btn" onclick="G.close()">Close</button><button class="btn primary" ${m.partner!=null&&(total(m.give)||total(m.get))?'':'disabled'} onclick="G.tradeOffer()">${m.partner!=null?'Offer to '+pname(m.partner):'Pick a cat'}</button></div></div>`;
  }
  return '';
}
function rulesHTML(){
  return `<div class="modal rules"><h2>How to play</h2>
  <p>Be the first cat to reach ${WIN_AT} points by building beds and towers across the island. Play with 2 to 4 cats on the classic island, or 5 to 10 on Big Island.</p>
  <h3>Setting up</h3><ul><li>Each cat places a bed and a yarn path, then again in reverse order.</li><li>Your second bed collects one card from each tile it touches.</li><li>Beds can't sit right next to another bed. Leave at least one corner between.</li></ul>
  <h3>Your turn</h3><ul><li>Roll two dice. Every tile showing that number gives a card to each bed touching it (towers get two).</li><li>Build, trade and play one treat card, in any order.</li><li>End your turn.</li></ul>
  <h3>Building</h3><ul>
   <li>Yarn path: ${describe(COST.path)}. Paths extend from your beds and other paths.</li>
   <li>Cat bed: ${describe(COST.bed)}. 1 point. Must touch your yarn.</li>
   <li>Cat tower: ${describe(COST.tower)}. Upgrades a bed. 2 points, collects double.</li>
   <li>Treat card: ${describe(COST.treat)}. Drawn from the treat jar.</li></ul>
  <h3>The Vacuum</h3><ul><li>Rolling 7 switches it on. Anyone holding more than 7 cards drops half.</li><li>The roller moves the Vacuum to a tile. That tile stops producing until it moves again.</li><li>The roller swipes one random card from a cat with a bed on that tile.</li></ul>
  <h3>Trading</h3><ul><li>Offer any mix of cards to another cat on your turn.</li><li>Trade with the shop at 4 for 1. A bed on a 3:1 dock makes it 3 for 1, and a matching 2:1 dock makes that resource 2 for 1.</li></ul>
  <h3>Bonus points</h3><ul><li>Longest yarn: 2 points for the first unbroken trail of 5 or more paths. Longer trails steal it.</li><li>Zoomiest cat: 2 points for the first to play 3 Zoomies. More Zoomies steal it.</li><li>Cat show trophies: 1 secret point each.</li></ul>
  <h3>Treat cards</h3><ul>${Object.values(TREATS).map(t=>`<li><b>${t.name}:</b> ${t.text}</li>`).join('')}<li>A treat can't be played on the turn you buy it, and only one per turn.</li></ul>
  <h3>Playing online</h3><ul><li>Create a game and share its code. Friends open this page, enter the code and pick a cat.</li><li>The host starts the game once everyone is in. If you lose connection, open the page again and rejoin with the same code.</li></ul>
  <div class="actions"><button class="btn primary" onclick="G.close()">Back</button></div></div>`;
}

/* ---------- start and lobby screens ---------- */
function heroHTML(){
  const art = ART.has('logo-art') ? `<img class="hero-art" src="${artSrc('logo-art')}" alt="Four chibi cats waving from a little island">`
    : `<div class="hero-art fallback">${[0,1,2,3].map(i=>`<span>${catSVG(i)}</span>`).join('')}</div>`;
  return `<div class="hero"><div class="hero-frame">${art}<h1>Whisker Isles</h1></div>
    <p>Claim the comfiest corners of the island. Build cat beds, roll out yarn, trade snacks and keep away from the Vacuum.</p></div>`;
}
function breedPicker(sel, taken, fn){
  return `<div class="breeds" role="radiogroup" aria-label="Pick your cat">${BREEDS.map((b,i)=>`<button role="radio" aria-checked="${sel===i}" aria-label="${b.label}" title="${b.label}" ${taken.includes(i)?'disabled':''} onclick="${fn}(${i})" style="--pc:${b.color}">${catArt(i)}</button>`).join('')}</div>`;
}
function startScreen(){
  if(!ui.seats) ui.seats = DEFAULT_NAMES.slice(0,3).map((n,i)=>({name:n, breed:i}));
  if(!ui.form){
    const q = new URLSearchParams(location.search).get('game');
    ui.form = {name: store.get('whisker-isles-name') || '', breed: +(store.get('whisker-isles-breed')||0) || 0, code: q ? normCode(q) : ''};
  }
  const saved = loadSave();
  const seats = ui.seats, n = seats.length;
  const busy = ['creating','connecting'].includes(ON.status);
  return `<main class="start">
    ${heroHTML()}
    ${ON.err?`<p class="hint alert" role="alert" style="max-width:680px;margin:14px auto 0">${esc(ON.err)}</p>`:''}
    <div class="modes">
      <section class="card mode">
        <h2>Play online with friends</h2>
        <p class="muted">Everyone plays on their own phone or laptop.</p>
        <label class="field">Your name<input id="on-name" maxlength="14" value="${esc(ui.form.name)}" placeholder="e.g. Mochi" oninput="G.formName(this.value)"></label>
        <div class="field">Your cat</div>
        ${breedPicker(ui.form.breed, [], 'G.formBreed')}
        <div class="online-actions">
          <button class="btn primary" ${busy?'disabled':''} onclick="G.create()">${ON.status==='creating'?'Making a code…':'Create a game'}</button>
          <span class="or">or</span>
          <form class="join" onsubmit="event.preventDefault();G.join()">
            <input id="on-code" value="${esc(ui.form.code)}" placeholder="sleepy-tuna-42" aria-label="Game code" autocapitalize="none" autocomplete="off" spellcheck="false" oninput="G.formCode(this.value)">
            <button class="btn" ${busy?'disabled':''}>${ON.status==='connecting'?'Joining…':'Join'}</button>
          </form>
        </div>
      </section>
      <section class="card mode">
        <h2>Play on one device</h2>
        <p class="muted">Pass the screen around. ${n>MAX_CLASSIC?'<b>Big Island</b> for 5 to 10 cats.':'Classic island for 2 to 4 cats. Add a 5th for Big Island.'}</p>
        <div class="seats">${seats.map((s,i)=>`<div class="seat">
          <button class="portrait" style="--pc:${BREEDS[s.breed].color}" onclick="G.seatBreed(${i})" aria-label="Change cat for ${esc(s.name)}" title="Tap to change cat">${catArt(s.breed)}</button>
          <input value="${esc(s.name)}" maxlength="14" aria-label="Name for cat ${i+1}" oninput="G.seatName(${i},this.value)">
          ${n>2?`<button class="x" aria-label="Remove ${esc(s.name)}" onclick="G.seatRemove(${i})">×</button>`:''}
        </div>`).join('')}
        ${n<MAX_CATS?`<button class="seat add" onclick="G.seatAdd()"><span>+</span>Add a cat</button>`:''}</div>
        <div class="online-actions">
          ${saved && saved.phase!=='over' ? `<button class="btn" onclick="G.resume()">Continue saved game</button>` : ''}
          <button class="btn primary" onclick="G.start()">Start with ${n} cats</button>
        </div>
      </section>
    </div>
    <p class="center" style="margin-top:18px"><button class="btn small" onclick="G.open('rules')">How to play</button></p>
  </main>`;
}
function lobbyScreen(){
  const L = ON.lobby, isHost = L.host===ON.pid, n = L.seats.length;
  const link = location.origin + location.pathname + '?game=' + L.code;
  const taken = L.seats.filter(s=>s.pid!==ON.pid).map(s=>s.breed);
  const mySeat = L.seats.find(s=>s.pid===ON.pid);
  return `<main class="start lobby">
    <section class="card code-card">
      <p class="muted">Share this code so friends can join</p>
      <div class="big-code">${esc(L.code)}</div>
      <div class="row center">
        <button class="btn small" onclick="G.copy('${esc(L.code)}', this)">Copy code</button>
        <button class="btn small" onclick="G.copy('${esc(link)}', this)">Copy invite link</button>
      </div>
    </section>
    <section class="card">
      <h2>${n} cat${n===1?'':'s'} in the lobby <small class="muted">${n>MAX_CLASSIC?'Big Island':'Classic island'}, up to ${MAX_CATS}</small></h2>
      <div class="lobby-seats">${L.seats.map(s=>`<div class="lseat${s.pid===ON.pid?' me':''}">
        ${portrait(s.breed)}<b>${esc(s.name)}</b><small>${s.pid===L.host?'Host':''}${s.pid===ON.pid?(s.pid===L.host?' · you':'You'):''}${!ON.online.includes(s.pid)?' · away':''}</small></div>`).join('')}</div>
      ${mySeat?`<div class="field" style="margin-top:14px">Your cat</div>${breedPicker(mySeat.breed, taken, 'G.lobbyBreed')}`:''}
      <div class="online-actions">
        <button class="btn" onclick="G.toStart()">Leave</button>
        ${isHost ? `<button class="btn primary" ${n>=2?'':'disabled'} onclick="G.hostStart()">${n>=2?`Start with ${n} cats`:'Waiting for a friend to join'}</button>`
          : `<span class="muted">Waiting for the host to start…</span>`}
      </div>
    </section>
  </main>`;
}

/* =====================================================================
   Controller (called from markup)
   ===================================================================== */
const G = {
  /* hot-seat setup */
  start(){
    const seats = ui.seats.map(s=>({name:s.name.trim()||BREEDS[s.breed].label, breed:s.breed}));
    ui.modal=null; ui.mode=null; ui.hideWin=false; $('#root').innerHTML='';
    newGame(seats, {online:false}); save(); render(); window.scrollTo(0,0);
  },
  resume(){ S = loadSave(); buildGeo(S.board.radius); ui.modal=null; $('#root').innerHTML=''; render(); window.scrollTo(0,0); },
  toStart(){
    if(S && S.online) leaveOnline(); else store.del(SAVE_KEY);
    if(!S && ON.status==='lobby') leaveOnline();
    S=null; ui.modal=null; ui.mode=null; ui.hideWin=false; ON.err=null; $('#root').innerHTML=''; render(); window.scrollTo(0,0);
  },
  seatName(i,v){ ui.seats[i].name=v; },
  seatBreed(i){
    const used = ui.seats.filter((s,j)=>j!==i).map(s=>s.breed);
    let b = ui.seats[i].breed;
    for(let k=0;k<BREEDS.length;k++){ b=(b+1)%BREEDS.length; if(!used.includes(b)) break; }
    ui.seats[i].breed=b; render();
  },
  seatAdd(){ if(ui.seats.length>=MAX_CATS) return; const used=ui.seats.map(s=>s.breed); const b=BREEDS.findIndex((_,i)=>!used.includes(i)); const names=DEFAULT_NAMES.filter(n=>!ui.seats.some(s=>s.name===n)); ui.seats.push({name:names[0]||('Cat '+(ui.seats.length+1)), breed:b}); render(); },
  seatRemove(i){ if(ui.seats.length<=2) return; ui.seats.splice(i,1); render(); },
  /* online setup */
  formName(v){ ui.form.name=v; store.set('whisker-isles-name', v); },
  formBreed(i){ ui.form.breed=i; store.set('whisker-isles-breed', String(i)); render(); },
  formCode(v){ ui.form.code=v; },
  create(){ if(!ui.form.name.trim()){ ON.err='Add your name so friends know who you are.'; render(); $('#on-name').focus(); return; } createOnline(); },
  join(){ if(!ui.form.name.trim()){ ON.err='Add your name so friends know who you are.'; render(); $('#on-name').focus(); return; } ON.status='connecting'; connect(ui.form.code); },
  lobbyBreed(i){ if(ON.ws) ON.ws.send(JSON.stringify({type:'breed', breed:i})); ui.form.breed=i; store.set('whisker-isles-breed', String(i)); },
  hostStart(){
    const L = ON.lobby; if(L.host!==ON.pid || L.seats.length<2) return;
    newGame(L.seats.map(s=>({name:s.name, breed:s.breed})), {online:true, code:L.code});
    ON.ws.send(JSON.stringify({type:'start', state:S}));
    S = null;   // wait for the server to confirm, so every screen starts together
  },
  copy(text, btn){ navigator.clipboard && navigator.clipboard.writeText(text).then(()=>{ btn.textContent='Copied'; setTimeout(()=>render(),1200); }); },
  /* turns */
  startTurn(){ S.handoff=false; save(); render(); },
  roll, endTurn, buyTreat, playTreat,
  mode(k){ if(!myTurn()) return; ui.mode = (ui.mode===k||k===null)?null:k; render(); },
  open(kind){
    if(kind==='bank') ui.modal={kind, give:null, get:null};
    else if(kind==='trade') ui.modal={kind, partner:null, give:emptyRes(), get:emptyRes()};
    else ui.modal={kind};
    render();
  },
  close(){ ui.modal=null; render(); },
  hideWin(){ ui.hideWin=true; render(); },
  discardStep(r,d){ const p=discardSeat(); if(p<0) return; const pl=S.players[p]; const need=Math.floor(total(pl.res)/2); const n=ui.discardSel[r]+d; if(n<0||n>pl.res[r]||(d>0&&total(ui.discardSel)>=need)) return; ui.discardSel[r]=n; lastOverlay=''; renderOverlay(); },
  confirmDiscard, steal(v){ steal(v); },
  giftPick(r){ if(ui.modal.pick.length<2){ ui.modal.pick.push(r); renderOverlay(); } },
  giftReset(){ ui.modal.pick=[]; renderOverlay(); },
  giftTake(){ const pk=ui.modal.pick; pk.forEach(r=>P().res[r]++); log(`${pname(S.cur)} unpacks ${pk.map(r=>RINFO[r].name).join(' and ')} from a gift basket.`); ui.modal=null; commit(); },
  pouncePick(r){ ui.modal.pick=r; renderOverlay(); },
  pounceGo(){ const r=ui.modal.pick; let n=0; S.players.forEach((q,i)=>{ if(i!==S.cur){ n+=q.res[r]; q.res[r]=0; } }); P().res[r]+=n; log(`${pname(S.cur)} pounces on ${n} ${RINFO[r].name}.`); ui.modal=null; commit(); },
  bankGive(r){ ui.modal.give=r; if(ui.modal.get===r) ui.modal.get=null; renderOverlay(); },
  bankGet(r){ ui.modal.get=r; renderOverlay(); },
  bankGo(){ const m=ui.modal, rt=rate(S.cur,m.give), pl=P(); if(pl.res[m.give]<rt) return; pl.res[m.give]-=rt; pl.res[m.get]++; log(`${pname(S.cur)} trades ${rt} ${RINFO[m.give].name} at the shop for 1 ${RINFO[m.get].name}.`); m.give=null; m.get=null; commit(); },
  tradePartner(i){ ui.modal.partner=i; renderOverlay(); },
  tradeGive(r,d){ const m=ui.modal, n=m.give[r]+d; if(n<0||n>P().res[r]) return; m.give[r]=n; if(n>0) m.get[r]=0; renderOverlay(); },
  tradeGet(r,d){ const m=ui.modal, n=m.get[r]+d; if(n<0||n>9) return; m.get[r]=n; if(n>0) m.give[r]=0; renderOverlay(); },
  tradeOffer(){ const m=ui.modal; S.offer={from:S.cur, to:m.partner, give:{...m.give}, get:{...m.get}}; ui.modal=null; commit(); },
  tradeCancel(){ if(!S.offer) return; log(`${pname(S.offer.from)} withdraws a trade offer.`); S.offer=null; commit(); },
  tradeDecline(){ if(!S.offer) return; log(`${pname(S.offer.to)} turns down a trade.`); S.offer=null; commit(); },
  tradeAccept(){
    const o=S.offer; if(!o) return; const a=S.players[o.from], b=S.players[o.to];
    if(!RES.every(r=>a.res[r]>=o.give[r] && b.res[r]>=o.get[r])) return;
    RES.forEach(r=>{ a.res[r]+=o.get[r]-o.give[r]; b.res[r]+=o.give[r]-o.get[r]; });
    log(`${pname(o.from)} trades ${describe(o.give)||'nothing'} to ${pname(o.to)} for ${describe(o.get)||'nothing'}.`);
    S.offer=null; commit();
  }
};
window.G = G;

/* board clicks and keyboard */
function boardAct(t){
  const g = t.closest('[data-v],[data-e],[data-h],[data-t]'); if(!g) return;
  const mode = boardMode();
  if(g.dataset.v!==undefined && mode==='bed'){ const v=+g.dataset.v; if(canBed(S.cur,v,S.phase==='setup')) placeBed(v); }
  else if(g.dataset.t!==undefined && mode==='tower'){ placeTower(+g.dataset.t); }
  else if(g.dataset.e!==undefined && mode==='path'){ const e=+g.dataset.e; if(canPath(S.cur,e,S.phase==='setup'?S.setup.lastBed:null)) placePath(e); }
  else if(g.dataset.h!==undefined && mode==='vacuum'){ moveVacuum(+g.dataset.h); }
}
document.addEventListener('click', e=>{ if(e.target.closest && e.target.closest('#board')) boardAct(e.target); });
document.addEventListener('keydown', e=>{
  if((e.key==='Enter'||e.key===' ') && e.target.closest && e.target.closest('#board')){ e.preventDefault(); boardAct(e.target); }
  if(e.key==='Escape' && ui.modal && !['gift','pounce'].includes(ui.modal.kind)){ G.close(); }
});

/* boot: rejoin an online game from the link, or show the start screen */
(function boot(){
  const q = new URLSearchParams(location.search).get('game');
  render();
  if(q && ui.form.name.trim()){ ON.status='connecting'; connect(q); }
})();
