/* ============================================================
   App Check — js/firestore.js
   ------------------------------------------------------------
   Dimuat sebagai module (type="module") selepas js/ai-logic.js.
   Tugasnya satu sahaja: melekatkan App Check pada aplikasi
   Firebase 'jelajah-ai' yang telah dicipta oleh js/ai-logic.js,
   supaya bukti pengunjung sampai ke Gemini dengan permintaan AI.

   ONE reCAPTCHA v3 site key serves the whole app. Both delivery hosts are the SAME
   Firebase web app (same appId), so App Check only accepts one registered key; the
   second domain is authorised by adding it to that key's domain allow-list in the
   reCAPTCHA admin, not by a second key.
     1. Key set + domain allowed + provider registered → reCAPTCHA v3 (production).
     2. No key, but window.FIREBASE_APPCHECK_DEBUG_TOKEN set → Google debug mode
        (your own browser only).
     3. Neither → App Check not attached; tier 1 fails and the site falls to the
        server Function (Qoder) or the offline engine (GitHub Pages).
   ============================================================ */
import { getApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';

/* Kunci SITE reCAPTCHA v3 awam (kunci rahsia hanya di konsol, bukan di sini).
   Domain yang dibenarkan bagi kunci ini: lemonbearfiras.github.io + *.qoder.website */
var APP_CHECK_SITE_KEY = '6LcyC-8tAAAAAGNJsfELIqPyI7tQ4MUpXDDCbm2t';

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
