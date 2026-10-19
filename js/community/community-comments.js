/* ============================================================
   COMMUNITY — COMMENTS (Jelajah Korea Selatan)
   ------------------------------------------------------------
   • Firebase mode: comments live in the "comments" collection
                    (Cloud Firestore) with real-time updates.
   • Demo mode    : comments are kept in this browser's localStorage.

   Firestore document shape:
     comments/{id} = { uid, name, photo, text, replyTo, replyName, createdAt }
     likes/{commentId_uid} = { commentId, uid, createdAt }

   Engagement features: like (♥), reply (↩), share link, a "most active"
   leaderboard and lightweight reply notifications.
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
var replyTarget=null;   /* {id,name} while a reply is being composed */
var pendingJump=true;

/* ---------- util ---------- */
var BM_M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ago(ts){
  if(!ts)return 'just now';
  var s=Math.max(0,(Date.now()-ts)/1000);
  if(s<60)return 'just now';
  if(s<3600)return Math.floor(s/60)+' min ago';
  if(s<86400)return Math.floor(s/3600)+' hr ago';
  var day=s/86400;
  if(day<2)return 'yesterday';
  if(day<7)return Math.floor(day)+' days ago';
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
  var prof=c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener" title="View '+esc(c.name)+'\'s profile page">':'';
  var profEnd=c.uid?'</a>':'';
  var replyTag=(!inThread&&c.replyTo)?'<span class="km-replytag">↩ replying to '+esc(c.replyName||'@'+c.replyTo.slice(0,8))+'</span>':'';
  return '<article class="km-item'+(inThread?' km-inthread':'')+'" id="komen-'+esc(c.id)+'">'+prof+avaHTML(c)+profEnd+
    '<div class="km-body">'+
      '<div class="km-meta"><b>'+(c.uid?'<a class="km-prof" href="'+esc(PROFILE_BASE+encodeURIComponent(c.uid))+'" target="_blank" rel="noopener">'+esc(c.name)+'</a>':esc(c.name))+'</b><time>'+ago(c.ts)+'</time>'+replyTag+
      (own?'<button class="km-del" type="button" data-id="'+esc(c.id)+'">Delete</button>':'')+
      '</div>'+
      '<p class="km-text">'+esc(c.text).replace(/\n/g,'<br>')+'</p>'+
      '<div class="km-acts">'+
        '<button class="km-like'+(li.mine?' on':'')+'" type="button" data-id="'+esc(c.id)+'" aria-pressed="'+(li.mine?'true':'false')+'" aria-label="Like comment">♥<i>'+li.n+'</i></button>'+
        '<button class="km-replyb" type="button" data-id="'+esc(c.id)+'" data-name="'+esc(c.name)+'">Reply</button>'+
        '<button class="km-shareb" type="button" data-id="'+esc(c.id)+'">Share</button>'+
      '</div>'+
      (!inThread?threadHTML(c):'')+
    '</div></article>';
}
function threadHTML(c){
  var reps=threads[c.id];
  if(!reps||!reps.length)return '';
  reps.sort(function(a,b){return a.ts-b.ts});
  var open=!!openThreads[c.id];
  return '<button class="km-toggle" type="button" data-id="'+esc(c.id)+'" aria-expanded="'+(open?'true':'false')+'">'+(open?'Close':'Open')+' replies ('+reps.length+')</button>'+
    '<div class="km-replies" id="rep-'+esc(c.id)+'"'+(open?'':' hidden')+'>'+reps.map(function(r){return itemHTML(r,true)}).join('')+'</div>';
}
var threads={};
var openThreads={};  /* id of the thread being opened — survives re-renders */
function rootOf(cid){
  var ids={};items.forEach(function(c){ids[c.id]=c});
  var cur=ids[cid];if(!cur)return cid;
  var guard=0;
  while(cur.replyTo&&ids[cur.replyTo]&&guard<CHAIN_MAX){cur=ids[cur.replyTo];guard++}
  return cur.id;
}
function buildThreads(){
  threads={};
  var ids={},roots=[];
  items.forEach(function(c){ids[c.id]=c});
  items.forEach(function(c){
    if(!c.replyTo||!ids[c.replyTo]){roots.push(c);return}
    /* find the top-level parent (reply chains flatten to the root) */
    var cur=c,guard=0;
    while(cur.replyTo&&ids[cur.replyTo]&&guard<CHAIN_MAX){cur=ids[cur.replyTo];guard++}
    (threads[cur.id]=threads[cur.id]||[]).push(c);
  });
  roots.sort(function(a,b){return b.ts-a.ts});
  return roots;
}
function realCount(){
  var n=0;
  items.forEach(function(c){if(!c.ctxOnly)n++});
  return n;
}
function render(){
  items.sort(function(a,b){return b.ts-a.ts});
  var n=realCount();
  countEl.textContent=n?n+(n===1?' comment':' comments'):'';
  if(!items.length){
    list.innerHTML='<div class="km-empty">No comments yet — be the first to share your travel story!</div>';
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
  openThreads[box.id.slice(4)]=true;
  if(tg){tg.setAttribute('aria-expanded','true');tg.textContent='Close replies ('+box.querySelectorAll('.km-item').length+')'}
}
window.addEventListener('hashchange',tryJump);

/* ---------- leaderboard ---------- */
function renderBoard(){
  if(!boardEl)return;
  if(!items.length){boardEl.hidden=true;return}
  var map={};
  items.forEach(function(c){
    if(c.ctxOnly)return; /* a fetched ancestor is context, not activity */
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
      '<span class="km-bscore">'+r.n+(r.n===1?' comment · ':' comments · ')+'♥ '+r.hearts+'</span></li>';
  }).join('');
  boardEl.hidden=rows.length<2;
}

/* ---------- reply note ---------- */
/* The last-seen stamp used to be written the moment the note was painted, so the very next
   re-render — a like, somebody else's comment — made the replies "old" again and the note
   vanished before anyone read it. The stamp is only written when the member acts on the note. */
var noteIds=[];
function readSeen(){
  try{return parseInt(localStorage.getItem('km-seen-reply')||'0',10)}catch(e){return 0}
}
function markSeen(){
  try{localStorage.setItem('km-seen-reply',String(Date.now()))}catch(e){}
  noteIds=[];
  noteEl.hidden=true;
}
function paintNote(){
  if(!noteEl)return;
  noteEl.hidden=true;
  noteIds=[];
  if(!user)return;
  var mine={};
  items.forEach(function(c){if(c.uid===user.uid)mine[c.id]=1});
  var seen=readSeen();
  noteIds=items.filter(function(c){return !c.ctxOnly&&c.replyTo&&mine[c.replyTo]&&c.ts>seen}).map(function(c){return c.id});
  if(!noteIds.length)return;
  noteEl.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>'+
    '<b>'+noteIds.length+'</b> new '+(noteIds.length===1?'reply':'replies')+' to '+(noteIds.length===1?'your comment':'your comments')+'.'+
    '<button class="km-note-act" type="button" data-act="open">Show me</button>'+
    '<button class="km-note-act" type="button" data-act="close" aria-label="Dismiss the reply notice">✕</button>';
  noteEl.hidden=false;
}
if(noteEl)noteEl.addEventListener('click',function(ev){
  var b=ev.target.closest?ev.target.closest('button'):null;
  if(!b||!noteIds.length)return;
  if(b.getAttribute('data-act')==='open'){
    var el=d.getElementById('komen-'+noteIds[0]);
    if(el){
      var box=el.closest('.km-replies');
      if(box)openThread(box);
      el.classList.add('flash');
      try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){el.scrollIntoView()}
      setTimeout(function(){el.classList.remove('flash')},2200);
    }
  }
  markSeen();
});

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
/* The live list holds the 50 newest comments. A reply to something older than that window
   would lose its parent and be promoted to a top-level post, so the missing ancestors are
   fetched on demand and kept in ctxCache. They are marked ctxOnly: they exist to hold a
   thread together, not to be counted as comments or put on the leaderboard. */
var ctxCache={};
var ctxMiss={};   /* ancestors already looked for and not found — never ask twice */
var fbSeq=0;
function docItem(id,v){
  return {id:id,uid:v.uid||'',name:v.name||'Traveller',photo:v.photo||'',text:v.text||'',
    replyTo:v.replyTo||'',replyName:v.replyName||'',ts:v.createdAt&&v.createdAt.toMillis?v.createdAt.toMillis():null};
}
/* Reply chains are followed all the way up, not just a few generations: the live window holds the
   50 newest comments, so an old thread can be missing every one of its parents. The two limits are
   safety stops for bad data (a cycle, or a comment replying to itself), not the normal path —
   CHAIN_MAX is how many generations one walk accepts, CTX_ROUNDS how many query rounds a single
   list may need, CTX_DOCS the most ancestors kept in memory for the session. */
var CHAIN_MAX=40, CTX_ROUNDS=12, CTX_DOCS=240;
function ctxSize(){return Object.keys(ctxCache).length+Object.keys(ctxMiss).length}
function missingAncestors(list){
  var ids={},out=[];
  list.forEach(function(c){ids[c.id]=1});
  list.forEach(function(c){
    var r=c.replyTo,guard=0;
    while(r&&!ids[r]&&guard<CHAIN_MAX){
      if(out.indexOf(r)<0)out.push(r);
      var p=ctxCache[r];
      r=p?p.replyTo:'';
      guard++;
    }
  });
  return out;
}
function fetchAncestors(base,depth){
  if(depth>CTX_ROUNDS||ctxSize()>=CTX_DOCS)return Promise.resolve();
  var need=missingAncestors(base).filter(function(id){return !ctxCache[id]&&!ctxMiss[id]});
  if(!need.length)return Promise.resolve();
  var db=KomAuth.db();
  return Promise.all(chunkIds(need).map(function(chunk){
    return db.collection('comments')
      .where(firebase.firestore.FieldPath.documentId(),'in',chunk).get();
  })).then(function(res){
    res.forEach(function(snap){snap.docs.forEach(function(doc){ctxCache[doc.id]=docItem(doc.id,doc.data())})});
    /* a reply can point at a comment that was deleted: remember the gap instead of
       asking for it again on every re-render */
    need.forEach(function(id){if(!ctxCache[id])ctxMiss[id]=1});
    return fetchAncestors(base,depth+1);
  }).catch(function(){/* read-only nicety: the list works without the ancestors */});
}
function withAncestors(base){
  var out=base.slice(),ids={},round=0;
  base.forEach(function(c){ids[c.id]=1});
  while(round++<CTX_ROUNDS){
    var added=false;
    out.forEach(function(c){
      var r=c.replyTo,guard=0;
      while(r&&!ids[r]&&ctxCache[r]&&guard++<CHAIN_MAX){
        ids[r]=1;
        /* the cached copy stands for a comment outside the live window — flag it so the
           count and the leaderboard leave it out */
        ctxCache[r].ctxOnly=true;
        out.push(ctxCache[r]);
        added=true;
        r=ctxCache[r].replyTo;
      }
    });
    if(!added)break;
  }
  return out;
}
function fbLoad(){
  var db=KomAuth.db();
  unsubs=db.collection('comments').orderBy('createdAt','desc').limit(50).onSnapshot(function(snap){
    var base=snap.docs.map(function(doc){return docItem(doc.id,doc.data())});
    var seq=++fbSeq;
    var paint=function(){
      if(seq!==fbSeq)return;
      items=withAncestors(base);
      refreshLikes();
    };
    paint();
    fetchAncestors(base,0).then(paint);
  },function(err){
    list.innerHTML='<div class="km-empty">The comments could not be loaded ('+esc(err.code||'error')+'). See the Firestore rules in README-FIREBASE.md.</div>';
  });
}

/* ---------- auth state ---------- */
function applyAuth(){
  var locked=!user;
  sendBtn.disabled=locked;
  textEl.disabled=locked;
  compose.classList.toggle('locked',locked);
  textEl.placeholder=locked?'Log in to write a comment…':'Share your experience — itinerary, budget or food tips?';
  hintEl.hidden=!locked;
  if(locked)cancelReply();
  render(); /* re-count the Delete/Like buttons per owner */
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

/* ---------- send ---------- */
textEl.addEventListener('input',function(){
  charsEl.textContent=textEl.value.length+' / 600';
});
/* The rules only accept the name and photo that are already in the caller's own profile
   document, so read that document immediately before posting and send its values verbatim.
   The copy in memory can be a moment out of date after a settings save, which would make the
   comment bounce; and if the document is gone (a sign-up whose write failed twice — a reload
   rebuilds it) there is no identity to post under, so say that instead of a permission error. */
function ownProfile(){
  return KomAuth.db().collection('users').doc(user.uid).get().then(function(doc){
    if(!doc.exists){var e=new Error('no profile document');e.code='profile-missing';throw e}
    var v=doc.data()||{};
    return {name:typeof v.name==='string'?v.name:'',photo:typeof v.photo==='string'?v.photo:''};
  });
}
compose.addEventListener('submit',function(ev){
  ev.preventDefault();
  if(!user)return;
  var text=textEl.value.trim();
  if(!text)return;
  sendBtn.disabled=true;
  var rt=replyTarget;
  if(rt)openThreads[rootOf(rt.id)]=true; /* the thread stays open after replying */
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
    ownProfile().then(function(prof){
      return KomAuth.db().collection('comments').add({
        uid:user.uid,
        name:prof.name,
        photo:prof.photo,
        text:text,
        replyTo:rt?rt.id:'',
        replyName:rt?rt.name.slice(0,40):'',
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(clear).catch(function(err){
      sendBtn.disabled=false;
      if(err&&err.code==='profile-missing'){
        alert('Your profile row is missing from the database, so a comment cannot carry your name. Reload this page — it is rebuilt automatically — and send the comment again.');
        return;
      }
      alert('The comment could not be saved ('+(err.code||'error')+'). See the Firestore rules in README-FIREBASE.md.');
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
      alert('The like could not be saved ('+(e.code||'error')+'). Publish the likes rules — README-FIREBASE.md.');
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
    navigator.share({title:'Jelajah Korea Selatan — Community',text:c.name+': "'+snippet+'"',url:url}).catch(function(){});
    return;
  }
  copyText(url).then(function(){flashBtn(btn,'Link copied!')},function(){flashBtn(btn,'Copy failed')});
}

/* ---------- click delegation on the list ---------- */
list.addEventListener('click',function(ev){
  var t=ev.target;
  var tg=t.closest('.km-toggle');
  if(tg){
    var rbox=d.getElementById('rep-'+tg.getAttribute('data-id'));
    if(!rbox)return;
    if(rbox.hidden){openThread(rbox)}
    else{
      rbox.hidden=true;
      delete openThreads[tg.getAttribute('data-id')];
      tg.setAttribute('aria-expanded','false');
      tg.textContent='Open replies ('+rbox.querySelectorAll('.km-item').length+')';
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
  if(!window.confirm('Delete this comment?'))return;
  var id2=b.getAttribute('data-id');
  if(mode==='demo'){
    demoWrite(demoRead().filter(function(c){return c.id!==id2}));
    demoLoad();
  }else{
    KomAuth.db().collection('comments').doc(id2).delete().then(function(){
      /* if the deleted comment was only on screen as a fetched ancestor, drop it now —
         the snapshot will never mention it again */
      delete ctxCache[id2];
      items=items.filter(function(c){return c.id!==id2});
      render();
    }).catch(function(e){
      alert('The comment could not be deleted ('+(e.code||'error')+'). Check the Firestore rules — README-FIREBASE.md.');
    });
  }
});

/* ---------- init ---------- */
mode=(window.KomAuth&&KomAuth.getMode)?KomAuth.getMode():'demo';
user=(window.KomAuth&&KomAuth.getUser)?KomAuth.getUser():null;
if(mode==='firebase')fbLoad();else demoLoad();
applyAuth();
})();
