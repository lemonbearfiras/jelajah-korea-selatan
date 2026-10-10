/* ============================================================
   KOMUNITI — KOMEN (Jelajah Korea Selatan)
   ------------------------------------------------------------
   • Mod firebase : komen disimpan dalam koleksi "comments"
                    (Cloud Firestore), kemas kini masa nyata.
   • Mod demo     : komen disimpan dalam localStorage pelayar.

   Struktur dokumen Firestore:
     comments/{id} = { uid, name, photo, text, createdAt }
   ============================================================ */
(function(){
'use strict';
var d=document;
var $=function(s){return d.querySelector(s)};

var list=$('#km-list'), countEl=$('#km-count');
var compose=$('#km-compose'), textEl=$('#km-text'), sendBtn=$('#km-send'), charsEl=$('#km-chars');
var hintEl=$('#km-hint');
if(!list)return;

var mode='demo', user=null, unsubs=null;
var items=[];

/* ---------- util ---------- */
var PROFILE_BASE='https://lemonbearfiras.github.io/jelajah-korea-selatan/profile?v=';
var BM_M=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ago(ts){
  if(!ts)return 'baru sahaja';
  var s=Math.max(0,(Date.now()-ts)/1000);
  if(s<60)return 'baru sahaja';
  if(s<3600)return Math.floor(s/60)+' minit lalu';
  if(s<86400)return Math.floor(s/3600)+' jam lalu';
  var day=s/86400;
  if(day<2)return 'semalam';
  if(day<7)return Math.floor(day)+' hari lalu';
  var dt=new Date(ts);
  return dt.getDate()+' '+BM_M[dt.getMonth()]+' '+dt.getFullYear();
}
function avaHTML(p){
  if(p.photo)return '<span class="km-ava"><img src="'+esc(p.photo)+'" alt=""></span>';
  var g=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];
  var h=0,s=p.name||'';for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  var init=(s.trim().split(/\s+/).length>1?s.trim().split(/\s+/)[0][0]+s.trim().split(/\s+/).pop()[0]:s[0]||'?').toUpperCase();
  return '<span class="km-ava" style="background:'+g[h%g.length]+'">'+init+'</span>';
}

/* ---------- render ---------- */
function render(){
  items.sort(function(a,b){return b.ts-a.ts});
  countEl.textContent=items.length?items.length+' komen':'';
  if(!items.length){
    list.innerHTML='<div class="km-empty">Masih tiada komen — jadilah orang pertama berkongsi cerita perjalanan anda!</div>';
    return;
  }
  list.innerHTML=items.map(function(c){
    var own=user&&c.uid===user.uid;
    var prof=c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener" title="Lihat halaman profil '+esc(c.name)+'">':'';
    var profEnd=c.uid?'</a>':'';
    return '<article class="km-item">'+prof+avaHTML(c)+profEnd+
      '<div class="km-body">'+
        '<div class="km-meta"><b>'+(c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener">'+esc(c.name)+'</a>':esc(c.name))+'</b><time>'+ago(c.ts)+'</time>'+
        (own?'<button class="km-del" type="button" data-id="'+esc(c.id)+'">Padam</button>':'')+
        '</div>'+
        '<p class="km-text">'+esc(c.text).replace(/\n/g,'<br>')+'</p>'+
      '</div></article>';
  }).join('');
}

/* ---------- storan demo ---------- */
var DEMO_KEY='km-demo-comments';
function demoRead(){
  try{return JSON.parse(localStorage.getItem(DEMO_KEY)||'[]')}catch(e){return []}
}
function demoWrite(arr){
  try{localStorage.setItem(DEMO_KEY,JSON.stringify(arr))}catch(e){}
}
function demoLoad(){
  items=demoRead();
  render();
}

/* ---------- storan firebase ---------- */
function fbLoad(){
  var db=KomAuth.db();
  unsubs=db.collection('comments').orderBy('createdAt','desc').limit(50).onSnapshot(function(snap){
    items=snap.docs.map(function(doc){
      var v=doc.data();
      return {id:doc.id,uid:v.uid||'',name:v.name||'Pengembara',photo:v.photo||'',text:v.text||'',ts:v.createdAt&&v.createdAt.toMillis?v.createdAt.toMillis():null};
    });
    render();
  },function(err){
    list.innerHTML='<div class="km-empty">Tidak dapat memuatkan komen ('+esc(err.code||'ralat')+'). Semua peraturan Firestore dalam README-FIREBASE.md.</div>';
  });
}

/* ---------- auth state ---------- */
function applyAuth(){
  var locked=!user;
  sendBtn.disabled=locked;
  textEl.disabled=locked;
  compose.classList.toggle('locked',locked);
  textEl.placeholder=locked?'Log masuk untuk menulis komen…':'Kongsi pengalaman anda — tip jadual, bajet atau makanan?';
  hintEl.hidden=!locked;
  render(); /* kira semula butang "Padam" ikut pemilik */
}
d.addEventListener('komuniti:auth',function(ev){
  var prevMode=mode;
  user=ev.detail.user;mode=ev.detail.mode;
  if(prevMode!==mode){
    if(unsubs){unsubs();unsubs=null}
    if(mode==='firebase')fbLoad();else demoLoad();
  }
  applyAuth();
});

/* ---------- hantar ---------- */
textEl.addEventListener('input',function(){
  charsEl.textContent=textEl.value.length+' / 600';
});
compose.addEventListener('submit',function(ev){
  ev.preventDefault();
  if(!user)return;
  var text=textEl.value.trim();
  if(!text)return;
  sendBtn.disabled=true;
  if(mode==='demo'){
    var arr=demoRead();
    arr.push({id:'c'+Date.now()+Math.random().toString(36).slice(2,6),uid:user.uid,name:user.name,photo:user.photo||'',text:text,ts:Date.now()});
    demoWrite(arr);
    demoLoad();
    textEl.value='';charsEl.textContent='0 / 600';
    sendBtn.disabled=false;
  }else{
    KomAuth.db().collection('comments').add({
      uid:user.uid,
      name:user.name,
      photo:user.photo||'',
      text:text,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      textEl.value='';charsEl.textContent='0 / 600';
      sendBtn.disabled=false;
    }).catch(function(err){
      sendBtn.disabled=false;
      alert('Komen gagal dihantar ('+(err.code||'ralat')+'). Semua peraturan Firestore dalam README-FIREBASE.md.');
    });
  }
});

/* ---------- padam ---------- */
list.addEventListener('click',function(ev){
  var b=ev.target.closest('.km-del');
  if(!b||!user)return;
  if(!window.confirm('Padam komen ini?'))return;
  var id=b.getAttribute('data-id');
  if(mode==='demo'){
    demoWrite(demoRead().filter(function(c){return c.id!==id}));
    demoLoad();
  }else{
    KomAuth.db().collection('comments').doc(id).delete().catch(function(e){
      alert('Komen gagal dipadam ('+(e.code||'ralat')+'). Semak peraturan Firestore — README-FIREBASE.md.');
    });
  }
});

/* ---------- init ---------- */
mode=(window.KomAuth&&KomAuth.getMode)?KomAuth.getMode():'demo';
user=(window.KomAuth&&KomAuth.getUser)?KomAuth.getUser():null;
if(mode==='firebase')fbLoad();else demoLoad();
applyAuth();
})();
