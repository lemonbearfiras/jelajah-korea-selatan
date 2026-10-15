/* ============================================================
   App Check — js/firestore.js
   ------------------------------------------------------------
   Dimuat sebagai module (type="module") selepas js/ai-logic.js.
   Tugasnya satu sahaja: melekatkan App Check pada aplikasi
   Firebase 'jelajah-ai' yang telah dicipta oleh js/ai-logic.js,
   supaya bukti pengunjung sampai ke Gemini dengan permintaan AI.

   Kunci dipilih mengikut domain (kunci SITE reCAPTCHA v3 terikat pada domain):
   1. Domain sepadan dalam SITE_KEYS → reCAPTCHA v3 (betul untuk orang ramai).
      INI KEADAAN SEMASA: enforcement App Check dihidupkan pada aplikasi
      ini, jadi tanpa token sah Gemini menolak permintaan dengan
      "[401] Firebase App Check token is invalid".
   2. Tiada padanan, tetapi token debug ada (window.FIREBASE_APPCHECK_DEBUG_TOKEN)
      → mod debug Google; hanya berkesan pada pelayar anda sendiri.
   3. Tiada padanan dan tiada debug → App Check tidak dipasang; lapisan 1
      gagal dan laman jatuh ke Function / enjin offline.
   ============================================================ */
import { getApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';

/* Kunci SITE reCAPTCHA v3 awam, satu per domain (kunci rahsia tidak diperlukan).
   Pilih mengikut hostname; localhost/preview tanpa padanan → App Check tidak dipasang. */
var SITE_KEYS = {
  'lemonbearfiras.github.io': '6LcyC-8tAAAAAGNJsfELIqPyI7tQ4MUpXDDCbm2t',
  'jelajah-korea-qodzbckpyph.qoder.website': '6LcENvAtAAAAAN8G3yfb7bLAb9hpigbmr_80Gp4P',
};

var APP_CHECK_SITE_KEY = SITE_KEYS[window.location.hostname] || '';

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
