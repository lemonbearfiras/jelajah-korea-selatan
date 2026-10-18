/* ============================================================
   App Check — js/community/firestore.js
   ------------------------------------------------------------
   Loaded as a module (type="module") after js/community/ai-logic.js.
   It has one job: attach App Check to the 'jelajah-ai' Firebase app
   that js/community/ai-logic.js already created, so visitor evidence
   reaches Gemini alongside the AI request.

   ONE Google Cloud Fraud Defense (reCAPTCHA Enterprise) site key serves the whole app.
   Both delivery hosts are the SAME Firebase web app (same appId), so App Check only
   accepts one registered provider; the second domain is authorised by adding it to
   that key's domain allow-list, not by a second key.
   IMPORTANT — keep this key EMPTY for this project (verified 2026-10-15):
   this web app is registered under "Fraud Defense" (= reCAPTCHA Enterprise), because
   Google retired reCAPTCHA Classic. The token exchange then succeeds (HTTP 200), but
   firebasevertexai.googleapis.com (Firebase AI Logic) rejects ANY request carrying that
   token with "[401] Firebase App Check token is invalid" — for both regular and
   limited-use tokens, and even when App Check enforcement is set to NOT enforced.
   A request with no token at all is accepted, so attaching App Check is what breaks
   the AI tier. Fill the constant again only when Google accepts Fraud Defense tokens
   on AI Logic (or once a provider the endpoint understands, e.g. a v3 registration,
   is available again) — the provider class below is already the Enterprise one.
     1. Key set → reCAPTCHA Enterprise attached (currently = AI tier blocked).
     2. No key, but window.FIREBASE_APPCHECK_DEBUG_TOKEN set → Google debug mode
        (your own browser only).
     3. Neither → App Check not attached; the AI tier sends no token and answers.
   ============================================================ */
import { getApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';

/* Left empty: AI Logic rejects Fraud Defense tokens (see the note above).
   The registered public SITE key: 6LcyC-8tAAAAAGNJsfELIqPyI7tQ4MUpXDDCbm2t */
var APP_CHECK_SITE_KEY = '';

var DEBUG_TOKEN = window.FIREBASE_APPCHECK_DEBUG_TOKEN || '';
var app = null;

try { app = getApp('jelajah-ai'); } catch (e) { /* js/community/ai-logic.js was not loaded */ }

if (app && (APP_CHECK_SITE_KEY || DEBUG_TOKEN)) {
  initializeAppCheck(app, {
    /* In debug mode the SDK ignores this value and never loads reCAPTCHA. */
    provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY || 'app-check-debug-mode'),
    isTokenEnabled: true,
    getHeadersAsync: function () { return {}; },
  });
}

window.JelajahAppCheck = {
  attached: !!(app && (APP_CHECK_SITE_KEY || DEBUG_TOKEN)),
  mode: APP_CHECK_SITE_KEY ? 'recaptcha-enterprise' : (DEBUG_TOKEN ? 'debug' : 'off'),
};
