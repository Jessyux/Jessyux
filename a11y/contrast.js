/* ==========================================================================
   contrast.js — the playground's live score
   Each surface lists the page's real colours. Case studies use the brightest
   water stop as the worst case. It only measures colour against solid
   backgrounds, and the panel says so: it is not an audit.
   ========================================================================== */
(function(g){
  var CASE={bg:'#126A84',ink:'#EAF7F8',soft:'#9DB9C4',accent:'#5EF2C8'};
  var WATER={bg:'#06323F',ink:'#EAF7F8',soft:'#9DB9C4',accent:'#5EF2C8'};
  var SAND={bg:'#F3E3C6',ink:'#12404D',soft:'#2E5560',accent:'#078A72'};
  var SAND_HIGH={bg:'#FFF4DC',ink:'#000000',soft:'#1B2A2F',accent:'#034A3B'};
  var DEEP_HIGH={bg:'#00131D',ink:'#FFFFFF',soft:'#E6F2F4',accent:'#7CFFDB'};
  var SURFACES={
    'personality.intro.std':SAND,'personality.about.std':SAND,'personality.sand.std':SAND,
    'personality.recs.std':WATER,'personality.case.std':CASE,'personality.pm.std':CASE,
    'personality.intro.high':SAND_HIGH,'personality.about.high':SAND_HIGH,'personality.sand.high':SAND_HIGH,
    'personality.recs.high':DEEP_HIGH,'personality.case.high':DEEP_HIGH,'personality.pm.high':DEEP_HIGH,
    'classic.dark.std':{bg:'#1E1A24',ink:'#F6EFE8',soft:'#C9BFC4',accent:'#F2C9A8'},
    'classic.light.std':{bg:'#FFFFFF',ink:'#1E1A24',soft:'#4F4855',accent:'#8A3F1E'},
    'classic.dark.high':{bg:'#000000',ink:'#FFFFFF',soft:'#EDE7E2',accent:'#FFD9B8'},
    'classic.light.high':{bg:'#FFFFFF',ink:'#000000',soft:'#2A2531',accent:'#6B2C10'}
  };

  function lum(hex){
    var n=hex.replace('#','');
    if(n.length===3)n=n[0]+n[0]+n[1]+n[1]+n[2]+n[2];
    var c=[0,2,4].map(function(i){
      var v=parseInt(n.slice(i,i+2),16)/255;
      return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);
    });
    return .2126*c[0]+.7152*c[1]+.0722*c[2];
  }
  function ratio(a,b){
    var x=lum(a),y=lum(b);
    return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  function level(r,large){
    if(r>=(large?4.5:7))return 'AAA';
    if(r>=(large?3:4.5))return 'AA';
    return 'Below AA';
  }
  var RANK={'Below AA':0,AA:1,AAA:2};
  function score(key){
    var s=SURFACES[key];
    var rows=[['Body text',s.ink,false],['Secondary text',s.soft,false],['Accent words (large)',s.accent,true]].map(function(r){
      var v=ratio(r[1],s.bg);
      return {label:r[0],ratio:v,level:level(v,r[2])};
    });
    var low=rows.reduce(function(a,b){
      var ra=RANK[a.level],rb=RANK[b.level];
      return rb<ra||(rb===ra&&b.ratio<a.ratio)?b:a;
    });
    return {level:low.level,lowest:{label:low.label,ratio:low.ratio},rows:rows};
  }
  function surfaceFor(settings,theme,view){
    return settings.style==='classic'
      ?'classic.'+theme+'.'+settings.contrast
      :'personality.'+view+'.'+settings.contrast;
  }

  var api={ratio:ratio,level:level,score:score,surfaceFor:surfaceFor,SURFACES:SURFACES};
  g.juxContrast=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
