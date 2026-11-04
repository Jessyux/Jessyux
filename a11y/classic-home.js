/* ==========================================================================
   classic-home.js — Classic Portfolio on the home page
   Rendered from the same data as the beach (TIMELINE, RECS, POCKET_PHOTOS and
   the About me markup), so the two can't drift apart. About me is the landing
   view. Picks up from, and returns to, whichever beach view you were on.
   ========================================================================== */
(function(){
  var A=window.juxA11y,root,main,navBtns={},themeBtn,state='about',caseRoute=null;
  var STUDIES=[
    {id:'umeds',route:'multi-shipping-options',kicker:'uMeds · Health tech',title:'Patients kept walking out the door. We gave them a reason to stay.'},
    {id:'westpac',route:'westpac-youth',kicker:'Westpac Youth',title:'A 200-year-old bank was losing the next generation. We built them a goal worth saving for.'},
    {id:'circuit',route:'admin-redesign',kicker:'Montu admin',title:'Circuit had grown for years without anyone asking the people who live in it.'}
  ];
  var R2=Object.fromEntries(STUDIES.map(function(s){return [s.id,s.route]}));

  function el(tag,attrs,kids){
    var e=document.createElement(tag);
    Object.keys(attrs||{}).forEach(function(k){
      if(k==='text')e.textContent=attrs[k];else if(k==='on')e.onclick=attrs[k];else e.setAttribute(k,attrs[k]);
    });
    (kids||[]).forEach(function(c){if(c)e.append(c)});
    return e;
  }
  function pill(text,on,cls){return el('button',{type:'button',class:'cl-pill'+(cls?' '+cls:''),text:text,on:on})}
  function q(sel){return document.querySelector(sel)}

  function about(){
    var photo=q('#v-about .frame img'),links=el('div',{class:'cl-links'});
    document.querySelectorAll('#v-about .links a').forEach(function(a){
      var c=el('a',{class:'cl-pill',href:a.getAttribute('href'),text:a.textContent.trim()});
      if(a.target)c.target=a.target;if(a.rel)c.rel=a.rel;
      links.append(c);
    });
    var lead=el('p',{class:'cl-lead'},['A curious designer who creates experiences that ',el('b',{text:'move real numbers'}),'.']);
    var hero=el('div',{class:'cl-hero'},[
      el('div',{},[el('h1',{text:'Hi, I’m Jessy'}),lead,el('p',{text:q('#v-about p.bio').textContent.trim()}),links]),
      el('div',{class:'cl-photo'},[el('img',{src:photo.src,alt:photo.alt}),el('div',{class:'cl-status'},[el('i',{'aria-hidden':'true'}),q('#v-about .s-text').textContent.trim()])])
    ]);
    var rows=el('div',{class:'cl-rows'},TIMELINE.map(function(t){
      return el('details',{class:'cl-row'},[
        el('summary',{},[el('div',{},[el('h3',{text:t.role}),el('span',{class:'cl-soft',text:t.co+(t.loc?', '+t.loc:'')})]),el('span',{class:'cl-when',text:t.range})]),
        (t.bullets&&t.bullets.length)?el('ul',{},t.bullets.map(function(b){var li=el('li');li.innerHTML=b;return li})):null
      ]);
    }));
    var photos=el('ul',{class:'cl-photos'},POCKET_PHOTOS.map(function(p){
      var label=String(p.label||'').replace(/<-+|-+>/g,'').trim();
      return el('li',{},[el('figure',{},[el('img',{src:p.src,alt:label,loading:'lazy'}),el('figcaption',{text:label})])]);
    }));
    return [hero,el('section',{class:'cl-sec'},[el('h2',{text:'My professional lore'}),el('p',{class:'cl-soft',style:'margin-bottom:14px',text:'Where I’ve been and what I’ve done.'}),rows]),
      el('section',{class:'cl-sec'},[el('h2',{text:'Pocket sized me'}),el('p',{class:'cl-soft',style:'margin-bottom:14px',text:'A look into my life.'}),photos])];
  }
  function recs(){
    return [el('h1',{text:'What people say'}),el('p',{class:'cl-lead cl-soft',text:RECS.length+' recommendations from people I’ve worked with.'}),
      el('div',{class:'cl-stack'},RECS.map(function(r){
        return el('figure',{class:'cl-card'},r.p.map(function(t){return el('p',{text:t})}).concat([
          el('figcaption',{},[r.photo?el('img',{src:r.photo,alt:''}):null,el('span',{},[el('b',{text:r.name}),el('span',{class:'cl-soft',text:r.role})])])
        ]));
      }))];
  }
  function cases(){
    return [el('h1',{text:'Case studies'}),el('p',{class:'cl-lead cl-soft',text:'Pick one to read the whole story.'}),
      el('div',{class:'cl-grid'},STUDIES.map(function(s){
        return el('button',{type:'button',class:'cl-card',on:function(){show('case',s.route)}},[el('p',{class:'cl-kicker',text:s.kicker}),el('h3',{text:s.title})]);
      }))];
  }
  function show(next,route){
    state=next;caseRoute=route||null;
    main.textContent='';
    main.classList.toggle('flush',!!caseRoute);
    main.classList.toggle('wide',next==='recs');
    if(caseRoute){
      main.append(el('iframe',{class:'cl-frame',title:'Case study',src:NEW_CASE[caseRoute]}));
    }else{
      (next==='recs'?recs():next==='cases'?cases():about()).forEach(function(n){main.append(n)});
    }
    Object.keys(navBtns).forEach(function(k){
      if(k===(caseRoute?'cases':next))navBtns[k].setAttribute('aria-current','page');else navBtns[k].removeAttribute('aria-current');
    });
    scrollTo(0,0);
  }
  function theme(){
    var t=A.resolvedTheme();
    themeBtn.textContent=t==='dark'?'Light mode':'Dark mode';
  }
  function build(){
    main=el('main',{class:'cl-main'});
    navBtns.about=pill('About me',function(){show('about')});
    navBtns.recs=pill('Recommendations',function(){show('recs')});
    navBtns.cases=pill('Case studies',function(){show('cases')});
    themeBtn=pill('',function(){A.save({theme:A.resolvedTheme()==='dark'?'light':'dark'})});
    var brand=el('button',{type:'button',class:'cl-brand',on:function(){show('about')}},['Jessy Chappell',el('small',{text:'Product designer & manager'})]);
    var open=pill('Accessibility playground',function(){juxPanel.open()},'solid');
    root=el('div',{id:'classic'},[
      el('header',{class:'cl-head'},[brand,el('nav',{class:'cl-nav','aria-label':'Main'},[navBtns.about,navBtns.recs,navBtns.cases,open,themeBtn])]),
      main
    ]);
    document.body.appendChild(root);
    theme();
  }
  /* reading across a style switch: the study's last position, passed to the frame that opens next */
  function studyPath(route){return new URL(NEW_CASE[route],location.href).pathname.replace(/\.html$/,'')}
  function lastY(route){try{return sessionStorage.getItem('jux-lasty:'+studyPath(route))}catch(e){return null}}
  function carry(route){
    var y=lastY(route);
    try{if(y&&y!=='0')sessionStorage.setItem('jux-scroll:'+studyPath(route),y)}catch(e){}
  }
  function fromHome(){
    var v=juxHome.view();
    if(R2[v]){carry(R2[v]);show('cases',R2[v])}else if(v==='kind')show('recs');else if(v==='work')show('cases');else show('about');
  }
  function toHome(){
    var id=caseRoute&&STUDIES.find(function(s){return s.route===caseRoute}).id;
    var target=id||(state==='recs'?'kind':state==='cases'?'work':state==='about'?'about':'intro');
    if(juxHome.view()!==target){
      if(caseRoute)carry(caseRoute);
      juxHome.go(target);
    }else if(caseRoute){
      /* same study still open behind Classic: it only needs moving */
      var y=+lastY(caseRoute)||0,f=q('#v-case iframe');
      if(f)setTimeout(function(){try{f.contentWindow.scrollTo({top:y,behavior:'instant'})}catch(e){}},60);
    }
  }
  var wasClassic=false;
  function sync(){
    var on=A.load().style==='classic';
    if(on&&!root)build();
    if(on&&!wasClassic)fromHome();
    if(!on&&wasClassic)toHome();
    wasClassic=on;
    if(root)theme();
  }
  /* a study's Previous and Next cards post to whoever framed it */
  addEventListener('message',function(e){
    var f=root&&root.querySelector('.cl-frame');
    if(!f||e.source!==f.contentWindow)return;
    var n=e.data&&(e.data.juxNav!=null?e.data.juxNav:e.data.jux);
    if(typeof n!=='string')return;
    if(n==='recommendations')show('recs');
    else if(n==='home'||n==='')show('about');
    else if(NEW_CASE[n])show('case',n);
  });
  A.subscribe(sync);
  sync();
  window.juxClassic={sync:sync,show:function(v){if(root)show(v)}};
})();
