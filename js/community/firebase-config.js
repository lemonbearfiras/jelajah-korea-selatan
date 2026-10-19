/* ============================================================
   FIREBASE CONFIGURATION — Jelajah Korea Selatan
   ------------------------------------------------------------
   The values below are filled in — the site now runs on real
   Firebase (Authentication + Firestore + AI Logic).

   Worth knowing:
   - Email/password: works immediately, including file:// opening.
   - Google sign-in: must be served through http://localhost:8000
     (Firebase refuses the file:// domain).
   - Firestore has to be created in the console first — full guide
     in README-FIREBASE.md.
   - databaseURL (Realtime Database) is included so this config
     matches what the console shows, but the site does NOT use it
     — every document lives in Firestore.
   ============================================================ */

var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyClIW0rFCZFLVuOd0dGlyj9ztjZ0E6QMls",
  authDomain:        "jelajah-korea.firebaseapp.com",
  databaseURL:       "https://jelajah-korea-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "jelajah-korea",
  storageBucket:     "jelajah-korea.firebasestorage.app",
  messagingSenderId: "950161795507",
  appId:             "1:950161795507:web:97df07773ed36a387043c6",
  measurementId:     "G-C4KKCPHZ6E"
};

/* Shared profile links have to work on every host the site runs on — GitHub Pages under
   /jelajah-korea-selatan/, the Qoder site at the root, and localhost — so the base is read
   from the current URL. profile.html rather than the extensionless /profile because the
   Qoder host only serves the file with its extension. This is the one script every page
   loads before any code that needs a link, so it lives here. */
var SITE_BASE=location.origin+location.pathname.replace(/[^/]*$/,'');
var PROFILE_BASE=SITE_BASE+'profile.html?v=';

/* ---------- username reservations ----------
   Two accounts must not end up with the same handle, and checking "is it free?" in the browser
   cannot promise that: between the check and the write somebody else can claim it. A Firestore
   transaction does the read and the claim as one atomic server-side operation, and firestore.rules
   then rejects any profile document carrying a handle the writer does not own — so the guarantee
   holds even for a request that never ran this code. */
var HANDLE_RE=/^[a-z0-9._]{3,20}$/;
function handleRef(db,handle){return db.collection('usernames').doc(handle)}

/* -> 'ok' claimed just now · 'mine' already ours · 'taken' another account has it
   Anything else (rules not published, offline, a malformed handle) rejects. */
function handleTake(db,handle,uid){
  if(!HANDLE_RE.test(handle))return Promise.reject(new Error('bad handle'));
  return db.runTransaction(function(t){
    var ref=handleRef(db,handle);
    return t.get(ref).then(function(snap){
      if(snap.exists)return String((snap.data()||{}).uid)===String(uid)?'mine':'taken';
      t.set(ref,{uid:uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
      return 'ok';
    });
  });
}

/* The handle a member wants can already belong to somebody. Try it, then _2…_9, then a uid-derived
   one, so sign-up and the automatic profile repair always end up on a handle that is really theirs.
   Resolves to the handle claimed, or null when nothing could be reserved — the caller then writes
   the profile anyway, because a Firestore hiccup must not stop somebody from joining. */
function handleEnsure(db,want,uid){
  var idPart=String(uid||'').toLowerCase().replace(/[^a-z0-9._]/g,'');
  var base=String(want||'').toLowerCase().replace(/[^a-z0-9._]/g,'');
  if(base.length<3)base=('u'+idPart).slice(0,20);
  base=base.slice(0,20);
  var tries=[base];
  for(var i=2;i<=9;i++)tries.push(base.slice(0,18)+'_'+i);
  if(idPart)tries.push(('u'+idPart).slice(0,20));
  return tries.reduce(function(p,h){
    return p.then(function(done){
      if(done)return done;
      return handleTake(db,h,uid).then(function(r){return (r==='ok'||r==='mine')?h:null},function(){return null});
    });
  },Promise.resolve(null));
}

/* Release a handle an account has moved away from. Rules only let the owner delete their own
   reservation, and deleting one that is not there is not an error, so nothing is checked here. */
function handleFree(db,handle){
  if(!HANDLE_RE.test(handle))return Promise.resolve();
  return handleRef(db,handle).delete().then(function(){},function(){});
}

/* Read-only availability hint — 'free' | 'mine' | 'taken'. It claims nothing; handleTake is the
   only writer, so showing a hint while somebody types cannot win a handle by accident. */
function handlePeek(db,handle,uid){
  if(!HANDLE_RE.test(handle))return Promise.resolve('bad');
  return handleRef(db,handle).get().then(function(snap){
    if(!snap.exists)return 'free';
    return String((snap.data()||{}).uid)===String(uid)?'mine':'taken';
  },function(){return 'unknown'});
}
