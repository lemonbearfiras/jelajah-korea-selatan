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
  bolt:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="#ffd166"/></svg>'
};
function wmo(c){
  if(c===0)return['Cerah','sun'];
  if(c===1)return['Cerai Berawan','sun'];
  if(c===2)return['Berawan Separa','cloud'];
  if(c===3)return['Berawan','cloud'];
  if(c===45||c===48)return['Berkabus','fog'];
  if(c>=51&&c<=57)return['Renyai','rain'];
  if(c>=61&&c<=67)return['Hujan','rain'];
  if(c>=71&&c<=77)return['Salji','snow'];
  if(c>=80&&c<=82)return['Hujan Tiba-tiba','rain'];
  if(c===85||c===86)return['Hujan Salji','snow'];
  if(c>=95)return['Ribut Petir','bolt'];
  return['—','cloud'];
}
function loadWeather(){
  var cards=Array.prototype.slice.call(document.querySelectorAll('.dest-card[data-lat]'));
  if(!cards.length||!window.fetch)return;
  cards.forEach(function(card){
    var chip=card.querySelector('.weather-chip');if(!chip)return;
    var lat=card.getAttribute('data-lat'),lon=card.getAttribute('data-lon');
    var url='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=temperature_2m,weather_code&timezone=Asia%2FSeoul';
    fetch(url).then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){
      var cur=d&&d.current;if(!cur)return;
      var m=wmo(cur.weather_code);
      chip.innerHTML=ICON[m[1]]+'<span>'+Math.round(cur.temperature_2m)+'°C · '+m[0]+'</span>';
      chip.classList.add('upd');
      chip.title='Cuaca langsung · Open-Meteo';
    }).catch(function(){});
  });
}

/* ---------- KADAR LANGSUNG MYR→KRW ---------- */
var RATE=328, MONTHS=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
function iso(d){return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
function fmtDate(s){var p=s.split('-');return parseInt(p[2],10)+' '+MONTHS[parseInt(p[1],10)-1]+' '+p[0];}
function renderGraph(pts){
  var W=640,H=190,padX=6,padT=16,padB=28,n=pts.length;
  var vs=pts.map(function(p){return p.v;});var mn=Math.min.apply(0,vs),mx=Math.max.apply(0,vs);
  if(mn===mx){mn-=1;mx+=1;}
  function X(i){return padX+(i/(n>1?n-1:1))*(W-2*padX);}
  function Y(v){return padT+(1-(v-mn)/(mx-mn))*(H-padT-padB);}
  var line=pts.map(function(p,i){return X(i).toFixed(1)+','+Y(p.v).toFixed(1);}).join(' ');
  var area=line+' '+X(n-1).toFixed(1)+','+(H-padB)+' '+X(0).toFixed(1)+','+(H-padB);
  var ln=$('#rc-line'),ar=$('#rc-area'),dot=$('#rc-dot');
  if(ln)ln.setAttribute('points',line);
  if(ar)ar.setAttribute('points',area);
  if(dot){dot.setAttribute('cx',X(n-1).toFixed(1));dot.setAttribute('cy',Y(pts[n-1].v).toFixed(1));}
  var grid='';[mx,(mx+mn)/2,mn].forEach(function(v){var y=Y(v);grid+='<line x1="0" y1="'+y.toFixed(1)+'" x2="'+W+'" y2="'+y.toFixed(1)+'"/><text x="4" y="'+(y-4).toFixed(1)+'">'+Math.round(v)+'</text>';});
  var g=$('#rc-grid');if(g)g.innerHTML=grid;
  var minEl=$('#rc-min'),maxEl=$('#rc-max');
  if(minEl)minEl.textContent='▼ Min ₩'+Math.round(mn);
  if(maxEl)maxEl.textContent='▲ Max ₩'+Math.round(mx);
}
function setupConverter(){
  var rm=$('#rc-rm'),krw=$('#rc-krw'),note=$('#rc-note');
  function fromRM(){var r=parseFloat(rm.value);if(isNaN(r)||r<0)r=0;krw.value=Math.round(r*RATE);}
  function fromKRW(){var k=parseFloat(String(krw.value).replace(/[^0-9.]/g,''));if(isNaN(k)||k<0)k=0;rm.value=(k/RATE).toFixed(2);}
  if(rm)rm.addEventListener('input',fromRM);
  if(krw)krw.addEventListener('input',fromKRW);
  fromRM();
  if(note)note.innerHTML='Kadar kini: <b>1 RM = ₩'+RATE.toFixed(2)+'</b> · <b>1,000 ₩ = RM'+(1000/RATE).toFixed(2)+'</b>';
}
function applyRate(v){
  RATE=v;
  var big=$('#rc-big');if(big)big.textContent='₩'+v.toFixed(2);
  if(typeof window.__setLiveRate==='function'){try{window.__setLiveRate(v);}catch(e){}}
}
function loadFx(){
  if(!window.fetch)return;
  var end=new Date(),start=new Date();start.setDate(end.getDate()-38);
  var url='https://api.frankfurter.dev/v1/'+iso(start)+'..'+iso(end)+'?base=MYR&symbols=KRW';
  fetch(url).then(function(r){return r.ok?r.json():Promise.reject();}).then(function(d){
    var rates=(d&&d.rates)||{},dates=Object.keys(rates).sort();
    var pts=[];dates.forEach(function(dt){var v=rates[dt]&&rates[dt].KRW;if(v>0)pts.push({d:dt,v:v});});
    if(!pts.length)return;
    if(pts.length>31)pts=pts.slice(pts.length-31);
    renderGraph(pts);
    applyRate(pts[pts.length-1].v);
    var dateEl=$('#rc-date');if(dateEl)dateEl.textContent=fmtDate(pts[pts.length-1].d);
    setupConverter();
  }).catch(function(){
    applyRate(RATE);setupConverter();
    var dateEl=$('#rc-date');if(dateEl)dateEl.textContent='terputung · anggaran';
  });
}

loadWeather();
loadFx();
})();
