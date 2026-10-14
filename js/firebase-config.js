/* ============================================================
   KONFIGURASI FIREBASE — Jelajah Korea Selatan
   ------------------------------------------------------------
   Nilai di bawah telah diisi — laman kini menggunakan Firebase
   sebenar (Authentication + Firestore + AI Logic).

   Nota penting:
   - Email/Kata laluan: berfungsi terus (termasuk buka fail terus).
   - Log masuk Google: perlu buka melalui http://localhost:8000
     (domain file:// tidak dibenarkan Firebase).
   - Firestore mesti dicipta dahulu di konsol — panduan penuh
     dalam README-FIREBASE.md.
   - databaseURL (Realtime Database) disertakan supaya config ini
     sama dengan yang dipaparkan konsol, tetapi laman TIDAK
     menggunakannya — semua data berada di Firestore.
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
