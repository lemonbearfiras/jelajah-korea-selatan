/* ============================================================
   TETAPAN PROFIL — js/settings.js
   settings.html — hanya pemilik akaun (auth.currentUser).
   Username, nama, foto (URL), tentang + maklumat akaun
   bacaan sahaja. Simpan menulis dokumen users (merge) dan
   segerakkan profil Auth (displayName / photoURL).
   ============================================================ */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var BM_M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var GRADS=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function show(id){
  ['#st-load','#st-config','#st-auth','#st-err'].forEach(function(s){$(s).classList.remove('show')});
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
  if(p&&p.photo&&/^https?:\/\/\S+$/i.test(p.photo)){el.innerHTML='<img src="'+esc(p.photo)+'" alt="">';el.style.background='';}
  else{el.textContent=initials(p&&p.name);el.style.background=gradFor(p&&p.name);}
}

if(typeof FIREBASE_CONFIG==='undefined'||!FIREBASE_CONFIG.apiKey||FIREBASE_CONFIG.apiKey.indexOf('MASUKKAN')===0){
  show('#st-config');return;
}

firebase.initializeApp(FIREBASE_CONFIG);
var db=firebase.firestore(), auth=firebase.auth();
var me=null, prof=null;

var nameIn=$('#s-name'), userIn=$('#s-username'), photoIn=$('#s-photo'),
    aboutIn=$('#s-about'), noteEl=$('#save-note'), saveBtn=$('#btn-save'), avaEl=$('#s-ava');

function note(msg,cls){noteEl.textContent=msg;noteEl.className='note'+(cls?' '+cls:'')}

/* ---------- pratonton avatar masa nyata ---------- */
function previewAva(){
  paintAva(avaEl,{name:nameIn.value.trim(),photo:photoIn.value.trim()});
}
function bindPreview(){
  [nameIn,photoIn].forEach(function(el){el.addEventListener('input',previewAva)});
}

/* ---------- muat dokumen pengguna ---------- */
function loadDoc(){
  return db.collection('users').doc(me).get().then(function(snap){
    var v=snap.exists?snap.data():{};
    var u=auth.currentUser;
    prof={
      username:v.username||'',
      name:v.name||u.displayName||u.email.split('@')[0]||'',
      photo:v.photo||u.photoURL||'',
      about:v.about||'',
      createdAt:tsOf(v.createdAt)
    };
    fill();
    $('#back-link').href='profile.html?v='+encodeURIComponent(me);
    $('#btn-cancel').setAttribute('href','profile.html?v='+encodeURIComponent(me));
    var link='https://lemonbearfiras.github.io/jelajah-korea-selatan/profile?v='+encodeURIComponent(me);
    $('#i-link').textContent=link;
    $('#i-link').title=link;
    $('#i-email').textContent=u.email||'—';
    $('#i-uid').textContent=me;
    $('#i-member').textContent=fmtDate(prof.createdAt)||'—';
    show(null);
    $('#card').classList.add('show');
  });
}
function fill(){
  userIn.value=prof.username;
  nameIn.value=prof.name;
  photoIn.value=prof.photo;
  aboutIn.value=prof.about;
  $('#s-about-chars').textContent=prof.about.length+' / 500';
  previewAva();
  note('');
}

/* ---------- logik borang ---------- */
aboutIn.addEventListener('input',function(){$('#s-about-chars').textContent=aboutIn.value.length+' / 500'});

$('#ava-badge').addEventListener('click',function(){
  photoIn.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(function(){photoIn.focus({preventScroll:true})},350);
});
avaEl.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();$('#ava-badge').click()}
});
$('#s-photo-clear').addEventListener('click',function(){
  photoIn.value='';previewAva();photoIn.focus();
  note('Photo cleared — press "Save changes" to save.','');
});
$('#i-copy').addEventListener('click',function(){
  var link=$('#i-link').textContent;
  if(navigator.clipboard)navigator.clipboard.writeText(link).then(function(){note('✓ Profile link copied.','ok')});
  else prompt('Copy this link:',link);
});

userIn.addEventListener('input',function(){
  var p=userIn.selectionStart;
  userIn.value=userIn.value.toLowerCase().replace(/[^a-z0-9._]/g,'');
  try{userIn.setSelectionRange(Math.min(p,userIn.value.length),Math.min(p,userIn.value.length))}catch(e){}
});

function validate(){
  var un=userIn.value.trim(), n=nameIn.value.trim(), p=photoIn.value.trim(), a=aboutIn.value.trim();
  if(un&&!/^[a-z0-9._]{3,20}$/.test(un)){note('Username: 3–20 characters, lowercase letters, numbers, _ or . only.','bad');return null}
  if(n.length<2||n.length>40){note('Display name must be 2–40 characters.','bad');return null}
  if(p&&!/^https?:\/\/\S+$/i.test(p)){note('Photo URL must start with http:// or https://','bad');return null}
  if(p.length>500){note('Photo URL is too long (max 500).','bad');return null}
  if(a.length>500){note('About is too long (max 500).','bad');return null}
  return {username:un,name:n,photo:p,about:a};
}

saveBtn.addEventListener('click',function(){
  var data=validate();
  if(!data){return}
  saveBtn.disabled=true;
  note('Saving…','');
  data.uid=me;
  db.collection('users').doc(me).set(data,{merge:true}).then(function(){
    prof.username=data.username;prof.name=data.name;prof.photo=data.photo;prof.about=data.about;
    var u=auth.currentUser;
    return u.updateProfile({displayName:data.name,photoURL:data.photo||null});
  }).then(function(){
    note('✓ Changes saved.','ok');
  }).catch(function(e){
    var msg='Could not save: '+(e.code||e.message);
    if(e.code==='permission-denied'){
      msg='Could not save — please deploy the latest Firestore rules (firestore.rules, see README-FIREBASE.md).';
    }
    note(msg,'bad');
  }).then(function(){saveBtn.disabled=false});
});

/* ---------- boot ---------- */
var un=auth.onAuthStateChanged(function(u){
  un();
  if(!u){show('#st-auth');return}
  if((u.uid||'').indexOf('demo-')===0){show('#st-auth');return}
  me=u.uid;
  loadDoc().catch(function(e){
    $('#err-msg').textContent='Error while loading the settings ('+(e.code||e.message)+').';
    show('#st-err');
  });
});
})();
