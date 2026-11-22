/* ==========================================================================
   settings.js — the visitor's accessibility settings
   One source of truth, kept in localStorage so the home page and the case
   study frames share it. Written to <html> as data-jux-* attributes, so CSS
   does most of the work. Blocked or corrupt storage falls back to defaults.
   ========================================================================== */
(function(g){
  var KEY='jux-a11y';
  var DEFAULTS={style:'personality',theme:null,size:'1',contrast:'std',motion:'full',space:'std',font:'std',lens:'off'};
  var VALID={
    style:['personality','classic'],
    theme:['light','dark',null],
    size:['1','2','3'],
    contrast:['std','high'],
    motion:['full','calm'],
    space:['std','roomy'],
    font:['std','lexend','atkinson'],
    lens:['off','low','deut','prot','trit','kbd']
  };
  var FONTS={
    outfit:'Outfit:wght@300..800',
    lexend:'Lexend:wght@300..800',
    atkinson:'Atkinson+Hyperlegible:wght@400;700'
  };

  function sanitize(obj){
    var out={};
    Object.keys(DEFAULTS).forEach(function(k){
      var v=obj&&obj[k];
      out[k]=VALID[k].indexOf(v)>-1?v:DEFAULTS[k];
    });
    return out;
  }

  function makeSettings(opts){
    opts=opts||{};
    var storage=opts.storage;
    var prefersReduced=opts.prefersReduced||function(){return false};
    var prefersDark=opts.prefersDark||function(){return false};
    /* while the playground is hidden, nobody can change a setting, so the page shows the defaults */
    var playground=opts.playground||function(){return true};
    var listeners=[],memory=null;

    function load(){
      if(!playground())return sanitize();
      if(memory)return sanitize(memory);
      try{
        var raw=storage.getItem(KEY);
        return raw?sanitize(JSON.parse(raw)):sanitize();
      }catch(e){return sanitize()}
    }
    function write(next){
      try{storage.setItem(KEY,JSON.stringify(next));memory=null;}catch(e){memory=next;}
    }
    function notify(v){listeners.slice().forEach(function(fn){fn(v)})}
    function save(partial){
      var next=sanitize(Object.assign(load(),partial));
      write(next);notify(next);
      return next;
    }
    function reset(){
      var next=sanitize();
      write(next);notify(next);
      return next;
    }
    function subscribe(fn){
      listeners.push(fn);
      return function(){listeners=listeners.filter(function(x){return x!==fn})};
    }
    function isCalm(){return load().motion==='calm'||prefersReduced()}
    function resolvedTheme(){return load().theme||(prefersDark()?'dark':'light')}

    function needFont(root,name){
      var doc=root.ownerDocument||root;
      var id='jux-font-'+name;
      if(doc.querySelector('#'+id))return;
      var l=doc.createElement('link');
      l.id=id;l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family='+FONTS[name]+'&display=swap';
      doc.head.appendChild(l);
    }
    function apply(root){
      var v=load(),d=root.dataset;
      d.juxStyle=v.style;d.juxTheme=resolvedTheme();d.juxSize=v.size;d.juxContrast=v.contrast;
      d.juxMotion=v.motion;d.juxSpace=v.space;d.juxFont=v.font;d.juxLens=v.lens;
      if(v.style==='classic')needFont(root,'outfit');
      if(v.font!=='std')needFont(root,v.font);
    }
    /* other documents (a case study frame, another tab) saved something */
    function handleStorage(){notify(load())}

    return {load:load,save:save,reset:reset,subscribe:subscribe,isCalm:isCalm,resolvedTheme:resolvedTheme,apply:apply,handleStorage:handleStorage,playgroundOn:function(){return !!playground()}};
  }

  /* The playground is hidden from visitors while it's being refined. Open any page with
     ?playground=1 to turn it on in this browser, and ?playground=0 to hide it again. */
  var PLAY_KEY='jux-playground';
  function playgroundFlag(store,search){
    try{
      var m=/[?&]playground=([01])/.exec(search||'');
      if(m){if(m[1]==='1')store.setItem(PLAY_KEY,'1');else store.removeItem(PLAY_KEY)}
      return store.getItem(PLAY_KEY)==='1';
    }catch(e){return false}
  }

  if(g.document){
    var store=null;try{store=g.localStorage}catch(e){}
    var mm=function(q){return function(){return !!(g.matchMedia&&g.matchMedia(q).matches)}};
    /* frames inside the home page have no query string of their own; they read the saved flag */
    var playOn=playgroundFlag(store,g.location&&g.location.search);
    var inst=makeSettings({storage:store,prefersReduced:mm('(prefers-reduced-motion: reduce)'),prefersDark:mm('(prefers-color-scheme: dark)'),playground:function(){return playOn}});
    inst.DEFAULTS=DEFAULTS;inst.sanitize=sanitize;
    g.juxA11y=inst;
    g.addEventListener('storage',function(e){if(e.key===KEY||e.key===null){inst.apply(g.document.documentElement);inst.handleStorage()}});
    inst.subscribe(function(){inst.apply(g.document.documentElement)});
  }
  if(typeof module!=='undefined')module.exports={makeSettings:makeSettings,DEFAULTS:DEFAULTS,sanitize:sanitize};
})(typeof window!=='undefined'?window:globalThis);
