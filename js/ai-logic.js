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
import { getAI, GoogleAIBackend, getGenerativeModel } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-ai.js';

/* Gemini 2.5 dah tidak dibuka untuk projek baharu; alias latest sebagai penampan
   kalau Google menamatkan nama model. Tier percuma = 20 permintaan/hari untuk projek ini. */
var MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];

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

/* Aplikasi Firebase berasingan ('jelajah-ai') — firestore.js melekatkan App Check
   pada aplikasi yang sama, jadi tiada aplikasi kedua dicipta. */
var CFG = window.FIREBASE_CONFIG;
var app = (CFG && CFG.apiKey && CFG.projectId) ? initializeApp(CFG, 'jelajah-ai') : null;

/* Gemini melalui Firebase: satu instance AI untuk semua model. */
var aiPromise = null;

function buildAI() {
  if (!aiPromise) {
    aiPromise = new Promise(function (resolve, reject) {
      if (!app) { reject(new Error('tiada config Firebase')); return; }
      resolve(getAI(app, { backend: new GoogleAIBackend() }));
    });
  }
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

/* window.JelajahAI.ask(soalan, konteks?) → Promise<teks jawapan>
   `konteks` ialah entri pangkalan data tempat yang paling sepadan dengan soalan (dibina
   oleh index.html). Ia ditempel selepas soalan supaya Gemini menjawab dari data laman
   ini dan bukan rekaan. Kosong = prompt sama seperti dahulu. */
var CTX_MAX=2600;
var CTX_NOTE='\n\nMatching entries from this site\'s own places database — use these for names, entry fees, best seasons and tips instead of guessing:\n';

window.JelajahAI = {
  models: MODELS,
  ask: function (question, ctx) {
    var q = clean(question);
    if (q.length < 2 || q.length > 400) return Promise.reject(new Error('soalan tidak sah'));
    var extra = clean(ctx || '').slice(0, CTX_MAX);
    return attempt(0, q + (extra ? CTX_NOTE + extra : ''));
  },
};
