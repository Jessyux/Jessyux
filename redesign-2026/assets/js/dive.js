/* ==========================================================================
   dive.js — the shared scroll engine for jessyux
   One file, no dependencies. Every page gets:
     1. a depth model      sections declare data-depth, scroll interpolates
     2. a water background a gradient that darkens as you descend
     3. a life canvas      light rays near the surface, marine snow below
     4. reveals            .rv elements fade up once
     5. chart draws        [data-draw] containers get .drawn on entry
     6. counters           [data-count] numbers count up once
     7. the chain          #chain horizontal scroll-jack on wide screens

   Everything degrades: without JS the page renders complete and static,
   and prefers-reduced-motion disables motion but keeps all content visible.
   ========================================================================== */
(function(){
  var root=document.documentElement;
  root.classList.add('js');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Deepest point this page descends to. Challenger Deep by default; a page
     that stays in the sunlit zones sets <body data-max-depth="1200">.        */
  var MAX=parseFloat(document.body.dataset.maxDepth)||10994;

  /* --- 1. reveal --------------------------------------------------------- */
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{rootMargin:'0px 0px -8% 0px',threshold:.04});
  document.querySelectorAll('.rv').forEach(function(el){ io.observe(el); });

  var io2=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('drawn'); io2.unobserve(e.target); } });
  },{rootMargin:'0px 0px -12% 0px',threshold:.12});
  document.querySelectorAll('[data-draw]').forEach(function(el){ io2.observe(el); });

  /* --- 2. counters ------------------------------------------------------- */
  if(!reduce){
    var io3=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        io3.unobserve(e.target);
        var el=e.target, end=parseFloat(el.dataset.count), suf=el.dataset.suffix||'',
            txt=el.textContent, neg=end<0, abs=Math.abs(end), t0=performance.now();
        (function step(now){
          var p=Math.min(1,(now-t0)/1100), v=Math.round(abs*(1-Math.pow(1-p,3)));
          el.textContent=(neg?'−':'')+v.toLocaleString('en-AU')+suf;
          if(p<1) requestAnimationFrame(step); else el.textContent=txt;
        })(t0);
      });
    },{threshold:.5});
    document.querySelectorAll('[data-count]').forEach(function(el){ io3.observe(el); });
  }

  /* --- 2b. micro motion -------------------------------------------------- */
  if(!reduce){
    /* children of card grids rise one after another */
    var sg=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('go'); sg.unobserve(e.target); } });
    },{rootMargin:'0px 0px -8% 0px',threshold:.05});
    document.querySelectorAll('.grid,.kpis,.people,.annot,.meta').forEach(function(g){
      var kids=[].slice.call(g.children).filter(function(c){ return c.nodeType===1; });
      if(!kids.length||g.closest('.scroller')) return;
      g.classList.add('stagger');
      kids.forEach(function(k,i){ k.style.setProperty('--d',(i*80)+'ms'); });
      sg.observe(g);
    });

    /* headlines arrive word by word */
    var wio=new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('go'); wio.unobserve(e.target); } });
    },{rootMargin:'0px 0px -6% 0px',threshold:.1});
    document.querySelectorAll('h1,main h2').forEach(function(h){
      if(h.children.length) return;
      var txt=h.textContent.trim(); if(!txt) return;
      h.setAttribute('aria-label',txt);
      h.textContent='';
      txt.split(/\s+/).forEach(function(w,i,a){
        var s=document.createElement('span');
        s.className='wd'; s.setAttribute('aria-hidden','true'); s.style.setProperty('--w',i); s.textContent=w;
        h.appendChild(s);
        if(i<a.length-1) h.appendChild(document.createTextNode(' '));
      });
      h.classList.add('words'); wio.observe(h);
    });

    /* number tiles count up from zero the first time they are seen */
    var kio=new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        kio.unobserve(e.target);
        var el=e.target, node=null;
        [].slice.call(el.childNodes).forEach(function(n){ if(!node&&n.nodeType===3&&/\d/.test(n.nodeValue)) node=n; });
        if(!node) return;
        var orig=node.nodeValue, m=orig.match(/\d[\d,]*(\.\d+)?/); if(!m) return;
        var raw=m[0], num=parseFloat(raw.replace(/,/g,'')), dec=(raw.split('.')[1]||'').length,
            grp=raw.indexOf(',')>-1, t0=performance.now();
        (function step(now){
          var p=Math.min(1,(now-t0)/1000), v=num*(1-Math.pow(1-p,3)), s=v.toFixed(dec);
          if(grp) s=Number(s).toLocaleString('en-AU',{minimumFractionDigits:dec,maximumFractionDigits:dec});
          node.nodeValue=orig.replace(raw,s);
          if(p<1) requestAnimationFrame(step); else node.nodeValue=orig;
        })(t0);
      });
    },{threshold:.6});
    document.querySelectorAll('.kpi .v:not([data-count])').forEach(function(el){ kio.observe(el); });
  }

  /* personas wave on hover (CSS) and when tapped or clicked (this class, for touch screens) */
  [].slice.call(document.querySelectorAll('.persona')).forEach(function(p){
    var t;
    p.addEventListener('click',function(){
      p.classList.add('waving'); clearTimeout(t);
      t=setTimeout(function(){ p.classList.remove('waving'); },2200);
    });
  });

  /* --- 3. depth model ---------------------------------------------------- */
  /* Sections declare the depth at their TOP. Scroll position interpolates
     between them, then extrapolates to MAX over the final section.          */
  var marks=[].slice.call(document.querySelectorAll('[data-depth]')).map(function(el){
    return {el:el, d:parseFloat(el.dataset.depth)};
  });

  /* Keep in sync with the depth stop comment in tokens.css. */
  var stops=[
    {d:0,     a:[18,106,132], b:[10,74,102]},
    {d:200,   a:[13,95,126],  b:[7,64,92]},
    {d:1000,  a:[7,64,92],    b:[4,42,68]},
    {d:4000,  a:[4,34,58],    b:[2,20,36]},
    {d:6000,  a:[2,16,30],    b:[1,10,19]},
    {d:10994, a:[1,8,15],     b:[0,5,8]}
  ];
  function mix(x,y,t){return [Math.round(x[0]+(y[0]-x[0])*t),Math.round(x[1]+(y[1]-x[1])*t),Math.round(x[2]+(y[2]-x[2])*t)];}
  function rgb(c){return 'rgb('+c[0]+','+c[1]+','+c[2]+')';}
  function zoneOf(d){
    if(d<1) return 'Surface';
    if(d<200) return 'Epipelagic';
    if(d<1000) return 'Mesopelagic';
    if(d<4000) return 'Bathypelagic';
    if(d<6000) return 'Abyssopelagic';
    return 'Hadal';
  }

  var sea=document.getElementById('sea'),
      depthNum=document.getElementById('depthNum'),
      zoneName=document.getElementById('zoneName'),
      gaugeFill=document.getElementById('gaugeFill'),
      gaugeDot=document.getElementById('gaugeDot'),
      topfill=document.getElementById('topfill'),
      mread=document.getElementById('mread'),
      chain=document.getElementById('chain'),
      track=document.getElementById('track');
  var floats=[].slice.call(document.querySelectorAll('[data-float]'));
  var depth=0, lastY=scrollY, shownTitle='';

  /* The map's label is the title of the section you are in (data-title on the section),
     falling back to the depth zone name where a section has none. */
  function titleAt(d){
    var y=scrollY+innerHeight*0.55, t='';
    for(var i=0;i<marks.length;i++){
      if(marks[i].el.offsetTop<=y&&marks[i].el.dataset.title) t=marks[i].el.dataset.title;
    }
    return t||zoneOf(d);
  }

  /* Home, at the top of the map. Inside the home page's frame it asks the home page to go back
     to the beach; on its own it is a normal link. */
  var railHome=document.getElementById('railHome');
  if(railHome) railHome.addEventListener('click',function(e){
    if(window.parent!==window){ e.preventDefault(); window.parent.postMessage({jux:'home'},'*'); }
  });
  /* Previous / next links: data-nav="home" or a case study slug. In the home page's frame they ask the
     home page to switch; on their own they are normal links. */
  [].slice.call(document.querySelectorAll('[data-nav]')).forEach(function(a){
    a.addEventListener('click',function(e){
      if(window.parent===window) return;
      e.preventDefault();
      var n=a.getAttribute('data-nav');
      window.parent.postMessage(n==='home'?{jux:'home'}:n==='recommendations'?{jux:'recommendations'}:{juxNav:n},'*');
    });
  });

  function currentDepth(){
    if(!marks.length) return 0;
    var y=scrollY+innerHeight*0.55, tops=marks.map(function(m){return m.el.offsetTop;});
    if(y<=tops[0]) return marks[0].d;
    for(var i=0;i<marks.length-1;i++){
      if(y>=tops[i]&&y<tops[i+1]){
        var p=(y-tops[i])/Math.max(1,(tops[i+1]-tops[i]));
        return marks[i].d+(marks[i+1].d-marks[i].d)*p;
      }
    }
    var last=marks[marks.length-1], lt=last.el.offsetTop, end=document.body.scrollHeight-innerHeight*0.45; /* the deepest reading is reached with the page scrolled to its very bottom */
    if(y>lt&&end>lt) return last.d+(MAX-last.d)*Math.min(1,(y-lt)/(end-lt));
    return last.d;
  }

  /* The depth gauge is a slider: drag it, click it or use the arrow keys to move through the page quickly.
     The inverse of currentDepth(): from a depth in metres back to a scroll position. */
  function scrollForDepth(d){
    if(!marks.length) return 0;
    var tops=marks.map(function(m){return m.el.offsetTop;}), y=tops[0], done=false;
    if(d>marks[0].d){
      for(var i=0;i<marks.length-1;i++){
        if(d>=marks[i].d&&d<=marks[i+1].d){
          var sp=marks[i+1].d-marks[i].d, p=sp?(d-marks[i].d)/sp:0;
          y=tops[i]+(tops[i+1]-tops[i])*p; done=true; break;
        }
      }
      if(!done){
        var last=marks[marks.length-1], lt=tops[tops.length-1], end=document.body.scrollHeight-innerHeight*0.45;
        y=lt+(end-lt)*Math.max(0,Math.min(1,(d-last.d)/Math.max(1,MAX-last.d)));
      }
    }
    return Math.max(0,Math.min(document.body.scrollHeight-innerHeight,y-innerHeight*0.55));
  }
  var gauge=document.getElementById('gauge');
  if(gauge){
    var dragging=false;
    var toPointer=function(e){
      var r=gauge.getBoundingClientRect();
      var f=Math.max(0,Math.min(1,(e.clientY-r.top)/Math.max(1,r.height)));
      scrollTo({top:scrollForDepth(f*MAX),behavior:'instant'});
    };
    gauge.setAttribute('role','slider'); gauge.setAttribute('tabindex','0');
    gauge.setAttribute('aria-label','Depth. Drag or use the arrow keys to move through the page');
    gauge.setAttribute('aria-valuemin','0'); gauge.setAttribute('aria-valuemax',String(Math.round(MAX)));
    gauge.setAttribute('title','Drag to move through the page');
    /* the map is a labelled slider now, so it is no longer hidden from assistive tech; its live readouts still are */
    var wrap=gauge.parentNode; if(wrap&&wrap.getAttribute('aria-hidden')) wrap.removeAttribute('aria-hidden');
    [].slice.call((wrap||document).querySelectorAll('.read,.unit,.zone')).forEach(function(n){ n.setAttribute('aria-hidden','true'); });
    gauge.addEventListener('pointerdown',function(e){
      dragging=true; try{ gauge.setPointerCapture(e.pointerId); }catch(err){} gauge.classList.add('drag'); toPointer(e); e.preventDefault();
    });
    gauge.addEventListener('pointermove',function(e){ if(dragging) toPointer(e); });
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(ev){
      gauge.addEventListener(ev,function(){ dragging=false; gauge.classList.remove('drag'); });
    });
    gauge.addEventListener('keydown',function(e){
      var step=MAX*0.03, k=e.key, to=null;
      if(k==='ArrowDown'||k==='ArrowRight') to=depth+step;
      else if(k==='ArrowUp'||k==='ArrowLeft') to=depth-step;
      else if(k==='PageDown') to=depth+step*4;
      else if(k==='PageUp') to=depth-step*4;
      else if(k==='Home') to=0;
      else if(k==='End') to=MAX;
      if(to===null) return;
      e.preventDefault();
      scrollTo({top:scrollForDepth(Math.max(0,Math.min(MAX,to))),behavior:'instant'});
    });
  }

  function paint(){
    depth=currentDepth();
    var i=0; while(i<stops.length-2&&depth>stops[i+1].d) i++;
    var s=stops[i], e=stops[i+1], t=Math.max(0,Math.min(1,(depth-s.d)/(e.d-s.d)));
    if(sea) sea.style.background='linear-gradient(180deg,'+rgb(mix(s.a,e.a,t))+','+rgb(mix(s.b,e.b,t))+')';

    var pct=Math.max(0,Math.min(1,depth/MAX));
    var m=Math.round(depth).toLocaleString('en-AU');
    if(depthNum) depthNum.textContent=m;
    if(zoneName){
      var tt=titleAt(depth);
      if(tt!==shownTitle){
        shownTitle=tt; zoneName.textContent=tt;
        if(!reduce){ zoneName.classList.remove('swap'); void zoneName.offsetWidth; zoneName.classList.add('swap'); }
      }
    }
    if(gauge) gauge.setAttribute('aria-valuenow',String(Math.round(depth)));
    if(gaugeFill) gaugeFill.style.height=(pct*100)+'%';
    if(gaugeDot) gaugeDot.style.top='calc('+(pct*100)+'% - 4px)';
    if(mread) mread.textContent=m+' m · '+titleAt(depth);

    var docp=scrollY/Math.max(1,document.body.scrollHeight-innerHeight);
    if(topfill) topfill.style.width=(Math.min(1,docp)*100)+'%';

    if(!reduce) floats.forEach(function(el){
      var k=parseFloat(el.dataset.float)||0.045;
      el.style.transform='translateY('+Math.max(-34,Math.min(34,(innerHeight/2-el.getBoundingClientRect().top)*k))+'px)';
    });

    if(chain&&track&&innerWidth>=900){
      var r=chain.getBoundingClientRect(), span=chain.offsetHeight-innerHeight;
      var p=Math.max(0,Math.min(1,-r.top/Math.max(1,span)));
      var over=Math.max(0,track.scrollWidth-innerWidth+48);
      track.style.transform='translateX('+(-over*p)+'px)';
    }
  }

  /* --- 4. life canvas ---------------------------------------------------- */
  var cv=document.getElementById('life'), cx=cv&&cv.getContext('2d'), W=0,H=0,parts=[],DPR=1;
  function seed(){
    if(!cv) return;
    DPR=Math.min(2,devicePixelRatio||1); W=innerWidth; H=innerHeight;
    cv.width=W*DPR; cv.height=H*DPR; cv.style.width=W+'px'; cv.style.height=H+'px';
    cx.setTransform(DPR,0,0,DPR,0,0);
    var n=Math.round(Math.min(110,Math.max(40,W*H/16000)));
    parts=[];
    for(var i=0;i<n;i++) parts.push({
      x:Math.random()*W, y:Math.random()*H,
      r:Math.random()*1.9+.4, vy:-(Math.random()*.16+.03), vx:(Math.random()-.5)*.09,
      ph:Math.random()*6.28
    });
  }
  function frame(now){
    if(!cv) return;
    cx.clearRect(0,0,W,H);
    var dy=scrollY-lastY; lastY=scrollY;

    /* sunbeams: only while light still reaches this depth */
    var lit=Math.max(0,1-depth/420);
    if(lit>0.01){
      for(var k=0;k<5;k++){
        var bx=(k*0.23+0.06)*W + Math.sin((now||0)/5200+k)*34;
        var g=cx.createLinearGradient(bx,0,bx+90,H*0.78);
        g.addColorStop(0,'rgba(190,255,250,'+(0.09*lit)+')');
        g.addColorStop(1,'rgba(190,255,250,0)');
        cx.fillStyle=g; cx.beginPath();
        cx.moveTo(bx-30,0); cx.lineTo(bx+46,0); cx.lineTo(bx+150,H*0.82); cx.lineTo(bx+28,H*0.82);
        cx.closePath(); cx.fill();
      }
    }

    /* marine snow. turns bioluminescent past the midnight zone */
    var glow=Math.min(1,depth/2600);
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      if(!reduce){ p.y+=p.vy; p.x+=p.vx+Math.sin((now||0)/2600+p.ph)*0.12; p.y-=dy*0.22; }
      if(p.y<-12) p.y=H+12; if(p.y>H+12) p.y=-12;
      if(p.x<-12) p.x=W+12; if(p.x>W+12) p.x=-12;
      var a=0.16+0.3*glow, bio=glow>0.45&&p.r>1.4;
      cx.beginPath(); cx.arc(p.x,p.y,p.r,0,6.283);
      cx.fillStyle= bio ? 'rgba(94,242,200,'+(a*0.95)+')' : 'rgba(226,247,250,'+a+')';
      if(bio){ cx.shadowBlur=9; cx.shadowColor='rgba(94,242,200,.8)'; } else { cx.shadowBlur=0; }
      cx.fill(); cx.shadowBlur=0;
    }
    if(!reduce) requestAnimationFrame(frame);
  }

  /* --- 5. wire up -------------------------------------------------------- */
  var ticking=false;
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(function(){ paint(); ticking=false; }); } }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',function(){ seed(); paint(); });
  seed(); paint();
  if(reduce){ frame(0); } else { requestAnimationFrame(frame); }
})();
