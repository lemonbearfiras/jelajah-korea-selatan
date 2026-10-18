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
