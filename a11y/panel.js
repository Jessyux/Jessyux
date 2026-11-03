/* ==========================================================================
   panel.js — the accessibility playground panel
   window.juxPanel.mount({view, showFloatingButton, reloadOnMotion}) builds it
   once for a page. Frames inside the home page mount with no panel at all:
   they only follow the settings the home page saves.
   ========================================================================== */
(function(g){
  var d=g.document,A=g.juxA11y,C=g.juxContrast;
  var CONTROLS=[
    {k:'style',title:'Portfolio style',big:true,opts:[['personality','Personality Portfolio'],['classic','Classic Portfolio']]},
    {k:'theme',title:'Light/dark',classicOnly:true,opts:[['light','Light'],['dark','Dark']]},
    {k:'size',title:'Text size',why:'For anyone with low vision, tired eyes, or a small screen.',opts:[['1','Default'],['2','Larger'],['3','Largest']]},
    {k:'contrast',title:'Contrast',why:'For low vision and bright sunlight. High swaps photo backgrounds for solid colour.',opts:[['std','Standard'],['high','High']]},
    {k:'motion',title:'Motion',why:'For vestibular conditions, migraines and easily distracted focus. Your device setting still wins.',opts:[['full','Full'],['calm','Calm']]},
    {k:'space',title:'Spacing',why:'For dyslexia and anyone who loses their place in long lines.',opts:[['std','Standard'],['roomy','Roomy']]},
    {k:'font',title:'Typeface',why:'Lexend was designed for reading fluency. Atkinson makes similar letters easier to tell apart.',opts:[['std','Site default'],['lexend','Lexend'],['atkinson','Atkinson Hyperlegible']]},
    {k:'lens',title:'See it through someone\'s eyes',opts:[['off','Off'],['low','Low vision'],['deut','Red-green (deuteranopia)'],['prot','Red-green (protanopia)'],['trit','Blue-yellow'],['kbd','Keyboard only']]}
  ];
  var NOTES={
    off:'A simulation for empathy, not a replacement for testing with people.',
    low:'Blur and reduced contrast, close to uncorrected or cloudy vision. Try Larger text with this on.',
    deut:'Greens and reds move closer together.',
    prot:'Reds look darker and shift towards green. Colour should never be the only signal.',
    trit:'Blue and yellow get harder to separate.',
    kbd:'Many people navigate without a mouse. Press Tab and watch the focus ring travel through the page. Esc turns this off.'
  };
  /* Machado, Oliveira and Fernandes 2009, severity 1.0 */
  var FILTERS={
    'jux-prot':'.152286 1.052583 -.204868 0 0 .114503 .786281 .099216 0 0 -.003882 -.048116 1.051998 0 0 0 0 0 1 0',
    'jux-deut':'.367322 .860646 -.227968 0 0 .280085 .672501 .047413 0 0 -.01182 .04294 .968881 0 0 0 0 0 1 0',
    'jux-trit':'1.255528 -.076749 -.178779 0 0 -.078411 .930809 .147602 0 0 .004733 .691367 .3039 0 0 0 0 0 1 0'
  };
  var panel,opener,refs={},viewFn=function(){return 'case'},lastFocus,actions;

  function el(tag,cls,text){var e=d.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

  function injectFilters(){
    if(d.getElementById('jux-filters'))return;
    var svg='<svg id="jux-filters" class="jux-ui" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'
      +Object.keys(FILTERS).map(function(id){return '<filter id="'+id+'"><feColorMatrix values="'+FILTERS[id]+'"/></filter>'}).join('')
      +'</defs></svg>';
    d.body.insertAdjacentHTML('beforeend',svg);
  }

  function build(){
    panel=el('aside','jux-panel jux-ui');panel.setAttribute('aria-labelledby','jp-title');panel.id='jux-panel';
    var head=el('div','jp-head'),h=el('h2',null,'Accessibility playground'),close=el('button','jp-btn',"Close");
    h.id='jp-title';close.type='button';close.onclick=hide;head.append(h,close);refs.close=close;
    var body=el('div','jp-body');body.tabIndex=0;

    CONTROLS.forEach(function(c,i){
      var wrap=el('div','jp-ctl'+(c.big?' big':''));
      var title=el('h3',null,c.title),opts=el('div','jp-opts');
      opts.setAttribute('role','group');opts.setAttribute('aria-label',c.title);
      c.opts.forEach(function(o){
        var b=el('button',null,o[1]);b.type='button';b.dataset.v=o[0];
        b.onclick=function(){var p={};p[c.k]=o[0];A.save(p)};
        opts.appendChild(b);
      });
      wrap.append(title,opts);
      refs[c.k]={wrap:wrap,opts:opts};
      if(c.why)wrap.appendChild(el('p','jp-why',c.why));
      if(c.k==='lens'){refs.lensNote=el('p','jp-why');wrap.appendChild(refs.lensNote)}
      body.appendChild(wrap);
      if(i===1){ /* the score sits under the style choice */
        var score=el('div','jp-score');refs.badge=el('div','jp-badge');refs.scoreTitle=el('b');refs.scoreText=el('small');
        var t=el('div');t.append(refs.scoreTitle,refs.scoreText);score.append(refs.badge,t);
        var det=el('details','jp-checks'),sum=el('summary',null,'See the checks');refs.checks=el('div');
        det.append(sum,refs.checks,el('p','jp-why','Measured against each colour\'s solid background. It isn\'t a full audit: that takes people and assistive tech too.'));
        var intro=el('p','jp-intro','Accessibility is part of how I design, not a last step. Change anything here and the whole site responds, and I\'ve noted who each setting helps.');
        body.append(score,det,intro);
      }
    });
    actions=el('div','jp-actions');body.appendChild(actions);

    var foot=el('div','jp-foot'),reset=el('button','jp-btn','Reset everything'),done=el('button','jp-btn go','Done');
    reset.type=done.type='button';reset.onclick=function(){A.reset()};done.onclick=hide;
    foot.append(reset,done);
    panel.append(head,body,foot);
    d.body.appendChild(panel);

    var tip=el('div','jux-kbdtip jux-ui','Your mouse is off. Use Tab to move, Enter to choose, Esc to turn this off.');tip.setAttribute('role','status');
    d.body.appendChild(tip);
    d.addEventListener('keydown',function(e){
      if(e.key!=='Escape')return;
      if(A.load().lens==='kbd'){A.save({lens:'off'});return}
      if(panel.classList.contains('open'))hide();
    });
  }

  function refresh(){
    if(!panel)return;
    var s=A.load(),theme=A.resolvedTheme();
    CONTROLS.forEach(function(c){
      var r=refs[c.k],cur=c.k==='theme'?theme:s[c.k];
      r.opts.querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===cur))});
      if(c.classicOnly)r.wrap.hidden=s.style!=='classic';
    });
    refs.lensNote.textContent=NOTES[s.lens];
    var key=C.surfaceFor(s,theme,viewFn()),res=C.score(key),bad=res.level==='Below AA';
    refs.badge.textContent=bad?'Low':res.level;
    refs.badge.classList.toggle('warn',bad);
    refs.scoreTitle.textContent=bad?'Below WCAG 2.2 AA':'WCAG 2.2 '+res.level;
    refs.scoreText.textContent='Lowest result: '+res.lowest.ratio.toFixed(1)+':1 ('+res.lowest.label.toLowerCase()+'). AA needs 4.5:1, AAA needs 7:1.';
    refs.checks.textContent='';
    res.rows.forEach(function(r){
      var row=el('div','row');row.append(el('span',null,r.label),el('b',null,r.ratio.toFixed(1)+':1 '+r.level));
      refs.checks.appendChild(row);
    });
  }

  function show(){
    if(!panel)return;
    lastFocus=d.activeElement;
    refresh();
    panel.classList.add('open');
    if(opener)opener.setAttribute('aria-expanded','true');
    refs.close.focus();
  }
  function hide(){
    if(!panel||!panel.classList.contains('open'))return;
    panel.classList.remove('open');
    if(opener)opener.setAttribute('aria-expanded','false');
    if(lastFocus&&lastFocus.focus&&d.contains(lastFocus))lastFocus.focus();
  }

  /* dive.js and the page's particles read motion once at load, so a change reloads the study in place */
  function reloadKeepingScroll(){
    var key='jux-scroll:'+location.pathname;
    try{
      var saved=sessionStorage.getItem(key);
      if(saved!=null){sessionStorage.removeItem(key);scrollTo({top:+saved,behavior:'instant'})}
    }catch(e){}
    var was=A.isCalm();
    A.subscribe(function(){
      var now=A.isCalm();
      if(now===was)return;
      try{sessionStorage.setItem(key,String(scrollY))}catch(e){}
      location.reload();
    });
  }

  g.juxPanel={
    mount:function(o){
      o=o||{};
      injectFilters();
      if(o.reloadOnMotion)reloadKeepingScroll();
      if(d.documentElement.classList.contains('embed'))return;
      if(typeof o.view==='function')viewFn=o.view;else if(o.view)viewFn=function(){return o.view};
      build();
      A.subscribe(refresh);
      if(o.showFloatingButton){
        opener=el('button','jux-open jux-ui','Accessibility playground');opener.type='button';
        opener.setAttribute('aria-expanded','false');opener.setAttribute('aria-controls','jux-panel');
        opener.onclick=show;d.body.appendChild(opener);
      }
    },
    open:show,close:hide,refresh:refresh,
    addAction:function(label,fn){
      if(!actions)return;
      var b=el('button','jp-btn',label);b.type='button';b.onclick=fn;actions.appendChild(b);
    }
  };
})(window);
