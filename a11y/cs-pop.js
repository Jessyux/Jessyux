/* ==========================================================================
   cs-pop.js — case study cards on the beach
   Hovering a card shows its screenshot uncropped, rising out of the top of
   the card so the card's text stays readable. Only on screens wide enough
   with a mouse or trackpad; phones and touch screens keep the cropped image.
   The pop-out is decorative (the card already names the study), so it is
   hidden from assistive tech and never takes the pointer.
   ========================================================================== */
(function(){
  var big=matchMedia('(min-width:1024px) and (min-height:640px) and (hover:hover) and (pointer:fine)');
  var cs=document.getElementById('cs'),pop,img,shown=null;
  if(!cs)return;

  function make(){
    pop=document.createElement('div');
    pop.className='cs-pop';
    pop.setAttribute('aria-hidden','true');
    img=document.createElement('img');
    img.alt='';
    pop.appendChild(img);
    document.body.appendChild(pop);
  }
  function hide(){
    if(shown)shown.classList.remove('popped');
    shown=null;
    if(pop)pop.classList.remove('on');
  }
  function place(card){
    var shot=card.querySelector('img');
    if(!shot||!shot.naturalWidth)return;
    if(!pop)make();
    var r=shot.getBoundingClientRect(),pad=16;
    /* the floatie menu sits above the cards; the pop-out may pass over it */
    /* the whole screenshot, scaled down to fit the room above the card's text; the card keeps its size */
    var maxH=Math.max(r.height,r.bottom-pad),maxW=Math.min(innerWidth-pad*2,720);
    var k=Math.min(maxW/shot.naturalWidth,maxH/shot.naturalHeight,1);
    var w=shot.naturalWidth*k,h=shot.naturalHeight*k;
    var x=Math.min(Math.max(r.left+r.width/2-w/2,pad),innerWidth-pad-w);
    img.src=shot.currentSrc||shot.src;
    pop.style.cssText='left:'+x+'px;top:'+(r.bottom-h)+'px;width:'+w+'px;height:'+h+'px;--ox:'+(r.left+r.width/2-x)+'px';
    pop.classList.add('on');
    if(shown&&shown!==card)shown.classList.remove('popped');
    card.classList.add('popped');
    shown=card;
  }
  function on(e){
    var card=e.target.closest&&e.target.closest('.cs-card');
    if(!card||!big.matches||document.documentElement.dataset.juxStyle==='classic')return;
    if(card!==shown)place(card);
  }
  cs.addEventListener('mouseover',on);
  cs.addEventListener('mouseleave',hide);
  cs.addEventListener('mouseout',function(e){
    var card=e.target.closest&&e.target.closest('.cs-card');
    if(card&&!card.contains(e.relatedTarget))hide();
  });
  /* backstop: the pointer is anywhere but the shown card */
  document.addEventListener('mousemove',function(e){if(shown&&!shown.contains(e.target))hide()},{passive:true});
  /* anything that moves the cards puts the pop-out away */
  cs.addEventListener('scroll',hide,{passive:true});
  addEventListener('resize',hide);
  addEventListener('keydown',hide);
  cs.addEventListener('click',hide);
  big.addEventListener&&big.addEventListener('change',hide);
})();
