/* ============================================================
   App Check — js/firestore.js
   ------------------------------------------------------------
   Dimuat sebagai module (type="module") selepas js/ai-logic.js.
   Tugasnya satu sahaja: melekatkan App Check pada aplikasi
   Firebase 'jelajah-ai' yang telah dicipta oleh js/ai-logic.js,
   supaya bukti pengunjung sampai ke Gemini dengan permintaan AI.

   Tiga keadaan (panduan konsol: README-FIREBASE.md, Langkah 5):
   1. APP_CHECK_SITE_KEY diisi  → reCAPTCHA v3 (betul untuk orang ramai).
   2. Kosong, tetapi token debug ada (window.FIREBASE_APPCHECK_DEBUG_TOKEN)
      → mod debug Google; hanya berkesan pada pelayar anda sendiri.
   3. Kedua-dua kosong           → App Check tidak dipasang. Tier percuma
      masih menjawab; jika Google mula menolak, isi kunci site di bawah.
   ============================================================ */
import { getApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';

/* Tampal kunci SITE reCAPTCHA v3 di sini (kunci rahsia tidak diperlukan). */
var APP_CHECK_SITE_KEY = '';

var DEBUG_TOKEN = window.FIREBASE_APPCHECK_DEBUG_TOKEN || '';
var app = null;

try { app = getApp('jelajah-ai'); } catch (e) { /* js/ai-logic.js tidak dimuat */ }

if (app && (APP_CHECK_SITE_KEY || DEBUG_TOKEN)) {
  initializeAppCheck(app, {
    /* Dalam mod debug, SDK mengabaikan nilai ini dan tidak memuat reCAPTCHA. */
    provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY || 'app-check-debug-mode'),
    isTokenEnabled: true,
    getHeadersAsync: function () { return {}; },
  });
}

window.JelajahAppCheck = {
  attached: !!(app && (APP_CHECK_SITE_KEY || DEBUG_TOKEN)),
  mode: APP_CHECK_SITE_KEY ? 'recaptcha-v3' : (DEBUG_TOKEN ? 'debug' : 'off'),
};
