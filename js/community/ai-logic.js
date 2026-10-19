/* ============================================================
   Firebase AI Logic (Gemini) — the first AI tier behind "Ask Jelajah AI".
   ------------------------------------------------------------
   The ESM SDK loads straight from Google's CDN (v12), so there is
   no build step. A separate Firebase app ('jelajah-ai') keeps the
   10.12.2 compat code for auth + Firestore untouched.

   Needs this done in the Firebase console (guide: README-FIREBASE.md):
   1. Build → Gemini AI / "AI Logic" enabled (free tier).
   2. App Check → register this web app, get the reCAPTCHA v3 key.
   3. Paste that key into APP_CHECK_SITE_KEY below.

   Without App Check, Gemini calls are refused — this module then
   rejects and index.html falls back to the Function / local engine.
   ============================================================ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getAI, GoogleAIBackend, getGenerativeModel } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-ai.js';

/* Gemini 2.5 is no longer opened to new projects; the latest alias is a buffer in case
   Google retires a model name. Free tier = 20 requests/day for this project. */
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

/* Separate Firebase app ('jelajah-ai') — firestore.js attaches App Check to this same
   app, so no second app is created. */
var CFG = window.FIREBASE_CONFIG;
var app = (CFG && CFG.apiKey && CFG.projectId) ? initializeApp(CFG, 'jelajah-ai') : null;

/* Gemini through Firebase: one AI instance shared by all models. */
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
      generationConfig: { maxOutputTokens: 900 },
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

/* Google retires model names regularly — walk the MODELS list when one is refused.
   Only a model-name problem is worth retrying; a quota or auth error is the same on the
   next name, so it is raised and index.html hands over to the lower tiers. */
function attempt(i, q) {
  if (i >= MODELS.length) return Promise.reject(new Error('no Gemini model available'));
  return buildModel(MODELS[i]).then(function (model) {
    return model.generateContent([{ text: q }]);
  }).then(function (res) {
    var text = readAnswer(res);
    if (text.length < 3) throw new Error('empty answer');
    return text.slice(0, 1200);
  }).catch(function (e) {
    var msg = String(e && e.message || e);
    if (/no longer available|not found|not supported|unsupported|invalid model name|\[404/.test(msg)) return attempt(i + 1, q);
    throw e;
  });
}

/* window.JelajahAI.ask(question, context?) → Promise<answer text>
   `context` holds the database entries that best match the question (built by index.html).
   It is appended after the question so Gemini answers from this site's own data instead of
   inventing it. Empty = the prompt is exactly what it always was. */
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
