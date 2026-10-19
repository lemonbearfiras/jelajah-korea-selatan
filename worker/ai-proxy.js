/* Jelajah AI proxy — Cloudflare Worker (free plan).
   GitHub Pages cannot run server code, and after 2026-11-02 the Firebase AI Logic
   endpoint demands an App Check token that this project's provider cannot obtain.
   This Worker is a plain HTTPS API with no App Check involvement: the browser sends
   the question plus the matching entries from the site's own 126-place database, and the
   key stays in the Worker's secret.
   Deploy: Workers & Pages → Create → Worker → paste → Settings → Variables/secrets. */

const ALLOW = new Set([
  'https://lemonbearfiras.github.io',
  'https://jelajah-korea-qodzbckpyph.qoder.website',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
]);

const SYSTEM =
  'You are "Jelajah AI", a South Korea travel assistant for Malaysian travellers. ' +
  'Answer in friendly, specific and concise English: maximum 4 sentences, no lists. ' +
  'Focus only on South Korea: destinations (Seoul, Busan, Jeju, Gyeongju, Jeonju, Seoraksan), food, culture, ' +
  'transport (KTX, subway), budget (approx RM1 = ₩300-330), weather and seasons. ' +
  'If a fact is uncertain, say it is an estimate. If the question is off-topic from South Korea or travel, ' +
  'ask the user to ask about South Korea only.';

const MAX_ANSWER = 1200;
/* Retrieval context: index.html sends the database entries that best match the question, so
   the model answers from this site's own data instead of guessing. Size-capped, control
   characters stripped; a request without ctx behaves exactly like the previous build. */
const CTX_MAX = 2600;
const CTX_NOTE = '\n\nMatching entries from this site\'s own places database — use these for names, entry fees, best seasons and tips instead of guessing:\n';

/* A free-tier answer really does take ~30 s, so the ask budget is generous; discovery
   is a tiny request and must fail fast instead of eating the ask window. */
const ASK_BUDGET_MS = 28000;
const DISCOVERY_TIMEOUT_MS = 8000;
/* One slow model must not hold the whole window, so every attempt is capped and the
   next candidate model gets a turn inside the same budget. */
const PER_TRY_MS = 14000;
const MIN_TRY_MS = 4000;

const THINK = /<think\b[^>]*>[\s\S]*?<\/think>/gi;

/* Per-client request budget. The Origin list above is a CSRF guard, not authentication: a
   non-browser client can send any Origin header it likes, and this Worker answers from the
   owner's free-tier quota, which is counted per day. So every client also gets a hard
   minute/day allowance, counted in the edge cache and keyed on a hash of the IP.
   Cache writes are not atomic, so this is a firm ceiling rather than an exact counter —
   which is all that is needed to stop one script draining the day's quota. */
const RL_PER_MIN = 6;
const RL_PER_DAY = 120;
const MIN_SPAN_S = 60;
const DAY_SPAN_S = 86400;

function hashIp(ip) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip))
    .then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return (b < 16 ? '0' : '') + b.toString(16);
      }).join('');
    });
}

function bump(name, ipHash, max, spanS) {
  /* Buckets are absolute so the window cannot be extended by writing near its edge. */
  const key = new Request('https://rl.jelajah-korea.workers.dev/' + name +
    '/' + Math.floor(Date.now() / (spanS * 1000)) + '/' + ipHash);
  let n = 0;
  return caches.default.match(key)
    .then(function (hit) { return hit ? hit.text() : ''; })
    .then(function (text) { n = parseInt(text, 10) || 0; })
    .catch(function () { /* no cache entry yet */ })
    .then(function () {
      if (n >= max) return false;
      return caches.default.put(key, new Response(String(n + 1), {
        headers: { 'cache-control': 'public, max-age=' + spanS },
      })).then(function () { return true; }, function () { return true; });
    });
}

function withinBudget(request) {
  const ip = request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  return hashIp(ip).then(function (h) {
    return bump('min', h, RL_PER_MIN, MIN_SPAN_S).then(function (okMin) {
      return bump('day', h, RL_PER_DAY, DAY_SPAN_S).then(function (okDay) {
        return okMin && okDay;
      });
    });
  });
}

/* Secrets pasted from AI Studio often carry stray spaces/newlines, and a key with
   whitespace in it fails with a confusing 400 from Google. */
function read(env, name, minLen) {
  const v = typeof env[name] === 'string' ? env[name].trim() : '';
  return v.length >= (minLen || 8) ? v : '';
}

function clean(raw) {
  return String(raw || '').replace(THINK, ' ').replace(/<\/?think>/gi, ' ').replace(/\s+/g, ' ').trim();
}

/* Entries arrive one per line; collapsing the whitespace still keeps them readable because
   every line starts with "- ". */
function ctxText(raw) {
  return clean(String(raw).replace(/\p{C}/gu, ' ')).slice(0, CTX_MAX);
}

function withCtx(question, ctx) {
  return ctx ? question + CTX_NOTE + ctx : question;
}

function cors(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '600',
    'cache-control': 'no-store',
  };
}

function json(body, status, origin, extra) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, cors(origin), extra || {}),
  });
}

async function send(method, url, headers, payload, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || ASK_BUDGET_MS);
  try {
    return await fetch(url, { method: method, headers: headers, body: payload, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getJson(url, headers) {
  return send('GET', url, headers, undefined, DISCOVERY_TIMEOUT_MS);
}

function left(deadlineAt) {
  return Math.max(0, deadlineAt - Date.now());
}

/* A wrong model id and an exhausted daily quota both arrive as a non-200, so the
   provider's own reason is kept in the error to make them tellable apart. */
async function failWith(prefix, res, secret) {
  let reason = '';
  try {
    const data = await res.json();
    reason = clean(data && data.error && data.error.message);
  } catch (e) { /* body is not JSON — the status alone is enough */ }
  if (secret) reason = reason.split(secret).join('');
  return new Error(prefix + '_' + res.status + (reason ? ' ' + reason.slice(0, 90) : ''));
}

/* Free-tier Gemini through an API key. Quota is counted per model, so one 429 does not
   mean the key is spent — the next candidate model may still answer. */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
let geminiModels = [];

async function geminiCandidates(env) {
  if (env.GEMINI_MODEL) return [env.GEMINI_MODEL];
  if (geminiModels.length) return geminiModels;
  const out = [];
  function add(id) { if (id && out.indexOf(id) < 0) out.push(id); }
  try {
    const res = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      'x-goog-api-key': env.GEMINI_API_KEY,
    });
    const rows = (await res.json()).models || [];
    const ids = rows
      .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
      .map(function (m) { return m.name.replace(/^models\//, ''); });
    const ranks = [/gemini-3\.8-flash/, /gemini-3.*flash/i, /gemini.*flash/i, /gemini/i];
    for (let i = 0; i < ranks.length; i++) {
      ids.filter(function (id) { return ranks[i].test(id); }).sort().forEach(add);
    }
  } catch (e) { /* fall through to the alias */ }
  add('gemini-flash-latest');
  geminiModels = out.slice(0, 4);
  return geminiModels;
}

async function askGemini(env, question, deadlineAt) {
  const models = await geminiCandidates(env);
  let last = new Error('gemini_no_model');
  for (let i = 0; i < models.length; i++) {
    const remaining = left(deadlineAt);
    if (remaining < MIN_TRY_MS) break;
    const res = await send('POST', GEMINI_URL + models[i] + ':generateContent',
      { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 900, temperature: 0.4 },
      }),
      Math.min(remaining, PER_TRY_MS));
    if (!res.ok) {
      last = await failWith('gemini', res, env.GEMINI_API_KEY);
      if (res.status === 401 || res.status === 403) break; /* key rejected, not spent */
      continue;
    }
    const data = await res.json();
    const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const text = clean(parts
      .filter(function (p) { return !p.thought; })
      .map(function (p) { return p.text || ''; })
      .join(' '));
    if (text.length >= 3) return text.slice(0, MAX_ANSWER);
    last = new Error('gemini_empty');
  }
  throw last;
}

/* Backup: the owner's OpenAI-compatible gateway (same key the Qoder Function uses). */
const GATEWAY_URL = 'https://api.a2agent.me/v1/chat/completions';
let gatewayModels = [];

async function gatewayCandidates(env) {
  if (env.GATEWAY_MODEL) return [env.GATEWAY_MODEL];
  if (gatewayModels.length) return gatewayModels;
  const out = [];
  function add(id) { if (id && out.indexOf(id) < 0) out.push(id); }
  try {
    const res = await getJson('https://api.a2agent.me/v1/models', {
      authorization: 'Bearer ' + env.A2AGENT_API_KEY,
    });
    const ids = ((await res.json()).data || []).map(function (m) { return m.id; }).filter(Boolean);
    ids.filter(function (id) { return /minimax.?m3/i.test(id); }).forEach(add);
    ids.filter(function (id) { return /minimax/i.test(id); }).forEach(add);
    ids.filter(function (id) { return /deepseek|glm|kimi|qwen/i.test(id); }).sort().forEach(add);
  } catch (e) { /* fall through to the constant */ }
  add('minimax-m3');
  gatewayModels = out.slice(0, 3);
  return gatewayModels;
}

async function askGateway(env, question, deadlineAt) {
  const models = await gatewayCandidates(env);
  let last = new Error('gateway_no_model');
  for (let i = 0; i < models.length; i++) {
    const remaining = left(deadlineAt);
    if (remaining < MIN_TRY_MS) break;
    const res = await send('POST', GATEWAY_URL,
      { 'content-type': 'application/json', authorization: 'Bearer ' + env.A2AGENT_API_KEY },
      JSON.stringify({
        model: models[i],
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: question }],
        max_tokens: 900,
        temperature: 0.4,
        stream: false,
      }),
      Math.min(remaining, PER_TRY_MS));
    if (!res.ok) {
      last = await failWith('gateway', res, env.A2AGENT_API_KEY);
      if (res.status === 401 || res.status === 403) break;
      continue;
    }
    const data = await res.json();
    const text = clean((((data.choices || [])[0] || {}).message || {}).content || '');
    if (text.length >= 3) return text.slice(0, MAX_ANSWER);
    last = new Error('gateway_empty');
  }
  throw last;
}

export default {
  async fetch(request, env) {
    env = {
      GEMINI_API_KEY: read(env, 'GEMINI_API_KEY'),
      A2AGENT_API_KEY: read(env, 'A2AGENT_API_KEY'),
      GEMINI_MODEL: read(env, 'GEMINI_MODEL', 1),
      GATEWAY_MODEL: read(env, 'GATEWAY_MODEL', 1),
    };
    const origin = request.headers.get('origin') || '';
    if (!ALLOW.has(origin)) return json({ ok: false, error: 'origin_not_allowed' }, 403, '');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/ask') {
      return json({ ok: false, error: 'not_found' }, 404, origin);
    }
    let q = '';
    let ctx = '';
    try {
      const body = await request.json();
      q = typeof body.q === 'string' ? body.q.trim() : '';
      ctx = typeof body.ctx === 'string' ? ctxText(body.ctx) : '';
    } catch (e) {
      return json({ ok: false, error: 'bad_json' }, 400, origin);
    }
    if (q.length < 2 || q.length > 300) return json({ ok: false, error: 'bad_question' }, 400, origin);
    if (!(await withinBudget(request))) {
      return json({ ok: false, error: 'rate_limited' }, 429, origin, { 'retry-after': String(MIN_SPAN_S) });
    }
    const prompt = withCtx(q, ctx);

    const chain = [];
    if (env.GEMINI_API_KEY) chain.push(askGemini);
    if (env.A2AGENT_API_KEY) chain.push(askGateway);
    if (!chain.length) return json({ ok: false, error: 'no_key' }, 503, origin);

    const deadlineAt = Date.now() + ASK_BUDGET_MS;
    let last = new Error('no_provider');
    for (let i = 0; i < chain.length; i++) {
      if (i > 0 && left(deadlineAt) < MIN_TRY_MS) break;
      try {
        return json({ ok: true, answer: await chain[i](env, prompt, deadlineAt) }, 200, origin);
      } catch (e) {
        last = e;
      }
    }
    return json({ ok: false, error: String(last.message || last).slice(0, 120) }, 502, origin);
  },
};
