/* ============================================================
   Firebase AI Logic (Gemini) — lapisan AI pertama kotak "Tanya".
   ------------------------------------------------------------
   SDK modul ESM dimuat terus dari CDN Google (v12), jadi tiada
   build step. Aplikasi Firebase berasingan ('jelajah-ai') supaya
   kod compat 10.12.2 untuk auth + Firestore tidak diusik.

   Perlu siap di konsol Firebase (panduan: README-FIREBASE.md):
   1. Build → Gemini AI / "AI Logic" diaktifkan (tier percuma).
   2. App Check → daftar aplikasi web ini, dapat kunci reCAPTCHA v3.
   3. Tampal kunci itu ke APP_CHECK_SITE_KEY di bawah.

   Tanpa App Check, panggilan Gemini ditolak — fungsi ini akan
   reject dan index.html jatuh ke Function / enjin offline.
   ============================================================ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app-check.js';
import { getAI, GoogleAIBackend, getGenerativeModel } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-ai.js';

/* Tampal kunci site reCAPTCHA v3 dari konsol Firebase di sini. */
var APP_CHECK_SITE_KEY = '';

var MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];

var SYSTEM = 'You are "Jelajah AI", a South Korea travel assistant for Malaysian travellers. ' +
  'Answer in friendly, specific and concise English: maximum 4 sentences, no lists. ' +
  'Focus only on South Korea: destinations (Seoul, Busan, Jeju, Gyeongju, Jeonju, Seoraksan), food, culture, ' +
  'transport (KTX, subway), budget (approx RM1 = ₩300-330), weather and seasons. ' +
  'If a fact is uncertain, say it is an estimate. If the question is off-topic from South Korea or travel, ' +
  'ask the user to ask about South Korea only.';

var THINK_BLOCK = /<think\b[^>]*>[\s\S]*?<\/think>/gi;

function clean(raw) {
  return String(raw)
    .replace(THINK_BLOCK, ' ')
    .replace(/<\/?think>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Gemini melalui Firebase: satu instance AI untuk semua model. */
var aiPromise = null;

function buildAI() {
  if (aiPromise) return aiPromise;
  aiPromise = new Promise(function (resolve, reject) {
    var cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || !cfg.projectId) { reject(new Error('tiada config Firebase')); return; }
    var app = initializeApp(cfg, 'jelajah-ai');
    if (APP_CHECK_SITE_KEY) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
        isTokenEnabled: true,
        getHeadersAsync: function () { return {}; },
      });
    }
    resolve(getAI(app, { backend: new GoogleAIBackend() }));
  });
  return aiPromise;
}

var modelCache = {};

function buildModel(name) {
  if (modelCache[name]) return modelCache[name];
  modelCache[name] = buildAI().then(function (ai) {
    return getGenerativeModel(ai, {
      model: name,
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: { maxOutputTokens: 900, temperature: 0.4 },
    });
  });
  return modelCache[name];
}

function readAnswer(res) {
  var parts = res?.response?.candidates?.[0]?.content?.parts;
  return clean(Array.isArray(parts)
    ? parts.filter(function (p) { return p && typeof p.text === 'string' && p.thought !== true; })
        .map(function (p) { return p.text; }).join(' ')
    : (res?.response?.text ? res.response.text() : ''));
}

/* Google tamat sokongan model secara berkala — cuba senarai Model apabila satu ditolak. */
function attempt(i, q) {
  if (i >= MODELS.length) return Promise.reject(new Error('tiada model Gemini tersedia'));
  return buildModel(MODELS[i]).then(function (model) {
    return model.generateContent([{ text: q }]);
  }).then(function (res) {
    var text = readAnswer(res);
    if (text.length < 3) throw new Error('jawapan kosong');
    return text.slice(0, 1200);
  }).catch(function (e) {
    var msg = String(e && e.message || e);
    if (/no longer available|not found|\[404/.test(msg)) return attempt(i + 1, q);
    throw e;
  });
}

/* window.JelajahAI.ask(soalan) → Promise<teks jawapan> */
window.JelajahAI = {
  models: MODELS,
  ask: function (question) {
    var q = clean(question);
    if (q.length < 2 || q.length > 400) return Promise.reject(new Error('soalan tidak sah'));
    return attempt(0, q);
  },
};
