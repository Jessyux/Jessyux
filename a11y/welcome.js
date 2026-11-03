/* ==========================================================================
   welcome.js — the first-visit "What brings you here?" screen
   Home page only, once per visitor. A native <dialog>, so focus stays inside
   and Esc closes it for free. Skipping counts as an answer.
   ========================================================================== */
(function(g){
  var KEY='jux-welcome-seen',EMAIL='mailto:jessyuxer@gmail.com',LINKEDIN='https://www.linkedin.com/in/jessyux';

  function shouldShow(storage,view){
    if(view!=='intro')return false;
    try{return !storage.getItem(KEY)}catch(e){return false} /* blocked storage would ask on every visit */
  }
  function markSeen(storage){
    try{storage.setItem(KEY,'1')}catch(e){}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={shouldShow:shouldShow,markSeen:markSeen,KEY:KEY};
  if(!g||!g.document)return;

  var d=g.document,dlg,body;
  function storage(){try{return g.localStorage}catch(e){return null}}
  function classic(){return g.juxA11y&&juxA11y.load().style==='classic'}
  function el(tag,cls,text){var e=d.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function btn(text,on,cls){var b=el('button',cls||'jw-btn',text);b.type='button';b.onclick=on;return b}
  function link(text,href,external){
    var a=el('a','jw-btn',text);a.href=href;
    if(external){a.target='_blank';a.rel='noopener'}
    return a;
  }
  function close(){if(dlg&&dlg.open)dlg.close()}

  function fill(eyebrow,title,nodes){
    body.textContent='';
    if(eyebrow)body.appendChild(el('p','jw-eyebrow',eyebrow));
    var h=el('h2',null,title);h.id='jw-title';h.tabIndex=-1;
    body.append(h);
    nodes.forEach(function(n){body.appendChild(n)});
    body.scrollTop=0;
    return h;
  }
  function question(){
    var opts=el('div','jw-opts');
    opts.append(
      btn('I\'m hiring a senior designer',close,'jw-opt'),
      btn('I\'m hiring a product manager',function(){close();g.location.href='/product-manager'},'jw-opt'),
      btn('I\'m building or fixing a team',team,'jw-opt'),
      btn('I\'m a fellow designer',fellow,'jw-opt')
    );
    var foot=el('div','jw-foot');foot.appendChild(btn('Skip',close));
    return fill('Quick question','What brings you here?',[opts,foot]);
  }
  function message(title,copy,buttons){
    var row=el('div','jw-row');buttons.forEach(function(b){row.appendChild(b)});
    var foot=el('div','jw-foot');foot.appendChild(btn('Back',function(){question().focus()},'jw-link'));
    fill(null,title,[el('p','jw-copy',copy),row,foot]).focus();
  }
  function team(){
    message('Building a team or fixing one?','I\'d be glad to talk through what\'s getting in the way. Send me a note about where things are at and we can work out whether I can help.',[
      link('Email Jessy',EMAIL),
      link('LinkedIn',LINKEDIN,true),
      btn(classic()?'Back to the portfolio':'Back to the beach',close)
    ]);
  }
  function fellow(){
    message('Hello, fellow designer.','Have a poke around. The accessibility playground shows how I think about inclusive design, and I\'d love to swap notes.',[
      link('Write in the sand','/sand'),
      btn('Open the playground',function(){close();g.juxPanel&&juxPanel.open()}),
      btn('See the work',function(){close();if(classic()&&g.juxClassic)juxClassic.show('cases')}),
      link('LinkedIn',LINKEDIN,true)
    ]);
  }
  function build(){
    dlg=el('dialog','jux-welcome jux-ui');
    dlg.setAttribute('aria-labelledby','jw-title');
    body=el('div','jw-body');
    dlg.appendChild(body);
    dlg.addEventListener('close',function(){markSeen(storage())});
    d.body.appendChild(dlg);
  }
  function open(){
    if(!dlg)build();
    if(dlg.open)return;
    if(g.juxPanel)juxPanel.close();
    question();
    dlg.showModal();
  }
  /* wait for the skeleton loader to go, so the two never stack */
  function whenLoaded(fn){
    var l=d.getElementById('jx-loading');
    if(!l||l.classList.contains('done'))return fn();
    setTimeout(function(){whenLoaded(fn)},120);
  }

  g.juxWelcome={open:open,shouldShow:shouldShow};
  if(d.documentElement.classList.contains('embed')||!g.juxHome)return;
  if(g.juxPanel)juxPanel.addAction('Change what brought you here',open);
  whenLoaded(function(){
    if(shouldShow(storage(),juxHome.view()))open();
  });
})(typeof window!=='undefined'?window:null);
