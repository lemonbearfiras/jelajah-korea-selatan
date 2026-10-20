/* ============================================================
   PRIVATE CHAT — js/pages/chat.js
   chat.html?v=<friend uid>  ·  realtime through onSnapshot
   Documents: chats/<pairId>/messages/{auto}
   pairId = both uids sorted a-z (they are grouped in firestore.rules)
   ============================================================ */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var GRADS=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function show(id){
  ['#st-load','#st-param','#st-config','#st-login','#st-notfriend','#st-err'].forEach(function(s){$(s).classList.remove('show')});
  if(id)$(id).classList.add('show');
}
function initials(n){n=(n||'?').trim();var p=n.split(/\s+/);return (p.length>1?p[0][0]+p[p.length-1][0]:p[0][0]||'?').toUpperCase()}
function gradFor(s){var h=0;s=String(s||'');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return GRADS[h%GRADS.length]}
function paintAva(el,p){
  if(p&&p.photo){el.innerHTML='<img src="'+esc(p.photo)+'" alt="">';el.style.background=''}
  else{el.textContent=initials(p&&p.name);el.style.background=gradFor(p&&p.name)}
}
function fmtTime(ts){
  var d=new Date(ts);
  var t=d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  var today=new Date();
  var sameDay=d.getDate()===today.getDate()&&d.getMonth()===today.getMonth()&&d.getFullYear()===today.getFullYear();
  return sameDay?t:(d.getDate()+'/'+(d.getMonth()+1)+' '+t);
}
/* The realtime listener keeps working after sign-out only until the next rules check, but the
   messages already painted stay in the DOM, so logging out would leave a private conversation on
   screen for the next person to use this browser. Everything room-related is dropped here. */
function blockSubmit(ev){ev.preventDefault()}
function teardown(){
  initGen++; /* invalidates every pending read, listener callback and send completion */
  $('#chat-form').onsubmit=blockSubmit;
  if(unsub){try{unsub()}catch(e){}unsub=null}
  me=null;chatId=null;
  $('#msgs').innerHTML='';
  $('#room').classList.remove('show');
  $('#chat-input').value='';
  $('#c-name').textContent='—';
  paintAva($('#c-ava'),{});
  $('#lnk-profile').hidden=true;
  document.title='Chat · Jelajah Korea Selatan';
}

var other=(new URLSearchParams(location.search).get('v')||'').trim();
if(!other||other.indexOf('demo-')===0){show('#st-param');return}
if(typeof FIREBASE_CONFIG==='undefined'||!FIREBASE_CONFIG.apiKey||FIREBASE_CONFIG.apiKey.indexOf('MASUKKAN')===0){show('#st-config');return}

firebase.initializeApp(FIREBASE_CONFIG);
var db=firebase.firestore(), auth=firebase.auth();
var me=null, chatId=null, unsub=null, initGen=0;
var form=$('#chat-form'), inputEl=$('#chat-input'), sendBtn=$('#chat-send');
/* Registered once; sending is only possible after startChat installs a room-specific handler. */
form.onsubmit=blockSubmit;
inputEl.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();form.requestSubmit()}
});
inputEl.addEventListener('input',function(){
  inputEl.style.height='auto';
  inputEl.style.height=Math.min(inputEl.scrollHeight,120)+'px';
});

function errState(e){
  var msg='Error: '+esc(e.code||e.message||e);
  if(e.code==='permission-denied'){
    msg='The Firestore rules do not yet allow chat — please deploy the rules in <b>firestore.rules</b> (README-FIREBASE.md, Step 4).';
  }
  $('#err-msg').innerHTML=msg;
  show('#st-err');
}

function renderMsgs(snap){
  var box=$('#msgs');
  var atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<70;
  if(!snap.size){
    box.innerHTML='<div class="msg-sys">No messages yet. Start the conversation! 👋</div>';
    return;
  }
  box.innerHTML='';
  var lastFrom=null;
  snap.forEach(function(doc){
    var m=doc.data();
    lastFrom=m.from;
    var div=document.createElement('div');
    div.className='msg '+(m.from===me?'me':'them');
    var ts=m.createdAt&&m.createdAt.toMillis?m.createdAt.toMillis():Date.now();
    div.innerHTML=esc(m.text)+'<time>'+fmtTime(ts)+'</time>';
    box.appendChild(div);
  });
  if(atBottom||lastFrom===me)box.scrollTop=box.scrollHeight;
}

function startChat(uid,gen){
  var pairId=[uid,other].sort().join('_');
  function live(){return gen===initGen&&me===uid&&chatId===pairId}
  chatId=pairId;
  db.collection('friends').doc(pairId).get().then(function(f){
    if(!live())return;
    if(!f.exists){
      show('#st-notfriend');
      $('#act-toprofile').href='profile.html?v='+encodeURIComponent(other);
      return;
    }
    return Promise.all([
      db.collection('users').doc(other).get().catch(function(){return {exists:false,data:function(){return {}}}}),
      db.collection('users').doc(uid).get().catch(function(){return {exists:false,data:function(){return {}}}})
    ]).then(function(res){
      if(!live())return;
      var ov=res[0].exists?res[0].data():{};
      var name=ov.name||'Friend';
      paintAva($('#c-ava'),{name:name,photo:ov.photo||''});
      $('#c-name').textContent=name;
      document.title='Chat with '+name+' · Jelajah Korea Selatan';
      $('#lnk-profile').hidden=false;
      $('#lnk-profile').href='profile.html?v='+encodeURIComponent(other);
      $('#room').classList.add('show');
      show(null);

      /* send the message — only from this authorized, still-current room */
      function send(ev){
        ev.preventDefault();
        var text=inputEl.value.trim();
        if(!text||sendBtn.disabled||!live()||form.onsubmit!==send)return;
        sendBtn.disabled=true;
        db.collection('chats').doc(pairId).collection('messages').add({
          from:uid,to:other,text:text,createdAt:firebase.firestore.FieldValue.serverTimestamp()
        }).then(function(){if(live()){inputEl.value='';inputEl.focus()}})
          .catch(function(e){
            if(live())alert('Message could not be sent: '+(e.code||e.message));
          }).then(function(){if(live()&&form.onsubmit===send)sendBtn.disabled=false});
      }
      sendBtn.disabled=false;
      form.onsubmit=send;
      unsub=db.collection('chats').doc(pairId).collection('messages')
        .orderBy('createdAt','asc').limitToLast(100)
        .onSnapshot(function(snap){if(live())renderMsgs(snap)}, function(e){
          if(!live())return;
          form.onsubmit=blockSubmit;
          errState(e);
        });
    });
  }).catch(function(e){if(live())errState(e)});
}

auth.onAuthStateChanged(function(u){
  if(u&&me===u.uid)return; /* same account re-notified: keep the existing room/initialization */
  var switched=!!me&&!!u&&me!==u.uid;
  if(!u||switched)teardown();
  if(!u){show('#st-login');return}
  me=u.uid;
  if(me===other){show('#st-param');return}
  show(null);
  startChat(me,++initGen);
});
})();
