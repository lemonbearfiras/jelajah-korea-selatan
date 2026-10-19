/* ============================================================
   COMMUNITY — AUTHENTICATION (Jelajah Korea Selatan)
   ------------------------------------------------------------
   Two modes, chosen automatically:
   • firebase — FIREBASE_CONFIG is filled in and the Firebase CDN is ready
   • demo     — config not filled in / offline; profiles & sessions are
                kept in this browser's localStorage only

   Interface used by community-comments.js:
     KomAuth.getMode()  -> 'firebase' | 'demo'
     KomAuth.getUser()  -> {uid,name,email,photo} | null
     the 'komuniti:auth' event fires on every change
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
var form=$('#km-form'), fName=$('#km-f-name'), fUser=$('#km-f-username');
var nameIn=$('#km-name'), emailIn=$('#km-email'), passIn=$('#km-pass'), userIn=$('#km-username');
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
    'auth/invalid-email':'Invalid email format.',
    'auth/email-already-in-use':'This email is already registered — use the Log in tab.',
    'auth/weak-password':'Password is too short — minimum 6 characters.',
    'auth/user-not-found':'Account not found. Sign up first.',
    'auth/wrong-password':'Wrong password.',
    'auth/invalid-credential':'Wrong email or password.',
    'auth/too-many-requests':'Too many attempts — try again in a few minutes.',
    'auth/popup-closed-by-user':'The Google window was closed before you finished logging in.',
    'auth/popup-blocked':'The browser blocked the pop-up — allow pop-ups and try again.',
    'auth/unauthorized-domain':'This domain is not authorised in Firebase yet. Open the site via http://localhost:8000 (see README-FIREBASE.md).',
    'auth/network-request-failed':'Network problem — check your internet connection.',
    'auth/operation-not-allowed':'This login method is not enabled yet in the Firebase Console.'
  };
  return m[code]||('Error: '+code);
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
    var first=(user.name||'Account').trim().split(/\s+/)[0];
    navLogin.classList.add('signed');
    if(mode==='firebase'){
      navLogin.href=PROFILE_BASE+encodeURIComponent(user.uid);
      navLogin.target='_blank';
      navLogin.rel='noopener';
      navLogin.title='Hi, '+user.name+' — view your public profile page';
    }else{
      navLogin.href='#komuniti';
      navLogin.removeAttribute('target');
      navLogin.removeAttribute('rel');
      navLogin.title='Hi, '+user.name+' — go to the Community Space';
    }
    navLogin.innerHTML='<span class="nl-ava">'+(user.photo?'<img src="'+esc(user.photo)+'" alt="">':initials(user.name))+'</span><span class="nl-name">'+esc(first)+'</span>';
  }else{
    navLogin.classList.remove('signed');
    navLogin.href='#komuniti';
    navLogin.removeAttribute('target');
    navLogin.removeAttribute('rel');
    navLogin.title='Log in or sign up';
    navLogin.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4.2 4.9-6 8-6s6.5 1.8 8 6"/></svg><span class="nl-name">Log in</span>';
  }
}
function paintUser(){
  paintNav();
  var userLink=$('#km-user');
  if(userLink){
    if(user&&mode==='firebase'){
      userLink.href=PROFILE_BASE+encodeURIComponent(user.uid);
      userLink.title='View your public profile page — opens in a new window';
    }else{
      userLink.removeAttribute('href');
    }
  }
  if(!user){inBox.hidden=true;outBox.hidden=false;return}
  inBox.hidden=false;outBox.hidden=true;
  unameEl.textContent=user.name;
  umailEl.textContent=user.email||'';
  if(user.photo){
    avaEl.innerHTML='<img src="'+esc(user.photo)+'" alt="">';
  }else{
    avaEl.textContent=initials(user.name);
    var g=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];
    var h=0,s=user.name||'';for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;
    avaEl.style.background=g[h%g.length];
  }
  badgeEl.textContent=(mode==='demo')?'Demo Mode':'Firebase · Cloud';
  badgeEl.className='km-badge '+(mode==='demo'?'demo':'cloud');
}
function setNote(){
  if(mode==='firebase'){
    noteEl.innerHTML='<b style="color:#0b7a52">✓ Connected to Firebase</b> — accounts &amp; comments are stored in the cloud, visible to every visitor.';
  }else{
    noteEl.innerHTML='<b>Demo Mode</b> — profiles &amp; comments are stored in this browser only. Connect your Firebase project (fill in <b>js/community/firebase-config.js</b>, guide in <b>README-FIREBASE.md</b>) for real comments.';
  }
}

/* ---------- login / sign-up tabs ---------- */
function setTab(t){
  tab=t;
  tabIn.classList.toggle('active',t==='in');
  tabUp.classList.toggle('active',t==='up');
  fName.hidden=(mode==='demo')?false:(t==='in');
  fUser.hidden=(mode==='demo')||(t==='in');
  nameIn.required=(mode==='demo'||t==='up');
  submitBtn.textContent=(mode==='demo')?'Continue as guest':((t==='in')?'Log in':'Create account');
  passIn.setAttribute('autocomplete',t==='in'?'current-password':'new-password');
  hideErr();
}
userIn.addEventListener('input',function(){
  var p=userIn.selectionStart;
  userIn.value=userIn.value.toLowerCase().replace(/[^a-z0-9._]/g,'');
  try{userIn.setSelectionRange(Math.min(p,userIn.value.length),Math.min(p,userIn.value.length))}catch(e){}
});
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

/* ---------- submit the form ---------- */
form.addEventListener('submit',function(ev){
  ev.preventDefault();hideErr();
  var name=nameIn.value.trim(), email=emailIn.value.trim(), pass=passIn.value;

  if(mode==='demo'){
    if(name.length<2){showErr('Enter your name (minimum 2 letters).');return}
    submitBtn.disabled=true;
    setTimeout(function(){
      demoIn(name);
      submitBtn.disabled=false;
      form.reset();
    },350);
    return;
  }

  if(tab==='up'&&name.length<2){showErr('Enter your full name.');return}
  var un=userIn.value.trim();
  if(tab==='up'&&!un){showErr('Choose a username — 3–20 characters, lowercase letters, numbers, _ or .');return}
  if(tab==='up'&&!/^[a-z0-9._]{3,20}$/.test(un)){showErr('Username: 3–20 characters — lowercase letters, numbers, _ or . only.');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('Enter a valid email.');return}
  if(pass.length<6){showErr('Password must be at least 6 characters.');return}

  submitBtn.disabled=true;
  var done=function(){submitBtn.disabled=false;form.reset();hideErr();setTab('in')};

  if(tab==='up'){
    fbAuth.createUserWithEmailAndPassword(email,pass).then(function(cred){
      return cred.user.updateProfile({displayName:name}).then(function(){
        return saveUserProfile(cred.user,un).then(function(){
          setUser(cred.user);done();
        },function(e){
          /* The Auth account exists whether Firestore answered or not, so finish the login
             rather than pretending sign-up failed — but say what is still missing. */
          setUser(cred.user);done();
          showErr(profileFailMsg(e));
        });
      });
    }).catch(function(e){submitBtn.disabled=false;showErr(errMsg(e.code||e.message))});
  }else{
    fbAuth.signInWithEmailAndPassword(email,pass).then(function(cred){
      return saveUserProfile(cred.user).then(function(){
        setUser(cred.user);done();
      },function(e){
        setUser(cred.user);done();
        showErr(profileFailMsg(e));
      });
    }).catch(function(e){submitBtn.disabled=false;showErr(errMsg(e.code||e.message))});
  }
});

/* ---------- reset kata laluan ---------- */
resetBtn.addEventListener('click',function(){
  if(mode==='demo')return;
  var email=emailIn.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showErr('Type your email above first, then click "Forgot password?".');return}
  fbAuth.sendPasswordResetEmail(email).then(function(){
    showErr('A reset link has been sent to '+email+'.',true);
  }).catch(function(e){showErr(errMsg(e.code||e.message))});
});

/* ---------- Google ---------- */
googleBtn.addEventListener('click',function(){
  hideErr();
  var p=new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(p).then(function(cred){
    return saveUserProfile(cred.user).then(function(){setUser(cred.user)},function(e){
      setUser(cred.user);showErr(profileFailMsg(e));
    });
  }).catch(function(e){showErr(errMsg(e.code||e.message))});
});

/* ---------- log out ---------- */
outBtn.addEventListener('click',function(){
  if(mode==='demo'){
    user=null;
    try{localStorage.removeItem('km-demo-user')}catch(e){}
    paintUser();setNote();emit();
  }else{
    fbAuth.signOut().catch(function(){});
  }
});

/* ---------- save the profile into the "users" collection ---------- */
function unameFrom(email,uid){
  var base=String(email||'').split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g,'');
  if(base.length<3)base=(base+'u'+String(uid||'')).replace(/[^a-z0-9._]/g,'');
  return base.slice(0,20);
}
/* Failures are deliberately NOT caught here: without this document a member cannot be
   followed or friended (the Firestore rules require the target account to exist) and their
   profile page reads "Profile not found", so the caller has to hear about it. */
function saveUserProfile(u,username){
  if(!fb||!u)return Promise.resolve();
  var ref=fb.collection('users').doc(u.uid);
  function write(){
    return ref.get().then(function(snap){
      if(snap.exists)return; /* profile already exists */
      return ref.set({
        uid:u.uid,
        name:u.displayName||'',
        photo:u.photoURL||'',
        about:'',
        username:username||unameFrom(u.email,u.uid),
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }
  /* One retry, because this used to be a hiccup nobody heard about: a member with no profile
     document cannot be followed or friended (the rules require the target to exist) and their
     profile page reads "Profile not found". */
  return write().catch(function(e){
    return write().catch(function(){throw e});
  });
}
function profileFailMsg(e){
  return 'You are signed in, but your profile row could not be saved ('+
    ((e&&e.code)||(e&&e.message)||'unknown error')+'). Reload this page to try again.';
}
/* Even with the message above, a member who closes the tab right away would have no profile
   row in the database, so the next load fills the gap by itself — once per account, so a
   write that keeps failing cannot loop. */
var profileRepaired=null;
function repairProfile(u){
  if(!u||!fb||profileRepaired===u.uid)return;
  profileRepaired=u.uid;
  saveUserProfile(u).then(function(){loadProfileDoc(u.uid)},function(){});
}

/* ---------- firebase boot ---------- */
var fbUser=null;
function setUser(u){
  fbUser=u||null;
  user=u?{uid:u.uid,name:u.displayName||(u.email||'').split('@')[0],email:u.email||'',photo:u.photoURL||''}:null;
  paintUser();setNote();emit();
  if(u&&fb)loadProfileDoc(u.uid);
}
var profileUid=null;
function loadProfileDoc(uid){
  profileUid=uid;
  fb.collection('users').doc(uid).get().then(function(snap){
    if(!snap.exists){
      if(fbUser&&fbUser.uid===uid&&profileUid===uid)repairProfile(fbUser);
      return;
    }
    if(!user||user.uid!==uid||profileUid!==uid)return;
    var v=snap.data()||{};
    if(v.name)user.name=v.name;
    if(typeof v.photo==='string')user.photo=v.photo;
    paintUser();emit();
  }).catch(function(){});
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
