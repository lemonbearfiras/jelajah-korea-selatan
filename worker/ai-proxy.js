/* Jelajah AI proxy — Cloudflare Worker (free plan).
   GitHub Pages cannot run server code, and after 2026-11-02 the Firebase AI Logic
   endpoint demands an App Check token that this project's provider cannot obtain.
   This Worker is a plain HTTPS API with no App Check involvement: the browser sends
   only a question, the key stays in the Worker's secret.
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
const PROVIDER_TIMEOUT_MS = 12000;

const THINK = /<think\b[^>]*>[\s\S]*?<\/think>/gi;

function clean(raw) {
  return String(raw).replace(THINK, ' ').replace(/<\/?think>/gi, ' ').replace(/\s+/g, ' ').trim();
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

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'content-type': 'application/json; charset=utf-8' }, cors(origin)),
  });
}

async function post(url, headers, payload, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/* Free-tier Gemini via an API key — the model name is discovered, not guessed. */
let geminiModel = '';

async function pickGemini(env) {
  if (env.GEMINI_MODEL) return env.GEMINI_MODEL;
  if (geminiModel) return geminiModel;
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY },
    });
    const rows = (await res.json()).models || [];
    const ids = rows
      .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') >= 0; })
      .map(function (m) { return m.name.replace(/^models\//, ''); });
    const ranks = [/gemini-3\.8-flash/, /gemini-3.*flash/i, /gemini.*flash/i, /gemini/i];
    for (let i = 0; i < ranks.length; i++) {
      const hit = ids.filter(function (id) { return ranks[i].test(id); }).sort();
      if (hit.length) { geminiModel = hit[0]; return geminiModel; }
    }
  } catch (e) { /* fall through to the constant */ }
  return 'gemini-flash-latest';
}

async function askGemini(env, question) {
  const model = await pickGemini(env);
  const res = await post(
    'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
    { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ parts: [{ text: question }] }],
      generationConfig: { maxOutputTokens: 900, temperature: 0.4 },
    },
  );
  if (!res.ok) throw new Error('gemini_' + res.status);
  const data = await res.json();
  const parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  const text = clean(
    parts
      .filter(function (p) { return !p.thought; })
      .map(function (p) { return p.text || ''; })
      .join(' ')
  );
  if (text.length < 3) throw new Error('gemini_empty');
  return text.slice(0, MAX_ANSWER);
}

/* Backup: the owner's OpenAI-compatible gateway (same key the Qoder Function uses). */
let gatewayModel = '';

async function pickGateway(env) {
  if (env.GATEWAY_MODEL) return env.GATEWAY_MODEL;
  if (gatewayModel) return gatewayModel;
  try {
    const res = await fetch('https://api.a2agent.me/v1/models', {
      headers: { authorization: 'Bearer ' + env.A2AGENT_API_KEY },
    });
    const rows = (await res.json()).data || [];
    const ids = rows.map(function (m) { return m.id; }).filter(Boolean);
    const m3 = ids.filter(function (id) { return /minimax.?m3/i.test(id); });
    if (m3.length) gatewayModel = m3[0];
    else {
      const rest = ids.filter(function (id) { return /minimax|deepseek|glm|kimi|qwen/i.test(id); }).sort();
      gatewayModel = rest[0] || '';
    }
    if (gatewayModel) return gatewayModel;
  } catch (e) { /* fall through to the constant */ }
  return 'minimax-m3';
}

async function askGateway(env, question) {
  const model = await pickGateway(env);
  const res = await post(
    'https://api.a2agent.me/v1/chat/completions',
    { 'content-type': 'application/json', authorization: 'Bearer ' + env.A2AGENT_API_KEY },
    {
      model: model,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: question }],
      max_tokens: 900,
      temperature: 0.4,
      stream: false,
    },
  );
  if (!res.ok) throw new Error('gateway_' + res.status);
  const data = await res.json();
  const text = clean((((data.choices || [])[0] || {}).message || {}).content || '');
  if (text.length < 3) throw new Error('gateway_empty');
  return text.slice(0, MAX_ANSWER);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    if (!ALLOW.has(origin)) return json({ ok: false, error: 'origin_not_allowed' }, 403, '');
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/ask') {
      return json({ ok: false, error: 'not_found' }, 404, origin);
    }
    let q = '';
    try {
      const body = await request.json();
      q = typeof body.q === 'string' ? body.q.trim() : '';
    } catch (e) {
      return json({ ok: false, error: 'bad_json' }, 400, origin);
    }
    if (q.length < 2 || q.length > 300) return json({ ok: false, error: 'bad_question' }, 400, origin);
    if (!env.GEMINI_API_KEY && !env.A2AGENT_API_KEY) return json({ ok: false, error: 'no_key' }, 503, origin);

    const chain = [];
    if (env.GEMINI_API_KEY) chain.push(askGemini);
    if (env.A2AGENT_API_KEY) chain.push(askGateway);
    let last = new Error('no_provider');
    for (let i = 0; i < chain.length; i++) {
      try {
        return json({ ok: true, answer: await chain[i](env, q) }, 200, origin);
      } catch (e) {
        last = e;
      }
    }
    return json({ ok: false, error: String(last.message || last).slice(0, 60) }, 502, origin);
  },
};
