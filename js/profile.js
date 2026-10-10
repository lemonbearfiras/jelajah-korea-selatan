/* ============================================================
   PROFIL AWAM — js/profile.js
   profile.html?v=<uid> — ikut, rakan, permintaan, tentang,
   statistik & senarai komen. Semua bacaan koleksi baharu
   (follows / friendRequests / friends) mempunyai fallback
   sekiranya peraturan Firestore belum diterbitkan lagi.
   ============================================================ */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var BM_M=['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'];
var GRADS=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function show(id){
  $('#st-load').classList.remove('show');
  ['#st-param','#st-config','#st-demo','#st-404','#st-err'].forEach(function(s){$(s).classList.remove('show')});
  if(id)$(id).classList.add('show');
}
function fmtDate(ts){
  if(!ts)return null;
  var dt=new Date(ts);
  return dt.getDate()+' '+BM_M[dt.getMonth()]+' '+dt.getFullYear();
}
function tsOf(v){return v&&v.toMillis?v.toMillis():null}
function initials(n){
  n=(n||'?').trim();var p=n.split(/\s+/);
  return (p.length>1?p[0][0]+p[p.length-1][0]:p[0][0]||'?').toUpperCase();
}
function gradFor(s){
  var h=0;s=String(s||'');
  for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
  return GRADS[h%GRADS.length];
}
function paintAva(el,p){
  if(p&&p.photo){el.innerHTML='<img src="'+esc(p.photo)+'" alt="">';el.style.background='';}
  else{el.textContent=initials(p&&p.name);el.style.background=gradFor(p&&p.name);}
}
function pairId(a,b){return [a,b].sort().join('_')}

var uid=(new URLSearchParams(location.search).get('v')||'').trim();
if(!uid){show('#st-param');return}
if(uid.indexOf('demo-')===0){show('#st-demo');return}
if(typeof FIREBASE_CONFIG==='undefined'||!FIREBASE_CONFIG.apiKey||FIREBASE_CONFIG.apiKey.indexOf('MASUKKAN')===0){show('#st-config');return}

firebase.initializeApp(FIREBASE_CONFIG);
var db=firebase.firestore(), auth=firebase.auth();
var me=null, prof=null;
var isFriend=false, isFollowing=false, myReqId=null, incomingReqId=null;

/* tunggu keadaan auth pertama kali pasti */
var authReady=new Promise(function(res){
  var un=auth.onAuthStateChanged(function(u){un();me=u?u.uid:null;res()});
});

function btnBusy(b,fn){
  if(b.disabled)return;
  b.disabled=true;
  Promise.resolve().then(fn).catch(function(e){
    alert('Tidak dapat menyelesaikan tindakan: '+(e&&e.code?e.code:e&&e.message?e.message:e));
  }).then(function(){b.disabled=false});
}
function needLogin(){
  alert('Sila log masuk dahulu dalam Ruang Komuniti untuk menggunakan ciri ini.');
  location.href='index.html#komuniti';
}

/* ---------- status butang rakan ---------- */
function paintFriendBtn(){
  var b=$('#btn-friend');
  b.style.display='';
  if(isFriend){
    b.textContent='Rakan ✓ · Chat';
    b.className='pill solid';
    b.onclick=function(){location.href='chat.html?v='+encodeURIComponent(uid)};
    return;
  }
  if(incomingReqId){
    b.textContent='Terima Permintaan';
    b.className='pill solid';
    b.onclick=function(){btnBusy(b,function(){return acceptReq(incomingReqId,uid)})};
    return;
  }
  if(myReqId){
    b.textContent='Permintaan dihantar (batal)';
    b.className='pill';
    b.onclick=function(){btnBusy(b,cancelRequest)};
    return;
  }
  b.textContent='Tambah Rakan';
  b.className='pill';
  b.onclick=function(){if(!me){needLogin();return}btnBusy(b,sendRequest)};
}
function paintFollowBtn(){
  var b=$('#btn-follow');
  b.textContent=isFollowing?'Mengikut ✓':'Ikut';
  b.className=isFollowing?'pill':'pill solid';
}

/* ---------- tindakan ---------- */
function sendRequest(){
  var id=me+'_'+uid;
  return db.collection('friendRequests').doc(id).set({from:me,to:uid,status:'pending'})
    .then(function(){myReqId=id;paintFriendBtn()});
}
function cancelRequest(){
  return db.collection('friendRequests').doc(myReqId).delete()
    .then(function(){myReqId=null;paintFriendBtn()});
}
/* PENTING: dua tulisan berturutan — peraturan membaca status
   friendRequests SEBELUM commit, jadi dokumen friends mesti
   dicipta selepas status 'accepted' benar-benar tersimpan. */
function acceptReq(rid,otherUid){
  var id=pairId(me,otherUid);
  return db.collection('friendRequests').doc(rid).update({status:'accepted'})
    .then(function(){
      return db.collection('friends').doc(id).set({
        participants:[me,otherUid].sort(),reqId:rid
      });
    })
    .then(function(){
      if(otherUid===uid){incomingReqId=null;isFriend=true;paintFriendBtn();loadStats();}
      reqRows=reqRows.filter(function(x){return x.id!==rid});
      return renderRequests();
    });
}
function toggleFollow(){
  var id=me+'_'+uid;
  if(isFollowing){
    return db.collection('follows').doc(id).delete().then(function(){isFollowing=false;paintFollowBtn();loadStats()});
  }
  return db.collection('follows').doc(id).set({follower:me,following:uid})
    .then(function(){isFollowing=true;paintFollowBtn();loadStats()});
}

/* ---------- hubungan saya <-> uid ---------- */
function loadRelation(){
  if(!me||me===uid)return Promise.resolve();
  var ops=[];
  ops.push(db.collection('follows').doc(me+'_'+uid).get().then(function(s){isFollowing=s.exists}).catch(function(){}));
  ops.push(db.collection('friends').doc(pairId(me,uid)).get().then(function(s){isFriend=s.exists}).catch(function(){}));
  ops.push(db.collection('friendRequests').doc(me+'_'+uid).get().then(function(s){
    if(s.exists&&s.data().status==='pending')myReqId=me+'_'+uid;
  }).catch(function(){}));
  ops.push(db.collection('friendRequests').doc(uid+'_'+me).get().then(function(s){
    if(s.exists&&s.data().status==='pending')incomingReqId=uid+'_'+me;
  }).catch(function(){}));
  return Promise.all(ops);
}

/* ---------- statistik ---------- */
function loadStats(){
  function count(q,el){
    q.get().then(function(s){$(el).textContent=s.size}).catch(function(){$(el).textContent='—'});
  }
  count(db.collection('follows').where('following','==',uid),'#st-followers');
  count(db.collection('follows').where('follower','==',uid),'#st-following');
  count(db.collection('friends').where('participants','array-contains',uid),'#st-friends');
}

/* ---------- permintaan rakan (profil sendiri) ---------- */
var reqRows=[];
function loadRequests(){
  if(me!==uid)return;
  $('#req-blk').hidden=false;
  return db.collection('friendRequests').where('to','==',me).where('status','==','pending').get()
    .then(function(snap){
      reqRows=snap.docs.map(function(d){return {id:d.id,from:d.data().from}});
      return renderRequests();
    }).catch(function(){$('#req-list').innerHTML='<p class="req-empty">Belum dapat dimuatkan — terbitkan peraturan Firestore baharu dahulu (lihat README-FIREBASE.md).</p>'});
}
function renderRequests(){
  var list=$('#req-list');
  if(!reqRows.length){list.innerHTML='<p class="req-empty">Tiada permintaan rakan ketika ini.</p>';reqCount();return}
  Promise.all(reqRows.map(function(r){
    return db.collection('users').doc(r.from).get().catch(function(){return {exists:false}});
  })).then(function(snaps){
    list.innerHTML='';
    reqRows.forEach(function(r,i){
      var v=snaps[i]&&snaps[i].exists?snaps[i].data():{};
      var nm=v.name||'Ahli Komuniti';
      var row=document.createElement('div');
      row.className='req-item';row.setAttribute('data-req',r.id);
      row.innerHTML='<span class="ava-sm" style="'+(v.photo?'':'background:'+gradFor(nm))+'">'
        +(v.photo?'<img src="'+esc(v.photo)+'" alt="">':esc(initials(nm)))+'</span>'
        +'<span class="nm-wrap"><b class="nm">'+esc(nm)+'</b><span class="sub">Ingin menjadi rakan anda</span></span>'
        +'<button class="pill solid req-acc" type="button">Terima</button>'
        +'<button class="pill req-del" type="button"> Tolak</button>';
      list.appendChild(row);
      var accBtn=row.querySelector('.req-acc'), delBtn=row.querySelector('.req-del');
      accBtn.onclick=function(){btnBusy(accBtn,function(){return acceptReq(r.id,r.from)})};
      delBtn.onclick=function(){btnBusy(delBtn,function(){
        return db.collection('friendRequests').doc(r.id).delete().then(function(){
          reqRows=reqRows.filter(function(x){return x.id!==r.id});
          return renderRequests();
        });
      })};
    });
    reqCount();
  });
}
function reqCount(){$('#req-count').textContent=reqRows.length?'('+reqRows.length+')':''}

/* ---------- tentang ---------- */
function initAbout(){
  var isOwn=(me===uid);
  var textEl=$('#about-text'),emptyEl=$('#about-empty'),editWrap=$('#about-edit-wrap'),btn=$('#btn-edit-about');
  function view(){
    var a=(prof&&prof.about)||'';
    editWrap.hidden=true;btn.style.display='';
    textEl.style.display=a?'block':'none';
    emptyEl.hidden=!!a;
    textEl.textContent=a;
  }
  view();
  if(!isOwn)return;
  btn.hidden=false;btn.textContent='Edit';
  btn.onclick=function(){
    btn.style.display='none';emptyEl.hidden=true;textEl.style.display='none';
    editWrap.hidden=false;
    var ta=$('#about-edit');ta.value=(prof&&prof.about)||'';
    $('#about-chars').textContent=ta.value.length+' / 500';
    ta.oninput=function(){$('#about-chars').textContent=ta.value.length+' / 500'};
  };
  $('#about-cancel').onclick=view;
  $('#about-save').onclick=function(){
    var b=$('#about-save');b.disabled=true;
    var a=$('#about-edit').value.trim();
    db.collection('users').doc(me).set({about:a},{merge:true}).then(function(){
      prof.about=a;view();
    }).catch(function(e){
      alert('Tentang tidak dapat disimpan: '+(e.code||e.message));
      btn.style.display='';
    }).then(function(){b.disabled=false});
  };
}

/* ---------- menu ⋮ ---------- */
function initMenu(){
  var menu=$('#menu'),btn=$('#btn-menu');
  var items=[];
  if(me===uid){
    items.push({t:'Edit Tentang',fn:function(){var b=$('#btn-edit-about');if(!b.hidden)b.click()}});
  }
  items.push({t:'Salin Pautan Profil',fn:function(){
    var u=location.href;
    if(navigator.clipboard)navigator.clipboard.writeText(u).then(function(){alert('Pautan profil disalin.')});
    else prompt('Salin pautan ini:',u);
  }});
  if(me&&me!==uid)items.push({t:isFriend?'Buka Sembang':'Tambah Rakan',fn:function(){
    if(isFriend)location.href='chat.html?v='+encodeURIComponent(uid);
    else $('#btn-friend').click();
  }});
  menu.innerHTML='';
  items.forEach(function(it){
    var b=document.createElement('button');b.type='button';b.textContent=it.t;
    b.onclick=function(){menu.classList.remove('open');it.fn()};
    menu.appendChild(b);
  });
  btn.onclick=function(ev){ev.stopPropagation();menu.classList.toggle('open')};
  document.addEventListener('click',function(){menu.classList.remove('open')});
}

/* ---------- hal mana ---------- */
function logHint(){
  if(me)return;
  $('#btn-follow').title='Log masuk dahulu';
  $('#btn-friend').title='Log masuk dahulu';
}

/* ---------- lukis kad ---------- */
function paintCard(){
  paintAva($('#p-ava'),prof);
  $('#p-name').textContent=prof.name||'Ahli Komuniti';
  $('#p-uid').textContent='id: '+uid;
  var join=fmtDate(prof.createdAt);
  $('#st-member').textContent=join||'—';
  if(me===uid){
    $('#btn-follow').style.display='none';
    $('#btn-friend').style.display='none';
    $('#own-chip').hidden=false;
  }else{
    paintFriendBtn();
    $('#btn-follow').onclick=function(){if(!me){needLogin();return}btnBusy($('#btn-follow'),toggleFollow)};
    paintFollowBtn();
  }
  initAbout();
  initMenu();
  logHint();
  loadStats();
  loadRequests();
  show(null);
  $('#card').classList.add('show');
}

/* ---------- muat profil + komen ---------- */
Promise.all([
  authReady,
  db.collection('users').doc(uid).get(),
  db.collection('comments').where('uid','==',uid).get()
]).then(function(res){
  var snap=res[1],cs=res[2];
  var items=cs.docs.map(function(doc){
    var c=doc.data();
    return {name:c.name||'Pengembara',text:c.text||'',ts:tsOf(c.createdAt)};
  }).sort(function(a,b){return (b.ts||0)-(a.ts||0)});

  if(snap.exists){
    var v=snap.data();
    prof={name:v.name||'',photo:v.photo||'',about:v.about||'',createdAt:tsOf(v.createdAt)};
  }else if(items.length){
    prof={name:items[0].name,photo:'',about:'',createdAt:null,fromComments:true};
  }else{
    show('#st-404');return;
  }

  if(items.length){
    $('#p-c-note').textContent='— '+items.length+' terkini dahulu';
    $('#p-list').innerHTML=items.map(function(c){
      return '<div class="c-item"><time>'+(c.ts?fmtDate(c.ts):'baru sahaja')+'</time><p>'+esc(c.text)+'</p></div>';
    }).join('');
  }else{
    $('#p-c-note').textContent='';
    $('#p-list').innerHTML='<div class="c-empty">Ahli ini belum meninggalkan komen dalam Ruang Komuniti.</div>';
  }

  return loadRelation().then(paintCard);
}).catch(function(e){
  var msg='Ralat semasa memuatkan profil ('+esc(e.code||e.message)+').';
  if(e.code==='permission-denied'){
    msg='Peraturan Firestore belum mengizinkan bacaan awam — terbitkan peraturan dalam <b>firestore.rules</b> (lihat README-FIREBASE.md, Langkah 4).';
  }
  $('#err-msg').innerHTML=msg;
  show('#st-err');
});
})();
