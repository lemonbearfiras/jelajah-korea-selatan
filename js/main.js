/* Jelajah Korea Selatan — every main-page interaction: navigation, search, map, planner, database, lightbox. */
(function(){
'use strict';
var $=function(s,c){return (c||document).querySelector(s)};
var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s))};
var finePointer=window.matchMedia('(pointer:fine)').matches;
var reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var FB_IMG='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\' viewBox=\'0 0 800 600\'%3E%3Crect width=\'800\' height=\'600\' fill=\'%23f2f0ea\'/%3E%3Ccircle cx=\'400\' cy=\'250\' r=\'64\' fill=\'%23CD2E3A\'/%3E%3Ccircle cx=\'400\' cy=\'250\' r=\'64\' fill=\'%230047A0\' opacity=\'0.35\'/%3E%3Ctext x=\'400\' y=\'410\' font-family=\'Arial\' font-size=\'26\' fill=\'%230a0a0a\' text-anchor=\'middle\'%3EJelajah Korea Selatan%3C/text%3E%3C/svg%3E';

function guardImg(img){
  if(!img||img.dataset.fbGuard)return;
  img.dataset.fbGuard='1';
  img.addEventListener('error',function(){
    if(img.dataset.fbDone)return;
    img.dataset.fbDone='1';
    img.src=FB_IMG;
  });
}
$$('img').forEach(guardImg);

/* gallery data */
var W='https://upload.wikimedia.org/wikipedia/commons/';
var GALLERY=[
  {src:W+'thumb/b/b0/Seoul_cityscape_by_night_%2802%29.jpg/1920px-Seoul_cityscape_by_night_%2802%29.jpg',t:'Seoul at Night'},
  {src:W+'thumb/0/0a/Namsan_Tower_sunset%2C_Seoul.jpg/1920px-Namsan_Tower_sunset%2C_Seoul.jpg',t:'Namsan Tower'},
  {src:W+'thumb/0/09/Gwangandaegyo_Diamond_Bridge_Gwangalli_Beach_Busan_%2831877282428%29.jpg/1920px-Gwangandaegyo_Diamond_Bridge_Gwangalli_Beach_Busan_%2831877282428%29.jpg',t:'Gwangandaegyo, Busan'},
  {src:W+'thumb/4/4a/Seongsan-ri_town_at_blue_hour_seen_from_Seongsan_Ilchulbong_volcano_Jeju_Island_South_Korea.jpg/1920px-Seongsan-ri_town_at_blue_hour_seen_from_Seongsan_Ilchulbong_volcano_Jeju_Island_South_Korea.jpg',t:'Seongsan-ri, Jeju'},
  {src:W+'thumb/f/ff/Bukchon_Hanok_Village_03.jpg/1920px-Bukchon_Hanok_Village_03.jpg',t:'Bukchon Hanok'},
  {src:W+'c/c7/Night_view_of_Downtown_Seoul_along_Jongno_Street_in_2020.jpg',t:'Jongno Street, Seoul'},
  {src:W+'thumb/b/bf/Korea_Gyeongbokgung_Guard_13.jpg/1920px-Korea_Gyeongbokgung_Guard_13.jpg',t:'Gyeongbokgung Guard'},
  {src:W+'thumb/3/3f/Cherry_Blossom_in_Yeouido_Park_-_panoramio.jpg/1920px-Cherry_Blossom_in_Yeouido_Park_-_panoramio.jpg',t:'Yeouido Cherry Blossoms'},
  {src:W+'thumb/3/34/Korean_pancakes_and_pan-fried_foods_at_Gwangjang_Market.jpg/1920px-Korean_pancakes_and_pan-fried_foods_at_Gwangjang_Market.jpg',t:'Gwangjang Market'},
  {src:W+'thumb/6/69/Exterior_front_view_of_Daejojeon_Hall_of_Changdeokgung_Palace_with_blue_sky_in_Seoul.jpg/1920px-Exterior_front_view_of_Daejojeon_Hall_of_Changdeokgung_Palace_with_blue_sky_in_Seoul.jpg',t:'Daejojeon, Changdeokgung'},
  {src:W+'thumb/0/0f/Burimun_gate_and_pine_under_blue_sky_at_Beomeosa_temple_in_Busan%2C_South_Korea.jpg/1920px-Burimun_gate_and_pine_under_blue_sky_at_Beomeosa_temple_in_Busan%2C_South_Korea.jpg',t:'Beomeosa Gate, Busan'}
];
var lbEl,imgLB,capLB,countLB,thumbsEl,thumbEls=[],lbCur=0;

/* plan data */
var PLANS={
  p1:{note:'<strong>Tip:</strong> A capital-city route suits a long weekend — buy a T-money card on day one &amp; let the subway take you almost everywhere.',days:[
    {l:'Day 1',h:'Classic Seoul',items:['Gyeongbokgung Palace &amp; royal guard changing ceremony','Bukchon Hanok Village','Insadong &amp; traditional tea houses','N Seoul Tower at dusk']},
    {l:'Day 2',h:'Modern Seoul',items:['Myeongdong &amp; street food','Cafes &amp; galleries in Seongsu-dong','Picnic at Han River Park, Yeouido','Late-night shopping in Dongdaemun']},
    {l:'Day 3',h:'One-Day Trip Options',items:['DMZ (book early) or Everland','Gwangjang Market for lunch','Last-minute shopping before the airport']}
  ]},
  p2:{note:'<strong>Tip:</strong> Book KTX tickets early for cheaper fares; Seoul–Busan takes roughly 2 hours 30 minutes. Carry a small backpack for trips like this.',days:[
    {l:'Day 1–2',h:'Seoul',items:['Royal palaces &amp; Bukchon Hanok','Myeongdong, Hongdae &amp; Han River','Gwangjang Market &amp; Namsan Tower']},
    {l:'Day 3',h:'Gyeongju',items:['KTX to Sin-gyeongju','Bulguksa Temple &amp; Seokguram','Daereungwon Tombs &amp; Anapji at night']},
    {l:'Day 4',h:'Busan',items:['Haedong Yonggungsa in the morning','Haeundae &amp; Gwangalli Beach','Jagalchi Market &amp; Gamcheon Village']},
    {l:'Day 5',h:'Departure',items:['Free morning at Nampo or Songdo','KTX back to Seoul','Duty-free shopping &amp; departure']}
  ]},
  p3:{note:'<strong>Tip:</strong> The 7-day route saves the most with the Korea Rail Pass (KR Pass) — one pass for all your KTX journeys.',days:[
    {l:'Day 1',h:'Seoul',items:['Gyeongbokgung, Bukchon &amp; Insadong','Ikseon-dong in the evening']},
    {l:'Day 2',h:'Seoul',items:['Namsan Tower &amp; Myeongdong','Hongdae &amp; Han River at night']},
    {l:'Day 3',h:'Jeonju',items:['KTX to Jeonju','Hanok Village &amp; original bibimbap','Dinner around Gyeonggijeon']},
    {l:'Day 4',h:'Busan',items:['KTX to Busan','Haeundae &amp; Gwangalli','Jagalchi Market at night']},
    {l:'Day 5',h:'Busan',items:['Gamcheon Village &amp; Huinnyeoul','Haedong Yonggungsa','Seomyeon at night']},
    {l:'Day 6',h:'Gyeongju',items:['Bulguksa &amp; Seokguram','Daereungwon Tombs &amp; Cheomseongdae','Anapji at night']},
    {l:'Day 7',h:'Seoul &amp; Departure',items:['KTX back to Seoul','Free time in Insadong','Depart from ICN/GMP']}
  ]}
};
var header=$('#site-header');
var mobileMenu=$('#mobile-menu'),hamburger=$('#hamburger');
var searchBar=$('#searchbar'),searchInput=$('#search-input'),searchCount=$('#search-count');
var searchNote=$('#search-note'),noteQ=$('#note-q'),noteN=$('#note-n');
var progressBar=$('#progress i'),pcBtn=$('#progress-circle'),pcBar=$('#progress-circle .pc-bar');
var loader=$('#loader');
$$('img').forEach(function(im){if(im.id!=='hero-img')im.loading='lazy';});
/* counters */
function animateCount(el){
  var target=parseFloat(el.dataset.count||'0');
  var dec=parseInt(el.dataset.decimals||'0',10);
  var suf=el.dataset.suffix||'';
  function render(v){el.innerHTML=(dec?v.toFixed(dec):Math.round(v).toLocaleString('en-US'))+(suf?'<em>'+suf+'</em>':'')}
  if(reducedMotion){render(target);return}
  var t0=null,dur=1700;
  function tick(ts){
    if(t0===null)t0=ts;
    var p=Math.min((ts-t0)/dur,1);
    render(target*(1-Math.pow(1-p,3)));
    if(p<1)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
var countersDone=false;
function runCounters(){if(countersDone)return;countersDone=true;$$('strong[data-count]').forEach(animateCount)}
(function(){
  var min=new Promise(function(r){setTimeout(r,700)});
  var loaded=new Promise(function(r){
    if(document.readyState==='complete')r();else window.addEventListener('load',r);
    setTimeout(r,3500);
  });
  Promise.all([min,loaded]).then(function(){
    loader.classList.add('done');
    document.body.classList.remove('locked');
    document.body.classList.add('site-ready');
    setTimeout(runCounters,250);
    setTimeout(function(){if(loader&&loader.parentNode)loader.parentNode.removeChild(loader)},800);
  });
})();
/* floating hangul */
(function(){
  var field=$('#hangul-field');if(!field||reducedMotion)return;
  var chars=['한','국','서','울','부','산','제','주','경','주','설','악','전','주','여','행'];
  var n=window.innerWidth<640?8:14;
  for(var i=0;i<n;i++){
    var s=document.createElement('span');
    s.textContent=chars[Math.floor(Math.random()*chars.length)];
    s.style.left=(Math.random()*92+2)+'%';
    s.style.fontSize=(Math.random()*46+18)+'px';
    s.style.setProperty('--ho',(Math.random()*0.1+0.05).toFixed(2));
    s.style.animationDuration=(Math.random()*16+14)+'s';
    s.style.animationDelay=(-Math.random()*20)+'s';
    field.appendChild(s);
  }
})();
/* reveal + map draw */
var mapDrawn=false;
function drawMap(){
  if(mapDrawn)return;mapDrawn=true;
  var path=$('#korea-path');
  if(path&&!reducedMotion){
    var len=path.getTotalLength();
    path.style.strokeDasharray=len;path.style.strokeDashoffset=len;
    path.getBoundingClientRect();
    path.style.transition='stroke-dashoffset 3.2s cubic-bezier(.22,1,.36,1)';
    path.style.strokeDashoffset='0';
  }
  $$('.ktx-line').forEach(function(l,i){setTimeout(function(){l.classList.add('on')},reducedMotion?0:1500+i*450)});
  $$('.map-city').forEach(function(c,i){setTimeout(function(){c.classList.add('on')},reducedMotion?0:2100+i*90)});
  $$('.map-pin').forEach(function(p,i){setTimeout(function(){p.classList.add('on')},reducedMotion?0:2600+i*260)});
}
var revealEls=$$('[data-reveal]');
revealEls.forEach(function(el){var d=el.getAttribute('data-delay');if(d)el.style.transitionDelay=d+'ms'});
if('IntersectionObserver' in window){
  var revealObs=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        en.target.classList.add('revealed');
        if(en.target.querySelector('#korea-path'))drawMap();
        revealObs.unobserve(en.target);
      }
    });
  },{threshold:0.12});
  revealEls.forEach(function(el){revealObs.observe(el)});
}else{
  revealEls.forEach(function(el){el.classList.add('revealed')});
  drawMap();
}
if(reducedMotion){revealEls.forEach(function(el){el.classList.add('revealed')});drawMap();}
/* scroll: progress, header, parallax */
var heroBg=$('.hero-bg');
var parTX=0,parX=0;
function onScrollFrame(){
  var st=window.scrollY||document.documentElement.scrollTop||0;
  var max=document.documentElement.scrollHeight-window.innerHeight;
  var p=max>0?Math.min(st/max,1):0;
  progressBar.style.transform='scaleX('+p+')';
  pcBar.style.strokeDashoffset=String(163.4*(1-p));
  pcBtn.classList.toggle('show',st>600);
  header.classList.toggle('scrolled',st>40);
  if(heroBg&&!reducedMotion&&st<window.innerHeight*1.4){heroBg.style.transform='translate3d('+parX+'px,'+(st*0.28)+'px,0)'}
}
var scrollTick=false;
window.addEventListener('scroll',function(){if(scrollTick)return;scrollTick=true;requestAnimationFrame(function(){onScrollFrame();scrollTick=false})},{passive:true});
onScrollFrame();
pcBtn.addEventListener('click',function(){window.scrollTo({top:0,behavior:reducedMotion?'auto':'smooth'})});
/* cursor + parallax mouse lerp */
if(finePointer&&!reducedMotion){
  document.body.classList.add('custom-cursor');
  var cursorDot=$('#cursor-dot'),cursorRing=$('#cursor-ring');
  var mx=window.innerWidth/2,my=window.innerHeight/2,rx=mx,ry=my;
  window.addEventListener('mousemove',function(e){
    mx=e.clientX;my=e.clientY;
    parTX=(e.clientX/window.innerWidth-0.5)*16;
    cursorDot.style.left=mx+'px';cursorDot.style.top=my+'px';
  });
  (function loop(){
    rx+=(mx-rx)*0.16;ry+=(my-ry)*0.16;
    parX+=(parTX-parX)*0.06;
    cursorRing.style.left=rx+'px';cursorRing.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover',function(e){
    var t=e.target.closest('a,button,.dest-card,.mo-item,.map-pin,input,select,.tl-item,.fbtn,.plan-tab');
    document.body.classList.toggle('cursor-hover',!!t);
  });
  document.documentElement.addEventListener('mouseleave',function(){cursorDot.style.opacity='0';cursorRing.style.opacity='0'});
  document.documentElement.addEventListener('mouseenter',function(){cursorDot.style.opacity='1';cursorRing.style.opacity='1'});
}
/* magnetic */
if(finePointer&&!reducedMotion){
  $$('[data-magnetic]').forEach(function(el){
    el.addEventListener('mousemove',function(e){
      var r=el.getBoundingClientRect();
      el.style.transform='translate('+((e.clientX-r.left-r.width/2)/r.width*10)+'px,'+((e.clientY-r.top-r.height/2)/r.height*8)+'px)';
    });
    el.addEventListener('mouseleave',function(){el.style.transform=''});
  });
}
/* mobile menu */
function toggleMenu(force){
  var open=typeof force==='boolean'?force:!mobileMenu.classList.contains('open');
  mobileMenu.classList.toggle('open',open);
  hamburger.classList.toggle('open',open);
  hamburger.setAttribute('aria-expanded',String(open));
  mobileMenu.setAttribute('aria-hidden',String(!open));
  document.body.classList.toggle('locked',open);
}
hamburger.addEventListener('click',function(){toggleMenu()});
$$('.mm-link',mobileMenu).forEach(function(a){a.addEventListener('click',function(){toggleMenu(false)})});
/* search */
function searchQuery(){return searchInput.value.trim().toLowerCase()}
function syncFoodEmpty(){
  if(!foodEmpty)return;
  var visible=foodCards.filter(function(c){return !c.classList.contains('hide')&&!c.classList.contains('search-hidden')});
  foodEmpty.classList.toggle('show',visible.length===0);
}
function applySearch(){
  var q=searchQuery();
  var matches=0;
  $$('.searchable').forEach(function(el){
    var ok=!q||(el.textContent||'').toLowerCase().indexOf(q)>-1;
    el.classList.toggle('search-hidden',!ok);
    if(ok)matches++;
  });
  syncFoodEmpty();
  searchCount.textContent=q?matches+' matches':'';
  noteQ.textContent=q;noteN.textContent=matches+' matches';
  searchNote.classList.toggle('show',!!q);
}
var searchTimer=null;
searchInput.addEventListener('input',function(){clearTimeout(searchTimer);searchTimer=setTimeout(applySearch,160)});
searchInput.addEventListener('keydown',function(e){
  if(e.key==='Enter'){
    var first=$$('.searchable').filter(function(el){return !el.classList.contains('search-hidden')})[0];
    if(first)first.scrollIntoView({behavior:reducedMotion?'auto':'smooth',block:'center'});
  }
});
function openSearch(){searchBar.classList.add('open');setTimeout(function(){searchInput.focus()},60);applySearch()}
function closeSearch(){searchBar.classList.remove('open');searchInput.value='';applySearch();if(searchBar.contains(document.activeElement))$('#search-toggle').focus();}
$('#search-close').addEventListener('click',closeSearch);
$('#note-clear').addEventListener('click',function(){closeSearch();searchInput.focus()});
$('#search-toggle').addEventListener('click',function(){searchBar.classList.contains('open')?closeSearch():openSearch()});
/* destination rail */
var rail=$('#dest-rail'),dotsEl=$('#rail-dots');
var cards=$$('.dest-card',rail);
cards.forEach(function(_,i){
  var d=document.createElement('button');
  d.setAttribute('aria-label','Go to card '+(i+1));
  d.addEventListener('click',function(){railTo(i)});
  dotsEl.appendChild(d);
});
var dotBtns=$$('button',dotsEl);
function step(){var c=cards[0];return c?c.getBoundingClientRect().width+24:354}
function railTo(i){rail.scrollTo({left:i*step(),behavior:reducedMotion?'auto':'smooth'})}
function railBy(dir){rail.scrollBy({left:dir*step(),behavior:reducedMotion?'auto':'smooth'})}
$('#rail-prev').addEventListener('click',function(){railBy(-1)});
$('#rail-next').addEventListener('click',function(){railBy(1)});
var railTicking=false;
rail.addEventListener('scroll',function(){
  if(railTicking)return;railTicking=true;
  requestAnimationFrame(function(){
    var i=Math.max(0,Math.min(cards.length-1,Math.round(rail.scrollLeft/step())));
    dotBtns.forEach(function(d,k){d.classList.toggle('on',k===i)});
    railTicking=false;
  });
});
if(dotBtns[0])dotBtns[0].classList.add('on');
var dragging=false,dragX=0,dragScroll=0,moved=false;
rail.addEventListener('pointerdown',function(e){
  if(e.pointerType!=='mouse')return;
  dragging=true;moved=false;dragX=e.clientX;dragScroll=rail.scrollLeft;
  rail.classList.add('dragging');
});
window.addEventListener('pointermove',function(e){
  if(!dragging)return;
  var dx=e.clientX-dragX;
  if(Math.abs(dx)>5)moved=true;
  rail.scrollLeft=dragScroll-dx;
});
window.addEventListener('pointerup',function(){if(!dragging)return;dragging=false;rail.classList.remove('dragging')});
rail.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopPropagation();moved=false}},true);
/* map */
var PINS={
  seoul:{t:'Seoul 서울 — Capital · Metro',d:'The capital metropolis with 9 metro lines, Joseon dynasty palaces and the most popular starting point for travellers.'},
  busan:{t:'Busan 부산 — Coastal City',d:'Beaches, the Jagalchi fish market and Gamcheon art village — 2 hours 30 minutes from Seoul by KTX.'},
  jeju:{t:'Jeju 제주 — Volcanic Island',d:'A 1-hour flight from Seoul; UNESCO landscapes, lava cliffs and the unique haenyeo culture.'},
  gyeongju:{t:'Gyeongju 경주 — Ancient Silla Capital',d:'Ancient tombs, Bulguksa Temple and Wolji Lake — 2 hours by KTX to Sin-gyeongju.'},
  seoraksan:{t:'Seoraksan 설악산 — National Park',d:'Ulsanbawi Peak and Sinheungsa Temple; 2 hours 40 minutes by KTX and bus from Seoul.'},
  jeonju:{t:'Jeonju 전주 — Hanok Village',d:'Over 800 hanok houses, the birthplace of bibimbap and pansori — 1 hour 40 minutes by KTX.'}
};
var mapInfo=$('#map-info');
function activatePin(id){
  $$('.map-pin').forEach(function(p){p.classList.toggle('active',p.dataset.pin===id)});
  var pin=PINS[id];
  if(!pin||!mapInfo)return;
  mapInfo.classList.add('swap');
  setTimeout(function(){mapInfo.innerHTML='<strong>'+pin.t+'</strong>'+pin.d;mapInfo.classList.remove('swap')},180);
}
$$('.map-pin').forEach(function(p){p.addEventListener('click',function(){activatePin(p.dataset.pin)})});
$$('.dest-map-link').forEach(function(a){
  a.addEventListener('click',function(){var id=a.dataset.map;setTimeout(function(){activatePin(id)},reducedMotion?0:400)});
});
/* food filter */
var foodCards=$$('#food-grid .food-card');
var foodEmpty=$('#food-empty');
var currentFood='semua';
function applyFoodFilter(){
  foodCards.forEach(function(c){
    var cats=(c.dataset.cat||'').split(' ');
    c.classList.toggle('hide',!(currentFood==='semua'||cats.indexOf(currentFood)>-1));
  });
  syncFoodEmpty();
}
$$('.fbtn').forEach(function(b){
  b.addEventListener('click',function(){
    $$('.fbtn').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
    currentFood=b.dataset.f;
    applyFoodFilter();
  });
});
/* timeline */
var tlItems=$$('.tl-item'),tlPanels=$$('.tl-panel');
tlItems.forEach(function(b,i){
  b.addEventListener('click',function(){
    tlItems.forEach(function(x){x.classList.remove('active')});
    tlPanels.forEach(function(p,k){p.classList.toggle('active',k===i)});
    b.classList.add('active');
  });
});
/* plan tabs */
var planDays=$('#plan-days'),planNote=$('#plan-note');
function renderPlan(id){
  var p=PLANS[id];
  planDays.classList.add('swap');
  setTimeout(function(){
    planDays.innerHTML=p.days.map(function(d){
      return '<div class="plan-day"><span class="pd-label">'+d.l+'</span><h4>'+d.h+'</h4><ul>'+d.items.map(function(i){return '<li>'+i+'</li>'}).join('')+'</ul></div>';
    }).join('');
    planNote.innerHTML=p.note;
    planDays.classList.remove('swap');
  },reducedMotion?0:220);
}
renderPlan('p1');
$$('.plan-tab').forEach(function(b){
  b.addEventListener('click',function(){
    if(b.classList.contains('active'))return;
    $$('.plan-tab').forEach(function(x){x.classList.remove('active');x.setAttribute('aria-selected','false')});
    b.classList.add('active');b.setAttribute('aria-selected','true');
    renderPlan(b.dataset.plan);
  });
});
/* budget planner */
var PL_RATE=300;
var PL_RATES={
  santai:{penginapan:110000,makanan:40000,aktiviti:10000,pengangkutan:10000,lain:8000},
  sederhana:{penginapan:90000,makanan:35000,aktiviti:22000,pengangkutan:12000,lain:10000},
  padat:{penginapan:95000,makanan:32000,aktiviti:35000,pengangkutan:15000,lain:12000}
};
var PL_SEASON={sakura:{m:1.3,l:'Cherry Blossoms (April)'},panas:{m:1.1,l:'Summer (Jun–Aug)'},luruh:{m:1.2,l:'Autumn (Oct–Nov)'},sejuk:{m:.9,l:'Winter (Dec–Feb)'}};
var PL_PACE={santai:'Relaxed — 1–2 activities a day',sederhana:'Moderate — 2–4 activities a day',padat:'Packed — 4–6 activities a day'};
var PL_PACE_SHORT={santai:'relaxed',sederhana:'moderate',padat:'packed'};
var PL_THEME={
  sejarah:{pkg:35000,l:'History',c:'Seoul + Gyeongju or Suwon',d:'Gyeongbokgung & Changdeokgung palaces, the Silla tombs in Gyeongju and Hwaseong Fortress.'},
  bandar:{pkg:25000,l:'City',c:'Seoul + Busan',d:'N Seoul Tower, Myeongdong night markets, Seongsu cafes and Gwangalli beach.'},
  makanan:{pkg:30000,l:'Food',c:'Seoul + Jeonju',d:'Gwangjang Market, the original bibimbap in Jeonju and Myeongdong street food lane.'},
  keluarga:{pkg:60000,l:'Family',c:'Seoul + Everland/Busan',d:'Everland, picnics by the Han River and kid-friendly Haeundae beach.'},
  budaya:{pkg:20000,l:'Culture',c:'Seoul + Jeonju',d:'Bukchon Hanok, hanbok rental, Jogyesa Temple and the Jeonju hanok village.'}
};
var PL_LIM={santai:2,sederhana:4,padat:5};
var PL_DAYS={
  sejarah:[
    {t:'Arrive in Seoul — Historic Jongno',a:['Arrival at Incheon &amp; check-in in Jongno','Gyeongbokgung Palace &amp; Gwanghwamun Plaza','Royal guard changing ceremony at Gwanghwamun','National Museum of Korea','Walk along Cheonggyecheon']},
    {t:'Royal Palaces &amp; UNESCO Heritage',a:['Changdeokgung Palace &amp; Huwon Garden','Jongmyo Shrine (UNESCO)','Changgyeonggung Palace','Insadong art street','N Seoul Tower at night']},
    {t:'Demilitarized Zone (DMZ)',a:['Full-day guided DMZ tour','Dora Observatory — glimpsing North Korea','The Third Infiltration Tunnel','Dorasan railway station','Back to Seoul']},
    {t:'Day Trip to Suwon',a:['Hwaseong Fortress (UNESCO)','Haenggung Palace Park','Paldalmun Gate','Night market in Suwon old town','Ride the train back to Seoul']},
    {t:'KTX to Gyeongju — Ancient Silla',a:['KTX express train to Gyeongju','Bulguksa Temple (UNESCO)','Seokguram Grotto','Daereungwon tomb park','Cheomseongdae observatory']},
    {t:'Gyeongju — Open-Air Museum',a:['Donggung Palace &amp; Wolji Pond','Gyeongju National Museum','Cycling through the royal tomb parks','Bunhwangsa Temple grounds','Evening atmosphere at Anapji']},
    {t:'Back to Seoul — Joseon Trail',a:['Morning KTX back to Seoul','Deoksugung Palace','Hanyangdoseong old city wall','Sungnyemun Gate','Myeongdong night market']},
    {t:'Insadong &amp; Traditional Arts',a:['Insadong art street &amp; old craft shops','Traditional art museum','Jogyesa Buddhist Temple','Cheonggyecheon promenade','Traditional show (optional)']},
    {t:'Free History Day',a:['War Memorial of Korea (optional)','Sejong &amp; Hangeul memorial sites','Shopping in Dongdaemun','Stroll around the old station','Royal cuisine dinner (optional)']},
    {t:'Departure Day',a:['Last breakfast','Souvenirs in Insadong','Check-out &amp; on to Incheon airport','Arrive back in Malaysia','End of the history journey']}
  ],
  bandar:[
    {t:'Arrive in Seoul — Myeongdong',a:['Arrival at Incheon &amp; check-in','Stroll along Cheonggyecheon','Shopping in Myeongdong','N Seoul Tower at night','Jongno evening atmosphere']},
    {t:'Gangnam Style',a:['Starfield COEX &amp; the Star Library','Bongeunsa Temple','Apgujeong &amp; fashion stores','Garosu-gil &amp; hipster cafes','Dinner in Gangnam']},
    {t:'Hongdae &amp; Yeonnam',a:['Gyeongui Line Forest Park','Hongik University street','Coffee shops &amp; vinyl stores','Murals &amp; small galleries','Hongdae night market']},
    {t:'Seongsu — Brooklyn of Seoul',a:['Cafes in old factories','Seoul Forest park','Local pop-up stores','Common Ground','Iconic cafe lunch']},
    {t:'KTX to Busan — Haeundae',a:['KTX express train to Busan','Haeundae Beach','Dongbaekseom forest','Busan Tower &amp; Yongdusan','Gwangalli Beach at night']},
    {t:'Colourful Busan',a:['Gamcheon Culture Village','Jagalchi Fish Market','BIFF Square &amp; street food','Gukje Market','Nampo evening atmosphere']},
    {t:'Busan Beaches &amp; Return',a:['Haedong Yonggungsa seaside temple','Taejongdae Park &amp; lighthouse','Shinsegae Centum City','Afternoon KTX back to Seoul','Dinner in Seoul']},
    {t:'Dongdaemun &amp; DDP',a:['Dongdaemun Design Plaza','Dongdaemun night market','Kwangjang Market &amp; snacks','Cheonggyecheon at night','Local boutique stores']},
    {t:'Itaewon &amp; Noksapyeong',a:['Leeum Museum','Itaewon Global Village Street','Gyeongnidan-gil cafes','N Seoul Tower views','International dinner']},
    {t:'Departure Day',a:['Last breakfast','Shopping in Myeongdong','Check-out &amp; to the airport','Arrive back in Malaysia','End of the city journey']}
  ],
  makanan:[
    {t:'Arrive in Seoul — Gwangjang',a:['Arrival &amp; check-in','Mayak gimbap &amp; bindaetteok at Gwangjang','Walk along Cheonggyecheon','Coffee in a Jongno cafe','Soup at an old restaurant (optional)']},
    {t:'Myeongdong Food Street',a:['Street food: tteokbokki &amp; corndog','Gyoza &amp; Korean fried chicken','Korean shaved-ice bingsu','Evening snack lane','Chocolate &amp; snack shops']},
    {t:'Namdaemun &amp; Classic Cuisine',a:['Namdaemun Market','Kalguksu alley — hand-made noodles','Kimchi class (optional)','Tea houses in Insadong','Bulgogi dinner']},
    {t:'Hongdae: Cafes &amp; Chimaek',a:['Favourite dessert cafes','Chimaek — fried chicken &amp; beer','Hongdae street murals','Hongdae night market','Soft-meat BBQ dinner']},
    {t:'KTX to Jeonju — Nambu Market',a:['Train to Jeonju (the food city)','Nambu Market &amp; night market','Original Jeonju bibimbap','Hanok village street','Makgeolli alley']},
    {t:'Jeonju: Dessert Paradise',a:['PNB bakery — Jeonju choco pie','Viral cheese choco pie','Kongnamul gukbap — bean sprout soup','Ogura tea &amp; desserts','Street food on the hanok lane']},
    {t:'Jeonju &amp; Back to Seoul',a:['Breakfast at the market','Specialty omija tea of Jeonju','Coffee in a hanok cafe','KTX back to Seoul','Hanwoo BBQ dinner']},
    {t:'Mangwon &amp; Modern Markets',a:['Local Mangwon Market','Cafes on Mangridan-gil','Tent-shop street snacks','Ramyeon lunch','Dessert at a hipster cake shop']},
    {t:'Korean Cooking Class',a:['Korean dish cooking class','Fresh market tour with the chef','Lunch from your own cooking','Buy gochujang &amp; spices','Food photo session']},
    {t:'Departure Day',a:['Last breakfast','Convenience-store snack run','Kimchi to take home','To Incheon airport','End of the food journey']}
  ],
  keluarga:[
    {t:'Arrive in Seoul — Han River',a:['Arrival &amp; check-in','Picnic at Han River Park','Bike rental &amp; kite flying','Banpo Rainbow Fountain','Night views over the river']},
    {t:'Everland Full Day',a:['Everland theme park','Guided Safari World','Thunder Falls &amp; roller coasters','Afternoon parade','Fireworks show (summer)']},
    {t:'Lotte World Adventure',a:['Indoor Lotte World','Outdoor Magic Island','Lotte World Aquarium','Park ice cream &amp; snacks','Lotte World Mall']},
    {t:'City Parks &amp; Zoo',a:['Seoul Grand Park &amp; Zoo','Hilltop cable car','Seoul Children\u2019s Grand Park','Picnic in the park','Family dinner']},
    {t:'KTX to Busan — Haeundae',a:['Express train to Busan','Sand play at Haeundae Beach','SEA LIFE Busan Aquarium','Dongbaekseom Park','Gwangalli Beach at night']},
    {t:'Songdo &amp; Gamcheon',a:['Songdo seaside cable car','Gamcheon Culture Village','Street food at BIFF Square','Yongdusan Park','Seafood dinner']},
    {t:'Family Spa &amp; Return',a:['Jjimjilbang — Korean sauna spa','Shinsegae waterpark (optional)','Afternoon KTX back to Seoul','Station snacks','Dinner in Seoul']},
    {t:'COEX &amp; Starfield',a:['COEX Aquarium','Starfield Star Library','Bongeunsa Temple grounds','Toy stores &amp; convenience shops','Family lunch']},
    {t:'Namsan &amp; Tower',a:['Cable car up Namsan','N Seoul Tower','Love locks on the platform','Walk through Myeongdong','Family fried-chicken night']},
    {t:'Departure Day',a:['Last breakfast','Buy kids\u2019 souvenirs','Check-out &amp; to the airport','Arrive back in Malaysia','End of the family journey']}
  ],
  budaya:[
    {t:'Arrive in Seoul — Hanbok &amp; Bukchon',a:['Arrival &amp; hanbok rental','Bukchon Hanok Village','Jogyesa Buddhist Temple','Cheonggyecheon at night','Hanbok photos in the hanok alleys']},
    {t:'Insadong &amp; Traditional Crafts',a:['Insadong art street','Traditional hanji paper workshop','Tea house with Korean desserts','Ceramic &amp; lacquerware shops','Nanta performance (optional)']},
    {t:'Palaces &amp; Gugak Music',a:['Changdeokgung Palace &amp; Huwon','Gyeongbokgung Palace','Gugak traditional music show','Hanbok palace promenade','Evening concert (optional)']},
    {t:'Royal Culture Class',a:['Royal cuisine cooking class','Traditional ingredient market','Hangeul Museum &amp; King Sejong\u2019s story','Old city wall trail','Evening in Insadong']},
    {t:'KTX to Jeonju — Hanok Village',a:['Train to Jeonju','Jeonju Hanok Village (700 hanok)','Gyeonggijeon Shrine','Tomb of King Taejo','Tea in a hanok tea house']},
    {t:'Jeonju: Hanji &amp; Pansori',a:['Hanji Paper Museum','Jaman Mural Alley','Pansori performance','Local Jeonju dishes','Traditional makgeolli']},
    {t:'Back to Seoul — Modern Art',a:['Morning KTX to Seoul','MMCA modern art museum','Stroll around the palaces','Local craft markets','Free evening']},
    {t:'Kukkiwon &amp; Taekwondo',a:['Kukkiwon Taekwondo demonstration','Taekwondo basics experience','Short temple meditation','Starfield Library','Dinner']},
    {t:'Templestay Experience',a:['Templestay program at Jogyesa','Morning temple ceremony','Tea ceremony','Insadong craft market','Gayageum performance (optional)']},
    {t:'Departure Day',a:['Last breakfast &amp; tea','Handmade craft souvenirs','Check-out &amp; to the airport','Arrive back in Malaysia','End of the culture journey']}
  ]
};
/* --- database matching helpers & the search engine --- */
var DB_DEC=function(s){return String(s).replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"')};
var DB_UP=function(s){return DB_DEC(s).toUpperCase()};
var DB_STOP='ISTANA|TAMAN|PASAR|KUIL|PANTAI|KAMPUNG|GUNUNG|BALAIRUNG|MUZIUM|PULAU|TERJUN|MENARA|PERPUSTAKAAN|KERETA|KABEL|KEDAI|LADANG|NEGARA|CENTRAL|PARK|GRAND|WORLD|SQUARE|JALAN|BEBAS|ZON|TENTERA|RAIL|BIKE|KOLAM|DONGGUNG|SEOUL|BUSAN|PALACE|MARKET|VILLAGE|TEMPLE|BEACH|ISLAND|MOUNTAIN|TOWER|LIBRARY|MEMORIAL|MUSEUM|SHRINE|GROTTO|CABLE|WATERFALL|OBSERVATORY|POND|STREET|FORTRESS|BAY|FOREST|SHEEP|FARM|FOLK|ANCIENT|TOMB|PLANTATION|LAKE|DEMILITARIZED'.split('|');
var DB_FIX={'N Seoul Tower':['N SEOUL','SEOUL TOWER'],'Seoul Grand Park':['GRAND PARK'],'DMZ (Demilitarized Zone)':['DMZ'],'Starfield COEX Library':['STARFIELD'],'Han River Park':['HAN RIVER'],'Songdo Cable Car':['KABEL SONGDO'],'Songdo Central Park':['SONGDO CENTRAL'],'SEA LIFE Busan':['SEA LIFE'],'O&#39;sulloc Tea Plantation':['OSULLOC','SULLOC'],'Udo Island':['UDO'],'Nami Island':['NAMI'],'PNB Bakery':['PNB'],'BIFF Square &amp; Nampo-dong':['BIFF'],'Donggung &amp; Wolji Pond':['WOLJI'],'Korean Folk Village':['FOLK']};
var DB_IDX=KOREA_DB.map(function(e){
  var keys=(DB_FIX[e.n]||[]).slice();
  DB_UP(e.n).split(/[^A-Z0-9']+/).forEach(function(w){
    if(w.length>=5&&DB_STOP.indexOf(w)<0&&keys.indexOf(w)<0)keys.push(w);
  });
  return {e:e,k:keys};
});
function dbMatch(text){
  var t=DB_UP(text),best=null,bl=0;
  DB_IDX.forEach(function(it){
    var hit=0;
    it.k.forEach(function(k){if(t.indexOf(k)>=0)hit+=k.length});
    if(hit>bl){bl=hit;best=it.e}
  });
  return best;
}
function dbFind(n){
  var d=DB_DEC(n);
  for(var i=0;i<KOREA_DB.length;i++){if(DB_DEC(KOREA_DB[i].n)===d)return KOREA_DB[i]}
  return null;
}
function dbAct(x){
  var e=dbMatch(x);
  return e?'<li>'+x+' <button type="button" class="pl-info" data-n="'+e.n+'" aria-label="Describe '+DB_DEC(e.n)+'">i</button></li>':'<li>'+x+'</li>';
}
var plCur='krw';
function plVal(name){var el=document.querySelector('input[name='+name+']:checked');return el?el.value:null}
function plFmt(n){return plCur==='krw'?('₩'+n.toLocaleString('en-US')):('RM '+(n/PL_RATE).toLocaleString('en-US',{maximumFractionDigits:0}))}
function plCompute(){
  var kadar=plVal('pl-kadar')||'sederhana',musim=plVal('pl-musim')||'sakura',tema=plVal('pl-tema')||'bandar';
  var dur=parseInt(plVal('pl-tempoh')||'5',10);
  var r=PL_RATES[kadar],s=PL_SEASON[musim],t=PL_THEME[tema];
  var hotel=Math.round(r.penginapan*s.m/1000)*1000;
  var lines=[
    {k:'Accommodation',a:hotel*dur},
    {k:'Food',a:r.makanan*dur},
    {k:'Transport',a:r.pengangkutan*dur},
    {k:'Activities & tickets',a:r.aktiviti*dur+t.pkg},
    {k:'Other',a:r.lain*dur}
  ];
  var rail=dur>=7?120000:dur>=5?60000:dur>=3?30000:0;
  if(kadar==='santai')rail=Math.round(rail*.6);else if(kadar==='padat')rail=Math.round(rail*1.15);
  lines[2].a+=rail;
  var total=lines.reduce(function(s2,x){return s2+x.a},0);
  return{lines:lines,total:total,dur:dur,kadar:kadar,musim:s,tema:t,tkey:tema};
}
function renderPlanner(){
  var p=plCompute();
  $('#pr-total').textContent=plFmt(p.total);
  $('#pr-alt').innerHTML=plCur==='krw'
    ?'≈ <b>RM '+(p.total/PL_RATE).toLocaleString('en-US',{maximumFractionDigits:0})+'</b> per traveller'
    :'≈ <b>₩'+p.total.toLocaleString('en-US')+'</b> per traveller';
  var bars=$('#pr-bars');
  bars.innerHTML=p.lines.map(function(x){
    return '<div class="pr-row"><em>'+x.k+'</em><div class="pr-track"><div class="pr-fill"></div></div><span class="pr-amt">'+plFmt(x.a)+'</span></div>';
  }).join('');
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    Array.prototype.forEach.call(bars.querySelectorAll('.pr-fill'),function(f,i){f.style.width=Math.round(p.lines[i].a/p.total*100)+'%'});
  })});
  $('#pr-tip').innerHTML='<strong>'+p.tema.l+' suggestion:</strong> '+p.tema.d+' Ideal route: '+p.tema.c+' · '+p.dur+' days · '+PL_PACE[p.kadar]+' · '+p.musim.l+'.';
  var days=PL_DAYS[p.tkey].slice(0,p.dur),lim=PL_LIM[p.kadar];
  $('#pl-itin-meta').textContent='— '+PL_THEME[p.tkey].l+' · '+p.dur+' days';
  $('#pl-itin-sub').textContent='Pace: '+PL_PACE_SHORT[p.kadar]+' — '+lim+' activities shown each day.';
  var itin=$('#pl-itin');
  itin.innerHTML=days.map(function(d,i){
    return '<div class="pl-day"><span class="pd-label">Day '+(i+1)+'</span><h4>'+d.t+'</h4><ul>'+d.a.slice(0,lim).map(dbAct).join('')+'</ul></div>';
  }).join('');
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    Array.prototype.forEach.call(itin.children,function(el,i){el.style.transitionDelay=(i*50)+'ms';el.classList.add('in')});
  })});
}
document.querySelector('.planner').addEventListener('change',renderPlanner);
$$('.pr-currency button').forEach(function(b){
  b.addEventListener('click',function(){
    plCur=b.dataset.cur;
    $$('.pr-currency button').forEach(function(x){x.classList.toggle('on',x===b)});
    renderPlanner();
  });
});
renderPlanner();
window.__setLiveRate=function(r){if(r>0){PL_RATE=r;renderPlanner();var pr=$('#pr-rate');if(pr)pr.textContent='₩'+Math.round(r);var ps=$('#pr-rate-src');if(ps)ps.textContent=' (live)';}};
/* carousel */
var carIdx=[6,7,8,9,10,2,3,0];
var carTrack=$('#car-track'),carCount=$('#car-count'),carBar=$('#car-bar'),carEl=$('.carousel');
var carCur=0,carTimer=null,carPaused=false;
carTrack.innerHTML=carIdx.map(function(gi){
  var g=GALLERY[gi];
  var src=gi===5?g.src:g.src.replace('1920px-','1280px-');
  return '<figure class="car-slide"><img src="'+src+'" alt="'+g.t+'" loading="lazy" decoding="async"><figcaption>'+g.t+'</figcaption></figure>';
}).join('');
$$('img',carTrack).forEach(guardImg);
function restartBar(){
  if(reducedMotion)return;
  carBar.style.transition='none';carBar.style.width='0';
  void carBar.offsetWidth;
  carBar.style.transition='width 5.6s linear';carBar.style.width='100%';
}
function carGo(i){
  carCur=((i%carIdx.length)+carIdx.length)%carIdx.length;
  carTrack.style.transform='translateX(-'+(carCur*100)+'%)';
  carCount.textContent=(carCur+1)+' / '+carIdx.length;
  restartBar();
}
function carPlay(){
  clearTimeout(carTimer);
  if(reducedMotion||carPaused)return;
  carTimer=setTimeout(function(){carGo(carCur+1);carPlay()},5600);
}
$('#car-prev').addEventListener('click',function(){carGo(carCur-1);carPlay()});
$('#car-next').addEventListener('click',function(){carGo(carCur+1);carPlay()});
carEl.addEventListener('mouseenter',function(){carPaused=true;clearTimeout(carTimer);carBar.style.transition='none'});
carEl.addEventListener('mouseleave',function(){carPaused=false;carPlay()});
var swipeX=null;
carEl.addEventListener('pointerdown',function(e){swipeX=e.clientX});
carEl.addEventListener('pointerup',function(e){
  if(swipeX===null)return;
  var dx=e.clientX-swipeX;swipeX=null;
  if(Math.abs(dx)>40){carGo(carCur+(dx<0?1:-1));carPlay()}
});
carGo(0);carPlay();
/* lightbox */
function buildLB(){
  lbEl=$('#lightbox');imgLB=$('#lb-img');capLB=$('#lb-caption');
  countLB=$('#lb-count');thumbsEl=$('#lb-thumbs');
  GALLERY.forEach(function(g,i){
    var b=document.createElement('button');
    b.setAttribute('aria-label','Image '+(i+1)+': '+g.t);
    var t=document.createElement('img');
    t.src=g.src.replace('1920px-','960px-');t.alt='';
    b.appendChild(t);
    b.addEventListener('click',function(){lbShow(i)});
    thumbsEl.appendChild(b);thumbEls.push(b);
  });
  $$('img',thumbsEl).forEach(guardImg);
  guardImg(imgLB);
  $('#lb-close').addEventListener('click',closeLB);
  $('#lb-prev').addEventListener('click',function(){lbShow(lbCur-1)});
  $('#lb-next').addEventListener('click',function(){lbShow(lbCur+1)});
  $('#lb-fullscreen').addEventListener('click',function(){
    if(!document.fullscreenElement){if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen()}
    else if(document.exitFullscreen){document.exitFullscreen()}
  });
  $$('.mo-item').forEach(function(m){
    function open(){openLB(parseInt(m.dataset.g,10))}
    m.addEventListener('click',open);
    m.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
}
function openLB(i){lbPrevFocus=document.activeElement;lbShow(i);lbEl.classList.add('open');document.body.classList.add('locked');var c=$('#lb-close');if(c)c.focus();}
function closeLB(){lbEl.classList.remove('open');document.body.classList.remove('locked');mRestore(lbPrevFocus);lbPrevFocus=null;}
function lbShow(i){
  var n=GALLERY.length;
  lbCur=((i%n)+n)%n;
  var g=GALLERY[lbCur];
  imgLB.classList.remove('ready');
  imgLB.onload=function(){imgLB.classList.add('ready')};
  imgLB.src=g.src;imgLB.alt=g.t;
  capLB.textContent=g.t;
  countLB.textContent=(lbCur+1)+' / '+n;
  thumbEls.forEach(function(t,k){t.classList.toggle('on',k===lbCur)});
  if(thumbEls[lbCur])thumbEls[lbCur].scrollIntoView({block:'nearest',inline:'nearest',behavior:reducedMotion?'auto':'smooth'});
}
buildLB();
/* ===== PLACE DATABASE + ASK THE GUIDE ===== */
if(typeof KOREA_DB!=='undefined'&&KOREA_DB.length){
var DB_CATL={sejarah:'History',budaya:'Culture',bandar:'City',makanan:'Food',keluarga:'Family',alam:'Nature'};
function dbFee(e){return e.fee?'±&#8361;'+String(e.fee).replace(/\B(?=(\d{3})+(?!\d))/g,','):'Free'}
function dbBadges(e){return e.cat.map(function(c){return '<span class="db-badge '+c+'">'+DB_CATL[c]+'</span>'}).join('')}
var dbGrid=$('#db-grid'),dbCount=$('#db-count'),dbQ=$('#db-q');
function dbRender(){
  var q=DB_UP(dbQ.value.trim()),n=0;
  if(!q){
    dbGrid.innerHTML='<div class="db-empty idle">Type above to search places — e.g. "palace", "jeju", "market" or "food".</div>';
    dbCount.textContent='';
    return;
  }
  var html=KOREA_DB.map(function(e){
    var hay=DB_UP(e.n+' '+e.h+' '+e.c+' '+e.r+' '+e.d+' '+e.cat.map(function(c){return DB_CATL[c]}).join(' '));
    if(hay.indexOf(q)<0)return '';
    n++;
    return '<article class="db-card" tabindex="0" role="button" data-n="'+e.n+'" aria-label="Details for '+DB_DEC(e.n)+'">'+
      '<div class="db-card-top"><div class="db-badges">'+dbBadges(e)+'</div><span class="db-fee">'+dbFee(e)+'</span></div>'+
      '<h3>'+DB_DEC(e.n)+'<small>'+e.h+'</small></h3>'+
      '<p class="db-loc">'+e.c+' — '+e.r+'</p>'+
      '<p class="db-desc">'+e.d+'</p>'+
      (e.t?'<p class="db-tip">Tip: '+e.t+'</p>':'')+
    '</article>';
  }).join('');
  dbGrid.innerHTML=html||'<div class="db-empty">No places found — try another keyword.</div>';
  dbCount.textContent=n+' places found';
  var cards=$$('.db-card',dbGrid);
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    cards.forEach(function(c,i){c.style.transitionDelay=Math.min(i*35,700)+'ms';c.classList.add('in')});
  })});
}
dbGrid.addEventListener('click',function(ev){var c=ev.target.closest('.db-card');if(c)dbOpenModal(dbFind(c.getAttribute('data-n')))});
dbGrid.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'||ev.key===' '){var c=ev.target.closest('.db-card');if(c){ev.preventDefault();dbOpenModal(dbFind(c.getAttribute('data-n')))}}
});
dbQ.addEventListener('input',dbRender);
/* --- modal focus trap (keyboard) --- */
var MFOCUS='button:not([disabled]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
function mTrap(ev){
  if(ev.key!=='Tab')return;
  var box=this;
  var f=Array.prototype.filter.call(box.querySelectorAll(MFOCUS),function(el){return el.offsetWidth||el.offsetHeight||el===document.activeElement});
  if(!f.length)return;
  var first=f[0],last=f[f.length-1];
  if(ev.shiftKey&&(document.activeElement===first||!box.contains(document.activeElement))){ev.preventDefault();last.focus();}
  else if(!ev.shiftKey&&(document.activeElement===last||!box.contains(document.activeElement))){ev.preventDefault();first.focus();}
}
function mRestore(el){if(el&&document.contains(el)){try{el.focus()}catch(err){}}}
var lbPrevFocus=null;
if(lbEl)lbEl.addEventListener('keydown',mTrap);
/* --- modal --- */
var dbModal=$('#db-modal'),dbBody=$('#db-modal-body'),dbCloseBtn=$('#db-modal-close'),dbPrevFocus=null;
dbModal.addEventListener('keydown',mTrap);
function dbOpenModal(e){
  if(!e)return;
  dbPrevFocus=document.activeElement;
  dbBody.innerHTML=
    '<div class="dbm-badges">'+dbBadges(e)+'</div>'+
    '<h3 style="margin-top:12px">'+e.n+'<small>'+e.h+'</small></h3>'+
    '<p class="dbm-loc">'+e.c+' · '+e.r+'</p>'+
    '<span class="dbm-label">Entrance fee</span><p class="dbm-fee">'+dbFee(e)+(e.fn?' <em>— '+e.fn+'</em>':'')+'</p>'+
    '<span class="dbm-label">Best season</span><p class="dbm-desc">'+e.s+'</p>'+
    '<span class="dbm-label">About this place</span><p class="dbm-desc">'+e.d+'</p>'+
    (e.t?'<div class="dbm-tip"><b>Traveller tip:</b> '+e.t+'</div>':'');
  dbModal.classList.add('open');
  dbModal.setAttribute('aria-hidden','false');
  document.body.classList.add('locked');
  if(dbCloseBtn)dbCloseBtn.focus();
}
function dbCloseModal(){
  dbModal.classList.remove('open');
  dbModal.setAttribute('aria-hidden','true');
  document.body.classList.remove('locked');
  mRestore(dbPrevFocus);dbPrevFocus=null;
}
$('#db-modal-close').addEventListener('click',dbCloseModal);
$('.db-modal-bg',dbModal).addEventListener('click',dbCloseModal);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&dbModal.classList.contains('open'))dbCloseModal()});
document.addEventListener('click',function(ev){
  var b=ev.target.closest('.pl-info');
  if(b)dbOpenModal(dbFind(b.getAttribute('data-n')));
});
/* --- Ask the guide --- */
var DB_REGIONS=['seoul','busan','jeju','gyeongju','tongyeong','hahoe','andong','jeonju','yeosu','suncheon','damyang','incheon','suwon','yongin','everland','gangwon','seoraksan','nami','chuncheon','daejeon'];
var DB_RMAP={seoul:'Seoul',busan:'Busan',jeju:'Jeju',gyeongju:'Gyeongsang',tongyeong:'Gyeongsang',hahoe:'Gyeongsang',andong:'Gyeongsang',jeonju:'Jeolla',yeosu:'Jeolla',suncheon:'Jeolla',damyang:'Jeolla',incheon:'Incheon & Gyeonggi',suwon:'Incheon & Gyeonggi',yongin:'Incheon & Gyeonggi',everland:'Incheon & Gyeonggi',gangwon:'Gangwon',seoraksan:'Gangwon',nami:'Gangwon',chuncheon:'Gangwon',daejeon:'Chungcheong'};
var DB_CATS={sejarah:['sejarah','istana','dinasti','warisan','purba','history','historical','palace','dynasty','royal','heritage','ancient','shrine','tomb','museum','gallery','memorial'],budaya:['budaya','hanbok','kuil','tradisi','seni','upacara','teh','culture','cultural','tradition','temple','craft','ceremony','village'],bandar:['bandar','moden','beli','belian','shopping','malam','urban','kedai','kafe','city','night','street','tower','market'],makanan:['makan','makanan','sedap','kuliner','juadah','restoran','hidangan','lapar','food','snack','cuisine','restaurant','dish','taste','kimchi','bbq','noodle'],keluarga:['kanak','anak','keluarga','family','budak','seronok','kids','child','children','baby','play'],alam:['alam','gunung','pantai','pulau','hiking','pemandangan','semula','luar','nature','mountain','beach','island','hike','park','waterfall','view','garden','lake','forest']};
var DB_FREE=['percuma','free','murah','jimat','budget'];
var DB_SEASON={sakura:'Apr',spring:'Apr',bunga:'Apr',cherry:'Apr',blossom:'Apr',luruh:'Oct',autumn:'Oct',fall:'Nov',daun:'Oct',salji:'Jan',snow:'Jan',sejuk:'Jan',winter:'Jan',panas:'Jul',summer:'Jul'};
var dbAns=$('#db-ask-answer'),dbAskIn=$('#db-ask-input');
function dbAskEngine(q){
  var t=DB_DEC(q).toLowerCase(),cats=[],regs=[],mon='',free=DB_FREE.some(function(w){return t.indexOf(w)>=0}),toks;
  Object.keys(DB_CATS).forEach(function(c){if(DB_CATS[c].some(function(w){return t.indexOf(w)>=0}))cats.push(c)});
  DB_REGIONS.forEach(function(w){if(t.indexOf(w)>=0&&regs.indexOf(DB_RMAP[w])<0)regs.push(DB_RMAP[w])});
  Object.keys(DB_SEASON).forEach(function(w){if(t.indexOf(w)>=0)mon=DB_SEASON[w]});
  toks=t.split(/[^a-z0-9']+/).filter(function(w){
    return (w.length>=4||w==='dmz'||w==='ktx')&&DB_STOP2.indexOf(w)<0;
  });
  var scored=KOREA_DB.map(function(e){
    var sc=0;
    e.cat.forEach(function(c){if(cats.indexOf(c)>=0)sc+=4});
    if(regs.indexOf(DB_DEC(e.r))>=0)sc+=4;
    if(free&&e.fee===0)sc+=3;else if(free&&e.fee<=5000)sc+=1;
    if(mon&&e.s.indexOf(mon)>=0)sc+=2;
    var hay=DB_UP(e.n+' '+e.d+' '+e.c),nm=DB_UP(e.n);
    toks.forEach(function(w){var u=DB_UP(w);
      if(nm.indexOf(u)>=0)sc+=(DB_REGIONS.indexOf(w)>=0?1:5);
      else if(hay.indexOf(u)>=0)sc+=1});
    return {e:e,s:sc};
  }).sort(function(a,b){return b.s-a.s});
  return {list:scored,cats:cats,regs:regs,mon:mon,free:free,top:scored.length?scored[0].s:0};
}
var DB_STOP2=('tempat|best|mana|apa|yang|untuk|dengan|boleh|nak|saya|kita|tolong|cadang|cadangan|destinasi|bagus|cantik|lawat|lawatan|pergi|adakah|bagaimana|area|kawasan|sekitar|pengalaman|aktiviti|singgah|jalan'
  +'|what|where|which|when|how|many|much|should|could|would|please|recommend|suggestion|thing|things|worth|going|travel|itinerary|day|days|week|year|years|time|there|their|them|this|that|with|from|have|has|will|about|because|really|quite|like|know|want|need|price|prices|cost|costs|close|opens|open|place|places|spot|spots').split('|');
var DB_ESC=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
/* Set to true once the AI Logic server rejects the App Check token (kills tier 1 for this session). */
var DB_AI_OFF=false;
/* AI proxy URL (Cloudflare Worker from worker/ai-proxy.js) — NO trailing slash.
   Empty = tier 0 is skipped and the page behaves exactly as it did before.
   Deployed 2026-10-16: https://jelajah-korea-ai.firas12346haaha-e0d.workers.dev */
var DB_PROXY_URL='https://jelajah-korea-ai.firas12346haaha-e0d.workers.dev';
/* Database context (retrieval): the entries that best match the question are sent with it so the
   AI answers from this site's own data — names, fees, seasons, tips — instead of inventing them.
   Capped at ~2600 characters; a question with no match sends empty context, so the prompt stays
   exactly as it was. */
var DB_CTX_MAX=2600;
var DB_CTX_MIN=4;
function dbCut(s,n){
  s=String(s);
  if(s.length<=n)return s;
  var sp=s.slice(0,n).lastIndexOf(' ');
  return s.slice(0,sp>n/2?sp:n).replace(/[,.;:–—-]+$/,'')+'…';
}
function dbCtx(list){
  var out='',n=0;
  for(var i=0;i<list.length&&n<6;i++){
    var e=list[i].e;
    var line='- '+DB_DEC(e.n)+' ('+DB_DEC(e.c)+', '+(e.fee===0?'free entry':'entry ₩'+e.fee+(e.fn?', '+DB_DEC(e.fn):''))
      +', best '+DB_DEC(e.s)+'): '+dbCut(DB_DEC(e.d),200)
      +(e.t?'. Tip: '+dbCut(DB_DEC(e.t),100):'');
    if(out.length+line.length+1>DB_CTX_MAX)break;
    out+=(out?'\n':'')+line;n++;
  }
  return {text:out,used:n};
}
function dbReply(q){
  var r=dbAskEngine(q);
  var hits=r.list.filter(function(x){return x.s>0});
  var top=hits.slice(0,3);
  var ctxObj=dbCtx(hits.filter(function(x){return x.s>=Math.max(DB_CTX_MIN,r.top-5)}));
  var ctxStr=ctxObj.text;

  var chips='<div class="dbmini">'+top.map(function(x){return '<button type="button" data-n="'+x.e.n+'">'+DB_DEC(x.e.n)+' <i>'+x.e.c+'</i></button>'}).join('')+'</div>';
  function localReply(){
    dbAns.classList.remove('thinking');
    if(r.top<4){
      var sugg=['Gyeongbokgung Palace','Everland','Gwangjang Market'].map(function(n){return dbFind(n)}).filter(Boolean);
      dbAns.innerHTML='<p class="dblead">Hmm, that question is a bit broad for me.</p>'+
        '<p>Try naming a category (food, history, kids, nature), a city name (Seoul, Busan, Jeju, Jeonju…), or words like "free" and "autumn".</p>'+
        '<div class="dbmini">'+sugg.map(function(e){return '<button type="button" data-n="'+e.n+'">'+DB_DEC(e.n)+' <i>'+e.c+'</i></button>'}).join('')+'</div>';
      return;
    }
    var bits=[];
    if(r.cats.length)bits.push(r.cats.map(function(c){return DB_CATL[c].toLowerCase()}).join('/'));
    if(r.regs.length)bits.push(r.regs.join('/'));
    var lead=bits.length?'Best picks for '+bits.join(' in ')+':':'Special suggestions for you:';
    if(r.free)lead+=' (focus on cheap/free places)';
    if(r.mon)lead+=' — great around '+r.mon;
    dbAns.innerHTML='<p class="dblead">'+lead+'</p>'+chips+
      '<p class="dbfoot">'+top.length+' suggestions from '+KOREA_DB.length+' places · click for full details.</p>';
  }
  function showAi(clean){
    dbAns.classList.remove('thinking');
    dbAns.innerHTML='<p class="dblead">Jelajah AI</p><p>'+DB_ESC(clean)+'</p>'+(top.length?chips:'')+
      '<p class="dbfoot">Generated live by AI · '+(ctxObj.used
        ?'answered from '+ctxObj.used+' matching entr'+(ctxObj.used===1?'y':'ies')+' in the '+KOREA_DB.length+'-place database'
        :'no database match for this question, so answered from general South Korea knowledge')+'</p>';
  }
  /* Tier 0 (optional): CORS proxy — worker/ai-proxy.js on Cloudflare. It is the only tier that
     runs on GitHub Pages and is untouched by Firebase AI Logic's mandatory App Check rule
     (2 November 2026), because it is not a Firebase endpoint.
     Empty = this tier is skipped entirely. */
  function viaProxy(){
    return fetch(DB_PROXY_URL+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:DB_DEC(q),ctx:ctxStr})})
      .then(function(res){
        return res.text().then(function(t){
          var d=null;try{d=JSON.parse(t)}catch(err){}
          if(res.ok&&d&&d.ok===true&&typeof d.answer==='string')return d.answer;
          throw new Error(d&&d.error?'proxy '+d.error:'proxy http '+res.status);
        });
      })
      .then(function(a){
        var clean=a.replace(/\r?\n+/g,' ').replace(/\s+/g,' ').trim();
        if(clean.length<3)throw new Error('answer too short');
        return clean;
      });
  }
  /* Tier 1: Gemini through Firebase AI Logic (js/community/ai-logic.js). Free-tier answers can
     take ~30 seconds, so this request is never cancelled — the next tier is tried in parallel
     and whichever answers first wins.
     If the server refuses because of App Check (no valid token), stop retrying for this
     session — every question would waste one request that is guaranteed to fail. */
  function viaGemini(){
    if(!window.JelajahAI||DB_AI_OFF)return Promise.reject(new Error('AI Logic not loaded'));
    return window.JelajahAI.ask(DB_DEC(q),ctxStr).then(function(text){
      var clean=(typeof text==='string')?text.trim():'';
      if(clean.length<3)throw new Error('jawapan pendek');
      return clean;
    },function(e){
      if(/App Check/i.test(String(e&&e.message||e)))DB_AI_OFF=true;
      throw e;
    });
  }
  /* Tier 2: server-side Function (the API key is never visible to the browser). On GitHub Pages
     this route fails fast (405) — which is why tiers 0/1 are needed there. */
  function viaFunction(){
    return fetch('/functions/v1/app?action=ask',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({q:DB_DEC(q),ctx:ctxStr})})
      .then(function(res){return res.ok?res.json():Promise.reject(new Error('http '+res.status));})
      .then(function(data){
        var clean=(data&&data.ok===true&&typeof data.answer==='string')?data.answer.replace(/\r?\n+/g,' ').replace(/\s+/g,' ').trim():'';
        if(clean.length<3)return Promise.reject(new Error('empty answer'));
        return clean;
      });
  }
  dbAns.classList.add('show','thinking');
  dbAns.innerHTML='<p class="dblead">Jelajah AI is thinking</p>';
  var pool=[];
  if(DB_PROXY_URL)pool.push('proxy');
  if(window.JelajahAI&&!DB_AI_OFF)pool.push('gemini');
  pool.push('fn');
  var settled=false,tried={},failed={};
  function finish(text){
    if(settled)return;settled=true;
    clearTimeout(guard);clearTimeout(handover);
    if(text)showAi(text);else localReply();
  }
  var RUN={proxy:viaProxy,gemini:viaGemini,fn:viaFunction};
  function start(name){
    if(tried[name])return;tried[name]=true;
    RUN[name]().then(function(clean){finish(clean);},function(){
      failed[name]=true;
      var next=pool.filter(function(n){return !tried[n]})[0];
      if(next)start(next);
      else if(pool.every(function(n){return failed[n]}))finish(null);
    });
  }
  /* A fast failure → the next tier is tried immediately. This timeout covers a tier that
     hangs: after 8s with no answer, the following tier is started in parallel too. */
  var handover=setTimeout(function(){
    pool.filter(function(n){return !tried[n]}).slice(0,1).forEach(start);
  },8000);
  var guard=setTimeout(function(){finish(null);},40000);
  start(pool[0]);
}
$('#db-ask-form').addEventListener('submit',function(ev){
  ev.preventDefault();
  var v=dbAskIn.value.trim();
  if(v)dbReply(v);
});
$('#db-ask-chips').addEventListener('click',function(ev){
  var b=ev.target.closest('button');if(!b)return;
  dbAskIn.value=b.textContent;
  dbReply(b.textContent);
});
dbAns.addEventListener('click',function(ev){
  var b=ev.target.closest('button[data-n]');
  if(b)dbOpenModal(dbFind(b.getAttribute('data-n')));
});
dbRender();
}
/* global keys */
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K')){
    e.preventDefault();
    searchBar.classList.contains('open')?closeSearch():openSearch();
    return;
  }
  var lbOpen=lbEl&&lbEl.classList.contains('open');
  if(e.key==='Escape'){
    if(lbOpen)closeLB();
    else if(mobileMenu.classList.contains('open'))toggleMenu(false);
    else if(searchBar.classList.contains('open'))closeSearch();
    return;
  }
  if(lbOpen){
    if(e.key==='ArrowRight')lbShow(lbCur+1);
    if(e.key==='ArrowLeft')lbShow(lbCur-1);
  }
});
})();
