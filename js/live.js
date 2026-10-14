/* Jelajah Korea Selatan — data langsung: cuaca (Open-Meteo) + kadar MYR→KRW (ECB/Frankfurter) */
(function(){
'use strict';
function $(s){return document.querySelector(s);}
var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- CUACA LANGSUNG ---------- */
var ICON={
  sun:'<svg class="w-sun" viewBox="0 0 24 24" aria-hidden="true"><circle class="core" cx="12" cy="12" r="4.6"/><g class="rays"><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19"/></g></svg>',
  cloud:'<svg class="w-cloud" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18h10a4 4 0 0 0 .8-7.92A5.5 5.5 0 0 0 7.2 8.6 4.5 4.5 0 0 0 7 18z"/></svg>',
  rain:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14h9a3.5 3.5 0 0 0 .6-6.94A5 5 0 0 0 7.3 6.1 4.2 4.2 0 0 0 7 14z" fill="#dfe7f5"/><path d="M8.5 16.5l-1 3.2M12.5 16.5l-1 3.2M16.5 16.5l-1 3.2" stroke="#bcd3ff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
  snow:'<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#bfe0ff" stroke-width="2" stroke-linecap="round" fill="none"><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/></g></svg>',
  fog:'<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#dfe7f5" stroke-width="2" stroke-linecap="round" fill="none"><path d="M4 10h16M4 14h16M7 18h11M6 6h12"/></g></svg>',
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#ffd166"/></svg>',
  moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#cdd9f2"/></svg>'
};
function wmo(c){
  if(c===0||c===1)return['Clear','sun'];
  if(c===2)return['Partly Cloudy','cloud'];
  if(c===3)return['Cloudy','cloud'];
  if(c===45||c===48)return['Fog','fog'];
  if(c>=51&&c<=57)return['Drizzle','rain'];
  if(c>=61&&c<=67)return['Rain','rain'];
  if(c>=71&&c<=77)return['Snow','snow'];
  if(c>=80&&c<=82)return['Showers','rain'];
  if(c===85||c===86)return['Snow showers','snow'];
  if(c>=95)return['Thunderstorm','bolt'];
  return['—','cloud'];
}
function loadWeather(){
  var cards=Array.prototype.slice.call(document.querySelectorAll('.dest-card[data-lat]'));
  if(!cards.length||!window.fetch)return;
  cards.forEach(function(card){
    var chip=card.querySelector('.weather-chip');if(!chip)return;
    var lat=card.getAttribute('data-lat'),lon=card.getAttribute('data-lon');
    var url='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon
      +'&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code'
      +'&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&forecast_days=1'
      +'&timezone=Asia%2FSeoul';
    fetch(url).then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){
      var cur=d&&d.current;if(!cur)return;
      var m=wmo(cur.weather_code);
      var dy=d.daily||{},one=function(k,i){return Array.isArray(dy[k])?dy[k][i]:null;};
      var tmin=one('temperature_2m_min',0),tmax=one('temperature_2m_max',0),rainp=one('precipitation_probability_max',0);
      var sunrise=one('sunrise',0),sunset=one('sunset',0);
      var night=!!(sunrise&&sunset&&cur.time&&(cur.time<sunrise||cur.time>sunset));
      if(night&&m[1]==='sun')m=['Clear','moon'];
      var extra=[];
      if(cur.apparent_temperature!=null)extra.push('feels like '+Math.round(cur.apparent_temperature)+'°');
      if(tmax!=null&&tmin!=null)extra.push('☀ day '+Math.round(tmax)+'° · ☾ night '+Math.round(tmin)+'°');
      if(cur.relative_humidity_2m!=null)extra.push('💧'+Math.round(cur.relative_humidity_2m)+'%');
      if(cur.wind_speed_10m!=null)extra.push('💨'+Math.round(cur.wind_speed_10m)+' km/h');
      if(rainp!=null)extra.push('☔'+Math.round(rainp)+'%');
      chip.innerHTML=ICON[m[1]]+'<span>'+Math.round(cur.temperature_2m)+'°C · '+m[0]+(night?' (night)':'')+'</span>'
        +(extra.length?'<span class="w-x">'+extra.join(' · ')+'</span>':'');
      chip.classList.add('upd');
      chip.title='Live weather (Open-Meteo) · '+cur.time.replace('T',' ');
    }).catch(function(){});
  });
}

/* ---------- KADAR LANGSUNG MYR→KRW ---------- */
var RATE=328, MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function fmtDate(s){var p=s.split('-');return parseInt(p[2],10)+' '+MONTHS[parseInt(p[1],10)-1]+' '+p[0];}
function fmtShort(s){var p=s.split('-');return parseInt(p[2],10)+' '+MONTHS[parseInt(p[1],10)-1];}
function fmtFull(s){var dt=new Date(parseInt(s.slice(0,4),10),parseInt(s.slice(5,7),10)-1,parseInt(s.slice(8,10),10));return DAYS[dt.getDay()]+', '+fmtDate(s);}
var FXGEO=null,fxLastPts=null,fxCache={};
function smoothPath(p){
  if(p.length<3)return 'M'+p.map(function(q){return q.x.toFixed(1)+' '+q.y.toFixed(1)}).join(' L');
  var d='M'+p[0].x.toFixed(1)+' '+p[0].y.toFixed(1);
  for(var i=0;i<p.length-1;i++){
    var p0=p[i-1]||p[i],p1=p[i],p2=p[i+1],p3=p[i+2]||p2;
    d+=' C'+(p1.x+(p2.x-p0.x)/6).toFixed(1)+' '+(p1.y+(p2.y-p0.y)/6).toFixed(1)+
      ','+(p2.x-(p3.x-p1.x)/6).toFixed(1)+' '+(p2.y-(p3.y-p1.y)/6).toFixed(1)+
      ','+p2.x.toFixed(1)+' '+p2.y.toFixed(1);
  }
  return d;
}
function renderGraph(pts){
  var svg=$('#rc-svg');if(!svg)return;
  var W=Math.max(320,Math.round(svg.clientWidth||640)),H=190,padX=10,padT=16,padB=30,n=pts.length;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  var vs=pts.map(function(p){return p.v;});
  var mn=Math.min.apply(0,vs),mx=Math.max.apply(0,vs),mnI=vs.indexOf(mn),mxI=vs.indexOf(mx);
  if(mn===mx){mn-=1;mx+=1;}
  function X(i){return padX+(i/(n>1?n-1:1))*(W-2*padX);}
  function Y(v){return padT+(1-(v-mn)/(mx-mn))*(H-padT-padB);}
  var xy=pts.map(function(p,i){return {x:X(i),y:Y(p.v)}});
  var lineD=smoothPath(xy);
  var areaD=lineD+' L'+X(n-1).toFixed(1)+' '+(H-padB)+' L'+X(0).toFixed(1)+' '+(H-padB)+' Z';
  var ln=$('#rc-line'),ar=$('#rc-area'),dot=$('#rc-dot');
  if(ln)ln.setAttribute('d',lineD);
  if(ar)ar.setAttribute('d',areaD);
  if(dot){dot.setAttribute('cx',X(n-1).toFixed(1));dot.setAttribute('cy',Y(pts[n-1].v).toFixed(1));}
  if(ln&&!reduce&&ln.getTotalLength){
    var L=Math.ceil(ln.getTotalLength());
    ln.style.strokeDasharray=L;ln.style.strokeDashoffset=L;
    void ln.getBoundingClientRect();
    ln.style.transition='stroke-dashoffset 1.7s cubic-bezier(.22,1,.36,1)';
    ln.style.strokeDashoffset='0';
  }
  var grid='';
  [mx,(mx+mn)/2,mn].forEach(function(v){var y=Y(v);grid+='<line x1="0" y1="'+y.toFixed(1)+'" x2="'+W+'" y2="'+y.toFixed(1)+'"/><text x="4" y="'+(y-4).toFixed(1)+'">'+Math.round(v)+'</text>';});
  var ticks=[0,Math.round((n-1)*.25),Math.round((n-1)*.5),Math.round((n-1)*.75),n-1],seen={};
  ticks.forEach(function(i){
    if(seen[i])return;seen[i]=1;
    var x=X(i),anc=i===0?'start':(i===n-1?'end':'middle');
    grid+='<line class="rc-vline" x1="'+x.toFixed(1)+'" y1="'+padT+'" x2="'+x.toFixed(1)+'" y2="'+(H-padB)+'"/>';
    grid+='<text x="'+x.toFixed(1)+'" y="'+(H-8)+'" text-anchor="'+anc+'">'+fmtShort(pts[i].d)+'</text>';
  });
  var g=$('#rc-grid');if(g)g.innerHTML=grid;
  var ptsG=$('#rc-pts');
  if(ptsG){
    var h='';
    pts.forEach(function(p,i){
      if(i===n-1)return;
      h+='<circle class="rc-pt" cx="'+X(i).toFixed(1)+'" cy="'+Y(p.v).toFixed(1)+'" r="1.7"><title>'+fmtFull(p.d)+' · RM1 = ₩'+p.v.toFixed(2)+'</title></circle>';
    });
    var lp=pts[n-1];
    h+='<circle class="rc-pt hot" cx="'+X(n-1).toFixed(1)+'" cy="'+Y(lp.v).toFixed(1)+'" r="3.4"><title>'+fmtFull(lp.d)+' · RM1 = ₩'+lp.v.toFixed(2)+(lp.live?' (live · market)':' (latest rate)')+'</title></circle>';
    ptsG.innerHTML=h;
  }
  var minEl=$('#rc-min'),maxEl=$('#rc-max');
  if(minEl)minEl.textContent='▼ ₩'+mn.toFixed(1)+' · '+fmtShort(pts[mnI].d);
  if(maxEl)maxEl.textContent='▲ ₩'+mx.toFixed(1)+' · '+fmtShort(pts[mxI].d);
  if(!$('#rc-cross')){
    var cross=document.createElementNS('http://www.w3.org/2000/svg','g');
    cross.setAttribute('id','rc-cross');
    cross.innerHTML='<line x1="0" y1="16" x2="0" y2="160"/><circle r="4.5" cx="0" cy="0"/>';
    svg.appendChild(cross);
  }
  FXGEO={pts:pts,W:W,H:H,padX:padX,padT:padT,padB:padB,X:X,Y:Y};
  fxLastPts=pts;
}
function bindHover(){
  var svg=$('#rc-svg'),tip=$('#rc-tip');
  if(!svg||!tip||svg._rcBound)return;
  svg._rcBound=1;
  function show(ev){
    if(!FXGEO)return;
    var g=FXGEO,rect=svg.getBoundingClientRect();
    if(!rect.width)return;
    var clientX=(ev.touches&&ev.touches[0])?ev.touches[0].clientX:ev.clientX;
    var x=(clientX-rect.left)*(g.W/rect.width);
    var i=Math.round((x-g.padX)/(g.W-2*g.padX)*(g.pts.length-1));
    i=Math.max(0,Math.min(g.pts.length-1,i));
    var p=g.pts[i],px=g.X(i),py=g.Y(p.v);
    var cross=$('#rc-cross');
    if(cross){
      var cl=cross.querySelector('line'),cc=cross.querySelector('circle');
      cl.setAttribute('x1',px.toFixed(1));cl.setAttribute('x2',px.toFixed(1));
      cl.setAttribute('y1',g.padT);cl.setAttribute('y2',g.H-g.padB);
      cc.setAttribute('cx',px.toFixed(1));cc.setAttribute('cy',py.toFixed(1));
      cross.style.display='block';
    }
    tip.innerHTML='RM1 = \u20A9'+p.v.toFixed(2)+'<small>'+fmtFull(p.d)+'</small>';
    tip.style.display='block';
    var sx=rect.width/g.W,sy=rect.height/g.H;
    tip.style.left=Math.min(rect.width-84,Math.max(84,px*sx))+'px';
    tip.style.top=(py*sy)+'px';
  }
  function hide(){
    var cross=$('#rc-cross');if(cross)cross.style.display='none';
    tip.style.display='none';
  }
  svg.addEventListener('mousemove',show);
  svg.addEventListener('mouseleave',hide);
  svg.addEventListener('touchstart',show,{passive:true});
  svg.addEventListener('touchmove',show,{passive:true});
  svg.addEventListener('touchend',hide);
}
var RANGE_LABEL={7:'1 week',30:'1 month',92:'3 months',182:'6 months',365:'1 year'};
var liveP=null;
function fetchLive(){
  if(liveP)return liveP;
  liveP=fetch('https://api.exchangerate.fun/latest').then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){
    if(!d||d.base!=='USD'||!d.rates||!(d.rates.MYR>0)||!(d.rates.KRW>0))throw new Error('bad payload');
    var dt=new Date((d.timestamp?d.timestamp*1000:Date.now()));
    var isoD=dt.getUTCFullYear()+'-'+('0'+(dt.getUTCMonth()+1)).slice(-2)+'-'+('0'+dt.getUTCDate()).slice(-2);
    return {d:isoD,v:d.rates.KRW/d.rates.MYR,live:true};
  });
  liveP.catch(function(){liveP=null;});
  return liveP;
}
function fxSeries(days){
  if(fxCache[days])return fxCache[days];
  var end=new Date(),start=new Date();start.setDate(end.getDate()-days-3);
  var url='https://api.frankfurter.dev/v1/'+iso(start)+'..'+iso(end)+'?base=MYR&symbols=KRW';
  var pr=fetch(url).then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){
    var rates=(d&&d.rates)||{},dates=Object.keys(rates).sort();
    var pts=[];dates.forEach(function(dt){var v=rates[dt]&&rates[dt].KRW;if(v>0)pts.push({d:dt,v:v});});
    if(!pts.length)throw new Error('empty');
    return pts;
  });
  pr.catch(function(){delete fxCache[days];});
  fxCache[days]=pr;
  return pr;
}
function loadRange(days){
  fxSeries(days).then(function(pts){
    return fetchLive().then(function(live){
      if(live){
        var lastD=pts[pts.length-1].d;
        if(live.d===lastD){pts[pts.length-1]={d:live.d,v:live.v,live:true};}
        else if(live.d>lastD){pts.push({d:live.d,v:live.v,live:true});if(pts.length>366)pts=pts.slice(pts.length-366);}
      }
      return pts;
    }).catch(function(){return pts;});
  }).then(function(pts){
    renderGraph(pts);
    applyRate(pts[pts.length-1].v);
    var liveNow=pts[pts.length-1].live;
    var dateEl=$('#rc-date');
    if(dateEl)dateEl.textContent=fmtFull(pts[pts.length-1].d)+(liveNow?' · live':'');
    setupConverter();
    var mid=$('#rc-mid');
    if(mid)mid.textContent=RANGE_LABEL[days]+' · Mon–Fri ECB'+(liveNow?' + live point (now)':' · each point = 1 day (ECB)');
  }).catch(function(){
    if(!fxLastPts){applyRate(RATE);setupConverter();var dateEl=$('#rc-date');if(dateEl)dateEl.textContent='Disconnected · estimate';}
    var mid=$('#rc-mid');if(mid)mid.textContent='Disconnected · data for this range is unavailable';
  });
}
function bindRanges(){
  var wrap=$('#rc-ranges');
  if(!wrap||wrap._bound)return;
  wrap._bound=1;
  wrap.addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-days]');if(!b)return;
    Array.prototype.forEach.call(wrap.querySelectorAll('button'),function(x){x.classList.toggle('on',x===b);});
    loadRange(parseInt(b.getAttribute('data-days'),10));
  });
}
function setupConverter(){
  var rm=$('#rc-rm'),krw=$('#rc-krw'),note=$('#rc-note');
  function fromRM(){var r=parseFloat(rm.value);if(isNaN(r)||r<0)r=0;krw.value=Math.round(r*RATE);}
  function fromKRW(){var k=parseFloat(String(krw.value).replace(/[^0-9.]/g,''));if(isNaN(k)||k<0)k=0;rm.value=(k/RATE).toFixed(2);}
  if(!rm._bound){rm._bound=1;rm.addEventListener('input',fromRM);krw.addEventListener('input',fromKRW);}
  fromRM();
  if(note)note.innerHTML='Current rate: <b>RM1 = ₩'+RATE.toFixed(2)+'</b> · <b>1,000 ₩ = RM'+(1000/RATE).toFixed(2)+'</b>';
}
function applyRate(v){
  RATE=v;
  var big=$('#rc-big');if(big)big.textContent='₩'+v.toFixed(2);
  if(typeof window.__setLiveRate==='function'){try{window.__setLiveRate(v);}catch(e){}}
}
var rzT;
window.addEventListener('resize',function(){clearTimeout(rzT);rzT=setTimeout(function(){if(fxLastPts)renderGraph(fxLastPts);},200);});

loadWeather();
bindHover();
bindRanges();
loadRange(92);
})();
