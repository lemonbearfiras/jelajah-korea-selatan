/* ============================================================
   KOMUNITI — KOMEN (Jelajah Korea Selatan)
   ------------------------------------------------------------
   • Mod firebase : komen disimpan dalam koleksi "comments"
                    (Cloud Firestore), kemas kini masa nyata.
   • Mod demo     : komen disimpan dalam localStorage pelayar.

   Struktur dokumen Firestore:
     comments/{id} = { uid, name, photo, text, replyTo, replyName, createdAt }
     likes/{commentId_uid} = { commentId, uid, createdAt }

   Ciri engagement: suka (♥), balas (↩), kongsi pautan, papan
   peneraju "paling aktif" + notifikasi balasan ringkas.
   ============================================================ */
(function(){
'use strict';
var d=document;
var $=function(s){return d.querySelector(s)};

var list=$('#km-list'), countEl=$('#km-count');
var compose=$('#km-compose'), textEl=$('#km-text'), sendBtn=$('#km-send'), charsEl=$('#km-chars');
var hintEl=$('#km-hint');
if(!list)return;
var replyRow=$('#km-replyrow'), replyNameEl=$('#km-replyname'), replyCancel=$('#km-replycancel');
var noteEl=$('#km-replynote');
var boardEl=$('#km-board'), boardList=$('#km-board-list');

var mode='demo', user=null, unsubs=null;
var items=[];
var likeInfo={};        /* commentId -> {n:number, mine:boolean} */
var replyTarget=null;   /* {id,name} bila sedang membalas */
var pendingJump=true;

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
function avaHTML(p,cls){
  if(p.photo)return '<span class="km-ava '+(cls||'')+'"><img src="'+esc(p.photo)+'" alt=""></span>';
  var g=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];
  var h=0,s=p.name||'';for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  var init=(s.trim().split(/\s+/).length>1?s.trim().split(/\s+/)[0][0]+s.trim().split(/\s+/).pop()[0]:s[0]||'?').toUpperCase();
  return '<span class="km-ava '+(cls||'')+'" style="background:'+g[h%g.length]+'">'+init+'</span>';
}

/* ---------- render ---------- */
function itemHTML(c,inThread){
  var own=user&&c.uid===user.uid;
  var li=likeInfo[c.id]||{n:0,mine:false};
  var prof=c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener" title="Lihat halaman profil '+esc(c.name)+'">':'';
  var profEnd=c.uid?'</a>':'';
  var replyTag=(!inThread&&c.replyTo)?'<span class="km-replytag">↩ mem balas '+esc(c.replyName||'@'+c.replyTo.slice(0,8))+'</span>':'';
  return '<article class="km-item'+(inThread?' km-inthread':'')+'" id="komen-'+esc(c.id)+'">'+prof+avaHTML(c)+profEnd+
    '<div class="km-body">'+
      '<div class="km-meta"><b>'+(c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener">'+esc(c.name)+'</a>':esc(c.name))+'</b><time>'+ago(c.ts)+'</time>'+replyTag+
      (own?'<button class="km-del" type="button" data-id="'+esc(c.id)+'">Padam</button>':'')+
      '</div>'+
      '<p class="km-text">'+esc(c.text).replace(/\n/g,'<br>')+'</p>'+
      '<div class="km-acts">'+
        '<button class="km-like'+(li.mine?' on':'')+'" type="button" data-id="'+esc(c.id)+'" aria-pressed="'+(li.mine?'true':'false')+'" aria-label="Suka komen">♥<i>'+li.n+'</i></button>'+
        '<button class="km-replyb" type="button" data-id="'+esc(c.id)+'" data-name="'+esc(c.name)+'">Balas</button>'+
        '<button class="km-shareb" type="button" data-id="'+esc(c.id)+'">Kongsi</button>'+
      '</div>'+
      (!inThread?threadHTML(c):'')+
    '</div></article>';
}
function threadHTML(c){
  var reps=threads[c.id];
  if(!reps||!reps.length)return '';
  reps.sort(function(a,b){return a.ts-b.ts});
  return '<button class="km-toggle" type="button" data-id="'+esc(c.id)+'" aria-expanded="false">Buka balasan ('+reps.length+')</button>'+
    '<div class="km-replies" id="rep-'+esc(c.id)+'" hidden>'+reps.map(function(r){return itemHTML(r,true)}).join('')+'</div>';
}
var threads={};
function buildThreads(){
  threads={};
  var ids={},roots=[];
  items.forEach(function(c){ids[c.id]=c});
  items.forEach(function(c){
    if(!c.replyTo||!ids[c.replyTo]){roots.push(c);return}
    /* cari induk tahap-1 (rantai balasan diratakan ke punca) */
    var cur=c,guard=0;
    while(cur.replyTo&&ids[cur.replyTo]&&guard<20){cur=ids[cur.replyTo];guard++}
    (threads[cur.id]=threads[cur.id]||[]).push(c);
  });
  roots.sort(function(a,b){return b.ts-a.ts});
  return roots;
}
function render(){
  items.sort(function(a,b){return b.ts-a.ts});
  countEl.textContent=items.length?items.length+' komen':'';
  if(!items.length){
    list.innerHTML='<div class="km-empty">Masih tiada komen — jadilah orang pertama berkongsi cerita perjalanan anda!</div>';
    renderBoard();paintNote();return;
  }
  list.innerHTML=buildThreads().map(function(c){return itemHTML(c,false)}).join('');
  renderBoard();paintNote();
  if(pendingJump&&tryJump())pendingJump=false;
}
function tryJump(){
  var m=location.hash.match(/^#komen-([\w-]+)$/);
  if(!m)return true;
  var el=d.getElementById('komen-'+m[1]);
  if(!el)return false;
  var box=el.closest('.km-replies');
  if(box)openThread(box);
  el.classList.add('flash');
  try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){el.scrollIntoView()}
  setTimeout(function(){el.classList.remove('flash')},2200);
  return true;
}
function openThread(box){
  var tg=box.parentNode.querySelector('.km-toggle');
  box.hidden=false;
  if(tg){tg.setAttribute('aria-expanded','true');tg.textContent='Tutup balasan ('+box.querySelectorAll('.km-item').length+')'}
}
window.addEventListener('hashchange',tryJump);

/* ---------- papan peneraju ---------- */
function renderBoard(){
  if(!boardEl)return;
  if(!items.length){boardEl.hidden=true;return}
  var map={};
  items.forEach(function(c){
    var k=c.uid||('n:'+c.name);
    if(!map[k])map[k]={name:c.name,photo:c.photo,n:0,hearts:0};
    map[k].n++;
    map[k].hearts+=(likeInfo[c.id]||{n:0}).n;
  });
  var rows=Object.keys(map).map(function(k){return map[k]});
  rows.sort(function(a,b){return (b.n*2+b.hearts)-(a.n*2+a.hearts)});
  rows=rows.slice(0,5);
  boardList.innerHTML=rows.map(function(r,i){
    return '<li><span class="km-rank">'+(i+1)+'</span>'+avaHTML(r,'km-ava-xs')+'<b>'+esc(r.name)+'</b>'+
      '<span class="km-bscore">'+r.n+' komen · ♥ '+r.hearts+'</span></li>';
  }).join('');
  boardEl.hidden=rows.length<2;
}

/* ---------- notifikasi balasan ---------- */
function paintNote(){
  if(!noteEl)return;
  noteEl.hidden=true;
  if(!user)return;
  var mine={};
  items.forEach(function(c){if(c.uid===user.uid)mine[c.id]=1});
  var seen=0;
  try{seen=parseInt(localStorage.getItem('km-seen-reply')||'0',10)}catch(e){}
  var nw=items.filter(function(c){return c.replyTo&&mine[c.replyTo]&&c.ts>seen}).length;
  if(!nw)return;
  noteEl.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>'+
    '<b>'+nw+'</b> balasan baharu pada komen anda.';
  noteEl.hidden=false;
  try{localStorage.setItem('km-seen-reply',String(Date.now()))}catch(e){}
}

/* ---------- like state ---------- */
function demoLikeInfo(){
  likeInfo={};
  items.forEach(function(c){likeInfo[c.id]={n:c.likes||0,mine:!!c.likedByMe}});
}
function chunkIds(ids){
  var out=[];
  for(var i=0;i<ids.length;i+=30)out.push(ids.slice(i,i+30));
  return out;
}
function refreshLikes(){
  if(mode!=='firebase'){demoLikeInfo();render();return}
  var db=KomAuth.db();
  var ids=items.map(function(c){return c.id});
  if(!ids.length){likeInfo={};render();return}
  var info={},myUid=user?user.uid:'';
  var jobs=chunkIds(ids).map(function(chunk){
    return db.collection('likes').where('commentId','in',chunk).get().then(function(snap){
      snap.docs.forEach(function(doc){
        var v=doc.data();
        var k=v.commentId;
        if(!info[k])info[k]={n:0,mine:false};
        info[k].n++;
        if(v.uid===myUid)info[k].mine=true;
      });
    });
  });
  Promise.all(jobs).then(function(){likeInfo=info;render()}).catch(function(){likeInfo=info;render()});
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
  demoLikeInfo();
  render();
}

/* ---------- storan firebase ---------- */
function fbLoad(){
  var db=KomAuth.db();
  unsubs=db.collection('comments').orderBy('createdAt','desc').limit(50).onSnapshot(function(snap){
    items=snap.docs.map(function(doc){
      var v=doc.data();
      return {id:doc.id,uid:v.uid||'',name:v.name||'Pengembara',photo:v.photo||'',text:v.text||'',
        replyTo:v.replyTo||'',replyName:v.replyName||'',ts:v.createdAt&&v.createdAt.toMillis?v.createdAt.toMillis():null};
    });
    refreshLikes();
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
  if(locked)cancelReply();
  render(); /* kira semula butang Padam/Suka ikut pemilik */
}
d.addEventListener('komuniti:auth',function(ev){
  var prevMode=mode,prevUser=user;
  user=ev.detail.user;mode=ev.detail.mode;
  if(prevMode!==mode){
    if(unsubs){unsubs();unsubs=null}
    if(mode==='firebase')fbLoad();else demoLoad();
  }else if(user&&(!prevUser||prevUser.uid!==user.uid)&&mode==='firebase'){
    refreshLikes();
  }
  applyAuth();
});

/* ---------- balas: chip konteks ---------- */
function startReply(id,name){
  replyTarget={id:id,name:name};
  replyNameEl.textContent='@'+name;
  replyRow.hidden=false;
  textEl.focus();
}
function cancelReply(){
  replyTarget=null;
  if(replyRow){replyRow.hidden=true;}
}
if(replyCancel)replyCancel.addEventListener('click',cancelReply);

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
  var rt=replyTarget;
  var clear=function(){
    textEl.value='';charsEl.textContent='0 / 600';
    sendBtn.disabled=false;cancelReply();
  };
  if(mode==='demo'){
    var arr=demoRead();
    arr.push({id:'c'+Date.now()+Math.random().toString(36).slice(2,6),uid:user.uid,name:user.name,photo:user.photo||'',
      text:text,replyTo:rt?rt.id:'',replyName:rt?rt.name:'',likes:0,ts:Date.now()});
    demoWrite(arr);
    demoLoad();
    clear();
  }else{
    KomAuth.db().collection('comments').add({
      uid:user.uid,
      name:user.name,
      photo:user.photo||'',
      text:text,
      replyTo:rt?rt.id:'',
      replyName:rt?rt.name.slice(0,60):'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(clear).catch(function(err){
      sendBtn.disabled=false;
      alert('Komen gagal dihantar ('+(err.code||'ralat')+'). Semua peraturan Firestore dalam README-FIREBASE.md.');
    });
  }
});

/* ---------- suka ---------- */
function toggleLike(id){
  if(!user){hintEl.hidden=false;return}
  var info=likeInfo[id]||{n:0,mine:false};
  if(mode==='demo'){
    var arr=demoRead();
    arr.forEach(function(c){if(c.id===id){c.likes=(c.likedByMe?(c.likes||1)-1:(c.likes||0)+1);c.likedByMe=!c.likedByMe}});
    demoWrite(arr);demoLoad();
    return;
  }
  var db=KomAuth.db();
  var likeDoc=id+'_'+user.uid;
  if(info.mine){
    db.collection('likes').doc(likeDoc).delete().then(function(){
      likeInfo[id]={n:Math.max(0,info.n-1),mine:false};render();
    }).catch(function(){refreshLikes()});
  }else{
    db.collection('likes').doc(likeDoc).set({
      commentId:id,uid:user.uid,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
      likeInfo[id]={n:info.n+1,mine:true};render();
    }).catch(function(e){
      alert('Gagal menanda suka ('+(e.code||'ralat')+'). Terbitkan peraturan likes — README-FIREBASE.md.');
      refreshLikes();
    });
  }
}

/* ---------- kongsi ---------- */
function flashBtn(btn,label){
  var old=btn.textContent;
  btn.textContent=label;btn.classList.add('done');
  setTimeout(function(){btn.textContent=old;btn.classList.remove('done')},1400);
}
function copyText(t){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t);
  var ta=d.createElement('textarea');
  ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
  d.body.appendChild(ta);ta.select();
  try{d.execCommand('copy')}catch(e){}
  d.body.removeChild(ta);
  return Promise.resolve();
}
function shareComment(c,btn){
  var url=location.origin+location.pathname+'#komen-'+c.id;
  var snippet=c.text.length>90?c.text.slice(0,90)+'…':c.text;
  if(navigator.share){
    navigator.share({title:'Jelajah Korea Selatan — Komuniti',text:c.name+': "'+snippet+'"',url:url}).catch(function(){});
    return;
  }
  copyText(url).then(function(){flashBtn(btn,'Pautan tersalin!')},function(){flashBtn(btn,'Gagal menyalin')});
}

/* ---------- delegasi klik pada senarai ---------- */
list.addEventListener('click',function(ev){
  var t=ev.target;
  var tg=t.closest('.km-toggle');
  if(tg){
    var rbox=d.getElementById('rep-'+tg.getAttribute('data-id'));
    if(!rbox)return;
    if(rbox.hidden){openThread(rbox)}
    else{
      rbox.hidden=true;
      tg.setAttribute('aria-expanded','false');
      tg.textContent='Buka balasan ('+rbox.querySelectorAll('.km-item').length+')';
    }
    return;
  }
  var like=t.closest('.km-like');
  if(like){toggleLike(like.getAttribute('data-id'));return}
  var rb=t.closest('.km-replyb');
  if(rb){
    if(!user){hintEl.hidden=false;return}
    startReply(rb.getAttribute('data-id'),rb.getAttribute('data-name'));
    return;
  }
  var sb=t.closest('.km-shareb');
  if(sb){
    var id=sb.getAttribute('data-id');
    var c=items.filter(function(x){return x.id===id})[0];
    if(c)shareComment(c,sb);
    return;
  }
  var b=t.closest('.km-del');
  if(!b||!user)return;
  if(!window.confirm('Padam komen ini?'))return;
  var id2=b.getAttribute('data-id');
  if(mode==='demo'){
    demoWrite(demoRead().filter(function(c){return c.id!==id2}));
    demoLoad();
  }else{
    KomAuth.db().collection('comments').doc(id2).delete().catch(function(e){
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
