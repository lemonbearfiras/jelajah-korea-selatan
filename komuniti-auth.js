/* ============================================================
   KOMUNITI — AUTENTIKASI (Jelajah Korea Selatan)
   ------------------------------------------------------------
   Dua mod automatik:
   • firebase — FIREBASE_CONFIG sudah diisi + CDN Firebase siap
   • demo     — konfigurasi belum diisi / offline; profil &
                sesi disimpan dalam localStorage pelayar sahaja

   Interface untuk komuniti-comments.js:
     KomAuth.getMode()  -> 'firebase' | 'demo'
     KomAuth.getUser()  -> {uid,name,email,photo} | null
     event 'komuniti:auth' di-dispatch pada setiap perubahan
   ============================================================ */
(function(){
'use strict';
var d=document;
var $=function(s){return d.querySelector(s)};

var card=$('#km-card');
if(!card)return;

/* ---------- elemen ---------- */
var outBox=$('#km-auth-out'), inBox=$('#km-auth-in');
var tabs=$('#km-tabs'), tabIn=$('#km-tab-in'), tabUp=$('#km-tab-up');
var form=$('#km-form'), fName=$('#km-f-name');
var nameIn=$('#km-name'), emailIn=$('#km-email'), passIn=$('#km-pass');
var errEl=$('#km-err'), submitBtn=$('#km-submit'), resetBtn=$('#km-reset');
var googleBtn=$('#km-google'), outBtn=$('#km-out'), noteEl=$('#km-note');
var avaEl=$('#km-ava'), unameEl=$('#km-uname'), umailEl=$('#km-umail'), badgeEl=$('#km-badge');
var navLogin=$('#nav-login');

var mode='demo';
var fbAuth=null, fb=null;
var user=null;
var tab='in'; /* 'in' | 'up' */
var listeners=[];

/* ---------- util ---------- */
function emit(){
  d.dispatchEvent(new CustomEvent('komuniti:auth',{detail:{user:user,mode:mode}}));
  listeners.forEach(function(cb){try{cb(user,mode)}catch(e){}});
}
function errMsg(code){
  var m={
    'auth/invalid-email':'Format emel tidak sah.',
    'auth/email-already-in-use':'Emel ini sudah didaftar — gunakan tab Masuk.',
    'auth/weak-password':'Kata laluan terlalu pendek — minima 6 aksara.',
    'auth/user-not-found':'Akaun tidak dijumpai. Daftar dahulu.',
    'auth/wrong-password':'Kata laluan salah.',
    'auth/invalid-credential':'Emel atau kata laluan salah.',
    'auth/too-many-requests':'Terlalu banyak percubaan — cuba lagi beberapa minit.',
    'auth/popup-closed-by-user':'Tetingkap Google ditutup selesai.',
    'auth/popup-blocked':'Pelayar menyekat pop-up — benarkan pop-up dan cuba lagi.',
    'auth/unauthorized-domain':'Domain ini belum dibenarkan dalam Firebase. Buka laman melalui http://localhost:8000 (lihat README-FIREBASE.md).',
    'auth/network-request-failed':'Masalah rangkaian — semak sambungan internet.',
    'auth/operation-not-allowed':'Kaedah log masuk belum diaktifkan dalam Firebase Console.'
  };
  return m[code]||('Ralat: '+code);
}
function showErr(msg,ok){
  errEl.textContent=msg;
  errEl.classList.toggle('ok',!!ok);
  errEl.classList.add('show');
}
function hideErr(){errEl.classList.remove('show')}
function initials(n){n=(n||'?').trim();var p=n.split(/\s+/);return (p.length>1?p[0][0]+p[p.length-1][0]:p[0][0]||'?').toUpperCase()}
function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function paintNav(){
  if(!navLogin)return;
  if(user){
    var first=(user.name||'Akaun').trim().split(/\s+/)[0];
    navLogin.classList.add('signed');
    if(mode==='firebase'){
      navLogin.href='https://lemonbearfiras.github.io/jelajah-korea-selatan/profile?v='+encodeURIComponent(user.uid);
      navLogin.target='_blank';
      navLogin.rel='noopener';
      navLogin.title='Halo, '+user.name+' — lihat halaman profil awam anda';
    }else{
      navLogin.href='#komuniti';
      navLogin.removeAttribute('target');
      navLogin.removeAttribute('rel');
      navLogin.title='Halo, '+user.name+' — ke Ruang Komuniti';
    }
    navLogin.innerHTML='<span class="nl-ava">'+(user.photo?'<img src="'+esc(user.photo)+'" alt="">':initials(user.name))+'</span><span class="nl-name">'+esc(first)+'</span>';
  }else{
    navLogin.classList.remove('signed');
    navLogin.href='#komuniti';
    navLogin.removeAttribute('target');
    navLogin.removeAttribute('rel');
    navLogin.title='Log masuk / daftar akaun';
    navLogin.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.2 4.9-6 8-6s6.5 1.8 8 6"/></svg><span class="nl-name">Log Masuk</span>';
  }
}
function paintUser(){
  paintNav();
  var userLink=$('#km-user');
  if(userLink){
    if(user&&mode==='firebase'){
      userLink.href='https://lemonbearfiras.github.io/jelajah-korea-selatan/profile?v='+encodeURIComponent(user.uid);
      userLink.title='Lihat halaman profil awam anda — buka di tetingkap baharu';
    }else{
      userLink.removeAttribute('href');
    }
  }
  if(!user){inBox.hidden=true;outBox.hidden=false;return}
  inBox.hidden=false;outBox.hidden=true;
  unameEl.textContent=user.name;
  umailEl.textContent=user.email||'';
  if(user.photo){
    avaEl.innerHTML='<img src="'+user.photo+'" alt="">';
  }else{
    avaEl.textContent=initials(user.name);
    var g=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];
    var h=0,s=user.name||'';for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
    avaEl.style.background=g[h%g.length];
  }
  badgeEl.textContent=(mode==='demo')?'Mod Demo':'Firebase · Awan';
  badgeEl.className='km-badge '+(mode==='demo'?'demo':'cloud');
}
function setNote(){
  if(mode==='firebase'){
    noteEl.innerHTML='<b style="color:#0b7a52">✓ Disambungkan ke Firebase</b> — akaun &amp; komen disimpan dalam awan, boleh dilihat oleh semua pengunjung.';
  }else{
    noteEl.innerHTML='<b>Mod demo</b> — profil &amp; komen disimpan dalam pelayar ini sahaja. Sambungkan projek Firebase anda (isi <b>js/firebase-config.js</b>, panduan di <b>README-FIREBASE.md</b>) untuk komen sebenar.';
  }
}

/* ---------- tab masuk/daftar ---------- */
function setTab(t){
  tab=t;
  tabIn.classList.toggle('active',t==='in');
  tabUp.classList.toggle('active',t==='up');
  fName.hidden=(mode==='demo')?false:(t==='in');
  nameIn.required=(mode==='demo'||t==='up');
  submitBtn.textContent=(mode==='demo')?'Masuk sebagai tetamu':((t==='in')?'Masuk':'Daftar akaun');
  passIn.setAttribute('autocomplete',t==='in'?'current-password':'new-password');
  hideErr();
}
tabIn.addEventListener('click',function(){setTab('in')});
tabUp.addEventListener('click',function(){setTab('up')});

/* ---------- kemasukan demo (localStorage) ---------- */
function demoUserOf(n){
  return {uid:'demo-'+Math.random().toString(36).slice(2,10),name:n,email:'',photo:''};
}
function demoIn(n){
  user=demoUserOf(n);
  try{localStorage.setItem('km-demo-user',JSON.stringify(user))}catch(e){}
  paintUser();setNote();emit();
}

/* ---------- hantar borang ---------- */
form.addEventListener('submit',function(ev){
  ev.preventDefault();hideErr();
  var name=nameIn.value.trim(), email=emailIn.value.trim(), pass=passIn.value;

  if(mode==='demo'){
    if(name.length<2){showErr('Masukkan nama anda (minima 2 huruf).');return}
    submitBtn.disabled=true;
    setTimeout(function(){
      demoIn(name);
      submitBtn.disabled=false;
      form.reset();
    },350);
    return;
  }

  if(tab==='up'&&name.length<2){showErr('Masukkan nama penuh anda.');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('Masukkan emel yang sah.');return}
  if(pass.length<6){showErr('Kata laluan mesti sekurang-kurangnya 6 aksara.');return}

  submitBtn.disabled=true;
  var done=function(){submitBtn.disabled=false;form.reset();hideErr();setTab('in')};

  if(tab==='up'){
    fbAuth.createUserWithEmailAndPassword(email,pass).then(function(cred){
      return cred.user.updateProfile({displayName:name}).then(function(){
        saveUserProfile(cred.user);
        setUser(cred.user);done();
      });
    }).catch(function(e){submitBtn.disabled=false;showErr(errMsg(e.code||e.message))});
  }else{
    fbAuth.signInWithEmailAndPassword(email,pass).then(function(cred){
      saveUserProfile(cred.user);
      setUser(cred.user);done();
    }).catch(function(e){submitBtn.disabled=false;showErr(errMsg(e.code||e.message))});
  }
});

/* ---------- reset kata laluan ---------- */
resetBtn.addEventListener('click',function(){
  if(mode==='demo')return;
  var email=emailIn.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('Taip emel anda di atas dahulu, kemudian klik "Lupa kata laluan?".');return}
  fbAuth.sendPasswordResetEmail(email).then(function(){
    showErr('Pautan set semula telah dihantar ke '+email+'.',true);
  }).catch(function(e){showErr(errMsg(e.code||e.message))});
});

/* ---------- Google ---------- */
googleBtn.addEventListener('click',function(){
  hideErr();
  var p=new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(p).then(function(cred){saveUserProfile(cred.user);setUser(cred.user)}).catch(function(e){showErr(errMsg(e.code||e.message))});
});

/* ---------- log keluar ---------- */
outBtn.addEventListener('click',function(){
  if(mode==='demo'){
    user=null;
    try{localStorage.removeItem('km-demo-user')}catch(e){}
    paintUser();setNote();emit();
  }else{
    fbAuth.signOut().catch(function(){});
  }
});

/* ---------- simpan profil ke koleksi "users" ---------- */
function saveUserProfile(u){
  if(!fb||!u)return;
  var ref=fb.collection('users').doc(u.uid);
  ref.get().then(function(snap){
    if(snap.exists)return; /* profil sudah ada */
    return ref.set({
      uid:u.uid,
      name:u.displayName||'',
      photo:u.photoURL||'',
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    });
  }).catch(function(e){
    console.warn('Profil tidak dapat disimpan:',e.code||e.message);
  });
}

/* ---------- firebase boot ---------- */
function setUser(u){
  user=u?{uid:u.uid,name:u.displayName||(u.email||'').split('@')[0],email:u.email||'',photo:u.photoURL||''}:null;
  paintUser();setNote();emit();
}
function cfgReady(){
  if(typeof FIREBASE_CONFIG==='undefined')return false;
  return !!(FIREBASE_CONFIG.apiKey&&FIREBASE_CONFIG.apiKey.indexOf('MASUKKAN')!==0);
}

function boot(){
  if(cfgReady()&&typeof firebase!=='undefined'&&firebase.initializeApp){
    try{
      firebase.initializeApp(FIREBASE_CONFIG);
      fbAuth=firebase.auth();
      fb=firebase.firestore();
      mode='firebase';
      fbAuth.onAuthStateChanged(setUser);
      setUser(fbAuth.currentUser);
    }catch(e){
      mode='demo';
    }
  }else{
    mode='demo';
  }
  card.setAttribute('data-mode',mode);
  if(mode==='demo'){
    try{
      var s=localStorage.getItem('km-demo-user');
      if(s){user=JSON.parse(s);paintUser()}
    }catch(e){}
  }
  setTab('in');
  setNote();
  paintUser();
  emit();
}
boot();

/* ---------- API ---------- */
window.KomAuth={
  getMode:function(){return mode},
  getUser:function(){return user},
  db:function(){return fb},
  onAuth:function(cb){listeners.push(cb);cb(user,mode)}
};
})();
