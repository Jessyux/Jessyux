/* ==========================================================================
   sand.js — write a message in the sand, by typing or drawing
   Strokes are whole-number units from 0 to 1000 on each axis. Everything from
   the server goes on screen as textContent or as numbers in an SVG path, so a
   hostile message can only ever be text or a line.
   ========================================================================== */
(function(g){
  var MAX_STROKES=60,MAX_POINTS=2000,STEP=4,LOAD_EVERY=30000;

  var num=function(n){n=Number(n);return isFinite(n)?n:0};
  /* yScale lets a 0 to 1000 square drawing sit in a 2:1 box without stretching the pen */
  function strokesToPath(strokes,yScale){
    if(!Array.isArray(strokes))return '';
    var ys=yScale||1;
    return strokes.map(function(stroke){
      if(!Array.isArray(stroke)||!stroke.length)return '';
      var pts=stroke.map(function(p){return [num(p[0]),num(p[1])*ys]});
      var d='M'+pts[0][0]+' '+pts[0][1];
      if(pts.length===2)return d+' L'+pts[1][0]+' '+pts[1][1];
      for(var i=1;i<pts.length-1;i++){
        d+=' Q'+pts[i][0]+' '+pts[i][1]+' '+((pts[i][0]+pts[i+1][0])/2)+' '+((pts[i][1]+pts[i+1][1])/2);
      }
      var last=pts[pts.length-1];
      return pts.length>1?d+' L'+last[0]+' '+last[1]:d;
    }).filter(Boolean).join(' ');
  }
  function toUnits(x,y,box){
    var c=function(v){return Math.max(0,Math.min(1000,Math.round(v*1000)))};
    return [c((x-box.left)/box.width),c((y-box.top)/box.height)];
  }
  function simplify(points,step){
    if(points.length<3)return points.slice();
    var out=[points[0]],prev=points[0],lastI=points.length-1;
    for(var i=1;i<lastI;i++){
      if(Math.hypot(points[i][0]-prev[0],points[i][1]-prev[1])>=step){out.push(points[i]);prev=points[i]}
    }
    out.push(points[lastI]);
    return out;
  }
  var api={strokesToPath:strokesToPath,toUnits:toUnits,simplify:simplify};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!g||!g.document)return;
  g.juxSand=api;

  var d=g.document,$=function(id){return d.getElementById(id)};
  var SVG='http://www.w3.org/2000/svg';
  function calm(){return g.juxA11y?juxA11y.isCalm():false}

  function messageEl(m,fresh){
    var li=d.createElement('li');li.className='msg';li.dataset.id=m.id;
    if(m.kind==='draw'){
      var svg=d.createElementNS(SVG,'svg');svg.setAttribute('viewBox','0 0 1000 500');
      svg.setAttribute('role','img');
      svg.setAttribute('aria-label','Hand-drawn message'+(m.name?' from '+m.name:''));
      var path=d.createElementNS(SVG,'path');path.setAttribute('d',strokesToPath(m.strokes,.5));
      path.setAttribute('pathLength','1');
      if(fresh&&!calm())path.setAttribute('class','writing');
      svg.appendChild(path);li.appendChild(svg);
    }else{
      var p=d.createElement('p');p.className='hand';p.textContent=m.text;li.appendChild(p);
    }
    if(m.name){var by=d.createElement('p');by.className='by';by.textContent='From '+m.name;li.appendChild(by)}
    return li;
  }

  function wall(){
    var list=$('wall'),status=$('wall-status'),newest=null,loaded=false;
    function load(){
      if(d.hidden)return;
      fetch('/api/sand',{headers:{accept:'application/json'}})
        .then(function(r){if(!r.ok)throw 0;return r.json()})
        .then(function(data){
          var msgs=data.messages||[],top=msgs[0]&&msgs[0].id;
          loaded=true;
          /* an empty wall is just empty sand: no words on screen, a quiet note for screen readers only */
          status.textContent=msgs.length?'':'No messages yet.';status.classList.toggle('sand-sr',!msgs.length);
          if(top===newest&&list.children.length===msgs.length)return;
          newest=top;
          list.textContent='';
          msgs.forEach(function(m){list.appendChild(messageEl(m))});
        })
        .catch(function(){if(!loaded){status.classList.remove('sand-sr');status.textContent='Messages can\'t be loaded right now.'}});
    }
    load();
    setInterval(load,LOAD_EVERY);
    d.addEventListener('visibilitychange',load);
    return {add:function(m){
      newest=m.id;status.textContent='';
      var el=messageEl(m,true);list.prepend(el);
      /* the wall sits above the form, so bring the new message into view */
      if(el.scrollIntoView)el.scrollIntoView({block:'center',behavior:calm()?'auto':'smooth'});
    }};
  }

  function canvasPad(onChange){
    var cv=$('pad'),cx=cv.getContext('2d'),strokes=[],cur=null,note=$('draw-note');
    function ink(){return getComputedStyle(cv).getPropertyValue('--s-hand').trim()||'#5A4326'}
    function total(){return strokes.reduce(function(n,s){return n+s.length},0)}
    function fit(){
      var box=cv.getBoundingClientRect(),r=Math.min(2,g.devicePixelRatio||1);
      if(!box.width)return;
      cv.width=box.width*r;cv.height=box.height*r;paint();
    }
    function paint(){
      cx.clearRect(0,0,cv.width,cv.height);
      cx.lineCap=cx.lineJoin='round';cx.strokeStyle=ink();cx.lineWidth=Math.max(3,cv.width/170);
      (cur?strokes.concat([cur]):strokes).forEach(function(s){
        cx.beginPath();
        s.forEach(function(p,i){var x=p[0]*cv.width/1000,y=p[1]*cv.height/1000;if(i)cx.lineTo(x,y);else cx.moveTo(x,y)});
        cx.stroke();
      });
    }
    function end(e){
      if(!cur)return;
      /* a quick tap isn't a message */
      if(cur.length>1){
        strokes.push(simplify(cur,STEP));
        note.textContent=strokes.length>=MAX_STROKES||total()>=MAX_POINTS?'That\'s as much as the sand can hold. Undo a stroke to keep drawing.':'';
      }
      cur=null;paint();onChange();
    }
    cv.addEventListener('pointerdown',function(e){
      if(strokes.length>=MAX_STROKES||total()>=MAX_POINTS)return;
      e.preventDefault();
      try{cv.setPointerCapture(e.pointerId)}catch(x){}
      cur=[toUnits(e.clientX,e.clientY,cv.getBoundingClientRect())];
    });
    cv.addEventListener('pointermove',function(e){
      if(!cur)return;
      e.preventDefault();
      if(total()+cur.length>=MAX_POINTS){end();return}
      var box=cv.getBoundingClientRect(),p=toUnits(e.clientX,e.clientY,box),l=cur[cur.length-1];
      if(p[0]!==l[0]||p[1]!==l[1]){cur.push(p);paint()}
    });
    cv.addEventListener('pointerup',end);
    cv.addEventListener('pointercancel',end);
    $('undo').onclick=function(){strokes.pop();note.textContent='';paint();onChange()};
    $('clear').onclick=function(){strokes=[];note.textContent='';paint();onChange()};
    addEventListener('resize',fit);
    if(g.juxA11y)juxA11y.subscribe(paint);
    return {fit:fit,strokes:function(){return strokes},reset:function(){strokes=[];note.textContent='';paint()}};
  }

  function form(w){
    var f=$('sand-form'),text=$('sand-text'),count=$('sand-count'),post=$('post'),status=$('post-status');
    var typeBox=$('type-box'),drawBox=$('draw-box'),mode='text',pad;
    function kind(){return mode}
    function ready(){return kind()==='text'?!!text.value.trim():pad.strokes().length>0}
    function sync(){post.disabled=!ready();count.textContent=[...text.value].length+' of 140'}
    pad=canvasPad(sync);
    f.querySelectorAll('input[name="kind"]').forEach(function(r){
      r.addEventListener('change',function(){
        mode=r.value;
        typeBox.hidden=mode!=='text';drawBox.hidden=mode!=='draw';
        if(mode==='draw')pad.fit();
        status.textContent='';sync();
      });
    });
    text.addEventListener('input',sync);
    f.addEventListener('submit',function(e){
      e.preventDefault();
      if(!ready())return;
      var body={kind:kind(),name:$('sand-name').value,website:$('sand-website').value};
      if(body.kind==='text')body.text=text.value;else body.strokes=pad.strokes();
      post.disabled=true;status.textContent='Saving...';
      fetch('/api/sand',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){
          return r.json().catch(function(){return {}}).then(function(data){
            if(r.status===201){
              if(data.text!==''){w.add(data)}
              text.value='';pad.reset();status.textContent='Your message is in the sand.';
              return;
            }
            /* only reasons the server wrote for this visitor; anything else means it isn't there, as on Netlify */
            status.textContent=[400,413,422,429].indexOf(r.status)>=0&&data.error?data.error:'Messages can\'t be saved right now.';
          });
        })
        .catch(function(){status.textContent='Messages can\'t be saved right now.'})
        .then(sync);
    });
    sync();
  }

  if($('sand-form'))form(wall());
})(typeof window!=='undefined'?window:null);
