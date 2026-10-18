/* ============================================================
   PROFILE SETTINGS — js/pages/settings.js
   settings.html — the account owner only (auth.currentUser).
   Username, name, photo (file upload / URL), about + read-only
   account information. Saving writes the users document as a
   merge — that document is the photo source for the whole site.
   ============================================================ */
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var GRADS=['linear-gradient(135deg,#CD2E3A,#8e1f28)','linear-gradient(135deg,#0047A0,#2e6fd8)','linear-gradient(135deg,#c9a45c,#8a6d2f)','linear-gradient(135deg,#5b8def,#0047A0)','linear-gradient(135deg,#3d7a4f,#6b9c5a)','linear-gradient(135deg,#7a3dd1,#4a2a8e)'];
var AVA_PX=160, AVA_MAX_CHARS=100000, AVA_MAX_BYTES=6*1024*1024;
var PHOTO_RE=/^(https?:\/\/\S+|data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+)$/i;

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function show(id){
  ['#st-load','#st-config','#st-auth','#st-err'].forEach(function(s){$(s).classList.remove('show')});
  if(id)$(id).classList.add('show');
}
function fmtDate(ts){
  if(!ts)return null;
  var dt=new Date(ts);
  return dt.getDate()+' '+MONTHS[dt.getMonth()]+' '+dt.getFullYear();
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
  if(p&&p.photo&&PHOTO_RE.test(p.photo)){el.innerHTML='<img src="'+esc(p.photo)+'" alt="">';el.style.background='';}
  else{el.textContent=initials(p&&p.name);el.style.background=gradFor(p&&p.name);}
}

if(typeof FIREBASE_CONFIG==='undefined'||!FIREBASE_CONFIG.apiKey||FIREBASE_CONFIG.apiKey.indexOf('MASUKKAN')===0){
  show('#st-config');return;
}

firebase.initializeApp(FIREBASE_CONFIG);
var db=firebase.firestore(), auth=firebase.auth();
var me=null, prof=null;

var nameIn=$('#s-name'), userIn=$('#s-username'), photoIn=$('#s-photo'),
    aboutIn=$('#s-about'), noteEl=$('#save-note'), saveBtn=$('#btn-save'), avaEl=$('#s-ava'),
    fileIn=$('#photo-file'), upState=$('#up-state');

function note(msg,cls){noteEl.textContent=msg;noteEl.className='note'+(cls?' '+cls:'')}

/* ---------- photo: the real value (data URL / URL) ---------- */
var photoVal='';
function isDataUrl(s){return /^data:image\//i.test(s||'')}
function syncPhotoUI(){
  photoIn.value=isDataUrl(photoVal)?'':photoVal;
  if(!photoVal)upState.textContent='No photo — initials are used.';
  else if(isDataUrl(photoVal))upState.textContent='✓ Uploaded photo ('+AVA_PX+' × '+AVA_PX+')';
  else upState.textContent='✓ Using a linked image';
  upState.className='up-state'+(photoVal?' ok':'');
  previewAva();
}
function setPhoto(v){photoVal=String(v||'');syncPhotoUI()}

/* ---------- pratonton avatar masa nyata ---------- */
function previewAva(){
  paintAva(avaEl,{name:nameIn.value.trim(),photo:photoVal});
}
function bindPreview(){
  nameIn.addEventListener('input',previewAva);
  photoIn.addEventListener('input',function(){setPhoto(photoIn.value.trim())});
}

/* ---------- file upload: crop to a square + shrink ---------- */
function resizeImage(file){
  return new Promise(function(resolve,reject){
    if(!file){reject(new Error('empty'));return}
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type||'')){reject(new Error('type'));return}
    if(file.size>AVA_MAX_BYTES){reject(new Error('big'));return}
    var fr=new FileReader();
    fr.onerror=function(){reject(new Error('read'))};
    fr.onload=function(){
      var img=new Image();
      img.onerror=function(){reject(new Error('decode'))};
      img.onload=function(){
        var side=Math.min(img.width,img.height);
        var sx=Math.round((img.width-side)/2), sy=Math.round((img.height-side)/2);
        var cv=document.createElement('canvas');cv.width=AVA_PX;cv.height=AVA_PX;
        var ctx=cv.getContext('2d');
        ctx.fillStyle='#fff';ctx.fillRect(0,0,AVA_PX,AVA_PX);
        ctx.imageSmoothingEnabled=true;
        if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
        ctx.drawImage(img,sx,sy,side,side,0,0,AVA_PX,AVA_PX);
        var out=cv.toDataURL('image/jpeg',.78);
        if(out.length>AVA_MAX_CHARS){reject(new Error('too_big'));return}
        resolve(out);
      };
      img.src=fr.result;
    };
    fr.readAsDataURL(file);
  });
}
var UP_ERR={
  empty:'No file selected.',
  type:'That file is not a JPG, PNG, WEBP or GIF image.',
  big:'Image is too large (max 6 MB).',
  too_big:'Image could not be compressed enough — try a smaller or simpler photo.',
  read:'Could not read that file. Try again.',
  decode:'Could not open that image. The file may be damaged.'
};
fileIn.addEventListener('change',function(){
  var file=fileIn.files&&fileIn.files[0];
  fileIn.value='';
  if(!file)return;
  note('Processing image…','');
  resizeImage(file).then(function(dataUrl){
    setPhoto(dataUrl);
    note('✓ Photo ready — press "Save changes" to save it.','ok');
  }).catch(function(e){
    note(UP_ERR[e.message]||'Could not use that image.','bad');
  });
});
function openPicker(){fileIn.click()}
$('#btn-upload').addEventListener('click',openPicker);
$('#ava-badge').addEventListener('click',openPicker);
avaEl.addEventListener('click',openPicker);
avaEl.addEventListener('keydown',function(ev){
  if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();openPicker()}
});
$('#s-photo-clear').addEventListener('click',function(){
  setPhoto('');
  note('Photo removed — press "Save changes" to save.','');
  photoIn.focus();
});
$('#i-copy').addEventListener('click',function(){
  var link=$('#i-link').textContent;
  if(navigator.clipboard)navigator.clipboard.writeText(link).then(function(){note('✓ Profile link copied.','ok')});
  else prompt('Copy this link:',link);
});

function loadDoc(){
  return db.collection('users').doc(me).get().then(function(snap){
    var v=snap.exists?snap.data():{};
    var u=auth.currentUser;
    prof={
      username:v.username||'',
      name:v.name||u.displayName||u.email.split('@')[0]||'',
      photo:(typeof v.photo==='string'?v.photo:(u.photoURL||'')),
      about:v.about||'',
      createdAt:tsOf(v.createdAt)
    };
    fill();
    $('#back-link').href='profile.html?v='+encodeURIComponent(me);
    $('#btn-cancel').setAttribute('href','profile.html?v='+encodeURIComponent(me));
    var link=PROFILE_BASE+encodeURIComponent(me);
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
  aboutIn.value=prof.about;
  $('#s-about-chars').textContent=prof.about.length+' / 500';
  setPhoto(prof.photo);
  note('');
}

/* ---------- logik borang ---------- */
aboutIn.addEventListener('input',function(){$('#s-about-chars').textContent=aboutIn.value.length+' / 500'});

userIn.addEventListener('input',function(){
  var p=userIn.selectionStart;
  userIn.value=userIn.value.toLowerCase().replace(/[^a-z0-9._]/g,'');
  try{userIn.setSelectionRange(Math.min(p,userIn.value.length),Math.min(p,userIn.value.length))}catch(e){}
});

function validate(){
  var un=userIn.value.trim(), n=nameIn.value.trim(), p=photoVal, a=aboutIn.value.trim();
  if(!un){note('A username is required — 3–20 characters: lowercase letters, numbers, _ or .','bad');return null}
  if(!/^[a-z0-9._]{3,20}$/.test(un)){note('Username: 3–20 characters — lowercase letters, numbers, _ or . only.','bad');return null}
  if(n.length<2||n.length>40){note('Display name must be 2–40 characters.','bad');return null}
  if(p&&!PHOTO_RE.test(p)){note('Photo must be an uploaded image or a link starting with http:// or https://','bad');return null}
  if(p.length>AVA_MAX_CHARS){note('Photo is too large — upload a smaller image instead.','bad');return null}
  if(a.length>500){note('About is too long (max 500 characters).','bad');return null}
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
    /* Firebase Auth caps long data URLs — uploaded photos go into the document only */
    return u.updateProfile({displayName:data.name,photoURL:isDataUrl(data.photo)?null:(data.photo||null)})
      .then(function(){return null},function(pe){return pe});
  }).then(function(authErr){
    if(authErr)note('✓ Profile saved, but the photo could not be attached to your account ('+(authErr.code||authErr.message)+').','bad');
    else note('✓ Changes saved.','ok');
  }).catch(function(e){
    var msg='Could not save: '+(e.code||e.message);
    if(e.code==='permission-denied'){
      msg='Could not save — please deploy the latest Firestore rules (firestore.rules, see README-FIREBASE.md).';
    }
    note(msg,'bad');
  }).then(function(){saveBtn.disabled=false});
});

/* ---------- boot ---------- */
bindPreview();
var un=auth.onAuthStateChanged(function(u){
  un();
  if(!u){show('#st-auth');return}
  if((u.uid||'').indexOf('demo-')===0){show('#st-auth');return}
  me=u.uid;
  loadDoc().catch(function(e){
    $('#err-msg').textContent='The settings could not be loaded ('+(e.code||e.message)+').';
    show('#st-err');
  });
});
})();
